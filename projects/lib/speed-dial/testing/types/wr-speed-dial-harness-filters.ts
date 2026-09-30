/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

import type { WrSpeedDialDirection } from 'ngwr/speed-dial';

/** Narrows which `<wr-speed-dial>` a harness query matches. */
export interface WrSpeedDialHarnessFilters extends BaseHarnessFilters {
  /** Match the trigger's accessible name — a string is an exact match, a RegExp is tested. */
  readonly triggerLabel?: string | RegExp;
  /** Match the direction the actions fan out. */
  readonly direction?: WrSpeedDialDirection;
  /** Match only open (`true`) or only closed (`false`) dials. */
  readonly open?: boolean;
  /** Match only enabled (`false`) or only disabled (`true`) dials. */
  readonly disabled?: boolean;
}

/** Narrows which action inside a speed dial a harness query matches. */
export interface WrSpeedDialActionHarnessFilters extends BaseHarnessFilters {
  /** Match the action's accessible name — a string is an exact match, a RegExp is tested. */
  readonly label?: string | RegExp;
  /** Match only enabled (`false`) or only disabled (`true`) actions. */
  readonly disabled?: boolean;
}
