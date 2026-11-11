/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrStaggerBy } from '../../internal';

/** What one animated piece of the text is: a word, or a grapheme. */
type WrRevealBy = WrStaggerBy;

/** When the pieces start: at first paint, or the first time the host is in view. */
type WrRevealTrigger = 'load' | 'view';

export type { WrRevealBy, WrRevealTrigger };
