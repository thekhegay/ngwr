/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrStaggerBy } from 'ngwr/animations/core';

/** What one animated piece of the text is: a word, or a grapheme. */
type WrBlurRevealBy = WrStaggerBy;

/** The side a piece settles in from. */
type WrBlurRevealFrom = 'below' | 'above';

export type { WrBlurRevealBy, WrBlurRevealFrom };
