/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Where the text is. `fall` is from the click to the last letter settling on
 * the heap; `rest` is the heap lying still until a click or the rest timer;
 * `return` is the flight back to the line. `idle` is plain text: no piece, no
 * frame, no timer.
 */
type WrFallingLettersState = 'idle' | 'fall' | 'rest' | 'return';

export type { WrFallingLettersState };
