/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrTypeahead } from 'ngwr/utils';

/** Open levels by their pane, so an item can find the level it was rendered in. */
const levels = new WeakMap<HTMLElement, WrDropdownLevel>();

/**
 * Type a letter to move to the next item of this pane that starts with it.
 *
 * On the pane and in the capture phase, so each level keeps its own run and a
 * Space that belongs to one ("save a" for "Save as") stops before the item's
 * own Space activates it. The listener goes with the pane.
 *
 * @returns the handler, for a key typed on the trigger while focus is still there.
 */
function listenForTypeahead(pane: HTMLElement, locale?: () => string | undefined): (event: KeyboardEvent) => void {
  const typeahead = wrTypeahead({ locale });
  const onKeydown = (event: KeyboardEvent): void => {
    const items = wrDropdownItems(pane);
    const index = typeahead.handleKey(
      event,
      items.map(item => item.textContent),
      items.indexOf(document.activeElement as HTMLElement)
    );
    if (index === null) return;
    event.preventDefault();
    if (event.key === ' ') event.stopPropagation();
    items[index]?.focus();
  };
  pane.addEventListener('keydown', onKeydown, true);
  return onKeydown;
}

/**
 * One open menu of a dropdown: the root, or a submenu hanging off an item.
 *
 * Every level is its own overlay pane, a sibling of the others in the overlay
 * container, so neither the DOM nor the injector tree says which pane opened
 * which. This is that link.
 *
 * @internal
 */
export interface WrDropdownLevel {
  readonly pane: HTMLElement;
  /** `null` on the root menu. */
  readonly parent: WrDropdownLevel | null;
  /** The submenu open from one of this pane's items. */
  child: WrDropdownLevel | null;
  /** Close this level and every level below it. */
  close(): void;
  /** Root only: the pointer left a pane below for `related`. */
  pointerLeft?(related: EventTarget | null): void;
}

/**
 * `locale` is the interface language, for the type-ahead's case folding.
 *
 * @returns the level's type-ahead, to feed a key typed outside its pane.
 * @internal
 */
export function wrDropdownRegisterLevel(
  level: WrDropdownLevel,
  locale?: () => string | undefined
): (event: KeyboardEvent) => void {
  levels.set(level.pane, level);
  if (level.parent) level.parent.child = level;
  return listenForTypeahead(level.pane, locale);
}

/** @internal */
export function wrDropdownReleaseLevel(level: WrDropdownLevel): void {
  levels.delete(level.pane);
  if (level.parent?.child === level) level.parent.child = null;
}

/** The open level `el` is rendered in. @internal */
export function wrDropdownLevelAround(el: HTMLElement): WrDropdownLevel | null {
  const pane = el.closest<HTMLElement>('.wr-dropdown-overlay');
  return (pane && levels.get(pane)) ?? null;
}

/** The level at or below `from` whose pane holds `node`. @internal */
export function wrDropdownLevelOf(from: WrDropdownLevel, node: unknown): WrDropdownLevel | null {
  if (!(node instanceof Node)) return null;
  for (let level: WrDropdownLevel | null = from; level; level = level.child) {
    if (level.pane.contains(node)) return level;
  }
  return null;
}

/** The focus stops of one pane. A disabled item is not one. @internal */
export function wrDropdownItems(pane: HTMLElement): HTMLElement[] {
  return Array.from(pane.querySelectorAll<HTMLElement>('.wr-dropdown-item:not(.wr-dropdown-item--disabled)'));
}
