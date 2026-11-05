/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Service,
  PLATFORM_ID,
  type Signal,
  type WritableSignal,
  inject,
  signal,
  untracked,
} from '@angular/core';

import { WR_STORAGE_CONFIG } from './storage-config';
import { WR_STORAGE_ENGINE } from './storage-engine';
import type { WrStorageEnvelope } from './types';

function isEnvelope(x: unknown): x is WrStorageEnvelope {
  return x !== null && typeof x === 'object' && 'v' in x;
}

/**
 * One key's signal. `sig.set` persists, so a refresh from storage goes through
 * `write`, the setter the signal was born with.
 */
interface Watcher {
  readonly sig: WritableSignal<unknown>;
  readonly fallback: unknown;
  readonly write: (value: unknown) => void;
}

/**
 * Reactive key/value storage on top of any `Storage`-compatible engine.
 *
 * - **Swap engines** through {@link WR_STORAGE_ENGINE} or
 *   `provideWr(withStorage(...))`. Default: `localStorage` with an in-memory
 *   fallback for SSR / private mode.
 * - **Namespacing** via `prefix` (config) — every key is transparently
 *   prefixed on read / write.
 * - **TTL** per-call or default — values past their expiry are removed
 *   lazily on the next `get` / `watch` read.
 * - **Reactive watch** — `watch(key)` returns a `Signal` that updates on
 *   local writes and cross-tab `storage` events. `signal(key, default)` is the
 *   writable twin: `set` and `update` persist as they go.
 * - **On-disk format** — values are wrapped in a {@link WrStorageEnvelope}
 *   (`{"v":…,"e":…}`) while `json` is on. Anything reading the same key from
 *   outside Angular has to unwrap it.
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
 *
 * const density = store.signal<'compact' | 'comfortable'>('density', 'comfortable');
 * density.set('compact');                        // stored, and every tab follows
 * ```
 *
 * @see https://ngwr.dev/reference/services/storage
 */
@Service()
export class WrStorage {
  private readonly engine = inject(WR_STORAGE_ENGINE);
  private readonly config = inject(WR_STORAGE_CONFIG);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Per-key watchers. Shared so multiple `watch(k)` and `signal(k)` calls reuse
   * one signal.
   *
   * The fallback is kept alongside the signal because every refresh has to read
   * the key the same way `watch` first did. Refreshing without it made `get` and
   * `watch` disagree about what an ABSENT key means: after a `remove()` the
   * signal went to `null` while `get(key, fallback)` still answered with the
   * default, so a consumer watching `'theme'` with a `'light'` fallback got no
   * theme at all rather than the light one.
   */
  private readonly watchers = new Map<string, Watcher>();
  private listenerInstalled = false;

  // Public API

  /**
   * Is `key` present? A raw presence check: it does not parse the envelope, so
   * an EXPIRED entry still answers `true` until something reads it — `get()`
   * is what notices the TTL and removes the key on its way out. Branch on
   * `get() !== null` when the answer has to respect expiry; this one is for
   * "is there anything under this key at all", quota accounting included.
   */
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
   *
   * What lands in the engine is a {@link WrStorageEnvelope} —
   * `{"v":<value>}`, plus `"e"` when a TTL applies — not the bare value. Code
   * outside Angular that reads the same key has to unwrap it; see the envelope's
   * own docs for the exact format.
   */
  set<T = unknown>(key: string, value: T, opts?: { ttl?: number }): void {
    if (this.persist(key, value, opts)) this.notify(key);
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
    this.refreshAll();
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
    return (this.watcher(key, fallback).sig as WritableSignal<T | null>).asReadonly();
  }

  /**
   * Writable twin of {@link watch}: `set` and `update` store the value, then
   * the signal takes it. The signal is the one `watch(key)` reads, so a
   * `set()`, `remove()` or `clear()` on this instance moves it too, and so does
   * a write from another tab; a key another tab removes goes back to
   * `defaultValue`. Shared per key, so a second `signal(key)` is the same
   * signal and the first call's default stands.
   *
   * A `set` to the value it already holds (`Object.is`) writes nothing, like a
   * plain signal. A write the engine refuses (quota, storage disabled) is
   * logged and dropped exactly as `set()` does, and nothing throws: the signal
   * keeps the new value for this tab, and the next load reads what was stored
   * before.
   *
   * On the server it reads the engine as `watch()` does, so with the default
   * in-memory engine it holds `defaultValue`, and no `storage` listener is
   * installed. Hydration: the server renders that default and the browser
   * instance reads `localStorage` when it is created, so the first client
   * render can differ from the server markup, as with `watch()`.
   */
  signal<T>(key: string, defaultValue: T): WritableSignal<T> {
    return this.watcher(key, defaultValue).sig as WritableSignal<T>;
  }

  // Internals

  private fullKey(key: string): string {
    return this.config.prefix + key;
  }

  private watcher(key: string, fallback: unknown): Watcher {
    const existing = this.watchers.get(key);
    if (existing) return existing;

    const sig = signal<unknown>(this.get(key, fallback));
    const write = sig.set.bind(sig);
    sig.set = value => {
      if (Object.is(value, untracked(sig))) return;
      this.persist(key, value);
      write(value);
    };
    sig.update = fn => sig.set(fn(untracked(sig)));

    const entry: Watcher = { sig, fallback, write };
    this.watchers.set(key, entry);
    this.installCrossTabListener();
    return entry;
  }

  /** Serialize and store. `false` when nothing landed in the engine. */
  private persist<T>(key: string, value: T, opts?: { ttl?: number }): boolean {
    const fk = this.fullKey(key);
    let serialized: string;

    if (this.config.json) {
      const ttl = opts?.ttl ?? this.config.ttl;
      const env: WrStorageEnvelope<T> = ttl ? { v: value, e: Date.now() + ttl } : { v: value };
      try {
        serialized = JSON.stringify(env);
      } catch (err) {
        // eslint-disable-next-line no-console -- intentional diagnostic for unserialisable values
        console.warn('[ngwr/storage] value not JSON-serializable', err);
        return false;
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
      return false;
    }
    return true;
  }

  private notify(key: string): void {
    const entry = this.watchers.get(key);
    if (entry) entry.write(this.get(key, entry.fallback));
  }

  private refreshAll(): void {
    for (const [k, entry] of this.watchers) entry.write(this.get(k, entry.fallback));
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

    const handler = (event: StorageEvent): void => {
      // `storage` only fires for `localStorage` / `sessionStorage`, and
      // only for changes from OTHER tabs. Local writes are handled by
      // `notify()` in `set`/`remove`/`clear`.
      if (event.key === null) {
        // Storage cleared from another tab.
        this.refreshAll();
        return;
      }
      const p = this.config.prefix;
      if (p && !event.key.startsWith(p)) return;
      this.notify(p ? event.key.slice(p.length) : event.key);
    };

    window.addEventListener('storage', handler);

    // The listener belongs to THIS injector. Root-provided it lives as long as
    // the page, but a route or component that lists `WrStorage` in its own
    // `providers` used to leave the handler on the window after its injector was
    // gone — still driving the watcher signals of a destroyed instance, and
    // holding the instance and every signal in it reachable for the life of the
    // page. Same bug `WrHotkey` already fixed once.
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('storage', handler);
      this.listenerInstalled = false;
    });
  }
}
