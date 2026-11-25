/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Sets an attribute, or removes it for `null`, `undefined` and an empty string, touching the DOM only when the
 * value differs from the current one.
 *
 * @internal
 */
export function wrSetAttribute(el: Element, name: string, value: string | null | undefined): void {
  const next = value === undefined || value === '' ? null : value;
  if (el.getAttribute(name) === next) return;
  if (next === null) el.removeAttribute(name);
  else el.setAttribute(name, next);
}
