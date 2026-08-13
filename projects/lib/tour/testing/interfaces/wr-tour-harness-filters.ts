/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which tour popup a harness query matches. */
export interface WrTourHarnessFilters extends BaseHarnessFilters {
  /** Match the step's heading — a string is an exact match, a RegExp is tested. */
  readonly title?: string | RegExp;
  /** Match the step's body copy. */
  readonly content?: string | RegExp;
}

/** Which step of how many, as the popup prints it. */
export interface WrTourProgress {
  /** One-based, the way the card counts. */
  readonly current: number;
  /** How many steps the tour was STARTED with — not how many it will show. */
  readonly total: number;
}
