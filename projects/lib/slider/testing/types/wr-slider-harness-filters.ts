/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

import type { WrSliderValue } from 'ngwr/slider';

/** Which end of a range slider a thumb is — the `--low` / `--high` modifier it carries. */
export type WrSliderThumbPosition = 'low' | 'high';

/** Narrows which `<wr-slider>` a harness query matches. */
export interface WrSliderHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the current value, in the shape the model uses: a plain number for a
   * single-thumb slider, `[low, high]` for a range one. Compared element-wise,
   * so a tuple never matches a single-thumb slider and a number never matches a
   * range one.
   */
  readonly value?: WrSliderValue;
  /** Match only dual-thumb (`true`) or only single-thumb (`false`) sliders. */
  readonly range?: boolean;
  /** Match only disabled (`true`) or only enabled (`false`) sliders. */
  readonly disabled?: boolean;
  /**
   * Match the text the slider prints under its track — a string is an exact
   * match, a RegExp is tested. A slider with `showLabel="false"` prints none and
   * never matches.
   */
  readonly labelText?: string | RegExp;
}

/** Narrows which thumb of a `<wr-slider>` a harness query matches. */
export interface WrSliderThumbHarnessFilters extends BaseHarnessFilters {
  /** Match one end of a range slider. A single-thumb slider only has a `'low'`. */
  readonly position?: WrSliderThumbPosition;
  /** Match a thumb standing on exactly this value (`aria-valuenow`). */
  readonly value?: number;
  /**
   * Match the thumb's accessible name — `'Value'` on a single-thumb slider,
   * `'Lower value'` / `'Upper value'` on a range one. A string is an exact
   * match, a RegExp is tested.
   */
  readonly label?: string | RegExp;
}
