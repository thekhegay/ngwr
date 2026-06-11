/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import { Service, PLATFORM_ID, type Signal, type WritableSignal, inject, signal } from '@angular/core';

import { WR_STORAGE_CONFIG } from './storage-config';
import { WR_STORAGE_ENGINE } from './storage-engine';

/** Envelope written when `json` mode is on. `e` is epoch-ms expiry. @internal */
interface Envelope<T> {
  readonly v: T;
  readonly e?: number;
}

function isEnvelope(x: unknown): x is Envelope<unknown> {
  return x !== null && typeof x === 'object' && 'v' in x;
}

/**
 * Reactive key/value storage on top of any `Storage`-compatible engine.
 *
 * - **Swap engines** through {@link WR_STORAGE_ENGINE} or
 *   {@link provideWrStorage}. Default: `localStorage` with an in-memory
 *   fallback for SSR / private mode.
 * - **Namespacing** via `prefix` (config) — every key is transparently
 *   prefixed on read / write.
 * - **TTL** per-call or default — values past their expiry are removed
 *   lazily on the next `get` / `watch` read.
 * - **Reactive watch** — `watch(key)` returns a `Signal` that updates on
 *   local writes and cross-tab `storage` events.
 *
 * SSR-safe: the default engine factory returns an in-memory shim when
 * `localStorage` is unavailable, so reads always work.
 *
 * @example
 * ```ts
 * const store = inject(WrStorage);
 *
 * store.set('user', { name: 'Ada' });
 * store.get<{ name: string }>('user');         // { name: 'Ada' }
 *
 * store.set('cart', items, { ttl: 60_000 });   // expires in 60s
 *
 * const theme = store.watch<'light' | 'dark'>('theme', 'light');
 * effect(() => console.log('theme is', theme()));
 * ```
 *
 * @see https://ngwr.dev/services/storage
 */
@Service()
export class WrStorage {
  private readonly engine = inject(WR_STORAGE_ENGINE);
  private readonly config = inject(WR_STORAGE_CONFIG);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Per-key watchers. Shared so multiple `watch(k)` calls reuse one signal. */
  private readonly watchers = new Map<string, WritableSignal<unknown>>();
  private listenerInstalled = false;

  // Public API

  /** Is `key` present (regardless of value / expiry)? */
  has(key: string): boolean {
    return this.engine.getItem(this.fullKey(key)) !== null;
  }

  /**
   * Read `key`. Returns `fallback` (default `null`) when the key is
   * missing or expired. Expired values are also removed as a side effect.
   */
  get<T = unknown>(key: string, fallback: T | null = null): T | null {
    const fk = this.fullKey(key);
    const raw = this.engine.getItem(fk);
    if (raw === null) return fallback;

    if (!this.config.json) return raw as unknown as T;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Non-JSON value written by external code — return as-is.
      return raw as unknown as T;
    }

    if (!isEnvelope(parsed)) return parsed as T;

    if (parsed.e !== undefined && parsed.e < Date.now()) {
      this.remove(key);
      return fallback;
    }
    return parsed.v as T;
  }

  /**
   * Write `value` at `key`. Per-call `ttl` (ms) overrides the config
   * default. JSON-serializable values only when `json` is on (the default).
   */
  set<T = unknown>(key: string, value: T, opts?: { ttl?: number }): void {
    const fk = this.fullKey(key);
    let serialized: string;

    if (this.config.json) {
      const ttl = opts?.ttl ?? this.config.ttl;
      const env: Envelope<T> = ttl ? { v: value, e: Date.now() + ttl } : { v: value };
      try {
        serialized = JSON.stringify(env);
      } catch (err) {
        // eslint-disable-next-line no-console -- intentional diagnostic for unserialisable values
        console.warn('[ngwr/storage] value not JSON-serializable', err);
        return;
      }
    } else {
      serialized = String(value);
    }

    try {
      this.engine.setItem(fk, serialized);
    } catch (err) {
      // Quota exceeded / disabled / cleared mid-write — log + carry on.
      // eslint-disable-next-line no-console -- intentional diagnostic on storage write failure
      console.warn('[ngwr/storage] setItem failed', err);
      return;
    }
    this.notify(key);
  }

  /** Remove `key`. No-op when absent. */
  remove(key: string): void {
    this.engine.removeItem(this.fullKey(key));
    this.notify(key);
  }

  /**
   * Clear every key owned by this prefix. When `prefix` is empty this
   * defers to `engine.clear()` (clears everything — be careful with
   * shared storage).
   */
  clear(): void {
    const p = this.config.prefix;
    if (p) {
      for (const fk of this.rawKeys()) this.engine.removeItem(fk);
    } else {
      this.engine.clear();
    }
    // Refresh every active watcher — they may have just been cleared.
    for (const [k, sig] of this.watchers) sig.set(this.get(k));
  }

  /** All known keys under our prefix, with the prefix stripped. */
  keys(): readonly string[] {
    const p = this.config.prefix;
    return this.rawKeys().map(k => (p ? k.slice(p.length) : k));
  }

  /**
   * Reactive read of `key`. Updates when this instance writes to the key,
   * when `clear()` runs, and when another tab updates `localStorage`
   * under the same prefix. Returned signal is shared per key — calling
   * `watch(k)` twice returns the same signal.
   */
  watch<T = unknown>(key: string, fallback: T | null = null): Signal<T | null> {
    let sig = this.watchers.get(key) as WritableSignal<T | null> | undefined;
    if (!sig) {
      sig = signal<T | null>(this.get<T>(key, fallback));
      this.watchers.set(key, sig);
      this.installCrossTabListener();
    }
    return sig.asReadonly();
  }

  // Internals

  private fullKey(key: string): string {
    return this.config.prefix + key;
  }

  private notify(key: string): void {
    const sig = this.watchers.get(key);
    if (sig) sig.set(this.get(key));
  }

  private rawKeys(): string[] {
    const p = this.config.prefix;
    const out: string[] = [];
    for (let i = 0; i < this.engine.length; i++) {
      const k = this.engine.key(i);
      if (k === null) continue;
      if (!p || k.startsWith(p)) out.push(k);
    }
    return out;
  }

  private installCrossTabListener(): void {
    if (!this.isBrowser || this.listenerInstalled) return;
    this.listenerInstalled = true;
    window.addEventListener('storage', (event: StorageEvent) => {
      // `storage` only fires for `localStorage` / `sessionStorage`, and
      // only for changes from OTHER tabs. Local writes are handled by
      // `notify()` in `set`/`remove`/`clear`.
      if (event.key === null) {
        // Storage cleared from another tab.
        for (const [k, sig] of this.watchers) sig.set(this.get(k));
        return;
      }
      const p = this.config.prefix;
      if (p && !event.key.startsWith(p)) return;
      this.notify(p ? event.key.slice(p.length) : event.key);
    });
  }
}
