/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Provider } from '@angular/core';

import { type WrFeature, wrFeature } from 'ngwr/utils';

import { DEFAULT_WR_STORAGE_CONFIG, WR_STORAGE_CONFIG, type WrStorageConfigResolved } from './storage-config';
import { WR_STORAGE_ENGINE } from './storage-engine';
import type { WrStorageOptions } from './types';

/**
 * Configure {@link WrStorage}, as a feature of `provideWr()`. All fields
 * optional — merged with defaults.
 *
 * Bootstrap only: {@link WrStorage} is root-provided and resolves its engine
 * and config once, from the root injector — see {@link WR_STORAGE_ENGINE}.
 *
 * @example Override the engine globally (e.g. session storage)
 * ```ts
 * import { provideWr } from 'ngwr';
 * import { withStorage } from 'ngwr/storage';
 *
 * providers: [provideWr(withStorage({ engine: sessionStorage }))]
 * ```
 *
 * @example Lazy engine factory (e.g. wrap localStorage with encryption)
 * ```ts
 * provideWr(withStorage({ engine: () => new EncryptedStorage(localStorage, key) }))
 * ```
 *
 * @example Namespace + auto-expire
 * ```ts
 * provideWr(withStorage({ prefix: 'myapp:', ttl: 24 * 60 * 60 * 1000 }))
 * ```
 */
export function withStorage(options: WrStorageOptions = {}): WrFeature<'storage'> {
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

  return wrFeature('storage', providers);
}
