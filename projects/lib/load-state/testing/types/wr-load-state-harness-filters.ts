/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

import type { WrLoadStateStatus } from 'ngwr/load-state';

/** Narrows which `<wr-load-state>` a harness query matches. */
export interface WrLoadStateHarnessFilters extends BaseHarnessFilters {
  /** Match only wrappers drawing this state, as the host's modifier class announces it. */
  readonly state?: WrLoadStateStatus;
}
