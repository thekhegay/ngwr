import { EnvironmentInjector, PLATFORM_ID, createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WrStorage } from './storage';
import { createMemoryStorage } from './storage-engine';
import type { WrStorageEngine, WrStorageOptions } from './types';
import { withStorage } from './with-storage';

/**
 * `WrStorage` is the persistence floor under `WrI18n` and `WrTheme`, so a bug
 * here does not look like a storage bug — it looks like a user's locale or
 * theme resetting on reload.
 *
 * Every test drives an explicit in-memory engine rather than jsdom's
 * `localStorage`. That keeps the suite from leaking state between files (jsdom's
 * storage outlives TestBed) and, more importantly, makes the engine a seam:
 * quota failures and foreign values are things a test has to be able to stage,
 * not wait for.
 */
describe('WrStorage', () => {
  let engine: WrStorageEngine;

  const setup = (options: WrStorageOptions = {}): WrStorage => {
    TestBed.configureTestingModule({ providers: [provideWr(withStorage({ engine: () => engine, ...options }))] });
    return TestBed.inject(WrStorage);
  };

  beforeEach(() => {
    engine = createMemoryStorage();
    TestBed.resetTestingModule();
  });

  describe('round trips', () => {
    it('reads back what it wrote, through the envelope', () => {
      const store = setup();
      store.set('user', { name: 'Ada', years: 36 });

      expect(store.get<{ name: string; years: number }>('user')).toEqual({ name: 'Ada', years: 36 });
    });

    it('keeps types that JSON keeps, and reports a miss as the fallback', () => {
      const store = setup();
      store.set('n', 0);
      store.set('f', false);
      store.set('empty', '');

      // `0`, `false` and `''` are exactly what a truthiness check would turn
      // into a miss — and a miss returns the fallback, which is a different
      // value with a different meaning.
      expect([store.get('n'), store.get('f'), store.get('empty')]).toEqual([0, false, '']);
      expect(store.get('absent', 'fallback')).toBe('fallback');
      expect(store.get('absent')).toBeNull();
    });

    it('has() reports presence, not truthiness', () => {
      const store = setup();
      store.set('f', false);

      expect([store.has('f'), store.has('nope')]).toEqual([true, false]);
    });

    it('namespaces every key with the configured prefix', () => {
      const store = setup({ prefix: 'app:' });
      store.set('k', 1);

      expect(engine.getItem('app:k')).not.toBeNull();
      expect(engine.getItem('k')).toBeNull();
      expect(store.keys()).toEqual(['k']);
    });

    it('clear() under a prefix leaves other owners alone', () => {
      engine.setItem('other:keep', 'mine');
      const store = setup({ prefix: 'app:' });
      store.set('a', 1);
      store.set('b', 2);

      store.clear();

      expect(store.keys()).toEqual([]);
      expect(engine.getItem('other:keep')).toBe('mine');
    });
  });

  describe('values it did not write', () => {
    it('returns a foreign non-JSON value as-is instead of throwing', () => {
      // Another script's plain string sitting at our key. Parsing throws, and an
      // uncaught throw here would take down whatever read it — including
      // `WrTheme`'s constructor.
      engine.setItem('token', 'not-json{');
      const store = setup();

      expect(store.get('token')).toBe('not-json{');
    });

    it('returns a bare JSON value that is not one of our envelopes', () => {
      engine.setItem('count', '42');
      const store = setup();

      expect(store.get('count')).toBe(42);
    });
  });

  describe('expiry', () => {
    it('hides an expired value and removes it on the way out', () => {
      const store = setup();
      vi.useFakeTimers();
      try {
        store.set('cart', ['x'], { ttl: 1000 });
        vi.advanceTimersByTime(1001);

        expect(store.get('cart', 'gone')).toBe('gone');
        // Lazily removed, not merely hidden — otherwise the entry outlives its
        // own TTL in storage and counts against quota forever.
        expect(store.has('cart')).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it('keeps a value that has not expired yet', () => {
      const store = setup();
      vi.useFakeTimers();
      try {
        store.set('cart', ['x'], { ttl: 1000 });
        vi.advanceTimersByTime(999);

        expect(store.get('cart')).toEqual(['x']);
      } finally {
        vi.useRealTimers();
      }
    });

    it('treats ttl: 0 as no expiry at all', () => {
      const store = setup({ ttl: 0 });
      store.set('forever', 1);

      expect(engine.getItem('forever')).toBe(JSON.stringify({ v: 1 }));
    });
  });

  describe('write failures', () => {
    it('survives a quota-exceeded engine instead of propagating', () => {
      const store = setup();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      vi.spyOn(engine, 'setItem').mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });

      // A full disk must not become an exception in a click handler.
      expect(() => store.set('k', 'v')).not.toThrow();
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('survives a value JSON cannot serialize', () => {
      const store = setup();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const cyclic: Record<string, unknown> = {};
      cyclic['self'] = cyclic;

      expect(() => store.set('bad', cyclic)).not.toThrow();
      expect(store.has('bad')).toBe(false);
      warn.mockRestore();
    });
  });

  describe('watch', () => {
    it('shares one signal per key', () => {
      const store = setup();
      expect(store.watch('k')).toBe(store.watch('k'));
    });

    it('updates on a local write', () => {
      const store = setup();
      const value = store.watch<string>('k');
      expect(value()).toBeNull();

      store.set('k', 'hello');
      expect(value()).toBe('hello');
    });

    it('falls back to the SAME value the read does when the key goes away', () => {
      // `get(k, fallback)` and `watch(k, fallback)` are the same read with and
      // without reactivity, so they must not disagree about what an absent key
      // means. Dropping the fallback on removal hands the consumer `null` where
      // the non-reactive read gives them their default — for `WrTheme` that is
      // the difference between "light" and no theme at all.
      const store = setup();
      const theme = store.watch<string>('theme', 'light');
      store.set('theme', 'dark');
      expect(theme()).toBe('dark');

      store.remove('theme');
      expect(theme()).toBe('light');
      expect(store.get('theme', 'light')).toBe('light');
    });

    it('falls back the same way after clear()', () => {
      const store = setup({ prefix: 'app:' });
      const theme = store.watch<string>('theme', 'light');
      store.set('theme', 'dark');

      store.clear();

      expect(theme()).toBe('light');
    });

    it('stops listening for cross-tab writes once its injector is destroyed', () => {
      // `WrStorage` is root-provided, but nothing stops a lazy route from listing
      // the class in its own `providers`. The `storage` handler used to stay on
      // the window afterwards — still driving the watcher signals of an instance
      // the router had already thrown away, and keeping that instance, its
      // watchers map and every signal in it reachable for the life of the page.
      TestBed.configureTestingModule({ providers: [provideWr(withStorage({ engine: () => engine }))] });
      const child = createEnvironmentInjector([WrStorage], TestBed.inject(EnvironmentInjector));
      const theme = child.get(WrStorage).watch<string>('theme', 'light');

      // jsdom never fires `storage` for a same-window write, so the event another
      // tab would send is dispatched by hand — which is also the only way to tell
      // an installed listener from a removed one.
      engine.setItem('theme', JSON.stringify({ v: 'dark' }));
      window.dispatchEvent(new StorageEvent('storage', { key: 'theme' }));
      expect(theme()).toBe('dark');

      child.destroy();

      engine.setItem('theme', JSON.stringify({ v: 'sepia' }));
      window.dispatchEvent(new StorageEvent('storage', { key: 'theme' }));
      expect(theme()).toBe('dark');
    });
  });

  describe('signal', () => {
    it('starts from storage, or the default when the key is absent', () => {
      engine.setItem('theme', JSON.stringify({ v: 'dark' }));
      const store = setup();

      expect(store.signal('theme', 'light')()).toBe('dark');
      expect(store.signal('density', 'comfortable')()).toBe('comfortable');
    });

    it('writes through on set, so a new instance reads it back', () => {
      const store = setup();
      const theme = store.signal<string>('theme', 'light');

      theme.set('dark');

      expect(theme()).toBe('dark');
      expect(engine.getItem('theme')).toBe(JSON.stringify({ v: 'dark' }));
      TestBed.resetTestingModule();
      expect(setup().get('theme')).toBe('dark');
    });

    it('update() derives from the current value and persists', () => {
      const store = setup();
      const visits = store.signal<number>('visits', 0);

      visits.update(n => n + 1);
      visits.update(n => n + 1);

      expect(visits()).toBe(2);
      expect(store.get('visits')).toBe(2);
    });

    it('shares one signal per key, across signal() and watch()', () => {
      const store = setup();
      const a = store.signal<string>('theme', 'light');
      const b = store.signal<string>('theme', 'light');
      const seen = store.watch<string>('theme');

      a.set('dark');

      expect(b).toBe(a);
      expect([b(), seen()]).toEqual(['dark', 'dark']);
    });

    it('follows set(), remove() and clear() made through the service', () => {
      const store = setup({ prefix: 'app:' });
      const theme = store.signal<string>('theme', 'light');

      store.set('theme', 'dark');
      expect(theme()).toBe('dark');

      store.remove('theme');
      expect(theme()).toBe('light');

      store.set('theme', 'sepia');
      store.clear();
      expect(theme()).toBe('light');
    });

    it('follows a storage event for its key and ignores one for another', () => {
      const store = setup();
      const theme = store.signal<string>('theme', 'light');

      engine.setItem('theme', JSON.stringify({ v: 'dark' }));
      engine.setItem('other', JSON.stringify({ v: 'noise' }));
      window.dispatchEvent(new StorageEvent('storage', { key: 'other' }));
      expect(theme()).toBe('light');

      window.dispatchEvent(new StorageEvent('storage', { key: 'theme' }));
      expect(theme()).toBe('dark');
    });

    it('returns to the default when another tab removes the key or clears storage', () => {
      const store = setup();
      const theme = store.signal<string>('theme', 'light');
      theme.set('dark');

      engine.removeItem('theme');
      window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: null }));
      expect(theme()).toBe('light');

      theme.set('dark');
      engine.clear();
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
      expect(theme()).toBe('light');
    });

    it('does not write on a set to the value it already holds', () => {
      const store = setup();
      const theme = store.signal<string>('theme', 'light');
      theme.set('dark');
      const setItem = vi.spyOn(engine, 'setItem');

      theme.set('dark');

      expect(setItem).not.toHaveBeenCalled();
    });

    it('keeps the value in memory when the engine refuses the write', () => {
      const store = setup();
      const theme = store.signal<string>('theme', 'light');
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      vi.spyOn(engine, 'setItem').mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });

      // Same contract as `set()`: a full disk is logged, never thrown. The
      // signal still moves, so the tab keeps working on what it cannot save.
      expect(() => theme.set('dark')).not.toThrow();
      expect(theme()).toBe('dark');
      expect(engine.getItem('theme')).toBeNull();
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('holds the default on the server and listens to no storage event', () => {
      const add = vi.spyOn(window, 'addEventListener');
      TestBed.configureTestingModule({
        providers: [provideWr(withStorage({ engine: () => engine })), { provide: PLATFORM_ID, useValue: 'server' }],
      });
      const theme = TestBed.inject(WrStorage).signal<string>('theme', 'light');

      expect(theme()).toBe('light');
      expect(add).not.toHaveBeenCalledWith('storage', expect.any(Function));
      add.mockRestore();
    });
  });
});
