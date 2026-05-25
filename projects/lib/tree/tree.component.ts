/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';

import type { WrTreeNode, WrTreeSelectionMode } from './types';

type FlatNode<TId> = {
  readonly node: WrTreeNode<TId>;
  readonly depth: number;
  readonly hasChildren: boolean;
};

/**
 * Hierarchical tree. Data-driven — pass `[nodes]` with optional `children`
 * arrays. Supports single / multi selection (two-way `[(selected)]`),
 * controlled expand state (two-way `[(expanded)]`), and full keyboard
 * navigation.
 *
 * @example
 * ```html
 * <wr-tree
 *   [nodes]="folders"
 *   [(selected)]="picked"
 *   [(expanded)]="open"
 *   selectionMode="multi"
 * />
 * ```
 *
 * @see https://ngwr.dev/docs/components/tree
 */
@Component({
  selector: 'wr-tree',
  templateUrl: './tree.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrTreeComponent<TId = string> {
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

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

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

  protected readonly classes = computed(() => {
    const parts = ['wr-tree'];
    if (this.disabled()) parts.push('wr-tree--disabled');
    return parts.join(' ');
  });

  // ──────── Template handlers ────────

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
          // Jump up to parent.
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

  // ──────── Internals ────────

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
      return;
    }
    // multi
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

  private focusIndex(i: number): void {
    this.focusedIndex.set(i);
    // Defer to next frame so the DOM has updated row classes/tabindex.
    queueMicrotask(() => {
      const row = this.host.nativeElement.querySelector<HTMLElement>(`[data-tree-index="${i}"]`);
      row?.focus();
    });
  }
}
