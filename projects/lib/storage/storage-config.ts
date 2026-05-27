/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

/** {@link WrStorage} configuration. Pass partial — merged with defaults. */
export interface WrStorageConfig {
  /**
   * Prefix prepended to every key on read / write. Keeps your app's keys
   * from colliding with third-party libs sharing the same storage.
   * @default ''
   */
  readonly prefix?: string;
  /**
   * Auto JSON-(de)serialize values. Disable to store / read raw strings
   * verbatim (useful when interop with non-ngwr code).
   * @default true
   */
  readonly json?: boolean;
  /**
   * Default TTL in milliseconds applied to every `set()` without a
   * per-call override. `0` means no expiry.
   * @default 0
   */
  readonly ttl?: number;
}

/** Fully-resolved config (all defaults filled). @internal */
export type WrStorageConfigResolved = Required<WrStorageConfig>;

export const DEFAULT_WR_STORAGE_CONFIG: WrStorageConfigResolved = {
  prefix: '',
  json: true,
  ttl: 0,
};

export const WR_STORAGE_CONFIG = new InjectionToken<WrStorageConfigResolved>('WR_STORAGE_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_WR_STORAGE_CONFIG,
});
