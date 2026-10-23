/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-collapse>` a harness query matches. */
export interface WrCollapseHarnessFilters extends BaseHarnessFilters {
  /** Match the panel's header text — a string is an exact match, a RegExp is tested. */
  readonly title?: string | RegExp;
  /**
   * Match only open (`true`) or only closed (`false`) panels, as the HEADER announces
   * it — see `WrCollapseHarness.isOpen`, which is where the animated height is
   * explained away.
   */
  readonly open?: boolean;
  /** Match only enabled (`false`) or only disabled (`true`) panels. */
  readonly disabled?: boolean;
}

/** Narrows which `<wr-collapse-group>` / `<wr-accordion>` a harness query matches. */
export interface WrCollapseGroupHarnessFilters extends BaseHarnessFilters {
  /**
   * Match a group holding a panel with this header text — the readable way to tell two
   * groups on one page apart, a group having no name of its own. A string is an exact
   * match, a RegExp is tested.
   */
  readonly panelTitle?: string | RegExp;
  /**
   * Match a group whose OPEN panel has this header text; a group with everything closed
   * matches nothing. In accordion mode there is at most one open panel, which is what
   * makes this a way to address a group rather than a coin toss.
   */
  readonly openPanelTitle?: string | RegExp;
}
