/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrIconDef } from '../interfaces';

const VIEW_BOX_RE = /<svg\b[^>]*\bviewBox\s*=/i;
const SVG_ROOT_RE = /<svg\b/i;

/**
 * Dev-mode sanity check for a registered icon.
 *
 * Warns about issues that prevent correct rendering — most importantly,
 * a missing `viewBox`, which causes the SVG not to scale to the icon
 * host's size.
 *
 * Production builds drop the call entirely via `isDevMode()` tree-shaking.
 *
 * @internal
 */
export function validateIcon(icon: WrIconDef): void {
  if (!SVG_ROOT_RE.test(icon.data)) {
    // eslint-disable-next-line no-console -- dev-mode validation
    console.warn(
      `[NGWR] Icon "${icon.name}" data does not contain an <svg> root element. ` +
        `Custom icons must be valid SVG markup.`
    );
    return;
  }

  if (!VIEW_BOX_RE.test(icon.data)) {
    // eslint-disable-next-line no-console -- dev-mode validation
    console.warn(
      `[NGWR] Icon "${icon.name}" has no viewBox attribute — it won't scale ` +
        `to the host size. Add viewBox="0 0 W H" to the <svg> root.`
    );
  }
}
