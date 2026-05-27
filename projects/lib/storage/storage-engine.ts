/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

/**
 * Storage backend. Anything implementing the native `Storage` interface
 * works — `localStorage`, `sessionStorage`, a Map-backed shim, an
 * IndexedDB sync wrapper, an encrypted wrapper, a worker bridge, …
 */
export type WrStorageEngine = Storage;

/**
 * In-memory implementation of `Storage`. Used as the SSR / private-mode
 * fallback. Exported so consumers can opt into it explicitly for tests.
 */
export function createMemoryStorage(): WrStorageEngine {
  const map = new Map<string, string>();
  return {
    get length(): number {
      return map.size;
    },
    clear(): void {
      map.clear();
    },
    getItem(key: string): string | null {
      return map.has(key) ? map.get(key)! : null;
    },
    key(i: number): string | null {
      return Array.from(map.keys())[i] ?? null;
    },
    removeItem(key: string): void {
      map.delete(key);
    },
    setItem(key: string, value: string): void {
      map.set(key, value);
    },
  };
}

/**
 * Probe a `Storage` candidate to confirm it's writable. Safari private
 * mode, disabled cookies, and storage-blocked iframes all throw on
 * `setItem` — fall back to memory in those cases.
 */
function probe(engine: WrStorageEngine): boolean {
  try {
    const k = '__wr_storage_probe__';
    engine.setItem(k, '1');
    engine.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/**
 * Injection token for the active storage engine. Override at any
 * injector level to swap engines (e.g. a feature module uses
 * `sessionStorage`; the rest uses `localStorage`):
 *
 * ```ts
 * providers: [{ provide: WR_STORAGE_ENGINE, useValue: sessionStorage }]
 * ```
 *
 * The default factory returns `localStorage` in the browser when it's
 * actually writable, an in-memory map otherwise.
 */
export const WR_STORAGE_ENGINE = new InjectionToken<WrStorageEngine>('WR_STORAGE_ENGINE', {
  providedIn: 'root',
  factory: () => {
    if (typeof localStorage === 'undefined') return createMemoryStorage();
    return probe(localStorage) ? localStorage : createMemoryStorage();
  },
});
