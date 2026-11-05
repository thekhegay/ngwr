import { EnvironmentInjector, PLATFORM_ID, type ResourceRef, createEnvironmentInjector, resource } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { wrPoll } from './wr-poll';

/**
 * One timer for every polled resource, aimed at the earliest due one. The
 * resources are real `resource()`s: the skip-while-loading rule reads their
 * status, so a stub would only prove the stub.
 */
describe('wrPoll', () => {
  let injector: EnvironmentInjector;

  const setVisibility = (state: 'visible' | 'hidden'): void => {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    TestBed.tick();
  };

  /** Runs the effects that start a load, then lets the loader's promise settle. */
  const settle = async (): Promise<void> => {
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(0);
  };

  /** Fake time moves by `ms`, with the loads it triggers settled. */
  const pass = async (ms: number): Promise<void> => {
    await vi.advanceTimersByTimeAsync(ms);
    await settle();
  };

  const poll = (
    intervalMs: number,
    loader: () => Promise<number> = () => Promise.resolve(1)
  ): { res: ResourceRef<number | undefined>; reload: MockInstance<() => boolean> } =>
    TestBed.runInInjectionContext(() => {
      const res = resource({ loader });
      const reload = vi.spyOn(res, 'reload');
      wrPoll(res, intervalMs);
      return { res, reload };
    });

  const setup = (platform: 'browser' | 'server' = 'browser'): void => {
    TestBed.configureTestingModule({
      providers: platform === 'server' ? [{ provide: PLATFORM_ID, useValue: 'server' }] : [],
    });
    injector = TestBed.inject(EnvironmentInjector);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('reloads on the interval, through one timer shared by two pollers', async () => {
    setup();
    const fast = poll(1000);
    const slow = poll(3000);
    await settle();
    expect(vi.getTimerCount()).toBe(1);

    await pass(1000);
    expect([fast.reload.mock.calls.length, slow.reload.mock.calls.length]).toEqual([1, 0]);

    await pass(2000);
    expect([fast.reload.mock.calls.length, slow.reload.mock.calls.length]).toEqual([3, 1]);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('keeps a resource in the error state polling', async () => {
    setup();
    let fail = true;
    const { res, reload } = poll(1000, () => (fail ? Promise.reject(new Error('down')) : Promise.resolve(2)));
    await settle();
    expect(res.status()).toBe('error');

    await pass(1000);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(res.status()).toBe('error');

    fail = false;
    await pass(1000);
    expect(res.status()).toBe('resolved');
    expect(res.value()).toBe(2);
  });

  it('skips a resource still loading, and takes the next turn once it settled', async () => {
    setup();
    let release: (value: number) => void = () => undefined;
    let first = true;
    const { res, reload } = poll(1000, () => {
      if (!first) return Promise.resolve(2);
      first = false;
      return new Promise<number>(resolve => (release = resolve));
    });
    await settle();
    expect(res.isLoading()).toBe(true);

    await pass(1000);
    expect(reload).not.toHaveBeenCalled();

    release(1);
    await settle();
    expect(res.isLoading()).toBe(false);

    // Not queued: the skipped turn was spent, so the next one is a full interval later.
    await pass(999);
    expect(reload).not.toHaveBeenCalled();
    await pass(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('pauses while the page is hidden and reloads an overdue resource once on return', async () => {
    setup();
    const { reload } = poll(1000);
    await settle();

    setVisibility('hidden');
    expect(vi.getTimerCount()).toBe(0);
    await pass(10_000);
    expect(reload).not.toHaveBeenCalled();

    setVisibility('visible');
    expect(reload).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);

    // A short flick leaves nothing overdue, so nothing reloads.
    await pass(500);
    setVisibility('hidden');
    await pass(100);
    setVisibility('visible');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('stops with the owner, and drops the timer with the last poller', async () => {
    setup();
    const a = createEnvironmentInjector([], injector);
    const b = createEnvironmentInjector([], injector);
    const first = a.runInContext(() => {
      const res = resource({ loader: () => Promise.resolve(1) });
      const reload = vi.spyOn(res, 'reload');
      wrPoll(res, 1000);
      return reload;
    });
    const second = b.runInContext(() => {
      const res = resource({ loader: () => Promise.resolve(1) });
      const reload = vi.spyOn(res, 'reload');
      wrPoll(res, 1000);
      return reload;
    });
    await settle();

    a.destroy();
    await pass(1000);
    expect([first.mock.calls.length, second.mock.calls.length]).toEqual([0, 1]);
    expect(vi.getTimerCount()).toBe(1);

    b.destroy();
    expect(vi.getTimerCount()).toBe(0);
    await pass(5000);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('schedules nothing on the server', async () => {
    setup('server');
    const { reload } = poll(1000);
    await settle();

    expect(vi.getTimerCount()).toBe(0);
    await pass(3000);
    expect(reload).not.toHaveBeenCalled();
  });

  it('needs an injection context and a positive interval', () => {
    setup();
    const res = TestBed.runInInjectionContext(() => resource({ loader: () => Promise.resolve(1) }));

    expect(() => wrPoll(res, 1000)).toThrow(/injection context/);
    expect(() => TestBed.runInInjectionContext(() => wrPoll(res, 0))).toThrow(/positive/);
  });
});
