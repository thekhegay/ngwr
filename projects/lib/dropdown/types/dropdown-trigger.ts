/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * How the dropdown menu is opened. `manual` attaches no open listener to the
 * host: the menu opens only through `open()`, `close()` and `toggle()`, and
 * closes on Escape, an outside click and an item like the others.
 */
export type WrDropdownTrigger = 'click' | 'hover' | 'manual';
