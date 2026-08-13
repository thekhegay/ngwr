/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Which set of numeric fields the picker is showing. */
export type WrColorPickerTab = 'hex' | 'rgb' | 'hsl';

/** Narrows which `<wr-color-picker>` a harness query matches. */
export interface WrColorPickerHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the picker's current colour, as the preview swatch paints it — always
   * hex, whatever `format` writes into `value`. A string is an exact match, a
   * RegExp is tested.
   */
  readonly color?: string | RegExp;
  /** Match only pickers showing this tab. */
  readonly tab?: WrColorPickerTab;
  /** Match only enabled (`false`) or only disabled (`true`) pickers. */
  readonly disabled?: boolean;
}

/** Narrows which `[wrColorPickerTrigger]` a harness query matches. */
export interface WrColorPickerTriggerHarnessFilters extends BaseHarnessFilters {
  /** Match the trigger's own text, an exact string or a RegExp. */
  readonly text?: string | RegExp;
  /** Match only open (`true`) or only closed (`false`) triggers. */
  readonly open?: boolean;
}

/** The percentage each of the picker's thumbs sits at along its surface. */
export interface WrColorPickerThumbs {
  /** Saturation across, value down — both 0–100, and `y` is inverted (0 % is full brightness). */
  readonly sv: { readonly x: number; readonly y: number };
  /** Hue along its slider, 0–100 (so 50 is 180°). */
  readonly hue: number;
  /** Alpha along its slider, 0–100, or `null` when the picker has no alpha. */
  readonly alpha: number | null;
}
