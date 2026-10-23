/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { IsActiveMatchOptions } from '@angular/router';

import type { WrIconName } from 'ngwr/icon';

/**
 * What `[routerLinkActiveOptions]` accepts: the short form, or any subset of the
 * router's own match options (`paths`, `queryParams`, `matrixParams`, `fragment`).
 */
export type WrSidebarActiveOptions = { readonly exact: boolean } | Partial<IsActiveMatchOptions>;

/**
 * The tone of a word badge: `neutral` for Optional and Soon, `primary` for New,
 * `danger` for Deprecated. The word carries the meaning; the tone only repeats it.
 */
export type WrSidebarBadgeTone = 'neutral' | 'primary' | 'danger';

/** A word on the line under the title (`New`, `Optional`, `Deprecated`). */
export interface WrSidebarBadge {
  readonly text: string;
  /** @default 'neutral' */
  readonly tone?: WrSidebarBadgeTone;
}

/** What every row can show, page or group. */
export interface WrSidebarRow {
  /** One line, cut with an ellipsis. The full text is the accessible name, and a tooltip when cut. */
  readonly title: string;
  /** One line under the title, cut with an ellipsis. Announced as the row's description. */
  readonly subtitle?: string;
  /** 16px icon before the title. Rows without one indent their children under the title's first letter. */
  readonly icon?: WrIconName;
  /** Word badge under the title. Part of the accessible name, after the title. */
  readonly badge?: WrSidebarBadge;
  /** Number at the end of the first line (`12`, `'99+'`). Part of the accessible name. */
  readonly count?: number | string;
  /**
   * What a screen reader hears for `count` (`'12 pages'`). ngwr has no plural
   * rules, so the app words it. @default the count itself
   */
  readonly countLabel?: string;
}

/** A page: one link. */
export interface WrSidebarItem extends WrSidebarRow {
  /** Router commands array, passed to `[routerLink]`. Empty renders plain text. */
  readonly url: readonly (string | number)[];
  /** Render as plain text, out of the tab order. A `badge` can say why (`Soon`). */
  readonly disabled?: boolean;
  /**
   * How the router decides this entry is the current page, in the shape of
   * `[routerLinkActiveOptions]`. The default matches a path PREFIX, so an entry
   * at `['/']` is current on every route; `{ exact: true }` is what a "Home"
   * entry wants. It decides the current row only: `autoExpand` finds the groups
   * holding the current route by the same prefix rule either way.
   *
   * @default { exact: false }
   */
  readonly activeOptions?: WrSidebarActiveOptions;
}

/** A group of entries that opens and closes. Groups nest, three levels deep at most. */
export interface WrSidebarGroup extends WrSidebarRow {
  readonly children: readonly WrSidebarEntry[];
  /**
   * Makes the group a page as well: the title links here and the arrow becomes a
   * button of its own. The group's link is current on an EXACT path match only,
   * since its children own the paths below it.
   */
  readonly url?: readonly (string | number)[];
  /** Open on first render. @default false */
  readonly defaultOpen?: boolean;
}

/** Either a page or a group. */
export type WrSidebarEntry = WrSidebarItem | WrSidebarGroup;
