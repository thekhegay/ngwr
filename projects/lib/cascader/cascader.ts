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

import { provideWrIcons, WrIcon, chevronDown, chevronRight, close } from 'ngwr/icon';
import { WR_OVERLAY } from 'ngwr/overlay';
import { noop } from 'ngwr/utils';

let panelUid = 0;

/** One node in the cascader tree. */
export interface WrCascaderOption<T = string> {
  /** Value contributed when this node is part of the selection path. */
  readonly value: T;
  /** Display label for this node. */
  readonly label: string;
  /** Disable interaction for this node. @default false */
  readonly disabled?: boolean;
  /** Children. Absence (or empty array) marks this as a leaf. */
  readonly children?: readonly WrCascaderOption<T>[];
}

/**
 * Multi-level select — drills down through hierarchical categories
 * (e.g. country → state → city). Each level renders as a column; clicks
 * advance to the next column. Selecting a leaf (no children) commits
 * the full path.
 *
 * Implements `ControlValueAccessor` — value is the path through the
 * tree as a `readonly T[]`.
 *
 * @example
 * ```html
 * <wr-cascader [options]="locations" [(ngModel)]="path" placeholder="Pick a location" />
 * ```
 *
 * ```ts
 * locations: WrCascaderOption[] = [
 *   {
 *     value: 'us', label: 'United States', children: [
 *       { value: 'ny', label: 'New York', children: [
 *         { value: 'nyc', label: 'NYC' },
 *         { value: 'buf', label: 'Buffalo' },
 *       ] },
 *     ],
 *   },
 * ];
 * ```
 *
 * @see https://ngwr.dev/components/cascader
 */
@Component({
  selector: 'wr-cascader',
  templateUrl: './cascader.html',
  styleUrl: './cascader.scss',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrIcon],
  providers: [
    provideWrIcons([chevronDown, chevronRight, close]),
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrCascader),
      multi: true,
    },
  ],
})
export class WrCascader<T = string> implements ControlValueAccessor {
  /** Root-level options. Each may have `children` for deeper levels. */
  readonly options = input.required<readonly WrCascaderOption<T>[]>();

  /** Placeholder shown when no path is selected. @default '' */
  readonly placeholder = input<string>('');

  /** Disable the cascader. */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Show a clear-all (×) button on the trigger when a path is selected. @default true */
  readonly clearable = input(true, { transform: coerceBooleanProperty });

  /**
   * Allow selecting non-leaf (parent) nodes. When `false`, only leaves
   * (nodes without children) commit a selection. @default false
   */
  readonly changeOnSelect = input(false, { transform: coerceBooleanProperty });

  /** Separator between labels in the trigger display. @default '/' */
  readonly separator = input<string>('/');

  /** Committed selection path (full T[] from root to leaf). @internal */
  protected readonly path = signal<readonly T[]>([]);

  /** Currently-expanded column path — drives which columns the panel shows. @internal */
  protected readonly activePath = signal<readonly T[]>([]);

  protected readonly open = signal(false);

  /** Panel id used by the trigger's `aria-controls`. */
  protected readonly panelId = `wr-cascader-panel-${++panelUid}`;

  private readonly disabledFromCva = signal(false);

  protected readonly isDisabled = computed(() => this.disabled() || this.disabledFromCva());

  /**
   * Columns visible in the panel. Each column shows the children of the
   * preceding activePath entry. Column 0 = root options. The last
   * column is whatever the deepest active node's children resolve to —
   * we only render a column when there are children to show.
   */
  protected readonly columns = computed<readonly (readonly WrCascaderOption<T>[])[]>(() => {
    const cols: (readonly WrCascaderOption<T>[])[] = [this.options()];
    const trail = this.activePath();
    let list: readonly WrCascaderOption<T>[] = this.options();
    for (const v of trail) {
      const node = list.find(o => o.value === v);
      if (!node?.children?.length) break;
      cols.push(node.children);
      list = node.children;
    }
    return cols;
  });

  /** Label trail joined by `separator()` — what the trigger shows. */
  protected readonly displayLabel = computed(() => {
    const p = this.path();
    if (p.length === 0) return null;
    const labels: string[] = [];
    let list: readonly WrCascaderOption<T>[] = this.options();
    for (const v of p) {
      const node = list.find(o => o.value === v);
      if (!node) return null;
      labels.push(node.label);
      list = node.children ?? [];
    }
    const sep = ` ${this.separator()} `;
    return labels.join(sep);
  });

  protected readonly hasSelection = computed(() => this.path().length > 0);

  protected readonly classes = computed(() => {
    const parts = ['wr-cascader'];
    if (this.open()) parts.push('wr-cascader--open');
    if (this.isDisabled()) parts.push('wr-cascader--disabled');
    return parts.join(' ');
  });

  protected readonly panelTpl = viewChild.required('panelTpl', { read: TemplateRef });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);
  private overlayRef: OverlayRef | null = null;

  private onChange: (value: readonly T[]) => void = noop;
  protected onTouched: () => void = noop;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.openOverlay();
      } else {
        this.closeOverlay();
      }
    });
  }

  // ──────── Template handlers ────────

  protected onTriggerClick(): void {
    if (this.isDisabled()) return;
    if (!this.open()) this.activePath.set(this.path());
    this.open.update(v => !v);
  }

  protected onOptionClick(colIndex: number, opt: WrCascaderOption<T>, event: Event): void {
    event.stopPropagation();
    if (opt.disabled || this.isDisabled()) return;

    const head = this.activePath().slice(0, colIndex);
    const newPath = [...head, opt.value];

    const hasChildren = !!opt.children?.length;

    // Always update active column for visual feedback / next column.
    this.activePath.set(newPath);

    // Commit when we've reached a leaf, or when changeOnSelect is on.
    if (!hasChildren || this.changeOnSelect()) {
      this.path.set(newPath);
      this.onChange(newPath);
      this.onTouched();
      // Close once we hit a true leaf — parent commits keep the panel open.
      if (!hasChildren) this.open.set(false);
    }
  }

  protected clearSelection(event: Event): void {
    event.stopPropagation();
    if (this.isDisabled()) return;
    this.path.set([]);
    this.activePath.set([]);
    const empty: readonly T[] = [];
    this.onChange(empty);
    this.onTouched();
  }

  protected isActiveAt(colIndex: number, value: T): boolean {
    return this.activePath()[colIndex] === value;
  }

  // ──────── ControlValueAccessor ────────

  writeValue(value: unknown): void {
    if (Array.isArray(value)) {
      this.path.set(value as readonly T[]);
      this.activePath.set(value as readonly T[]);
    } else {
      this.path.set([]);
      this.activePath.set([]);
    }
  }

  registerOnChange(fn: (value: readonly T[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledFromCva.set(coerceBooleanProperty(isDisabled));
    if (isDisabled) this.open.set(false);
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
      panelClass: 'wr-cascader-overlay',
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
