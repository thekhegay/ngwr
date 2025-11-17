/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Avatar size type.
 *
 * Supported formats:
 * - number        → pixels            (e.g. 48     → 48px)
 * - `${number}`   → pixels as string  (e.g. "48"   → 48px)
 * - `${number}px` → pixels            (e.g. "48px" → 48px)
 * - `${number}rem`→ rems              (e.g. "3rem" → 3 × root font size)
 *
 * Percentage values like "80%" or "100%" are intentionally NOT supported.
 */
export type WrAvatarSize = number | `${number}` | `${number}px` | `${number}rem`;
