/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-stepper>` a harness query matches. */
export interface WrStepperHarnessFilters extends BaseHarnessFilters {
  /**
   * Match a stepper that renders a step with this label — the readable way to tell
   * two wizards on one page apart. A string is an exact match, a RegExp is tested.
   */
  readonly stepLabel?: string | RegExp;
  /**
   * Match the layout direction the stepper was ASKED for. A `responsive` horizontal
   * stepper still matches `'horizontal'` while it lays itself out vertically — see
   * `WrStepperHarness.getOrientation()`.
   */
  readonly orientation?: 'horizontal' | 'vertical';
  /** Match only linear (`true`) or only freely navigable (`false`) steppers. */
  readonly linear?: boolean;
}

/** Narrows which step of a `<wr-stepper>` a harness query matches. */
export interface WrStepHarnessFilters extends BaseHarnessFilters {
  /** Match the step's label — a string is an exact match, a RegExp is tested. */
  readonly label?: string | RegExp;
  /** Match the step the wizard is showing — the one header announcing `aria-current="step"`. */
  readonly active?: boolean;
  /**
   * Match steps shown as done. Completion is normally derived (everything before the
   * active step), but a step's own `completed` input overrides it, so a step AFTER
   * the active one can match too.
   */
  readonly completed?: boolean;
  /**
   * Match steps switched off by their own `disabled` input. A step merely locked by
   * `linear` is not disabled — it is unreachable, which is `reachable: false`.
   */
  readonly disabled?: boolean;
  /**
   * Match steps whose header accepts a click right now, which is also exactly the
   * set of headers a Tab press can reach.
   */
  readonly reachable?: boolean;
  /** Match steps flagged `optional` in the header. */
  readonly optional?: boolean;
}
