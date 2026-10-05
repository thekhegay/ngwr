/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ElementRef, Signal } from '@angular/core';

/**
 * Contract a `<wr-sortable-item>` uses to talk to its parent list.
 *
 * The row owns nothing but its own position: the array, the keyboard gesture
 * and the live region all live on the list, and every method here delegates
 * to it.
 *
 * @internal
 */
export interface WrSortableListContext {
  /** Whether dragging is off for the whole list. */
  readonly disabled: Signal<boolean>;

  /** Axis lock, or `undefined` for free movement. */
  readonly lockAxis: Signal<'x' | 'y' | undefined>;

  /** Delay before a drag begins, per pointer type. */
  readonly dragStartDelay: Signal<number | { touch: number; mouse: number }>;

  /** Index of the row the keyboard is holding, or `null`. */
  readonly grabbedIndex: Signal<number | null>;

  /** Id of the shared key-model description every row points at. */
  readonly keyHelpId: string;

  /**
   * How many rows the list is showing, as a signal.
   *
   * A row's `index` is resolved by DOCUMENT ORDER, which touches no signal —
   * so the `computed` wrapping it had no producer and was cached for the life
   * of the row. This is the producer: the list owns `items` as a `model`, so
   * every reorder, insertion and removal goes through it, which is exactly
   * when a position can change.
   */
  readonly rowCount: Signal<number>;

  /** Register a row on construction, in projection order. */
  register(item: { readonly host: ElementRef<HTMLElement> }): void;

  /** Where a row sits among its siblings, which is its index into `items()`. */
  indexOf(item: { readonly host: ElementRef<HTMLElement> }): number;

  /** Key handling for a row — pick up, move, drop, cancel. */
  onRowKeydown(event: KeyboardEvent, index: number): void;

  /** A held row losing focus ends the gesture as a drop. */
  onRowFocusout(): void;
}
