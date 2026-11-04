/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { EnvironmentInjector, createEnvironmentInjector, effect } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { describe, expect, it, vi } from 'vitest';

import { wrAction, wrKeyedAction } from './action';

/** A promise the spec settles by hand, so every state between two ticks can be read. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets the settled promise's `then` callbacks run. */
const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

describe('wrAction', () => {
  it('starts idle, with nothing loaded and nothing failed', () => {
    const action = wrAction(() => Promise.resolve(1));

    expect(action.status()).toBe('idle');
    expect(action.loading()).toBe(false);
    expect(action.value()).toBeUndefined();
    expect(action.error()).toBeUndefined();
  });

  it('goes pending on run and success with the value once it settles', async () => {
    const gate = deferred<number>();
    const action = wrAction((n: number) => gate.promise.then(v => v + n));

    const result = action.run(2);
    expect(action.status()).toBe('pending');
    expect(action.loading()).toBe(true);

    gate.resolve(40);
    await expect(result).resolves.toBe(42);
    expect(action.status()).toBe('success');
    expect(action.loading()).toBe(false);
    expect(action.value()).toBe(42);
    expect(action.error()).toBeUndefined();
  });

  it('ends at error on a rejection, and run resolves rather than rejects', async () => {
    const boom = new Error('boom');
    const action = wrAction(() => Promise.reject(boom));

    await expect(action.run()).resolves.toBeUndefined();
    expect(action.status()).toBe('error');
    expect(action.loading()).toBe(false);
    expect(action.error()).toBe(boom);
  });

  it('treats a synchronous throw as a rejection', async () => {
    const action = wrAction((): Promise<void> => {
      throw new Error('sync');
    });

    await expect(action.run()).resolves.toBeUndefined();
    expect(action.status()).toBe('error');
    expect((action.error() as Error).message).toBe('sync');
  });

  it('keeps the last value through a later failure and clears the error when a run starts', async () => {
    let fail = false;
    const action = wrAction(() => (fail ? Promise.reject(new Error('later')) : Promise.resolve('first')));

    await action.run();
    fail = true;
    await action.run();
    expect(action.status()).toBe('error');
    expect(action.value()).toBe('first');

    fail = false;
    const again = action.run();
    expect(action.error()).toBeUndefined();
    await again;
    expect(action.status()).toBe('success');
  });

  it('is single-flight: a run during a pending run joins it and returns its result', async () => {
    const gate = deferred<string>();
    const fn = vi.fn(() => gate.promise);
    const action = wrAction(fn);

    const first = action.run();
    const second = action.run();
    expect(second).toBe(first);
    expect(fn).toHaveBeenCalledTimes(1);

    gate.resolve('once');
    await expect(second).resolves.toBe('once');
  });

  it('runs again once the previous run settled', async () => {
    const fn = vi.fn(() => Promise.resolve(1));
    const action = wrAction(fn);

    await action.run();
    await action.run();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('reset during a pending run drops the late result and leaves the state reset', async () => {
    const gate = deferred<number>();
    const action = wrAction(() => gate.promise);

    const late = action.run();
    action.reset();
    expect(action.status()).toBe('idle');

    gate.resolve(7);
    await expect(late).resolves.toBeUndefined();
    expect(action.status()).toBe('idle');
    expect(action.value()).toBeUndefined();
    expect(action.loading()).toBe(false);
  });

  it('reset during a pending run lets a new run start, and the old result cannot overwrite the new', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const gates = [first, second];
    const action = wrAction(() => gates.shift()!.promise);

    void action.run();
    action.reset();
    const fresh = action.run();
    expect(action.status()).toBe('pending');

    first.resolve('stale');
    await tick();
    expect(action.status()).toBe('pending');

    second.resolve('fresh');
    await expect(fresh).resolves.toBe('fresh');
    expect(action.value()).toBe('fresh');
  });

  it('reset after success clears value and error', async () => {
    const action = wrAction(() => Promise.resolve('v'));

    await action.run();
    action.reset();
    expect(action.status()).toBe('idle');
    expect(action.value()).toBeUndefined();
    expect(action.error()).toBeUndefined();
  });

  it('settles without throwing after the injection context it was created in is destroyed', async () => {
    const gate = deferred<number>();
    const parent = TestBed.inject(EnvironmentInjector);
    const injector = createEnvironmentInjector([], parent);
    const action = injector.runInContext(() => wrAction(() => gate.promise));

    const result = action.run();
    injector.destroy();
    gate.resolve(1);

    await expect(result).resolves.toBe(1);
    expect(action.status()).toBe('success');
  });
});

describe('wrKeyedAction', () => {
  it('reports no key pending and not loading at rest', () => {
    const action = wrKeyedAction((id: string) => Promise.resolve(id));

    expect(action.pending('a')).toBe(false);
    expect(action.loading()).toBe(false);
    expect(action.error()).toBeUndefined();
  });

  it('marks a key pending while its run is in flight, and drops it once settled', async () => {
    const gate = deferred<void>();
    const action = wrKeyedAction<string>(() => gate.promise);

    const result = action.run('a');
    expect(action.pending('a')).toBe(true);
    expect(action.pending('b')).toBe(false);
    expect(action.loading()).toBe(true);

    gate.resolve();
    await result;
    expect(action.pending('a')).toBe(false);
    expect(action.loading()).toBe(false);
  });

  it('runs two keys at once but one key only once at a time', async () => {
    const gates = new Map<string, ReturnType<typeof deferred<string>>>();
    const fn = vi.fn((id: string) => {
      const gate = deferred<string>();
      gates.set(id, gate);
      return gate.promise;
    });
    const action = wrKeyedAction(fn);

    const a = action.run('a');
    const b = action.run('b');
    const aAgain = action.run('a');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(aAgain).toBe(a);
    expect(action.pending('a')).toBe(true);
    expect(action.pending('b')).toBe(true);

    gates.get('a')!.resolve('A');
    await expect(a).resolves.toBe('A');
    expect(action.pending('a')).toBe(false);
    expect(action.pending('b')).toBe(true);
    expect(action.loading()).toBe(true);

    gates.get('b')!.resolve('B');
    await expect(b).resolves.toBe('B');
    expect(action.loading()).toBe(false);
  });

  it('passes the argument through with the key', async () => {
    const fn = vi.fn((id: number, patch: { name: string }) => Promise.resolve(`${id}:${patch.name}`));
    const action = wrKeyedAction(fn);

    await expect(action.run(3, { name: 'Ada' })).resolves.toBe('3:Ada');
    expect(fn).toHaveBeenCalledWith(3, { name: 'Ada' });
  });

  it('records the error of the run that failed, resolves rather than rejects, and frees the key', async () => {
    const boom = new Error('boom');
    const action = wrKeyedAction((id: string) => (id === 'bad' ? Promise.reject(boom) : Promise.resolve(id)));

    await expect(action.run('bad')).resolves.toBeUndefined();
    expect(action.error()).toBe(boom);
    expect(action.pending('bad')).toBe(false);

    await action.run('good');
    expect(action.error()).toBeUndefined();
  });

  it('pending(key) is a reactive read', async () => {
    const gate = deferred<void>();
    const action = wrKeyedAction<string>(() => gate.promise);
    const seen: boolean[] = [];
    const stop = TestBed.runInInjectionContext(() => effect(() => seen.push(action.pending('a'))));

    TestBed.tick();
    const result = action.run('a');
    TestBed.tick();
    gate.resolve();
    await result;
    TestBed.tick();
    stop.destroy();

    expect(seen).toEqual([false, true, false]);
  });

  it('reset forgets pending keys and drops a late result', async () => {
    const gate = deferred<string>();
    const action = wrKeyedAction<string, void, string>(() => gate.promise);

    const late = action.run('a');
    action.reset();
    expect(action.pending('a')).toBe(false);
    expect(action.loading()).toBe(false);

    gate.resolve('late');
    await expect(late).resolves.toBeUndefined();
    expect(action.pending('a')).toBe(false);
  });

  it('a key disowned by reset can run again, and the old result does not clear the new flight', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const gates = [first, second];
    const action = wrKeyedAction<string, void, string>(() => gates.shift()!.promise);

    void action.run('a');
    action.reset();
    const fresh = action.run('a');
    expect(action.pending('a')).toBe(true);

    first.resolve('stale');
    await tick();
    expect(action.pending('a')).toBe(true);

    second.resolve('fresh');
    await expect(fresh).resolves.toBe('fresh');
    expect(action.pending('a')).toBe(false);
  });
});
