/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The same 24×24 stroked ✕ the rest of the library's chrome draws (alert, toast,
 * lightbox). Static markup — the caller's label goes on via `setAttribute`, so
 * nothing from a catalog or a consumer is ever parsed as HTML.
 */
const CLOSE_ICON =
  '<svg class="wr-icon__svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"' +
  ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>';

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
  button.innerHTML = CLOSE_ICON;
  button.addEventListener('click', onClose);
  host.appendChild(button);
  return button;
}
