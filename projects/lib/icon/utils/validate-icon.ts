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
 * Dev-mode sanity check for a registered icon — a **rendering** check, and
 * explicitly not a security control.
 *
 * It warns about the two things that make an icon come out wrong: no `<svg>`
 * root, and no `viewBox`, which stops the glyph scaling to the host. It reads
 * the string with two regexes and cannot tell a shape from a script — every
 * payload in the icon corpus passes it, because each one does carry an `<svg>`
 * root with a `viewBox`. It also runs only under `isDevMode()`, so it is absent
 * from the build an attacker would meet.
 *
 * What actually keeps hostile markup out of the DOM is {@link sanitizeIcon},
 * which runs on every render in every build: `<wr-icon>` rebuilds the glyph
 * from an allowlist instead of assigning to `innerHTML`. Anything this function
 * would have to reject is already gone by then, and the component says so in
 * dev mode when it drops something.
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
