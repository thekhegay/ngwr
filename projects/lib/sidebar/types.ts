/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrIconName } from 'ngwr/icon';

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
