/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
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

import { readI18nText, useI18nFormatter } from 'ngwr/i18n';
import { WR_OVERLAY, WrOutsideClick } from 'ngwr/overlay';

import type { WrTreeNode, WrTreeSelectionMode } from './interfaces';

interface FlatNode<TId> {
  readonly node: WrTreeNode<TId>;
  readonly depth: number;
  readonly hasChildren: boolean;
  /** Absolute position in the flattened visible list. */
  readonly index: number;
  /** 1-based position within its sibling group (ARIA `aria-posinset`). */
  readonly posinset: number;
  /** Sibling count at this level (ARIA `aria-setsize`). */
  readonly setsize: number;
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
 *   in multi mode) that opens a popover containing the tree. A signal-forms
 *   native control: it implements `FormValueControl<unknown>`, so `[formField]`
 *   binds straight to its `value` model — no `ControlValueAccessor` in between.
 *   `[(value)]` and classic `[(ngModel)]` / reactive forms all keep working via
 *   Angular's bridge. Replaces the standalone `<wr-tree-select>`.
 *
 * Value type in `overlay` mode: `TId | null` in single mode,
 * `readonly TId[]` in multi mode.
 *
 * @example
 * ```html
 * <!-- Inline tree (display widget) -->
 * <wr-tree [nodes]="folders" [(selected)]="picked" [(expanded)]="open" />
 *
 * <!-- Form-bound combobox (signal forms) -->
 * <wr-tree
 *   openOn="overlay"
 *   [nodes]="folders"
 *   selectionMode="single"
 *   [formField]="form.folder"
 *   placeholder="Pick a folder"
 * />
 *
 * <!-- standalone two-way binding -->
 * <wr-tree openOn="overlay" [nodes]="folders" [(value)]="picked" placeholder="Pick a folder" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/tree
 */
@Component({
  selector: 'wr-tree',
  templateUrl: './tree.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [NgTemplateOutlet],
})
export class WrTree<TId = string> implements FormValueControl<unknown> {
  /** Tree data. */
  readonly nodes = input<readonly WrTreeNode<TId>[]>([]);

  /** Selected node ids (two-way bindable). */
  readonly selected = model<readonly TId[]>([]);

  /** Expanded node ids (two-way bindable). */
  readonly expanded = model<readonly TId[]>([]);

  /** Selection behavior. @default 'single' */
  readonly selectionMode = input<WrTreeSelectionMode>('single');

  /**
   * Disable the whole tree. Bound automatically from the field's disabled
   * state when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  // Overlay-mode inputs (ignored when openOn='inline')

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

  /**
   * Window the visible-node list so a large tree keeps only ~one viewport of
   * rows in the DOM. Opt-in and OFF by default — a tree without it renders
   * byte-identically to today. Works in both `inline` and `overlay` shapes;
   * while on, keyboard navigation switches to the `aria-activedescendant`
   * pattern so Arrow / Home / End / Enter keep working across un-rendered rows.
   * @default false
   */
  readonly virtualScroll = input(false, { transform: coerceBooleanProperty });

  /**
   * Uniform row height in px used to map scroll offset to node index. `0`
   * (default) measures the first rendered row once and reuses it, so it adapts
   * to the active density / touch target automatically. Read only when
   * `virtualScroll` is on. @default 0
   */
  readonly rowHeight = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /**
   * Height of the scroll viewport when `virtualScroll` is on — a number (px) or
   * any CSS length (`'60vh'`). A numeric px value lets the server prerender the
   * exact first window. @default 288
   */
  readonly viewportHeight = input<number | string>(288);

  /** Extra rows kept rendered above and below the viewport as scroll headroom. @default 6 */
  readonly overscan = input(6, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 6)) });

  /**
   * Form value — the current selection as seen by a bound field. Bound by
   * `[formField]`, or two-way via `[(value)]`. Shape follows `selectionMode`:
   * `TId | null` in single mode, `readonly TId[]` in multi mode. Meaningful in
   * `overlay` mode; inline mode drives selection via `[(selected)]` instead.
   */
  readonly value = model<unknown>(undefined);

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  // Internals

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly outsideClick = inject(WrOutsideClick);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  /** Currently focused row's index in the flattened visible list. */
  protected readonly focusedIndex = signal(0);

  /** Resolved ARIA labels — resolved once at construction, so a runtime locale switch needs a re-create. */
  protected readonly clearLabel = readI18nText('tree.clearSelection', 'Clear selection');
  protected readonly expandLabel = readI18nText('tree.expand', 'Expand');
  protected readonly collapseLabel = readI18nText('tree.collapse', 'Collapse');
  protected readonly chipRemoveLabel = useI18nFormatter('tree.removeItem', 'Remove {{label}}');

  /** Flattened list of currently visible nodes — what the template renders. */
  protected readonly flat = computed<readonly FlatNode<TId>[]>(() => {
    const expanded = new Set(this.expanded());
    const out: FlatNode<TId>[] = [];
    const walk = (list: readonly WrTreeNode<TId>[], depth: number): void => {
      list.forEach((node, i) => {
        const hasChildren = (node.children?.length ?? 0) > 0;
        out.push({ node, depth, hasChildren, index: out.length, posinset: i + 1, setsize: list.length });
        if (hasChildren && expanded.has(node.id)) walk(node.children!, depth + 1);
      });
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

  protected readonly classes = computed(() => {
    const parts = ['wr-tree'];
    if (this.disabled()) parts.push('wr-tree--disabled');
    if (this.isOverlay()) {
      parts.push('wr-tree--combobox');
      if (this.open()) parts.push('wr-tree--open');
      if (this.isMulti()) parts.push('wr-tree--multi');
    }
    return parts.join(' ');
  });

  protected readonly panelTpl = viewChild('panelTpl', { read: TemplateRef });

  private overlayRef: OverlayRef | null = null;

  // --- Virtual scroll -------------------------------------------------------

  private static readonly FALLBACK_ROW_PX = 32;
  private static readonly FALLBACK_VIEWPORT_PX = 288;

  /** Live vertical scroll offset (px); 0 on the server / before first scroll. */
  private readonly scrollTop = signal(0);
  /** Measured viewport clientHeight (px); 0 until the browser observer fires. */
  private readonly viewportPx = signal(0);
  /** Measured first-row height (px) when `rowHeight` is auto; 0 until measured. */
  private readonly measuredRowPx = signal(0);

  /** Virtualization active (opt-in and there is anything to window). */
  protected readonly virtualized = computed(() => this.virtualScroll() && this.flat().length > 0);

  /** Effective uniform row height (px). */
  protected readonly effRowH = computed(() =>
    this.rowHeight() > 0 ? this.rowHeight() : this.measuredRowPx() || WrTree.FALLBACK_ROW_PX
  );

  /** Deterministic viewport px for SSR + first paint (numeric height, else fallback). */
  private readonly fallbackViewportPx = computed(() => {
    const h = this.viewportHeight();
    if (typeof h === 'number') return h;
    return /^\d+$/.test(h) ? Number(h) : WrTree.FALLBACK_VIEWPORT_PX;
  });

  /** `viewportHeight` as a CSS length for the inline max-height (bare number → px). */
  protected readonly resolvedViewportHeight = computed(() => {
    const h = this.viewportHeight();
    return typeof h === 'number' || /^\d+$/.test(h) ? `${h}px` : h;
  });

  /** Rendered window [start,end) + spacer pads (px). Pure math from `scrollTop`. */
  protected readonly virtualWindow = computed<{ start: number; end: number; padTop: number; padBottom: number }>(() => {
    const total = this.flat().length;
    if (!this.virtualized() || total === 0) return { start: 0, end: total, padTop: 0, padBottom: 0 };
    const h = this.effRowH();
    const vp = this.viewportPx() || this.fallbackViewportPx();
    const over = this.overscan();
    // Clamp `first` so a transient effRowH shrink (auto-measure landing below the
    // fallback within one frame) can't push it past the list and slice to empty.
    const first = Math.min(Math.floor(this.scrollTop() / h), total - 1);
    // `+ 1` covers the partial row at the viewport's bottom edge even at overscan 0.
    const count = Math.ceil(vp / h) + 1;
    const start = Math.max(0, first - over);
    const end = Math.min(total, first + count + over);
    return { start, end, padTop: start * h, padBottom: (total - end) * h };
  });

  /** Nodes placed in the list. SAME array instance as `flat()` when off → byte-identical DOM. */
  protected readonly windowRows = computed<readonly FlatNode<TId>[]>(() => {
    if (!this.virtualized()) return this.flat();
    const { start, end } = this.virtualWindow();
    return this.flat().slice(start, end);
  });

  /** Stable id for a row at flat index `i` — the `aria-activedescendant` target. */
  protected rowId(i: number): string {
    return `${this.panelId}-row-${i}`;
  }

  /**
   * Active-descendant id when virtualized (focus stays on the list container),
   * else `null`. Returns `null` while the focused row is outside the rendered
   * window (e.g. mouse-wheeled away) so `aria-activedescendant` never dangles at
   * a removed element — the next arrow key scrolls it back and re-establishes it.
   */
  protected readonly activeRowId = computed(() => {
    if (!this.virtualized()) return null;
    const i = this.focusedIndex();
    const { start, end } = this.virtualWindow();
    return i >= start && i < end ? this.rowId(i) : null;
  });

  /** The scrollable `<ul>` — inside the overlay panel in overlay mode, else in the host. */
  private get listElement(): HTMLElement | null {
    const root = this.overlayRef?.overlayElement ?? this.host.nativeElement;
    return root.querySelector<HTMLElement>('.wr-tree__list');
  }

  /** Scroll flat index `i` just into view (sets the `scrollTop` signal synchronously). */
  private ensureVisible(i: number): void {
    const h = this.effRowH();
    const vp = this.viewportPx() || this.fallbackViewportPx();
    const top = i * h;
    const cur = this.scrollTop();
    let next = cur;
    if (top < cur) next = top;
    else if (top + h > cur + vp) next = top + h - vp;
    if (next !== cur) {
      this.scrollTop.set(next);
      this.listElement?.scrollTo({ top: next });
    }
  }

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

    // Disabling the control closes any open overlay (mirrors the side effect
    // of the old CVA setDisabledState).
    effect(() => {
      if (this.disabled()) this.open.set(false);
    });

    // Bridge an external `value` write back into the internal `selected`
    // state (this is the old writeValue body). `undefined` is the untouched
    // sentinel — no field / ngModel has written yet, so leave any preset
    // `[(selected)]` alone; a real `null` still clears, exactly as
    // `writeValue(null)` did. Guarded against the echo of our own `emit()`
    // (equality check under `untracked`) so a live pick is never clobbered.
    effect(() => {
      const value = this.value();
      if (value === undefined) return;
      untracked(() => {
        const next: readonly TId[] = this.isMulti()
          ? Array.isArray(value)
            ? (value as readonly TId[])
            : []
          : value == null
            ? []
            : [value as TId];
        const current = this.selected();
        if (next.length === current.length && next.every((id, i) => id === current[i])) return;
        this.selected.set(next);
      });
    });

    // Wire the scroll listener + viewport/row measurement — only while virtual
    // and in the browser. Re-runs when the list (re)appears (overlay open, data
    // change), deferring the DOM read to a microtask so the portal / inline list
    // is attached. No-op on the server (SSR renders the deterministic first
    // window from inputs alone).
    effect(onCleanup => {
      if (!isPlatformBrowser(this.platformId) || !this.virtualScroll()) return;
      const open = this.isOverlay() ? this.open() : true;
      this.flat();
      if (!open) return;
      let raf = 0;
      let ro: ResizeObserver | null = null;
      let el: HTMLElement | null = null;
      const onScroll = (): void => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (el) this.scrollTop.set(el.scrollTop);
        });
      };
      queueMicrotask(() => {
        el = this.listElement;
        if (!el) return;
        // The overlay `<ul>` is destroyed + recreated on each open, but the
        // `scrollTop` signal persists — restore the fresh element to it so a
        // reopened panel isn't blank (window computed from a non-zero signal
        // while the new DOM sits at scrollTop 0). No-op on first open / inline.
        if (el.scrollTop !== this.scrollTop()) el.scrollTop = this.scrollTop();
        this.viewportPx.set(el.clientHeight);
        if (this.rowHeight() === 0) {
          const h = el.querySelector<HTMLElement>('.wr-tree__row')?.offsetHeight ?? 0;
          if (h > 0) this.measuredRowPx.set(h);
        }
        el.addEventListener('scroll', onScroll, { passive: true });
        if (typeof ResizeObserver !== 'undefined') {
          ro = new ResizeObserver(() => {
            if (el) this.viewportPx.set(el.clientHeight);
          });
          ro.observe(el);
        }
      });
      onCleanup(() => {
        if (raf) cancelAnimationFrame(raf);
        if (el) el.removeEventListener('scroll', onScroll);
        ro?.disconnect();
      });
    });

    this.destroyRef.onDestroy(() => this.closeOverlay());
  }

  // Template handlers

  protected onRowClick(flat: FlatNode<TId>, event: MouseEvent): void {
    if (this.disabled() || flat.node.disabled) return;
    if (flat.hasChildren && (event.target as HTMLElement).closest('.wr-tree__toggle')) {
      this.toggleExpanded(flat.node.id);
      return;
    }
    this.focusIndex(flat.index);
    this.select(flat.node.id, event.ctrlKey || event.metaKey);
  }

  protected onToggleClick(node: WrTreeNode<TId>, event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled() || node.disabled) return;
    this.toggleExpanded(node.id);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
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

  // Overlay-mode trigger handlers

  protected onTriggerClick(): void {
    if (this.disabled()) return;
    this.open.update(v => !v);
  }

  /** Trigger blur — mark the bound field touched. */
  protected onBlur(): void {
    this.touch.emit();
  }

  protected removeChip(id: TId, event: Event): void {
    event.stopPropagation();
    if (this.disabled()) return;
    const next = this.selected().filter(x => x !== id);
    this.selected.set(next);
    this.emit();
  }

  protected clearSelection(event: Event): void {
    event.stopPropagation();
    if (this.disabled()) return;
    this.selected.set([]);
    this.emit();
  }

  // Selection / expansion plumbing

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

    // Overlay mode: propagate to the bound value, close on single-mode pick.
    if (this.isOverlay()) {
      this.emit();
      if (mode === 'single' && this.selected().length > 0) {
        this.open.set(false);
      }
    }
  }

  private emit(): void {
    this.touch.emit();
    if (this.isMulti()) {
      this.value.set(this.selected());
    } else {
      this.value.set(this.selected()[0] ?? null);
    }
  }

  private focusIndex(i: number): void {
    this.focusedIndex.set(i);
    if (this.virtualized()) {
      // Managed-focus (aria-activedescendant): focus stays on the list container.
      // Setting `scrollTop` synchronously materializes row `i` in the SAME change
      // detection pass, so the id referenced by `aria-activedescendant` is present
      // — no rAF/microtask race, no "points at an absent id" gap.
      this.ensureVisible(i);
      this.listElement?.focus();
      return;
    }
    // Non-virtual roving tabindex: defer so the DOM has updated tabindex, then
    // move focus to the row element.
    queueMicrotask(() => {
      const root = this.overlayRef?.overlayElement ?? this.host.nativeElement;
      const row = root.querySelector<HTMLElement>(`[data-tree-index="${i}"]`);
      row?.focus();
    });
  }

  // Overlay

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

    // Virtual mode drives keyboard nav via aria-activedescendant on the list
    // container, so it must hold focus once the panel is attached.
    if (this.virtualized()) queueMicrotask(() => this.listElement?.focus());

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

  private closeOverlay(): void {
    if (!this.overlayRef) return;
    this.overlayRef.dispose();
    this.overlayRef = null;
  }
}
