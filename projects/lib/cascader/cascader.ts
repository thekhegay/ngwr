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
  Injector,
  TemplateRef,
  ViewContainerRef,
  ViewEncapsulation,
  afterNextRender,
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

import { useFormFieldAria } from 'ngwr/form';
import { useI18nText } from 'ngwr/i18n';
import { WR_OVERLAY, WrOutsideClick } from 'ngwr/overlay';

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
  /** Accessible name. Falls back to `select.clearSelection`, then `'Clear selection'`. */
  readonly clearLabel = input<string | null>(null);

  protected readonly resolvedClearLabel = useI18nText(this.clearLabel, 'select.clearSelection', 'Clear selection');

  /** Root-level options. Each may have `children` for deeper levels. */
  readonly options = input.required<readonly WrCascaderOption<T>[]>();

  /** Placeholder shown when no path is selected. @default '' */
  readonly placeholder = input<string>('');

  /**
   * Accessible name of the trigger. Falls back to the placeholder, then to
   * `select.label` — a `role="combobox"` with nothing selected and no
   * placeholder otherwise has no name at all.
   */
  readonly ariaLabel = input<string | null>(null);

  private readonly labelText = useI18nText(this.ariaLabel, 'select.label', 'Select');
  protected readonly resolvedAriaLabel = computed(() => {
    // Not `??`: an empty placeholder must fall through to the catalog string.
    const explicit = this.ariaLabel();
    if (explicit) return explicit;
    const placeholder = this.placeholder();
    return placeholder ? placeholder : this.labelText();
  });

  /**
   * Disable the cascader. Bound automatically from the field's disabled state
   * when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Refuse changes while the trigger stays focusable and the path still submits.
   * Bound automatically from the field's readonly state when used with
   * `[formField]`.
   *
   * The panel is where every edit happens, so a read-only cascader simply does
   * not open — there is nothing to browse that is not already on the trigger —
   * and the clear button goes away with it. Mirrored as `aria-readonly`, which
   * role `combobox` supports.
   *
   * @default false
   */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  /** The surrounding `<wr-form-field>`'s error state. @internal */
  protected readonly fieldAria = useFormFieldAria();

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
    else if (this.readonly()) parts.push('wr-cascader--readonly');
    return parts.join(' ');
  });

  protected readonly panelTpl = viewChild.required('panelTpl', { read: TemplateRef });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly outsideClick = inject(WrOutsideClick);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private overlayRef: OverlayRef | null = null;

  constructor() {
    // Same contract as wr-select / wr-dropdown / wr-lightbox: an overlay lives in
    // the CDK container, not in this component's view, so destroying the
    // component while the panel is open would strand the pane and its scroll
    // strategy.
    this.destroyRef.onDestroy(() => this.closeOverlay());

    effect(() => {
      if (this.open()) {
        this.openOverlay();
      } else {
        this.closeOverlay();
      }
    });

    // Close the panel if the control becomes disabled or read-only while open.
    effect(() => {
      if (this.disabled() || this.readonly()) this.open.set(false);
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
    if (this.disabled() || this.readonly()) return;
    if (!this.open()) this.activePath.set(this.path());
    this.open.update(v => !v);
  }

  /**
   * ArrowDown / ArrowUp open the panel, Alt+ArrowDown included — the combobox way in,
   * and the shape `wr-dropdown`'s trigger uses. Enter and Space need no branch: the
   * trigger is a real `<button>`, so the browser turns them into the click above.
   *
   * Only while closed. Once the panel is up the caret is inside it, and its options
   * own their own keys.
   */
  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled() || this.readonly() || this.open()) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    this.activePath.set(this.path());
    this.open.set(true);
  }

  protected onOptionClick(colIndex: number, opt: WrCascaderOption<T>, event: Event): void {
    event.stopPropagation();
    if (opt.disabled || this.disabled() || this.readonly()) return;

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
    if (this.disabled() || this.readonly()) return;
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

    // Move the caret into the panel it just opened. Nothing did, and the pane is
    // appended to `<body>`, so an opened cascader left focus on the trigger and its
    // options were reachable only by tabbing past the whole rest of the page —
    // `wr-tree` and `wr-context-menu` were the same defect. `closeOverlay` below
    // already assumes this is where the caret lives.
    //
    // `afterNextRender`, NOT `queueMicrotask`: under zoneless CD change detection runs
    // in a macrotask, so a microtask queued here fires before the columns are in the
    // DOM — the trap that once left `wr-calendar`'s ring and its real focus on
    // different days.
    afterNextRender(() => this.focusPanelOption(), { injector: this.injector });

    this.outsideClick
      .outsidePointerEvents(this.overlayRef)
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

  /**
   * The option the panel opens on: the selected one in the first column when there is
   * a selection, otherwise the first enabled root. A disabled option is skipped — it
   * still carries `tabindex="-1"`, so `focus()` would land on it and answer for a
   * choice nobody can make.
   */
  private focusPanelOption(): void {
    const pane = this.overlayRef?.overlayElement;
    if (!pane) return;
    const option =
      pane.querySelector<HTMLElement>('.wr-cascader__opt--active:not(.wr-cascader__opt--disabled)') ??
      pane.querySelector<HTMLElement>('.wr-cascader__opt:not(.wr-cascader__opt--disabled)');
    option?.focus();
  }

  private closeOverlay(): void {
    if (!this.overlayRef) return;
    // Every enabled option carries `tabindex="0"` and commits on Enter, so on
    // the keyboard the caret is INSIDE the pane by design — and the ordinary
    // way to finish choosing (`onOptionClick` on a leaf) closes it. Disposing
    // without handing focus back dropped it on `<body>` on the SUCCESS path,
    // not merely on dismissal: a keyboard user who had just picked a value then
    // had to Tab from the top of the document to get back to the control.
    // Untouched when focus had already moved elsewhere — that click is usually
    // what closed us, and stealing the caret back would fight the user for it.
    const pane = this.overlayRef.overlayElement;
    const focusWasInside = pane.contains(this.host.nativeElement.ownerDocument.activeElement);
    this.overlayRef.dispose();
    this.overlayRef = null;
    if (focusWasInside) this.host.nativeElement.querySelector<HTMLElement>('.wr-cascader__trigger')?.focus();
  }
}

export type { WrCascaderOption } from './interfaces';
