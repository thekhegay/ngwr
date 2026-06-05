/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgTemplateOutlet } from '@angular/common';
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
  model,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { provideWrIcons, WrIcon, chevronDown, close } from 'ngwr/icon';
import { WR_OVERLAY } from 'ngwr/overlay';
import { noop } from 'ngwr/utils';

import type { WrTreeNode, WrTreeSelectionMode } from './types';

interface FlatNode<TId> {
  readonly node: WrTreeNode<TId>;
  readonly depth: number;
  readonly hasChildren: boolean;
}

interface SelectedChip<TId> {
  readonly id: TId;
  readonly label: string;
}

let panelUid = 0;

/**
 * Hierarchical tree. Data-driven — pass `[nodes]` with optional `children`
 * arrays. Supports single / multi selection (two-way `[(selected)]`),
 * controlled expand state (two-way `[(expanded)]`), and full keyboard
 * navigation.
 *
 * Two render shapes, picked by `[openOn]`:
 * - `'inline'` (default) — renders the tree list in-place. Use as a display
 *   widget or form-less hierarchical picker.
 * - `'overlay'` — renders a `<wr-select>`-style trigger button (with chips
 *   in multi mode) that opens a popover containing the tree. Acts as a
 *   `ControlValueAccessor` — bind via `[(ngModel)]`, `[formControl]`, or
 *   `formControlName`. Replaces the standalone `<wr-tree-select>`.
 *
 * Value type in `overlay` mode: `TId | null` in single mode,
 * `readonly TId[]` in multi mode.
 *
 * @example
 * ```html
 * <!-- Inline tree (display widget) -->
 * <wr-tree [nodes]="folders" [(selected)]="picked" [(expanded)]="open" />
 *
 * <!-- Form-bound combobox -->
 * <wr-tree
 *   openOn="overlay"
 *   [nodes]="folders"
 *   selectionMode="single"
 *   [(ngModel)]="picked"
 *   placeholder="Pick a folder"
 * />
 * ```
 *
 * @see https://ngwr.dev/components/tree
 */
@Component({
  selector: 'wr-tree',
  templateUrl: './tree.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [NgTemplateOutlet, WrIcon],
  providers: [
    provideWrIcons([chevronDown, close]),
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrTree),
      multi: true,
    },
  ],
})
export class WrTree<TId = string> implements ControlValueAccessor {
  /** Tree data. */
  readonly nodes = input<readonly WrTreeNode<TId>[]>([]);

  /** Selected node ids (two-way bindable). */
  readonly selected = model<readonly TId[]>([]);

  /** Expanded node ids (two-way bindable). */
  readonly expanded = model<readonly TId[]>([]);

  /** Selection behavior. @default 'single' */
  readonly selectionMode = input<WrTreeSelectionMode>('single');

  /** Disable the whole tree. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  // ──────── Overlay-mode inputs (ignored when openOn='inline') ────────

  /** Render shape. @default 'inline' */
  readonly openOn = input<'inline' | 'overlay'>('inline');

  /** Placeholder shown on the trigger when no node is selected. */
  readonly placeholder = input<string>('');

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

  /** Auto-expand every node that has children on first open of the overlay. @default false */
  readonly defaultExpandAll = input(false, { transform: coerceBooleanProperty });

