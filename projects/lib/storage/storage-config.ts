/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrStorageConfigResolved } from './interfaces';

export const DEFAULT_WR_STORAGE_CONFIG: WrStorageConfigResolved = {
  prefix: '',
  json: true,
  ttl: 0,
};

export const WR_STORAGE_CONFIG = new InjectionToken<WrStorageConfigResolved>('WR_STORAGE_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_WR_STORAGE_CONFIG,
});

export type { WrStorageConfig, WrStorageConfigResolved } from './interfaces';
