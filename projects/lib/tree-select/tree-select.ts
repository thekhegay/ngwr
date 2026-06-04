/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  ViewContainerRef,
  ViewEncapsulation,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { provideWrIcons, WrIcon, chevronDown, close } from 'ngwr/icon';
import { WR_OVERLAY } from 'ngwr/overlay';
import { WrTree, type WrTreeNode, type WrTreeSelectionMode } from 'ngwr/tree';
import { noop } from 'ngwr/utils';

let panelUid = 0;

interface SelectedChip<TId> {
  readonly id: TId;
  readonly label: string;
}

/**
 * Tree picker — opens an overlay containing a `<wr-tree>` and binds its
 * selection back through `ControlValueAccessor`. Single mode commits +
 * closes on pick; multi keeps the panel open so the user can keep
 * toggling.
 *
 * @example
 * ```html
 * <wr-tree-select
 *   [nodes]="folders"
 *   selectionMode="single"
 *   [(ngModel)]="picked"
 *   placeholder="Pick a folder"
 * />
 * ```
 *
 * @see https://ngwr.dev/components/tree-select
 */
@Component({
  selector: 'wr-tree-select',
  templateUrl: './tree-select.html',
  styleUrl: './tree-select.scss',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrIcon, WrTree],
  providers: [
    provideWrIcons([chevronDown, close]),
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrTreeSelect),
      multi: true,
    },
  ],
})
export class WrTreeSelect<TId = string> implements ControlValueAccessor {
  /** Tree data. */
  readonly nodes = input.required<readonly WrTreeNode<TId>[]>();

  /** Selection behavior — drives the inner `<wr-tree>`. @default 'single' */
  readonly selectionMode = input<WrTreeSelectionMode>('single');

  /** Placeholder shown when no node is selected. @default '' */
  readonly placeholder = input<string>('');

  /** Disable the picker. */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Show a clear-all (×) button on the trigger when at least one node is selected. @default true */
  readonly clearable = input(true, { transform: coerceBooleanProperty });

  /**
   * Cap on the number of chips rendered on the trigger before
   * collapsing the rest into `+N more` (multi mode only). `0` = render
   * every chip. @default 0
   */
  readonly maxTagCount = input(0, {
    transform: (v: unknown): number => Math.max(0, Number(v) || 0),
  });

  /** Auto-expand every node that has children on first open. @default false */
  readonly defaultExpandAll = input(false, { transform: coerceBooleanProperty });

  /**
   * Selected node ids (internal). Mirrors `<wr-tree>`'s `[(selected)]`.
   * @internal
   */
  protected readonly selected = signal<readonly TId[]>([]);

  /** Initial expanded set — once the user toggles, `<wr-tree>` owns it. */
  protected readonly expanded = signal<readonly TId[]>([]);

  protected readonly open = signal(false);

  /** Panel id used by the trigger's `aria-controls`. */
  protected readonly panelId = `wr-tree-select-panel-${++panelUid}`;

  private readonly disabledFromCva = signal(false);

  protected readonly isDisabled = computed(() => this.disabled() || this.disabledFromCva());

  /** Resolved label map — { id → label } for every node in the tree. */
  private readonly labelMap = computed<ReadonlyMap<TId, string>>(() => {
    const map = new Map<TId, string>();
    const walk = (list: readonly WrTreeNode<TId>[]): void => {
      for (const n of list) {
        map.set(n.id, n.label);
        if (n.children?.length) walk(n.children);
      }
    };
    walk(this.nodes());
    return map;
  });

  protected readonly selectedChips = computed<readonly SelectedChip<TId>[]>(() => {
    const map = this.labelMap();
    return this.selected().map<SelectedChip<TId>>(id => ({ id, label: map.get(id) ?? String(id) }));
  });

  protected readonly visibleChips = computed<readonly SelectedChip<TId>[]>(() => {
    const cap = this.maxTagCount();
    const chips = this.selectedChips();
    return cap > 0 && chips.length > cap ? chips.slice(0, cap) : chips;
  });

