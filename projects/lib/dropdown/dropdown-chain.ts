/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Open levels by their pane, so an item can find the level it was rendered in. */
const levels = new WeakMap<HTMLElement, WrDropdownLevel>();

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

/** @internal */
export function wrDropdownRegisterLevel(level: WrDropdownLevel): void {
  levels.set(level.pane, level);
  if (level.parent) level.parent.child = level;
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
