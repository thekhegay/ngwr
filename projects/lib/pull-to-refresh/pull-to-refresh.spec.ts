import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrHaptics } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrPullToRefresh } from './pull-to-refresh';

@Component({
  imports: [WrPullToRefresh],
  template: `
    <wr-pull-to-refresh
      [refreshing]="refreshing()"
      [disabled]="disabled()"
      [threshold]="threshold()"
      (refresh)="refreshes = refreshes + 1"
    >
      <div class="row">row</div>
    </wr-pull-to-refresh>
  `,
})
class Host {
  readonly refreshing = signal(false);
  readonly disabled = signal(false);
  readonly threshold = signal(64);
  refreshes = 0;
}

/**
 * The gesture is touch-only, and jsdom implements neither `TouchEvent` nor
 * scrolling — so touches are plain events carrying the two fields the component
 * reads, and `scrollTop` is defined on the host. What that leaves testable is the
 * state machine, which is the part with the bugs in it: the FEEL needs a device.
 *
 * Note the rubber band: `distance` is half the finger travel, so a 64px threshold
 * arms at 128px of pull.
 */
describe('WrPullToRefresh', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let haptics: { impact: ReturnType<typeof vi.fn> };

  const host = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-pull-to-refresh')!;
  const indicator = (): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-pull-to-refresh__indicator');
  const content = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-pull-to-refresh__content')!;

  /** A touch event with as many fingers as `ys` has entries. */
  const touch = (type: string, ...ys: number[]): Event => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { touches: ys.map(clientY => ({ clientY })) });
    return event;
  };

  const send = (type: string, ...ys: number[]): Event => {
    const event = touch(type, ...ys);
    host().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  /** Pull from 0 to `to` pixels of finger travel. */
  const pull = (to: number): void => {
    send('touchstart', 0);
    send('touchmove', to);
  };

  const scrolledTo = (top: number): void => {
    Object.defineProperty(host(), 'scrollTop', { value: top, configurable: true });
  };

  beforeEach(() => {
    haptics = { impact: vi.fn() };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: WrHaptics, useValue: haptics }] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    scrolledTo(0);
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('shows nothing at rest', () => {
    expect(indicator()).toBeNull();
    expect(content().style.transform).toBe('');
    expect(host().className).toContain('wr-pull-to-refresh--animating');
  });

  it('follows the finger at half its travel', () => {
    pull(100);

    expect(indicator()!.style.height).toBe('50px');
    expect(content().style.transform).toBe('translateY(50px)');
    expect(host().className).not.toContain('wr-pull-to-refresh--animating');
  });

  it('takes the gesture over from native scrolling only while pulling down', () => {
    send('touchstart', 0);
    expect(send('touchmove', 100).defaultPrevented).toBe(true);
    expect(send('touchmove', -20).defaultPrevented).toBe(false);
  });

  it('caps the pull well past the threshold', () => {
    pull(1000);

    // 1.75 × 64: the band stops stretching rather than following the arm.
    expect(indicator()!.style.height).toBe('112px');
  });

  it('refreshes on a release past the threshold, once', () => {
    pull(140);
    send('touchend');

    expect(fixture.componentInstance.refreshes).toBe(1);

    send('touchend');
    expect(fixture.componentInstance.refreshes).toBe(1);
  });

  it('lets go without refreshing when the pull is short', () => {
    pull(60);
    send('touchend');

    expect(fixture.componentInstance.refreshes).toBe(0);
    expect(indicator()).toBeNull();
  });

  it('abandons a cancelled pull instead of refreshing on it', () => {
    // `touchcancel` used to route straight into the release handler, so an
    // interruption — a call, a notification, a palm on the bezel — reloaded the
    // list on the user's behalf, past the threshold they had not let go at.
    pull(140);
    send('touchcancel');

    expect(fixture.componentInstance.refreshes).toBe(0);
    expect(indicator()).toBeNull();
  });

  it('keeps the origin when a second finger joins mid-pull', () => {
    // `touches[0]` on the second `touchstart` is the FIRST finger at its current
    // position, so re-reading it as the origin collapsed the pull in progress.
    send('touchstart', 0);
    send('touchmove', 100);
    send('touchstart', 100, 100);
    send('touchmove', 140);

    expect(indicator()!.style.height).toBe('70px');
  });

  it('taps once when the pull arms, and not again while it stretches', () => {
    send('touchstart', 0);
    send('touchmove', 100);
    expect(haptics.impact).not.toHaveBeenCalled();

    send('touchmove', 140);
    expect(haptics.impact).toHaveBeenCalledWith('light');

    send('touchmove', 200);
    expect(haptics.impact).toHaveBeenCalledTimes(1);
  });

  it('hands back to native scrolling once the content has scrolled off the top', () => {
    send('touchstart', 0);
    send('touchmove', 100);
    scrolledTo(20);
    send('touchmove', 140);

    expect(indicator()).toBeNull();
  });

  it('does not start a pull when the list is already scrolled', () => {
    scrolledTo(50);
    pull(200);

    expect(indicator()).toBeNull();
  });

  it('holds the indicator open for as long as the refresh runs', () => {
    fixture.componentInstance.refreshing.set(true);
    fixture.detectChanges();
    expect(indicator()!.style.height).toBe('64px');

    fixture.componentInstance.refreshing.set(false);
    fixture.detectChanges();
    expect(indicator()).toBeNull();
  });

  it('ignores a gesture that starts while a refresh is in flight', () => {
    fixture.componentInstance.refreshing.set(true);
    fixture.detectChanges();
    pull(200);
    send('touchend');

    expect(fixture.componentInstance.refreshes).toBe(0);
    expect(indicator()!.style.height).toBe('64px');
  });

  it('abandons a drag when a refresh starts underneath it', () => {
    pull(140);
    fixture.componentInstance.refreshing.set(true);
    fixture.detectChanges();
    send('touchmove', 200);

    expect(host().className).toContain('wr-pull-to-refresh--animating');
    expect(indicator()!.style.height).toBe('64px');
  });

  it('does nothing at all while disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    pull(200);
    send('touchend');

    expect(fixture.componentInstance.refreshes).toBe(0);
    expect(indicator()).toBeNull();
  });

  it('honours the threshold it was given, with a floor', () => {
    fixture.componentInstance.threshold.set(200);
    fixture.detectChanges();
    pull(300);
    send('touchend');
    expect(fixture.componentInstance.refreshes).toBe(0);

    fixture.componentInstance.threshold.set(1);
    fixture.detectChanges();
    // Floored at 24, so 40px of travel (20px of pull) is still not enough.
    pull(40);
    send('touchend');
    expect(fixture.componentInstance.refreshes).toBe(0);

    pull(60);
    send('touchend');
    expect(fixture.componentInstance.refreshes).toBe(1);
  });

  it('keeps the indicator out of the accessible tree', () => {
    pull(100);

    // Touch-only decoration: the spinner inside is already a named status region.
    expect(indicator()!.getAttribute('aria-hidden')).toBe('true');
  });
});
