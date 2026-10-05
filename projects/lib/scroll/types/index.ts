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

/** Options accepted by {@link WrScroll} scroll methods. */
export interface WrScrollOptions {
  /**
   * Pixel offset to subtract from the resolved target position — handy for
   * sticky headers. No effect on `toTop()`, where the target is already 0 and
   * the browser clamps a negative position back to the top.
   *
   * @default 0
   */
  readonly offset?: number;
  /** Smooth or instant scrolling. @default true (smooth) */
  readonly smooth?: boolean;
  /**
   * Scroll container. `window` (default) means the document; pass an
   * `Element` to scroll a nested overflow container instead.
   */
  readonly container?: Window | Element;
}
