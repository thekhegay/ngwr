/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { type CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import type { ElementRef } from '@angular/core';
import {
  Component,
  Injector,
  ViewEncapsulation,
  afterNextRender,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';

import { readI18nText, useI18nFormatter } from 'ngwr/i18n';

import { WR_SORTABLE_LIST } from './tokens';
import type { WrSortableListContext, WrSortableReorderEvent } from './types';

/** Whether `b` comes after `a` in the document. */
function follows(a: HTMLElement, b: HTMLElement): boolean {
  // eslint-disable-next-line no-bitwise -- compareDocumentPosition answers with a bitmask
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

/** Counted, not random: the list prerenders, so the id has to match on rehydration. */
let sortableListUid = 0;

/**
 * Drag-to-reorder list. Wraps CDK's `cdkDropList` + `cdkDrag` with a
 * signal-based items binding — the source array is updated in place and
 * emitted via 2-way `[(items)]`.
 *
 * Write the loop yourself and project a `<wr-sortable-item>` per row. Until
 * v15 the list owned the loop and rendered one unnamed `<ng-template
 * let-row let-i="index">`, which said nothing in the markup about where those
 * variables came from and gave a row no way to carry anything of its own. Put
 * `wrDragHandle` on an element inside a row to restrict drag start to a
 * handle; there is no input for it, the directive's presence is the switch.
 *
 * Every row is a tab stop: Space or Enter picks it up, the arrow keys move it,
 * Space or Enter drops it and Escape puts it back. CDK's `cdkDrag` ships no key
 * handling of its own, so without this the component's only function was
 * unreachable from a keyboard.
 *
 * Reading direction: a `horizontal` list follows the VISUAL order, so under
 * `dir="rtl"` ArrowLeft moves the held row toward the higher index — the same
 * rule `wr-slider` applies to its track. A vertical list never mirrors.
 *
 * What that does NOT answer is WCAG 2.5.7, which asks for a POINTER alternative
 * to the drag. Click-to-pick-up is the obvious candidate and is not safe here:
 * the CDK's drag-drop bundle installs no click suppressor of any kind, so the
 * mouseup ending a drag still produces a click, and a row that grabbed itself on
 * click would be picking itself straight back up. A visible move-up /
 * move-down affordance is the remaining answer, and that is a design change.
 *
 * @example
 * ```html
 * <wr-sortable-list [(items)]="rows" (reorder)="onReorder($event)">
 *   @for (row of rows(); track row.id) {
 *     <wr-sortable-item>
 *       <span wrDragHandle>≡</span>
 *       {{ row.label }}
 *     </wr-sortable-item>
 *   }
 * </wr-sortable-list>
 * ```
 *
 * @see https://ngwr.dev/reference/components/sortable-list
 */
@Component({
  selector: 'wr-sortable-list',
  templateUrl: './sortable-list.html',
  styleUrl: './sortable-list.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [CdkDropList],
  host: { class: 'wr-sortable-list' },
  providers: [{ provide: WR_SORTABLE_LIST, useExisting: WrSortableList }],
})
export class WrSortableList<T = unknown> implements WrSortableListContext {
  /** Items to render. Two-way — emits the reordered array on drop. */
  readonly items = model.required<T[]>();

  /** Layout direction. Drives CDK's `cdkDropListOrientation`. @default 'vertical' */
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');

  /** Disable all dragging. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Locked axis — restrict drag movement to one axis even diagonally. */
  readonly lockAxis = input<'x' | 'y' | undefined>(undefined);

  /**
   * Delay (ms) before a drag begins after the pointer goes down. The touch
   * delay is the fix for the classic CDK touch snag: without it, the
   * `touch-action: none` CDK puts on each item blocks scrolling the list on a
   * phone. With a small touch delay, a quick swipe scrolls and a brief hold
   * starts the drag; mouse stays instant. Pass a single number to apply one
   * delay to both pointers. @default { touch: 150, mouse: 0 }
   */
  readonly dragStartDelay = input<number | { touch: number; mouse: number }>({ touch: 150, mouse: 0 });

  /** Fired after a successful reorder with the new array + indices. */
  readonly reorder = output<WrSortableReorderEvent<T>>();

  private readonly injector = inject(Injector);

  /**
   * Ambient reading direction, for the horizontal keyboard path only.
   *
   * Optional so a bare `TestBed` — or any consumer that never set a direction —
   * needs no provider; `Directionality` is root-provided, so `null` only ever
   * means "nobody asked", which is LTR. Nothing caches a direction-derived
   * value: `isRtl()` is read inside the key handler, so a runtime flip needs no
   * subscription to `Directionality.change`.
   *
   * The POINTER path already mirrors without this — `cdkDropList` injects
   * `Directionality` itself and feeds it to `DropListRef.withDirection`, so a
   * horizontal drag has always followed the visual order. The keyboard path was
   * the half that did not, which is why the two disagreed.
   */
  private readonly dir = inject(Directionality, { optional: true });

  /**
   * The rows, in projection order, which is the order the consumer's own loop
   * rendered them in — so a row's position here IS its index into `items()`.
   *
   * Collected on construction rather than through `contentChildren`, because
   * the keyboard path has to resolve an index DURING a keydown and a query
   * signal is only guaranteed current after change detection. A row that
   * Angular destroys drops out on the next lookup: the element is gone from
   * the DOM, so `indexOf` cannot find it and the stale entry is swept then.
   */
  private readonly rows: { readonly host: ElementRef<HTMLElement> }[] = [];

  /** Index of the row the keyboard is holding, or `null` when nothing is held. */
  readonly grabbedIndex = signal<number | null>(null);

  /** Live-region text. Written by the keyboard path only. */
  protected readonly announcement = signal('');

  /** Links every row to the key model via `aria-describedby`. */
  readonly keyHelpId = `wr-sortable-list-help-${++sortableListUid}`;

  protected readonly resolvedKeyHelp = readI18nText(
    'sortableList.keyHelp',
    'Press Space to pick this item up, then use the arrow keys to move it. ' +
      'Press Space again to drop it, or Escape to put it back.'
  );

  private readonly grabbedText = useI18nFormatter('sortableList.grabbed', 'Grabbed. {{index}} of {{total}}.');
  private readonly movedText = useI18nFormatter('sortableList.moved', '{{index}} of {{total}}.');
  private readonly droppedText = useI18nFormatter('sortableList.dropped', 'Dropped. {{index}} of {{total}}.');
  private readonly cancelledText = readI18nText('sortableList.cancelled', 'Move cancelled.');

  /** Where the held row started. Escape puts it back there. */
  private grabOrigin = -1;

  /** True while a keyboard move is handing focus back — see `onRowFocusout`. */
  private restoringFocus = false;

  protected onDrop(event: CdkDragDrop<T[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const next = this.items().slice();
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.items.set(next);
    this.reorder.emit({
      items: next,
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
      item: next[event.currentIndex],
    });
  }

  /**
   * The keyboard reorder path: pick up, move, drop — deliberately a two-step
   * grab rather than "an arrow moves the focused row", so that arrowing through
   * a list a user is only reading can never rearrange it.
   *
   * Keys are handled only when the ROW itself is the event target; a button or
   * an input projected into the row template keeps every key it would normally
   * get.
   */
  /** @internal A row registering itself on construction. */
  register(item: { readonly host: ElementRef<HTMLElement> }): void {
    this.rows.push(item);
  }

  /**
   * @internal A row's position among its live siblings.
   *
   * Read off the DOM rather than off the registration order, because a row can
   * be added, removed or moved by the consumer's own loop and construction
   * order survives none of those. Rows whose element has left the document are
   * swept here, which is the only place that can tell.
   */
  indexOf(item: { readonly host: ElementRef<HTMLElement> }): number {
    for (let i = this.rows.length - 1; i >= 0; i -= 1) {
      if (!this.rows[i].host.nativeElement.isConnected) this.rows.splice(i, 1);
    }
    this.rows.sort((a, b) => (follows(a.host.nativeElement, b.host.nativeElement) ? -1 : 1));
    return this.rows.indexOf(item);
  }

  /** @internal */
  onRowKeydown(event: KeyboardEvent, index: number): void {
    if (this.disabled() || event.target !== event.currentTarget) return;

    const grabbed = this.grabbedIndex();
    const horizontal = this.orientation() === 'horizontal';
    // The horizontal arrows name a SIDE of the row, so they follow the reading
    // direction: a horizontal list under `dir="rtl"` paints index 0 at the right,
    // so the key that raises the index is ArrowLeft. Raising it on ArrowRight
    // regardless moved the held item away from the arrow the user pressed — the
    // one failure in this set a user cannot rationalise, because it inverts their
    // model of the list silently. The block arrows name a value's direction in a
    // column and never mirror, which is why only the horizontal pair is swapped.
    const rtl = horizontal && this.dir?.value === 'rtl';
    const forward = horizontal ? (rtl ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown';
    const back = horizontal ? (rtl ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp';

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (grabbed === null) this.grab(index);
      else this.drop();
      return;
    }

    if (grabbed === null) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      // Held only while a row is grabbed — an Escape typed anywhere else has to
      // keep reaching whatever dialog or overlay the list is sitting in.
      event.stopPropagation();
      this.cancelGrab();
      return;
    }

    if (event.key === forward || event.key === back) {
      event.preventDefault();
      this.moveGrabbed(event.key === forward ? 1 : -1);
    }
  }

  /**
   * Focus leaving a held row ends the gesture as a drop rather than dropping the
   * change on the floor — `[(items)]` has already been written by then, so a
   * silent release would leave `reorder` never reporting a move that happened.
   * The guard is what makes it safe: moving a focused node in the DOM blurs it,
   * so every keyboard move fires this too.
   */
  /** @internal */
  onRowFocusout(): void {
    if (this.restoringFocus || this.grabbedIndex() === null) return;
    this.drop();
  }

  private grab(index: number): void {
    this.grabOrigin = index;
    this.grabbedIndex.set(index);
    this.announcement.set(this.grabbedText(this.position(index)));
  }

  private moveGrabbed(delta: number): void {
    const from = this.grabbedIndex();
    if (from === null) return;
    const to = from + delta;
    if (to < 0 || to >= this.items().length) return;

    this.relocate(from, to);
    this.grabbedIndex.set(to);
    this.announcement.set(this.movedText(this.position(to)));
  }

  private drop(): void {
    const to = this.grabbedIndex();
    const from = this.grabOrigin;
    this.grabbedIndex.set(null);
    this.grabOrigin = -1;
    if (to === null) return;

    this.announcement.set(this.droppedText(this.position(to)));
    if (from === to) return;
    // One event per gesture, the way a drag emits one on drop — not one per
    // arrow press, which would put a host that persists on `reorder` through a
    // write per keystroke. `[(items)]` still updates on every press, because
    // the rendered order has to follow the row the user is moving.
    this.reorder.emit({ items: this.items(), previousIndex: from, currentIndex: to, item: this.items()[to] });
  }

  private cancelGrab(): void {
    const from = this.grabbedIndex();
    if (from === null) return;
    if (from !== this.grabOrigin) this.relocate(from, this.grabOrigin);
    this.grabbedIndex.set(null);
    this.grabOrigin = -1;
    this.announcement.set(this.cancelledText());
  }

  private relocate(from: number, to: number): void {
    const next = this.items().slice();
    moveItemInArray(next, from, to);
    this.items.set(next);

    // The row is the same DOM node moved to another slot, and moving a focused
    // node hands focus back to `<body>` — so it has to be taken again once the
    // move has rendered. `afterNextRender`, never a microtask: zoneless change
    // detection runs in a macrotask, so a microtask would fire while the row is
    // still at its old index and focus the wrong one. (jsdom keeps focus across
    // a node move, so no spec here can express that half.)
    this.restoringFocus = true;
    afterNextRender(
      () => {
        this.rows[to]?.host.nativeElement.focus();
        this.restoringFocus = false;
      },
      { injector: this.injector }
    );
  }

  private position(index: number): { index: number; total: number } {
    return { index: index + 1, total: this.items().length };
  }
}

export type { WrSortableReorderEvent } from './types';