  protected readonly hiddenChipCount = computed(() => {
    const cap = this.maxTagCount();
    const total = this.selectedChips().length;
    return cap > 0 && total > cap ? total - cap : 0;
  });

  /** Single-mode trigger label. */
  protected readonly singleLabel = computed<string | null>(() => {
    if (this.selectionMode() === 'multi') return null;
    const first = this.selected()[0];
    if (first == null) return null;
    return this.labelMap().get(first) ?? null;
  });

  protected readonly hasSelection = computed(() => this.selected().length > 0);

  protected readonly classes = computed(() => {
    const parts = ['wr-tree-select'];
    if (this.open()) parts.push('wr-tree-select--open');
    if (this.isDisabled()) parts.push('wr-tree-select--disabled');
    if (this.selectionMode() === 'multi') parts.push('wr-tree-select--multi');
    return parts.join(' ');
  });

  protected readonly panelTpl = viewChild.required('panelTpl', { read: TemplateRef });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);
  private overlayRef: OverlayRef | null = null;

  private onChange: (value: TId | readonly TId[] | null) => void = noop;
  protected onTouched: () => void = noop;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.openOverlay();
        if (this.defaultExpandAll() && this.expanded().length === 0) {
          this.expanded.set(this.collectExpandableIds(this.nodes()));
        }
      } else {
        this.closeOverlay();
      }
    });
  }

  // ──────── Template handlers ────────

  protected onTriggerClick(): void {
    if (this.isDisabled()) return;
    this.open.update(v => !v);
  }

  /** Fires when the inner `<wr-tree>` reports a new selection. */
  protected onSelectedChange(next: readonly TId[]): void {
    this.selected.set(next);
    if (this.selectionMode() === 'single') {
      const first = next[0] ?? null;
      this.onChange(first);
      this.onTouched();
      // Single-mode: pick + close.
      if (first != null) this.open.set(false);
    } else {
      this.onChange(next);
      this.onTouched();
    }
  }

  protected removeChip(id: TId, event: Event): void {
    event.stopPropagation();
    if (this.isDisabled()) return;
    const next = this.selected().filter(x => x !== id);
    this.selected.set(next);
    this.onSelectedChange(next);
  }

  protected clearSelection(event: Event): void {
    event.stopPropagation();
    if (this.isDisabled()) return;
    this.selected.set([]);
    if (this.selectionMode() === 'single') {
      this.onChange(null);
    } else {
      this.onChange([]);
    }
    this.onTouched();
  }

  // ──────── ControlValueAccessor ────────

  writeValue(value: unknown): void {
    if (this.selectionMode() === 'multi') {
      this.selected.set(Array.isArray(value) ? (value as readonly TId[]) : []);
    } else if (value == null) {
      this.selected.set([]);
    } else {
      this.selected.set([value as TId]);
    }
  }

  registerOnChange(fn: (value: TId | readonly TId[] | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledFromCva.set(coerceBooleanProperty(isDisabled));
    if (isDisabled) this.open.set(false);
  }

  // ──────── Internals ────────

  private collectExpandableIds(list: readonly WrTreeNode<TId>[]): readonly TId[] {
    const out: TId[] = [];
    const walk = (items: readonly WrTreeNode<TId>[]): void => {
      for (const n of items) {
        if (n.children?.length) {
          out.push(n.id);
          walk(n.children);
        }
      }
    };
    walk(list);
    return out;
  }

  // ──────── Overlay ────────

  private openOverlay(): void {
    if (this.overlayRef) return;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.host)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
      ])
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.reposition(),
      width: this.host.nativeElement.getBoundingClientRect().width,
      panelClass: 'wr-tree-select-overlay',
    });

    const portal = new TemplatePortal(this.panelTpl(), this.vcr);
    this.overlayRef.attach(portal);

    this.overlayRef
      .outsidePointerEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (this.host.nativeElement.contains(event.target as Node)) return;
        this.open.set(false);
      });

    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.open.set(false);
        }
      });
  }

  private closeOverlay(): void {
    if (!this.overlayRef) return;
    this.overlayRef.dispose();
    this.overlayRef = null;
  }
}
