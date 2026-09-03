import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrLoadingBar } from './services/loading-bar';

/**
 * A state machine whose whole output is a number between 0 and 1, so every
 * assertion here is on `progress()` / `state()` — and on the timers, because
 * what makes this service subtle is that both of its transitions are deferred:
 * a 150 ms trickle and a 220 ms hold at 100%. Fake timers make those the
 * subject rather than a source of flake.
 */
describe('WrLoadingBar', () => {
  const setup = (platform: 'browser' | 'server' = 'browser'): WrLoadingBar => {
    TestBed.resetTestingModule();
    // No router anywhere: the service names none. Navigations reach it only
    // through `provideWrLoadingBarRouter()` from `ngwr/loading-bar/router`,
    // which has its own spec next to it.
    TestBed.configureTestingModule({
      providers: platform === 'server' ? [{ provide: PLATFORM_ID, useValue: 'server' }] : [],
    });
    return TestBed.inject(WrLoadingBar);
  };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts at rest', () => {
    const bar = setup();
    expect([bar.progress(), bar.state()]).toEqual([0, 'idle']);
  });

  it('seeds and trickles upward while a task is running', () => {
    const bar = setup();
    bar.start();
    expect([bar.progress(), bar.state()]).toEqual([0.08, 'running']);

    vi.advanceTimersByTime(150);
    const first = bar.progress();
    vi.advanceTimersByTime(150);

    expect(first).toBeGreaterThan(0.08);
    expect(bar.progress()).toBeGreaterThan(first);
  });

  it('never reaches 100% on its own', () => {
    const bar = setup();
    bar.start();
    vi.advanceTimersByTime(150 * 200);

    // The final jump has to mean "done". A trickle that arrives at 1 by itself
    // spends that signal on nothing.
    expect(bar.progress()).toBeLessThan(0.9);
  });

  it('holds at 100% and then clears', () => {
    const bar = setup();
    bar.start();
    bar.complete();
    expect([bar.progress(), bar.state()]).toEqual([1, 'completing']);

    vi.advanceTimersByTime(220);
    expect([bar.progress(), bar.state()]).toEqual([0, 'idle']);
  });

  it('counts overlapping tasks and only finishes on the last one', () => {
    const bar = setup();
    bar.start();
    bar.start();
    bar.complete();

    // The interceptor case: two requests in flight, one returns. Finishing here
    // would clear the bar while the second is still running.
    expect(bar.state()).toBe('running');
    expect(bar.progress()).toBeLessThan(1);

    bar.complete();
    expect(bar.progress()).toBe(1);
  });

  it('re-seeds a task that starts inside the 100% hold', () => {
    const bar = setup();
    bar.start();
    bar.complete();
    expect(bar.progress()).toBe(1);

    // Inside the 220 ms window — a redirecting route guard lands here on every
    // navigation, and so do back-to-back interceptor requests.
    bar.start();
    expect(bar.progress()).toBe(0.08);

    const seeded = bar.progress();
    vi.advanceTimersByTime(150);
    // Left at 1, the trickle formula approaches 0.9 from ABOVE: the bar would
    // sit at ~99% and creep BACKWARDS for the whole task.
    expect(bar.progress()).toBeGreaterThan(seeded);
  });

  it('does not let a stale hold-timer cut a later one short', () => {
    const bar = setup();
    bar.start();
    bar.complete(); // hold scheduled for +220

    vi.advanceTimersByTime(100);
    bar.start();
    vi.advanceTimersByTime(50);
    bar.complete(); // t+150: this hold owns the bar until t+370

    vi.advanceTimersByTime(70); // t+220 — where the FIRST hold's timer lands
    expect(bar.progress()).toBe(1);

    vi.advanceTimersByTime(150); // t+370
    expect(bar.progress()).toBe(0);
  });

  it('reset() clears immediately, without the victory lap', () => {
    const bar = setup();
    bar.start();
    bar.reset();

    expect([bar.progress(), bar.state()]).toEqual([0, 'idle']);
    vi.advanceTimersByTime(1000);
    expect(bar.progress()).toBe(0);
  });

  it('ignores a complete() with nothing running', () => {
    const bar = setup();
    bar.complete();

    expect([bar.progress(), bar.state()]).toEqual([0, 'idle']);
  });

  describe('on the server', () => {
    it('leaves nothing painted for the prerenderer to serialize', () => {
      const bar = setup('server');
      bar.start();
      bar.complete();

      // The 100% is cleared by a `setTimeout` that never runs before the HTML
      // is serialized, so a bar left at 1 here ships as `width: 100%` on every
      // prerendered page — a full primary bar across the top of every cold
      // load until hydration. 193 of the showcase's 217 pages had exactly that.
      expect([bar.progress(), bar.state()]).toEqual([0, 'idle']);
    });

    it('schedules no interval inside the prerender worker', () => {
      const setInterval = vi.spyOn(globalThis, 'setInterval');
      try {
        setup('server').start();
        expect(setInterval).not.toHaveBeenCalled();
      } finally {
        setInterval.mockRestore();
      }
    });
  });
});
