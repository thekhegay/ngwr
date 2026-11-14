/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrTypeahead } from 'ngwr/utils';

/**
 * Roving focus inside ONE context-menu pane.
 *
 * The APG menu pattern makes a menu a single tab stop and moves a focus cursor
 * between its rows with the arrows — which is why every `<wr-context-menu-item>`
 * carries `tabindex="-1"`. Shared by the root directive and by
 * `WrContextMenuItem`'s submenu because a submenu is a SEPARATE overlay pane
 * rather than nested DOM: each pane roves over its own rows, and CDK's keyboard
 * dispatcher hands the key to the topmost one, which is the pane the user is in.
 *
 * @internal
 */

/**
 * The rows of one pane the cursor may land on. Disabled rows are not stops —
 * the same rule `WrDropdown` follows.
 */
export function wrMenuItems(pane: HTMLElement): readonly HTMLElement[] {
  return Array.from(pane.querySelectorAll<HTMLElement>('.wr-context-menu-item:not(.wr-context-menu-item--disabled)'));
}

/** Focus the row at `index`, wrapping at both ends. A pane with no rows is left alone. */
export function wrFocusMenuItemAt(pane: HTMLElement, index: number): void {
  const items = wrMenuItems(pane);
  if (items.length === 0) return;
  const clamped = ((index % items.length) + items.length) % items.length;
  items[clamped]?.focus();
}

/**
 * ArrowDown / ArrowUp / Home / End over one pane's rows. Returns `true` when the
 * key was consumed, so a caller can leave every other key alone.
 */
export function wrHandleMenuNavigation(pane: HTMLElement, event: KeyboardEvent): boolean {
  const items = wrMenuItems(pane);
  if (items.length === 0) return false;
  const active = document.activeElement;
  // -1 when the keyboard is not on a row yet, which makes ArrowDown open at the
  // first row and ArrowUp at the last.
  const index = active instanceof HTMLElement ? items.indexOf(active) : -1;
  switch (event.key) {
    case 'ArrowDown':
      wrFocusMenuItemAt(pane, index + 1);
      break;
    case 'ArrowUp':
      wrFocusMenuItemAt(pane, index <= 0 ? items.length - 1 : index - 1);
      break;
    case 'Home':
      wrFocusMenuItemAt(pane, 0);
      break;
    case 'End':
      wrFocusMenuItemAt(pane, items.length - 1);
      break;
    default:
      return false;
  }
  event.preventDefault();
  return true;
}

/**
 * Type a letter to move to the next row of `pane` that starts with it.
 *
 * A listener on the pane, in the capture phase, rather than a branch of
 * {@link wrHandleMenuNavigation}: each pane keeps its own run, and a Space that
 * belongs to one ("save a" for "Save as") stops before the row's own Space
 * activates it. The listener goes with the pane. `locale` is the interface
 * language, for the case folding.
 */
export function wrListenForMenuTypeahead(pane: HTMLElement, locale?: () => string | undefined): void {
  const typeahead = wrTypeahead({ locale });
  pane.addEventListener(
    'keydown',
    event => {
      const items = wrMenuItems(pane);
      const index = typeahead.handleKey(
        event,
        items.map(item => item.querySelector('.wr-context-menu-item__label')?.textContent ?? ''),
        items.indexOf(document.activeElement as HTMLElement)
      );
      if (index === null) return;
      event.preventDefault();
      if (event.key === ' ') event.stopPropagation();
      items[index]?.focus();
    },
    true
  );
}
