/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The same 24×24 stroked ✕ the rest of the library's chrome draws (alert, toast, lightbox). */
const CLOSE_ICON_ATTRS: readonly (readonly [string, string])[] = [
  ['class', 'wr-icon__svg'],
  ['viewBox', '0 0 24 24'],
  ['fill', 'none'],
  ['stroke', 'currentColor'],
  ['stroke-width', '2'],
  ['stroke-linecap', 'round'],
  ['stroke-linejoin', 'round'],
  ['aria-hidden', 'true'],
];
const CLOSE_ICON_PATHS: readonly string[] = ['M18 6 6 18', 'm6 6 12 12'];

/**
 * Builds the ✕ node by node.
 *
 * It was one `innerHTML = CLOSE_ICON`, and the string was a compile-time
 * constant, so it was never an injection risk — it was an AVAILABILITY one.
 * Under `require-trusted-types-for 'script'` an `innerHTML` write throws
 * `TrustedHTML assignment` whatever the string is, and the throw landed after
 * the overlay was on screen: a modal with no ✕, no backdrop subscription and no
 * Escape handler, over the whole application. `createElementNS` is not a
 * Trusted Types sink, so there is nothing left to police.
 */
function createCloseIcon(doc: Document): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  // `setAttribute`, not `.className` — on an SVG element that property is an
  // `SVGAnimatedString` and assigning a string to it silently does nothing.
  for (const [name, value] of CLOSE_ICON_ATTRS) svg.setAttribute(name, value);
  for (const d of CLOSE_ICON_PATHS) {
    const path = doc.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

/**
 * Appends a dismiss (✕) button to a service-opened overlay panel.
 *
 * `WrDialog` and `WrDrawerManager` build their panel around a component the
 * consumer supplies, so there is no template of their own to put a corner button
 * in — they call this instead. Component-driven overlays (`<wr-drawer>`) render
 * the same markup in their template.
 *
 * Uses `host.ownerDocument` rather than the global `document`, so it carries no
 * hidden browser-only assumption; callers still gate on the platform because
 * they have nothing to append to on the server.
 *
 * @param host Panel element the button is appended to (and positioned against).
 * @param className BEM class for the button, e.g. `wr-dialog__close`.
 * @param label Accessible name — already localized by the caller.
 * @param onClose Invoked on click.
 */
export function wrAppendOverlayClose(
  host: HTMLElement,
  className: string,
  label: string,
  onClose: () => void
): HTMLButtonElement {
  const button = host.ownerDocument.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', label);
  button.appendChild(createCloseIcon(host.ownerDocument));
  button.addEventListener('click', onClose);
  host.appendChild(button);
  return button;
}
