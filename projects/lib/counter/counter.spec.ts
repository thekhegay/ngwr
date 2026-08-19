import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrCountUp } from './count-up';
import { WrCounter } from './counter';
import type { WrCounterMode, WrCountUpTrigger } from './interfaces';

@Component({
  imports: [WrCounter],
  template: `
    <wr-counter
      [value]="value()"
      [mode]="mode()"
      [decimals]="decimals()"
      [prefix]="prefix()"
      [suffix]="suffix()"
      [duration]="200"
    />
  `,
})
class Host {
  readonly value = signal(1234);
  readonly mode = signal<WrCounterMode>('tween');
  readonly decimals = signal(0);
  readonly prefix = signal('');
  readonly suffix = signal('');
}

@Component({
  imports: [WrCountUp],
  template: `
    <wr-count-up [to]="to()" [trigger]="trigger()" [duration]="200" (completed)="completions.set(completions() + 1)" />
  `,
})
class CountUpHost {
  readonly to = signal(1234);
  readonly trigger = signal<WrCountUpTrigger>('mount');
  readonly completions = signal(0);
}

/** jsdom has no `IntersectionObserver`, and `trigger="visible"` starts one on first render. */
function stubIntersectionObserver(): void {
  class StubObserver {
    observe(): void {
      /* never intersects — the point is what shows BEFORE it does */
    }
    disconnect(): void {
      /* nothing to release in the stub */
    }
  }
  vi.stubGlobal('IntersectionObserver', StubObserver);
}

/** The service stub a reader who asked for less motion arrives as. */
const reducedMotion = (): unknown => ({
  provide: WrPlatform,
  useValue: {
    isBrowser: true,
    isServer: false,
    userAgent: null,
    prefersDark: signal(false).asReadonly(),
    prefersReducedMotion: signal(true).asReadonly(),
  },
});

/**
 * The animation is driven by `requestAnimationFrame`, which jsdom does schedule — but the
 * end STATE is what a consumer and a screen reader see, so that is what is asserted, with
 * the frames advanced by hand where the journey matters.
 *
 * In odometer mode the visible markup is ten digits per column picked by a transform, so it
 * carries no readable text at all; `.wr-counter__sr-only` is the node that holds the real
 * value, and it is what both assistive tech and the prerendered HTML get.
 */
describe('WrCounter', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  /** The node that carries the real value for assistive tech and prerendered HTML. */
  const srText = (): string => root().querySelector('.wr-counter__sr-only')?.textContent?.trim() ?? '';
  const anyText = (): string => root().textContent.replace(/\s+/g, ' ').trim();

  const mount = (providers: unknown[] = []): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  /**
   * Run the `requestAnimationFrame` tween to its end, deterministically.
   *
   * An earlier version of this polled real time until the rendered text stopped changing,
   * which is a trap: "not changing yet" and "finished" look identical, so on a slower
   * machine it returned with the counter still on 0 — green here, red on CI. Faking the
   * clock and the frame callback removes the machine from the question entirely.
   */
  const finish = (): void => {
    vi.advanceTimersByTime(400);
    fixture.detectChanges();
  };

  beforeEach(() => {
    // `performance` and `requestAnimationFrame` are both faked: the tick reads the first and
    // is scheduled by the second, so faking one without the other stalls the tween.
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
    });
    mount();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('lands on the value it was given', () => {
    finish();
    expect(anyText()).toContain('1,234');
  });

  it('reaches a new value when one arrives', () => {
    finish();
    fixture.componentInstance.value.set(9876);
    fixture.detectChanges();
    finish();

    expect(anyText()).toContain('9,876');
  });

  it('formats with the decimals, prefix and suffix it was given', () => {
    fixture.componentInstance.decimals.set(2);
    fixture.componentInstance.prefix.set('$');
    fixture.componentInstance.suffix.set(' USD');
    fixture.componentInstance.value.set(9.5);
    fixture.detectChanges();
    finish();

    expect(anyText()).toContain('$9.50 USD');
  });

  it('carries the real value in text in odometer mode', () => {
    // The rolling strip renders every digit 0-9 per column, so without this node a screen
    // reader would read all ten and the prerendered HTML would ship the same noise.
    fixture.componentInstance.mode.set('odometer');
    fixture.componentInstance.value.set(42);
    fixture.detectChanges();
    finish();

    expect(srText()).toBe('42');
  });

  it('shows a number rather than the word NaN', () => {
    // `Intl.NumberFormat().format(NaN)` is the literal text `NaN`, and `value` was the only
    // numeric input here with no coercion.
    fixture.componentInstance.value.set(Number.NaN);
    fixture.detectChanges();
    finish();

    expect(anyText()).not.toContain('NaN');
  });

  it('is already on the value when it renders on the server', () => {
    // No animation to run there, and the prerendered HTML has to hold the final number.
    mount([{ provide: PLATFORM_ID, useValue: 'server' }]);
    expect(anyText()).toContain('1,234');
  });

  it('skips the animation for someone who asked for less motion', () => {
    // `wr-scroll` already falls back to instant on `prefers-reduced-motion`; a component
    // whose entire purpose is a 900ms count-up was still counting.
    mount([reducedMotion()]);

    // Synchronously, with no frames advanced at all.
    expect(anyText()).toContain('1,234');
  });
});

/**
 * `<wr-count-up>` ships from the same entry point and shared none of `wr-counter`'s
 * reduced-motion handling: it ran the rAF tween whatever the reader had asked for.
 */
describe('WrCountUp', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CountUpHost>>;

  const text = (): string => (fixture.nativeElement as HTMLElement).textContent.replace(/\s+/g, ' ').trim();

  const mount = (providers: unknown[] = [], trigger: WrCountUpTrigger = 'mount'): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(CountUpHost);
    fixture.componentInstance.trigger.set(trigger);
    fixture.detectChanges();
  };

  beforeEach(() => {
    stubIntersectionObserver();
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
    });
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('starts on `from` and counts to `to` when motion is welcome', () => {
    // The control for the test below: without it, "shows 1,234 straight away" would also
    // pass on a component that never animated at all.
    mount();
    expect(text()).toBe('0');

    vi.advanceTimersByTime(400);
    fixture.detectChanges();
    expect(text()).toBe('1,234');
  });

  it('is already on the figure for someone who asked for less motion', () => {
    mount([reducedMotion()]);

    // Synchronously, with no frames advanced at all — the seed lands on the END value, so
    // there is no placeholder left on screen either. And `completed` still fires, so a
    // consumer waiting on it is not left hanging on a tween that never ran.
    expect(text()).toBe('1,234');
    expect(fixture.componentInstance.completions()).toBe(1);
  });

  it('shows the figure below the fold too, for someone who asked for less motion', () => {
    // The seed is the other half of that guard and the only half `trigger="visible"` ever
    // reaches: seeded on `from`, a number further down the page sat on the placeholder
    // until the host scrolled into view — and then had no animation to move it off.
    mount([reducedMotion()], 'visible');

    expect(text()).toBe('1,234');
  });
});
