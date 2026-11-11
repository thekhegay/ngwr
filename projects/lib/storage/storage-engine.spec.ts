import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrAlert } from 'ngwr/alert';
import { WrI18n } from 'ngwr/i18n';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrStorage } from './storage';
import { WR_STORAGE_ENGINE } from './storage-engine';

@Component({ imports: [WrAlert], template: `<wr-alert closable message="Something happened" />` })
class Host {}

/**
 * With cookies blocked, or in a sandboxed or third-party iframe, the browser
 * throws a `SecurityError` from the `window.localStorage` GETTER, before any
 * method is called. `WrI18n` injects `WrStorage`, so a default engine that
 * lets that escape takes every component with a built-in string down with it.
 */
describe('WR_STORAGE_ENGINE with storage blocked by the browser', () => {
  const names = ['localStorage', 'sessionStorage'] as const;
  const saved = new Map<string, PropertyDescriptor | undefined>();

  beforeEach(() => {
    TestBed.resetTestingModule();
    for (const name of names) {
      saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
      Object.defineProperty(globalThis, name, {
        configurable: true,
        get: () => {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
      });
    }
  });

  afterEach(() => {
    for (const name of names) {
      const descriptor = saved.get(name);
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete (globalThis as Record<string, unknown>)[name];
    }
  });

  it('stages the block: reading the global throws', () => {
    expect(() => localStorage).toThrow();
  });

  it('falls back to a working in-memory engine', () => {
    const engine = TestBed.inject(WR_STORAGE_ENGINE);
    engine.setItem('k', 'v');

    expect(engine.getItem('k')).toBe('v');
  });

  it('keeps WrStorage reading back what it wrote', () => {
    const store = TestBed.inject(WrStorage);
    store.set('user', { name: 'Ada' });

    expect(store.get('user')).toEqual({ name: 'Ada' });
  });

  it('still renders a component that resolves WrI18n', () => {
    const fixture = TestBed.createComponent(Host);

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(() => TestBed.inject(WrI18n)).not.toThrow();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Something happened');
  });
});
