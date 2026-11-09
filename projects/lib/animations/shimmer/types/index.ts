/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Where the host is in its cycle, as the modifier on it says: `first` and
 * `rest` run the silent wait for the delay and the pause, `pass` runs the
 * band. No modifier is off: nothing animates.
 */
type WrShimmerState = 'first' | 'pass' | 'rest';

export type { WrShimmerState };
