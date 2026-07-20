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
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { FormValueControl } from '@angular/forms/signals';

import { WR_OVERLAY } from 'ngwr/overlay';

import type { WrCascaderOption } from './interfaces';

let panelUid = 0;

/**
 * Multi-level select — drills down through hierarchical categories
 * (e.g. country → state → city). Each level renders as a column; clicks
 * advance to the next column. Selecting a leaf (no children) commits
 * the full path.
 *
 * A signal-forms native control: it implements `FormValueControl<unknown>`,
 * so `[formField]` binds straight to its `value` model — no
 * `ControlValueAccessor` in between. `[(value)]` works standalone. The value
 * is the path through the tree (an array from root to leaf).
 *
 * @example
 * ```html
 * <!-- signal forms -->
 * <wr-cascader [options]="locations" [formField]="form.path" placeholder="Pick a location" />
 *
 * <!-- standalone two-way binding -->
 * <wr-cascader [options]="locations" [(value)]="path" placeholder="Pick a location" />
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
 * @see https://ngwr.dev/reference/components/cascader
 */
export type WrCascaderSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'wr-cascader',
  templateUrl: './cascader.html',
  styleUrl: './cascader.scss',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrCascader<T = string> implements FormValueControl<unknown> {
  /** Root-level options. Each may have `children` for deeper levels. */
  readonly options = input.required<readonly WrCascaderOption<T>[]>();

  /** Placeholder shown when no path is selected. @default '' */
  readonly placeholder = input<string>('');

  /**
   * Disable the cascader. Bound automatically from the field's disabled state
   * when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Control size — shares the `--wr-control-*` contract. @default 'md' */
  readonly size = input<WrCascaderSize>('md');

  /** Show a clear-all (×) button on the trigger when a path is selected. @default true */
  readonly clearable = input(true, { transform: coerceBooleanProperty });

  /**
   * Allow selecting non-leaf (parent) nodes. When `false`, only leaves
   * (nodes without children) commit a selection. @default false
   */
  readonly changeOnSelect = input(false, { transform: coerceBooleanProperty });

  /** Separator between labels in the trigger display. @default '/' */
  readonly separator = input<string>('/');

  /**
   * Committed selection path (full array from root to leaf). Bound by
   * `[formField]`, or two-way via `[(value)]`.
   */
  readonly value = model<unknown>([]);

  /** Emitted on blur / commit so a bound field can mark itself touched. */
  readonly touch = output<void>();

  /** Committed selection path (full T[] from root to leaf). @internal */
  protected readonly path = signal<readonly T[]>([]);

  /** Currently-expanded column path — drives which columns the panel shows. @internal */
  protected readonly activePath = signal<readonly T[]>([]);

  protected readonly open = signal(false);

  /** Panel id used by the trigger's `aria-controls`. */
  protected readonly panelId = `wr-cascader-panel-${++panelUid}`;

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
    const size = this.size();
    if (size !== 'md') parts.push(`wr-cascader--${size}`);
    if (this.open()) parts.push('wr-cascader--open');
    if (this.disabled()) parts.push('wr-cascader--disabled');
    return parts.join(' ');
  });

  protected readonly panelTpl = viewChild.required('panelTpl', { read: TemplateRef });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);
  private overlayRef: OverlayRef | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.openOverlay();
      } else {
        this.closeOverlay();
      }
    });

    // Close the panel if the control becomes disabled while open.
    effect(() => {
      if (this.disabled()) this.open.set(false);
    });

    // Mirror an external `value` write into the internal path/activePath
    // (the old `writeValue`). Skipped when the write merely echoes the
    // committed path, so a live drill-down can never be clobbered.
    effect(() => {
      // Coerce null/undefined/non-array to an empty path — a classic-forms
      // binding can write null, which the old `writeValue(value: unknown)`
      // treated as "no selection" too.
      const value = this.value();
      untracked(() => {
        const next: readonly T[] = Array.isArray(value) ? (value as readonly T[]) : [];
        if (this.pathsEqual(this.path(), next)) return;
        this.path.set(next);
        this.activePath.set(next);
      });
    });
  }

  // Template handlers

  protected onTriggerClick(): void {
    if (this.disabled()) return;
    if (!this.open()) this.activePath.set(this.path());
    this.open.update(v => !v);
  }

  protected onOptionClick(colIndex: number, opt: WrCascaderOption<T>, event: Event): void {
    event.stopPropagation();
    if (opt.disabled || this.disabled()) return;

    const head = this.activePath().slice(0, colIndex);
    const newPath = [...head, opt.value];

    const hasChildren = !!opt.children?.length;

    // Always update active column for visual feedback / next column.
    this.activePath.set(newPath);

    // Commit when we've reached a leaf, or when changeOnSelect is on.
    if (!hasChildren || this.changeOnSelect()) {
      this.path.set(newPath);
      this.value.set(newPath);
      this.touch.emit();
      // Close once we hit a true leaf — parent commits keep the panel open.
      if (!hasChildren) this.open.set(false);
    }
  }

  protected clearSelection(event: Event): void {
    event.stopPropagation();
    if (this.disabled()) return;
    this.path.set([]);
    this.activePath.set([]);
    this.value.set([]);
    this.touch.emit();
  }

  protected isActiveAt(colIndex: number, value: T): boolean {
    return this.activePath()[colIndex] === value;
  }

  private pathsEqual(a: readonly T[], b: readonly T[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }

  // Overlay

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

export type { WrCascaderOption } from './interfaces';
