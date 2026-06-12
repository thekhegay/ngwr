/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Any icon name registered via {@link provideWrIcons}.
 *
 * Kept as a string alias so consumers can pass any name they've wired
 * — there are no built-ins shipped by ngwr. Bring an icon set via one
 * of the adapters under `ngwr/icon/adapters/<set>` or via `svgIcon()`.
 */
export type WrIconName = string;
