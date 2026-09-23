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

/** A single navigable entry. */
export interface WrSidebarItem {
  readonly title: string;
  /** Router commands array — passed to `[routerLink]`. */
  readonly url: readonly (string | number)[];
  readonly icon?: WrIconName;
  /** Optional trailing badge text (e.g. `'new'`, `'12'`). */
  readonly badge?: string;
  /** Render as disabled (no navigation). */
  readonly disabled?: boolean;
  /**
   * How the router decides this entry is active — the value of
   * `[routerLinkActiveOptions]`. The default matches a path PREFIX, so an entry at
   * `['/']` is active on every route; `{ exact: true }` is what a "Home" entry
   * wants. It decides the active class only: `autoExpand` finds the group holding
   * the current route by the same prefix rule either way.
   *
   * @default { exact: false }
   */
  readonly activeOptions?: WrSidebarActiveOptions;
}

/** Expandable group of items. */
export interface WrSidebarGroup {
  readonly title: string;
  readonly icon?: WrIconName;
  readonly children: readonly WrSidebarItem[];
  /** Open by default. @default false */
  readonly defaultOpen?: boolean;
}

/** Either a direct-link item or an expandable group. */
export type WrSidebarEntry = WrSidebarItem | WrSidebarGroup;
