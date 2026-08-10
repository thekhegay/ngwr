import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrCounter } from './counter';
import type { WrCounterMode } from './interfaces';

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
   * Let the `requestAnimationFrame` tween run out. Polled rather than slept for a fixed
   * time: jsdom schedules frames on a timer whose cadence is not ours to assume, so this
   * waits for the rendered text to stop changing.
   */
  const finish = async (): Promise<void> => {
    let previous = '';
    for (let i = 0; i < 40; i += 1) {
      await new Promise<void>(resolve => setTimeout(resolve, 25));
      fixture.detectChanges();
      const now = root().textContent ?? '';
      if (now === previous && i > 2) return;
      previous = now;
    }
    fixture.detectChanges();
  };

  beforeEach(() => mount());
  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('lands on the value it was given', async () => {
    await finish();
    expect(anyText()).toContain('1,234');
  });

  it('reaches a new value when one arrives', async () => {
    await finish();
    fixture.componentInstance.value.set(9876);
    fixture.detectChanges();
    await finish();

    expect(anyText()).toContain('9,876');
  });

  it('formats with the decimals, prefix and suffix it was given', async () => {
    fixture.componentInstance.decimals.set(2);
    fixture.componentInstance.prefix.set('$');
    fixture.componentInstance.suffix.set(' USD');
    fixture.componentInstance.value.set(9.5);
    fixture.detectChanges();
    await finish();

    expect(anyText()).toContain('$9.50 USD');
  });

  it('carries the real value in text in odometer mode', async () => {
    // The rolling strip renders every digit 0-9 per column, so without this node a screen
    // reader would read all ten and the prerendered HTML would ship the same noise.
    fixture.componentInstance.mode.set('odometer');
    fixture.componentInstance.value.set(42);
    fixture.detectChanges();
    await finish();

    expect(srText()).toBe('42');
  });

  it('shows a number rather than the word NaN', async () => {
    // `Intl.NumberFormat().format(NaN)` is the literal text `NaN`, and `value` was the only
    // numeric input here with no coercion.
    fixture.componentInstance.value.set(Number.NaN);
    fixture.detectChanges();
    await finish();

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
    const platform = {
      isBrowser: true,
      isServer: false,
      userAgent: null,
      prefersDark: signal(false).asReadonly(),
      prefersReducedMotion: signal(true).asReadonly(),
    };
    mount([{ provide: WrPlatform, useValue: platform }]);

    // Synchronously, with no frames advanced at all.
    expect(anyText()).toContain('1,234');
  });
});
