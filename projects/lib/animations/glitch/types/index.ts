/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Where the target is in its cycle. `wait` is the quiet between bursts, where a
 * hover or focus may bring the next one forward; `burst` is the glitch itself;
 * `cool` is the first second after a burst, where nothing may start one. `null`
 * is off: nothing is scheduled and the target holds no copy.
 */
type WrGlitchState = 'wait' | 'burst' | 'cool';

export type { WrGlitchState };
