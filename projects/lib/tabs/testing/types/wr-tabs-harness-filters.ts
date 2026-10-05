/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/**
 * The sizes a strip renders — the `size` input as the host actually paints it.
 *
 * `md` is the default and carries no modifier class, so it is read as the ABSENCE
 * of the other two. `<wr-tabs>` resolves this input on its own rather than through
 * `provideWrConfig()`, so what the harness reports and what the consumer wrote are
 * the same thing here.
 */
export type WrTabsHarnessSize = 'sm' | 'md' | 'lg';

/** Narrows which `<wr-tabs>` a harness query matches. */
export interface WrTabsHarnessFilters extends BaseHarnessFilters {
  /**
   * Match a strip that offers a tab with this label — a string is an exact match,
   * a RegExp is tested. Any of its tabs, not the selected one; see `selectedLabel`.
   */
  readonly tabLabel?: string | RegExp;
  /**
   * Match the label of the SELECTED tab — a string is an exact match, a RegExp is
   * tested. A strip with no selected tab (a router strip whose route matches none
   * of them) never matches.
   */
  readonly selectedLabel?: string | RegExp;
  /** Match the size the strip renders at. */
  readonly size?: WrTabsHarnessSize;
  /**
   * Match only router strips (`true`) or only content strips (`false`).
   *
   * One `routerLink` anywhere in the strip switches the whole thing over, so this
   * is a property of the strip and not of one tab.
   */
  readonly router?: boolean;
}

/**
 * Narrows which tab of a `<wr-tabs>` strip a harness query matches.
 *
 * Tabs are addressed by their LABEL rather than by their `key`: the key names the
 * tab in the `active` model and reaches the DOM only buried inside the generated
 * header and panel ids, and a tab that never set one carries a random id instead.
 */
export interface WrTabHarnessFilters extends BaseHarnessFilters {
  /** Match the tab's visible label — a string is an exact match, a RegExp is tested. */
  readonly label?: string | RegExp;
  /** Match only the selected tab (`true`) or only the others (`false`). */
  readonly selected?: boolean;
  /** Match only disabled (`true`) or only enabled (`false`) tabs. */
  readonly disabled?: boolean;
}
