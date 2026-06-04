/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type EnvironmentProviders, type Provider, makeEnvironmentProviders } from '@angular/core';

import {
  DEFAULT_WR_STORAGE_CONFIG,
  WR_STORAGE_CONFIG,
  type WrStorageConfig,
  type WrStorageConfigResolved,
} from './storage-config';
import { WR_STORAGE_ENGINE, type WrStorageEngine } from './storage-engine';

/**
 * Configure {@link WrStorage}. All fields optional — merged with defaults.
 *
 * @example Override the engine globally (e.g. session storage)
 * ```ts
 * provideWrStorage({ engine: sessionStorage })
 * ```
 *
 * @example Lazy engine factory (e.g. wrap localStorage with encryption)
 * ```ts
 * provideWrStorage({ engine: () => new EncryptedStorage(localStorage, key) })
 * ```
 *
 * @example Namespace + auto-expire
 * ```ts
 * provideWrStorage({ prefix: 'myapp:', ttl: 24 * 60 * 60 * 1000 })
 * ```
 */
export interface ProvideWrStorageOptions extends WrStorageConfig {
  /**
   * Storage engine. Either an instance (eager) or a factory (lazy —
   * called inside the injection context the first time `WR_STORAGE_ENGINE`
   * is read). Defaults to {@link WR_STORAGE_ENGINE}'s factory
   * (`localStorage` with in-memory fallback).
   */
  readonly engine?: WrStorageEngine | (() => WrStorageEngine);
}

export function provideWrStorage(options: ProvideWrStorageOptions = {}): EnvironmentProviders {
  const { engine, ...config } = options;

  const merged: WrStorageConfigResolved = { ...DEFAULT_WR_STORAGE_CONFIG, ...config };

  const providers: Provider[] = [{ provide: WR_STORAGE_CONFIG, useValue: merged }];

  if (engine !== undefined) {
    providers.push(
      typeof engine === 'function'
        ? { provide: WR_STORAGE_ENGINE, useFactory: engine }
        : { provide: WR_STORAGE_ENGINE, useValue: engine }
    );
  }

  return makeEnvironmentProviders(providers);
}
