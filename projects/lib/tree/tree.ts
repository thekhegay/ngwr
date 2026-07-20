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
import { WR_OVERLAY } from 'ngwr/overlay';

import type { WrTreeNode, WrTreeSelectionMode } from './interfaces';

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
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);

  /** Currently focused row's index in the flattened visible list. */
  protected readonly focusedIndex = signal(0);

  /** Resolved ARIA labels — pick up live locale changes via re-render. */
  protected readonly clearLabel = readI18nText('tree.clearSelection', 'Clear selection');
  protected readonly expandLabel = readI18nText('tree.expand', 'Expand');
  protected readonly collapseLabel = readI18nText('tree.collapse', 'Collapse');
  protected readonly chipRemoveLabel = useI18nFormatter('tree.removeItem', 'Remove {{label}}');

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

    this.destroyRef.onDestroy(() => this.closeOverlay());
  }

  // Template handlers

  protected onRowClick(flat: FlatNode<TId>, event: MouseEvent): void {
    if (this.disabled() || flat.node.disabled) return;
    if (flat.hasChildren && (event.target as HTMLElement).closest('.wr-tree__toggle')) {
      this.toggleExpanded(flat.node.id);
      return;
    }
    this.focusIndex(this.flat().indexOf(flat));
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
    // Defer to next frame so the DOM has updated row classes/tabindex.
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