  // ──────── Internals ────────

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);

  /** Currently focused row's index in the flattened visible list. */
  protected readonly focusedIndex = signal(0);

  /** Flattened list of currently visible nodes — what the template renders. */
  protected readonly flat = computed<readonly FlatNode<TId>[]>(() => {
    const expanded = new Set(this.expanded());
    const out: FlatNode<TId>[] = [];
    const walk = (list: readonly WrTreeNode<TId>[], depth: number): void => {
      for (const node of list) {
        const hasChildren = (node.children?.length ?? 0) > 0;
        out.push({ node, depth, hasChildren });
        if (hasChildren && expanded.has(node.id)) walk(node.children!, depth + 1);
      }
    };
    walk(this.nodes(), 0);
    return out;
  });

  protected readonly selectedSet = computed(() => new Set(this.selected()));
  protected readonly expandedSet = computed(() => new Set(this.expanded()));

  protected readonly isOverlay = computed(() => this.openOn() === 'overlay');
  protected readonly isMulti = computed(() => this.selectionMode() === 'multi');
  protected readonly hasSelection = computed(() => this.selected().length > 0);

  /** Overlay-mode trigger label / chip map. */
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

  protected readonly singleLabel = computed<string | null>(() => {
    if (this.isMulti()) return null;
    const first = this.selected()[0];
    if (first == null) return null;
    return this.labelMap().get(first) ?? null;
  });

  /** Overlay open state. Only meaningful when `openOn='overlay'`. */
  protected readonly open = signal(false);

  /** Trigger / panel id for `aria-controls`. */
  protected readonly panelId = `wr-tree-panel-${++panelUid}`;

  private readonly disabledFromCva = signal(false);

  protected readonly isDisabled = computed(() => this.disabled() || this.disabledFromCva());

  protected readonly classes = computed(() => {
    const parts = ['wr-tree'];
    if (this.isDisabled()) parts.push('wr-tree--disabled');
    if (this.isOverlay()) {
      parts.push('wr-tree--combobox');
      if (this.open()) parts.push('wr-tree--open');
      if (this.isMulti()) parts.push('wr-tree--multi');
    }
    return parts.join(' ');
  });

  protected readonly panelTpl = viewChild('panelTpl', { read: TemplateRef });

  private overlayRef: OverlayRef | null = null;

  // ──────── ControlValueAccessor ────────

  private onChange: (value: TId | readonly TId[] | null) => void = noop;
  /** @internal exposed so the trigger can fire on blur. */
  protected onTouched: () => void = noop;

  constructor() {
    // Drive the overlay open/close in response to the `open` signal.
    effect(() => {
      if (!this.isOverlay()) return;
      if (this.open()) {
        this.openOverlay();
        if (this.defaultExpandAll() && this.expanded().length === 0) {
          this.expanded.set(this.collectExpandableIds(this.nodes()));
        }
      } else {
        this.closeOverlay();
      }
    });

    this.destroyRef.onDestroy(() => this.closeOverlay());
  }

  writeValue(value: unknown): void {
    if (this.isMulti()) {
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

  // ──────── Template handlers ────────

  protected onRowClick(flat: FlatNode<TId>, event: MouseEvent): void {
    if (this.isDisabled() || flat.node.disabled) return;
    if (flat.hasChildren && (event.target as HTMLElement).closest('.wr-tree__toggle')) {
      this.toggleExpanded(flat.node.id);
      return;
    }
    this.focusIndex(this.flat().indexOf(flat));
    this.select(flat.node.id, event.ctrlKey || event.metaKey);
  }

  protected onToggleClick(node: WrTreeNode<TId>, event: MouseEvent): void {
    event.stopPropagation();
    if (this.isDisabled() || node.disabled) return;
    this.toggleExpanded(node.id);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) return;
    const flat = this.flat();
    const i = this.focusedIndex();
    const current = flat[i];
    if (!current) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusIndex(Math.min(flat.length - 1, i + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusIndex(Math.max(0, i - 1));
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (current.hasChildren && !this.expandedSet().has(current.node.id)) {
          this.toggleExpanded(current.node.id);
        } else if (current.hasChildren) {
          this.focusIndex(Math.min(flat.length - 1, i + 1));
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (current.hasChildren && this.expandedSet().has(current.node.id)) {
          this.toggleExpanded(current.node.id);
        } else if (current.depth > 0) {
          for (let j = i - 1; j >= 0; j--) {
            if (flat[j].depth < current.depth) {
              this.focusIndex(j);
              break;
            }
          }
        }
        break;
      case 'Home':
        event.preventDefault();
        this.focusIndex(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusIndex(flat.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!current.node.disabled) this.select(current.node.id, event.ctrlKey || event.metaKey);
        break;
      default:
        break;
    }
  }

  // ──────── Overlay-mode trigger handlers ────────

  protected onTriggerClick(): void {
    if (this.isDisabled()) return;
    this.open.update(v => !v);
  }

  protected removeChip(id: TId, event: Event): void {
    event.stopPropagation();
    if (this.isDisabled()) return;
    const next = this.selected().filter(x => x !== id);
    this.selected.set(next);
    this.emit();
  }

  protected clearSelection(event: Event): void {
    event.stopPropagation();
    if (this.isDisabled()) return;
    this.selected.set([]);
    if (this.isMulti()) {
      this.onChange([]);
    } else {
      this.onChange(null);
    }
    this.onTouched();
  }

  // ──────── Selection / expansion plumbing ────────

  private toggleExpanded(id: TId): void {
    const set = new Set(this.expanded());
    if (set.has(id)) set.delete(id);
    else set.add(id);
    this.expanded.set([...set]);
  }

  private select(id: TId, additive: boolean): void {
    const mode = this.selectionMode();
    if (mode === 'none') return;
    if (mode === 'single') {
      this.selected.set([id]);
    } else {
      const set = new Set(this.selected());
      if (additive) {
        if (set.has(id)) set.delete(id);
        else set.add(id);
      } else {
        // Plain click toggles single id in multi mode — common UX.
        if (set.size === 1 && set.has(id)) set.delete(id);
        else {
          set.clear();
          set.add(id);
        }
      }
      this.selected.set([...set]);
    }

    // Overlay mode: propagate to CVA, close on single-mode pick.
    if (this.isOverlay()) {
      this.emit();
      if (mode === 'single' && this.selected().length > 0) {
        this.open.set(false);
      }
    }
  }

  private emit(): void {
    this.onTouched();
    if (this.isMulti()) {
      this.onChange(this.selected());
    } else {
      this.onChange(this.selected()[0] ?? null);
    }
  }

  private focusIndex(i: number): void {
    this.focusedIndex.set(i);
    // Defer to next frame so the DOM has updated row classes/tabindex.
    queueMicrotask(() => {
      const root = this.overlayRef?.overlayElement ?? this.host.nativeElement;
      const row = root.querySelector<HTMLElement>(`[data-tree-index="${i}"]`);
      row?.focus();
    });
  }

  // ──────── Overlay ────────

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

  private openOverlay(): void {
    if (this.overlayRef) return;
    const tpl = this.panelTpl();
    if (!tpl) return;

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
      panelClass: 'wr-tree-overlay',
    });

    this.overlayRef.attach(new TemplatePortal(tpl, this.vcr));

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
