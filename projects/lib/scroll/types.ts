/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * What to scroll to — an `Element`, an `id` string (looked up via
 * `getElementById`), an arbitrary CSS selector, or absolute coordinates.
 */
export type WrScrollTarget = Element | string | { top: number; left?: number };

/** Options accepted by {@link WrScrollService} scroll methods. */
export type WrScrollOptions = {
  /** Pixel offset to subtract from the target — handy for sticky headers. @default 0 */
  readonly offset?: number;
  /** Smooth or instant scrolling. @default true (smooth) */
  readonly smooth?: boolean;
  /**
   * Scroll container. `window` (default) means the document; pass an
   * `Element` to scroll a nested overflow container instead.
   */
  readonly container?: Window | Element;
};
