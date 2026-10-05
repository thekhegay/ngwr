/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Extra CSS classes a consumer hands to a part ngwr renders itself — an overlay
 * pane, a toast, a table cell.
 *
 * A space-separated string is the common case (`'p-4 rounded-xl'`), an array is
 * accepted for a list built in TypeScript, and `null` / `undefined` mean "add
 * nothing", so a `[panelClass]` bound to a signal that is not ready yet is not a
 * special case at the call site.
 *
 * Deliberately NOT the full shape Angular's own `[class]` binding takes: a
 * record and a `Set` are missing because half of these values are handed to the
 * CDK for an overlay pane rather than bound to an element, and a conditional
 * belongs in the `computed()` that produces the value.
 *
 * @see {@link toClassList} — normalises one into the token array both paths need.
 */
export type WrClassInput = string | readonly string[] | null | undefined;
