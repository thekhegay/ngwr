/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/**
 * Which way the bright stripe travels. Mirrors the component's `direction` input, which
 * declares the union inline and exports no name for it.
 */
export type WrShinyTextSweepDirection = 'left' | 'right';

/** Narrows which `<wr-shiny-text>` a harness query matches. */
export interface WrShinyTextHarnessFilters extends BaseHarnessFilters {
  /** Match the rendered text — a string is an exact match, a RegExp is tested. */
  readonly text?: string | RegExp;
  /**
   * Match only the stopped (`true`) or only the running (`false`) instances. Named for the
   * DOM contract rather than for the input: `[disabled]` writes `wr-shiny-text--paused`.
   */
  readonly paused?: boolean;
  /** Match the sweep direction — `'left'` is the absence of the reverse modifier. */
  readonly direction?: WrShinyTextSweepDirection;
}
