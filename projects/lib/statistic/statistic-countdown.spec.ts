import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrStatisticCountdown } from './statistic-countdown';

/** A fixed "now", so every expected string in this file is arithmetic. */
const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

@Component({
  imports: [WrStatisticCountdown],
  template: `
    <wr-statistic-countdown
      [target]="target()"
      [format]="format()"
      [endText]="endText()"
      [tickMs]="tickMs()"
      (countdownEnd)="ended = ended + 1"
    />
  `,
})
class Host {
  readonly target = signal<Date | string | number>(NOW + HOUR);
  readonly format = signal('HH:mm:ss');
  readonly endText = signal<string | null>(null);
  readonly tickMs = signal(1000);
  ended = 0;
}

/**
 * The clock is faked for every test here: a countdown asserted against real time
 * is a countdown asserted against how long the test runner took to get here. The
 * interval lives behind `afterNextRender`, so `whenStable` is what starts it: only
 * `setInterval`, `Date` and `performance` are faked, leaving the `setTimeout`
 * that Angular's own scheduler runs on real — fake that too and `whenStable`
 * waits forever.
 */
describe('WrStatisticCountdown', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const text = (): string =>
    (fixture.nativeElement as HTMLElement).querySelector('.wr-statistic__number')!.textContent.trim();

  const mount = async (providers: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  /** Advance the faked clock and let the interval callback repaint. */
  const advance = (ms: number): void => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['setInterval', 'clearInterval', 'Date', 'performance'] });
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the time left before the first tick ever fires', async () => {
    // Seeded synchronously, because the prerendered HTML has to hold a real
    // value rather than 00:00:00.
    await mount();
    expect(text()).toBe('01:00:00');
  });

  it('counts down as the clock advances', async () => {
    await mount();
    advance(SECOND);
    expect(text()).toBe('00:59:59');

    advance(59 * SECOND);
    expect(text()).toBe('00:59:00');
  });

  it('formats days, hours, minutes and seconds as separate components', async () => {
    await mount();
    fixture.componentInstance.target.set(NOW + 2 * DAY + 3 * HOUR + 4 * MINUTE + 5 * SECOND);
    fixture.componentInstance.format.set('D days HH:mm:ss');
    fixture.detectChanges();

    // A sequential `.replace()` chain used to re-scan its own output here: the
    // `s` step matched the one inside the word "days".
    expect(text()).toBe('2 days 03:04:05');
  });

  it('zero-pads the double-letter tokens and leaves the single ones bare', async () => {
    await mount();
    fixture.componentInstance.target.set(NOW + 5 * MINUTE + 7 * SECOND);
    fixture.componentInstance.format.set('DD/D H:m:s');
    fixture.detectChanges();

    expect(text()).toBe('00/0 0:5:7');
  });

  it('renders milliseconds when asked', async () => {
    await mount();
    fixture.componentInstance.target.set(NOW + 1500);
    fixture.componentInstance.format.set('ss.SSS');
    fixture.detectChanges();

    expect(text()).toBe('01.500');
  });

  it('stops at zero, announces the end once, and swaps in the end text', async () => {
    await mount();
    fixture.componentInstance.endText.set('Live now');
    fixture.detectChanges();

    advance(HOUR);
    expect(fixture.componentInstance.ended).toBe(1);
    expect(text()).toBe('Live now');

    // Still zero, and still one event, however long the page stays open.
    advance(10 * HOUR);
    expect(fixture.componentInstance.ended).toBe(1);
    expect(text()).toBe('Live now');
  });

  it('shows zeroes rather than the end text when there is none', async () => {
    await mount();
    advance(HOUR);

    expect(text()).toBe('00:00:00');
  });

  it('restarts for a new target that is further out', async () => {
    await mount();
    advance(HOUR);
    expect(fixture.componentInstance.ended).toBe(1);

    fixture.componentInstance.target.set(NOW + HOUR + 30 * MINUTE);
    fixture.detectChanges();
    expect(text()).toBe('00:30:00');

    advance(30 * MINUTE);
    expect(fixture.componentInstance.ended).toBe(2);
  });

  it('reads a target that is already past as finished', async () => {
    await mount();
    fixture.componentInstance.target.set(NOW - HOUR);
    fixture.detectChanges();

    expect(text()).toBe('00:00:00');
  });

  it('accepts a Date and an ISO string as well as a timestamp', async () => {
    await mount();
    for (const target of [new Date(NOW + HOUR), new Date(NOW + HOUR).toISOString()]) {
      fixture.componentInstance.target.set(target);
      fixture.detectChanges();
      expect(text()).toBe('01:00:00');
    }
  });

  it('shows zeroes for a target that is not a date at all, and never says it ended', async () => {
    // `new Date('nope').getTime()` is NaN, which used to reach the screen as
    // `NaN:NaN:NaN` — and a guard that only cleaned up the text would have fired
    // `countdownEnd` for a target the countdown never reached.
    await mount();
    fixture.componentInstance.target.set('not a date');
    fixture.detectChanges();

    expect(text()).toBe('00:00:00');
    advance(10 * SECOND);
    expect(text()).toBe('00:00:00');
    expect(fixture.componentInstance.ended).toBe(0);
  });

  it('ticks on the interval it was given', async () => {
    const spy = vi.spyOn(globalThis, 'setInterval');
    await mount();

    expect(spy).toHaveBeenLastCalledWith(expect.any(Function), 1000);
  });

  it('runs no interval at all on the server', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(vi.getTimerCount()).toBe(0);
    expect(text()).toBe('01:00:00');
  });

  it('stops ticking when it is destroyed', async () => {
    await mount();
    expect(vi.getTimerCount()).toBe(1);

    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});

@Component({
  imports: [WrStatisticCountdown],
  template: `<wr-statistic-countdown [target]="0" [tickMs]="0" />`,
})
class BusyHost {}

describe('WrStatisticCountdown with a zero tick', () => {
  it('floors the interval at one frame rather than busy-looping', async () => {
    // `setInterval(fn, 0)` is not a countdown, and an unparsable `tickMs` used to
    // land there through NaN. The interval is created once, behind a render hook,
    // so this needs its own host rather than a later `set`.
    vi.useFakeTimers({ now: NOW, toFake: ['setInterval', 'clearInterval', 'Date', 'performance'] });
    const spy = vi.spyOn(globalThis, 'setInterval');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(BusyHost);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(spy).toHaveBeenLastCalledWith(expect.any(Function), 16);

    fixture.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
});
