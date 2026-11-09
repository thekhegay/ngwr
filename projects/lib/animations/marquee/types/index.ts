/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** One entry of the row: the text it shows and the URL it opens. */
interface WrMarqueeItem {
  readonly title: string;
  readonly url: string;
}

/** What a projected item template receives: the item as `$implicit`, so `let-item` names it. */
interface WrMarqueeItemContext {
  readonly $implicit: WrMarqueeItem;
}

export type { WrMarqueeItem, WrMarqueeItemContext };
