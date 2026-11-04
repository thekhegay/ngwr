/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type ResourceRef, resource, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { beforeEach, describe, expect, it } from 'vitest';

import { wrResourceValue } from './resource-value';

/** A promise the spec settles by hand, one per loader call. */
interface Gate {
  resolve: (value: string[]) => void;
  reject: (reason: unknown) => void;
}

/** Lets a settled loader promise reach the resource, then runs the root effects. */
const settle = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 0));
  TestBed.tick();
};

/**
 * Against a REAL `resource()`, so what is pinned is Angular's own state
 * machine: `value()` throwing in `error`, the old value dropped on a `loading`
 * for new params and kept on a `reloading`, and `hasValue()` on each.
 */
describe('wrResourceValue', () => {
  const page = signal<number | undefined>(undefined);
  let gates: Gate[];
  let users: ResourceRef<string[] | undefined>;

  beforeEach(() => {
    gates = [];
    page.set(undefined);
    users = TestBed.runInInjectionContext(() =>
      resource({
        params: () => page(),
        loader: () => new Promise<string[]>((resolve, reject) => gates.push({ resolve, reject })),
      })
    );
  });

  it('needs an injection context, like the resource it reads', () => {
    expect(() => wrResourceValue(users, [])).toThrow(/injection context/);
  });

  it('answers the fallback while the resource is idle, then while it first loads', () => {
    const rows = TestBed.runInInjectionContext(() => wrResourceValue(users, []));
    const fallback = rows();

    expect(users.status()).toBe('idle');
    expect(rows()).toEqual([]);

    page.set(1);
    TestBed.tick();
    expect(users.status()).toBe('loading');
    expect(rows()).toBe(fallback);
  });

  it('answers the value once the resource resolves', async () => {
    const rows = TestBed.runInInjectionContext(() => wrResourceValue(users, []));
    page.set(1);
    TestBed.tick();

    gates[0].resolve(['ada']);
    await settle();
    expect(users.status()).toBe('resolved');
    expect(rows()).toEqual(['ada']);
  });

  it('keeps the last settled value through a reload', async () => {
    const rows = TestBed.runInInjectionContext(() => wrResourceValue(users, []));
    page.set(1);
    TestBed.tick();
    gates[0].resolve(['ada']);
    await settle();

    users.reload();
    TestBed.tick();
    expect(users.status()).toBe('reloading');
    expect(rows()).toEqual(['ada']);

    gates[1].resolve(['grace']);
    await settle();
    expect(rows()).toEqual(['grace']);
  });

  it('keeps the last settled value while new params load, where the resource itself drops it', async () => {
    const rows = TestBed.runInInjectionContext(() => wrResourceValue(users, []));
    page.set(1);
    TestBed.tick();
    gates[0].resolve(['ada']);
    await settle();

    page.set(2);
    TestBed.tick();
    expect(users.status()).toBe('loading');
    expect(users.value()).toBeUndefined();
    expect(rows()).toEqual(['ada']);
  });

  it('does not throw in the error state and keeps the last settled value', async () => {
    const rows = TestBed.runInInjectionContext(() => wrResourceValue(users, []));
    page.set(1);
    TestBed.tick();
    gates[0].resolve(['ada']);
    await settle();

    users.reload();
    TestBed.tick();
    gates[1].reject(new Error('503'));
    await settle();
    expect(users.status()).toBe('error');
    expect(() => users.value()).toThrow();
    expect(rows()).toEqual(['ada']);
  });

  it('answers the fallback in an error state nothing settled before', async () => {
    const rows = TestBed.runInInjectionContext(() => wrResourceValue(users, []));
    page.set(1);
    TestBed.tick();
    gates[0].reject(new Error('503'));
    await settle();

    expect(users.status()).toBe('error');
    expect(() => users.value()).toThrow();
    expect(rows()).toEqual([]);
  });

  it('follows a local write', async () => {
    const rows = TestBed.runInInjectionContext(() => wrResourceValue(users, []));
    page.set(1);
    TestBed.tick();
    gates[0].resolve(['ada']);
    await settle();

    users.set(['local']);
    expect(users.status()).toBe('local');
    expect(rows()).toEqual(['local']);
  });

  it('recovers from an error once a later load resolves', async () => {
    const rows = TestBed.runInInjectionContext(() => wrResourceValue(users, []));
    page.set(1);
    TestBed.tick();
    gates[0].reject(new Error('503'));
    await settle();

    users.reload();
    TestBed.tick();
    gates[1].resolve(['back']);
    await settle();
    expect(rows()).toEqual(['back']);
  });
});
