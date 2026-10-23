/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, EnvironmentInjector, Injector, PLATFORM_ID, createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type WrColorScheme, watchColorScheme } from './watch-color-scheme';

/**
 * The helper exists for a still canvas frame, which holds the colours it was
 * drawn with until something asks it to redraw. So what is pinned is WHEN it
 * calls: on each of the two things that move the root scheme — an inline
 * `color-scheme` on `<html>` (what `WrTheme` writes) and `prefers-color-scheme`
 * while the page says `light dark` — and NOT on a write that leaves the scheme
 * where it was, since every call is a repaint.
 *
 * jsdom computes `color-scheme` from an inline style and has no `matchMedia`,
 * so the OS half runs against a stub that can fire `change` by hand.
 */
describe('watchColorScheme', () => {
  let osDark: boolean;
  let listeners: Set<() => void>;
  let seen: WrColorScheme[];

  const html = (): HTMLElement => document.documentElement;

  /** A `matchMedia` whose `prefers-color-scheme: dark` answer the spec flips. */
  const stubMatchMedia = (): void => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      media: query,
      get matches() {
        return osDark;
      },
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    }));
  };

  /** Flip the OS preference and tell every listener, as a browser would. */
  const setOsDark = (dark: boolean): void => {
    osDark = dark;
    for (const fn of [...listeners]) fn();
  };

  /** MutationObserver records are delivered in a microtask. */
  const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

  @Component({ template: '' })
  class Watcher {
    readonly stop = watchColorScheme(scheme => seen.push(scheme));
  }

  const mount = (): ReturnType<typeof TestBed.createComponent<Watcher>> => {
    const fixture = TestBed.createComponent(Watcher);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    osDark = false;
    listeners = new Set();
    seen = [];
    stubMatchMedia();
    html().removeAttribute('style');
    html().removeAttribute('class');
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    html().removeAttribute('style');
    html().removeAttribute('class');
    vi.unstubAllGlobals();
  });

  it('calls back when <html> takes an inline color-scheme', async () => {
    mount();

    html().style.colorScheme = 'dark';
    await flush();
    html().style.colorScheme = 'light';
    await flush();

    expect(seen).toEqual(['dark', 'light']);
  });

  it('stays quiet for a write that leaves the scheme where it was', async () => {
    mount();

    // CDK's scroll blocking styles <html> too; each of these would be a repaint
    // for nothing.
    html().style.top = '-120px';
    html().classList.add('cdk-global-scrollblock');
    await flush();
    html().style.colorScheme = 'light';
    await flush();

    expect(seen).toEqual([]);
  });

  it('follows the OS while the page leaves the choice to it', () => {
    html().style.colorScheme = 'light dark';
    mount();

    setOsDark(true);
    setOsDark(false);

    expect(seen).toEqual(['dark', 'light']);
  });

  it('ignores the OS once the page has picked a scheme', () => {
    html().style.colorScheme = 'light';
    mount();

    setOsDark(true);

    expect(seen).toEqual([]);
  });

  it('defers a computed `normal` to the color-scheme meta', () => {
    const meta = document.createElement('meta');
    meta.name = 'color-scheme';
    meta.content = 'light dark';
    document.head.appendChild(meta);
    try {
      mount();
      setOsDark(true);

      expect(seen).toEqual(['dark']);
    } finally {
      meta.remove();
    }
  });

  it('stops when its injection context is destroyed', async () => {
    const fixture = mount();
    fixture.destroy();

    html().style.colorScheme = 'dark';
    await flush();
    setOsDark(true);

    expect(seen).toEqual([]);
    expect(listeners.size).toBe(0);
  });

  it('stops early when asked to', async () => {
    const fixture = mount();
    fixture.componentInstance.stop();

    html().style.colorScheme = 'dark';
    await flush();

    expect(seen).toEqual([]);
    expect(listeners.size).toBe(0);
  });

  it('takes an injector outside an injection context', async () => {
    const parent = TestBed.inject(EnvironmentInjector);
    const child = createEnvironmentInjector([], parent);
    watchColorScheme(scheme => seen.push(scheme), { injector: child });

    html().style.colorScheme = 'dark';
    await flush();
    child.destroy();
    html().style.colorScheme = 'light';
    await flush();

    expect(seen).toEqual(['dark']);
  });

  it('refuses a call with neither an injection context nor an injector', () => {
    expect(() => watchColorScheme(() => undefined)).toThrow(/NG0203/);
  });

  it('does nothing on the server', async () => {
    const server = Injector.create({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      parent: TestBed.inject(Injector),
    });
    const observe = vi.spyOn(MutationObserver.prototype, 'observe');

    const stop = watchColorScheme(scheme => seen.push(scheme), { injector: server });
    html().style.colorScheme = 'dark';
    await flush();

    expect(observe).not.toHaveBeenCalled();
    expect(listeners.size).toBe(0);
    expect(seen).toEqual([]);
    expect(() => stop()).not.toThrow();
  });
});
