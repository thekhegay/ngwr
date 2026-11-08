/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** When the text decodes: once, the first time most of the host is in view, or on every hover and focus. */
type WrDecodeTrigger = 'view' | 'hover';

/** The shape a slot's random glyphs keep: that of its real character. */
type WrDecodeShape = 'upper' | 'lower' | 'digit' | 'symbol';

export type { WrDecodeShape, WrDecodeTrigger };
