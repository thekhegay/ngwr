/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

/** Density scale. Components multiply their paddings by the matching multiplier. */
export type WrDensityValue = 'compact' | 'default' | 'comfortable';

/** Configuration for {@link WrDensityValueService}. */
export interface WrDensityConfig {
  /** Initial density used when no persisted value is present. @default 'default' */
  readonly defaultDensity: WrDensityValue;
  /** Storage key for persistence (via `WrStorage`). Set to `null` to disable. @default 'wr-density' */
  readonly storageKey: string | null;
  /** Attribute written to `<html>` to expose the active density. @default 'data-wr-density' */
  readonly attribute: string;
}

export const DEFAULT_WR_DENSITY_CONFIG: WrDensityConfig = {
  defaultDensity: 'default',
  storageKey: 'wr-density',
  attribute: 'data-wr-density',
};

export const WR_DENSITY_CONFIG = new InjectionToken<WrDensityConfig>('WR_DENSITY_CONFIG', {
  factory: (): WrDensityConfig => DEFAULT_WR_DENSITY_CONFIG,
});
