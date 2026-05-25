/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrIconName } from 'ngwr/icon';

/** A single action / page entry in {@link WrCommandPaletteComponent}. */
export type WrCommandItem = {
  /** Stable identifier — used for `track $index` and option focus. */
  readonly id: string;
  /** Primary visible label. */
  readonly label: string;
  /** Secondary text shown under the label. */
  readonly description?: string;
  /** Optional group title (items with the same group are bucketed). */
  readonly group?: string;
  /** Optional icon shown on the left. */
  readonly icon?: WrIconName;
  /** Extra search terms — added to the haystack alongside label + description. */
  readonly keywords?: readonly string[];
  /** Visual hint shown on the right (e.g. `'⌘K'`, `'G H'`). */
  readonly shortcut?: string;
  /** Imperative callback fired when this item is picked. */
  readonly action?: () => void;
};

/** Flat list of items grouped under a single header — convenience type. */
export type WrCommandGroup = {
  readonly title: string;
  readonly items: readonly WrCommandItem[];
};
