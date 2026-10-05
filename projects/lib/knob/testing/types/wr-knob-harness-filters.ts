/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/**
 * An arrow key, by the direction a user would say out loud — the parameter type
 * of `WrKnobHarness.pressArrow`, exported so a consumer's own test helper can name
 * what it forwards.
 */
export type WrKnobArrowKey = 'left' | 'right' | 'up' | 'down';

/** Narrows which `<wr-knob>` a harness query matches. */
export interface WrKnobHarnessFilters extends BaseHarnessFilters {
  /** Match the dial's accessible name — a string is an exact match, a RegExp is tested. */
  readonly label?: string | RegExp;
  /** Match the current value, as `aria-valuenow` reports it. */
  readonly value?: number;
  /** Match only enabled (`false`) or only disabled (`true`) dials. */
  readonly disabled?: boolean;
  /** Match only writable (`false`) or only read-only (`true`) dials. */
  readonly readonly?: boolean;
}
