/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/**
 * The alignments `<wr-split-text>` takes.
 *
 * Restated here because the component declares the union inline on its `textAlign`
 * input and exports no name for it — a filter typed `string` would take a value the
 * component cannot produce and then quietly match nothing.
 */
export type WrSplitTextHarnessAlign = 'left' | 'center' | 'right' | 'justify';

/** Narrows which `<wr-split-text>` a harness query matches. */
export interface WrSplitTextHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the string the component announces — the readable copy, not the pieces.
   * A string is an exact match, a RegExp is tested.
   *
   * Against the accessible copy rather than the host's own text, which holds the
   * string twice: once readably and once as a span per character.
   */
  readonly text?: string | RegExp;
  /**
   * Match on how many animated pieces the split produced — one per character, or one
   * per word. The only number about the animation that reaches the DOM.
   */
  readonly pieceCount?: number;
  /**
   * Match on the alignment the host was given.
   *
   * The most useful of the three in practice: a page usually carries several of these
   * and alignment is what tells a centred hero from a left-aligned caption, whereas
   * their text is the thing a spec is usually trying not to hard-code.
   */
  readonly textAlign?: WrSplitTextHarnessAlign;
}
