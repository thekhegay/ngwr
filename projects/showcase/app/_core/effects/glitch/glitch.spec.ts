import { Component, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GLITCH_BURST_MAX,
  GLITCH_BURST_MIN,
  GLITCH_COOLDOWN,
  GLITCH_DELAY,
  GLITCH_GAP_MAX,
  GLITCH_GAP_MIN,
  Glitch,
  glitchBurstMs,
  glitchGapMs,
  glitchVariation,
} from './glitch';

@Component({
  imports: [Glitch],
  template: `<h2 ngwrGlitch>{{ title() }}</h2>`,
})
class Host {
  readonly title = signal('404');
}

/** The host is a box-less wrapper and the text sits in a child the host does not own, as on the 404 page. */
@Component({
  imports: [Glitch],
  template: `<div [ngwrGlitch]="selector()" style="display: contents">
    <p class="desc">Nothing here</p>
    <h2 class="title">404</h2>
    <button type="button">Go home</button>
  </div>`,
})
class TargetHost {
  readonly selector = signal<string | null>('.title');
}

@Component({
  imports: [Glitch],
  template: `<a href="#"><span ngwrGlitch>Go</span></a>`,
})
class FocusableHost {}

class StubIntersectionObserver {
  static instances: StubIntersectionObserver[] = [];
  readonly disconnect = vi.fn();
  readonly observe = vi.fn();
  constructor(
    private readonly callback: IntersectionObserverCallback,
    public readonly options?: IntersectionObserverInit
  ) {
    StubIntersectionObserver.instances.push(this);
  }
  fire(isIntersecting: boolean): void {
    const entry = { isIntersecting } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

interface PlatformStub {
  readonly prefersReducedMotion: WritableSignal<boolean>;
  readonly pageVisible: WritableSignal<boolean>;
}

const stub = (reduced = false): PlatformStub => ({ prefersReducedMotion: signal(reduced), pageVisible: signal(true) });

const platform = (value: PlatformStub): unknown => ({ provide: WrPlatform, useValue: value });

const COPY = '.ngwr-glitch__copy';

const bursting = (el: HTMLElement): boolean => el.classList.contains('ngwr-glitch--burst');

const copies = (el: HTMLElement): HTMLElement[] => Array.from(el.querySelectorAll<HTMLElement>(COPY));

describe('glitch timing', () => {
  it('walks a low-discrepancy sequence: every value in (0, 1), no two neighbours alike, the same every time', () => {
    const values = Array.from({ length: 50 }, (_, i) => glitchVariation(i + 1));
    for (const v of values) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
    for (let i = 1; i < values.length; i++) expect(Math.abs(values[i] - values[i - 1])).toBeGreaterThan(0.2);
    expect(values).toEqual(Array.from({ length: 50 }, (_, i) => glitchVariation(i + 1)));
  });

  it('keeps a burst between 300 and 500 ms and the quiet after it between 5 and 8 s', () => {
    for (let n = 1; n <= 100; n++) {
      expect(glitchBurstMs(n)).toBeGreaterThanOrEqual(GLITCH_BURST_MIN);
      expect(glitchBurstMs(n)).toBeLessThanOrEqual(GLITCH_BURST_MAX);
      expect(glitchGapMs(n)).toBeGreaterThanOrEqual(GLITCH_GAP_MIN);
      expect(glitchGapMs(n)).toBeLessThanOrEqual(GLITCH_GAP_MAX);
    }
    expect(GLITCH_BURST_MIN).toBe(300);
    expect(GLITCH_BURST_MAX).toBe(500);
    expect(GLITCH_GAP_MIN).toBe(5000);
    expect(GLITCH_GAP_MAX).toBe(8000);
  });

  it('varies from one burst to the next, so the cadence is not a metronome', () => {
    const bursts = new Set(Array.from({ length: 10 }, (_, i) => glitchBurstMs(i + 1)));
    const gaps = new Set(Array.from({ length: 10 }, (_, i) => glitchGapMs(i + 1)));
    expect(bursts.size).toBe(10);
    expect(gaps.size).toBe(10);
  });

  it('keeps two burst starts more than a second apart, through the shortest burst and the cooldown', () => {
    expect(GLITCH_BURST_MIN + GLITCH_COOLDOWN).toBeGreaterThan(1000);
  });
});

describe('Glitch', () => {
  const render = async <T>(
    host: new () => T,
    providers: unknown[] = [platform(stub())]
  ): Promise<ReturnType<typeof TestBed.createComponent<T>>> => {
    TestBed.configureTestingModule({ providers: providers as never[] });
    const fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    await fixture.whenStable();
    // Fake only now: the initial render and `whenStable` run on the real clock.
    vi.useFakeTimers();
    return fixture;
  };

  const target = (fixture: { nativeElement: HTMLElement }, selector = 'h2'): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>(selector)!;

  const view = (fixture: { detectChanges(): void }, intersecting: boolean): void => {
    StubIntersectionObserver.instances[0].fire(intersecting);
    fixture.detectChanges();
  };

  /** The clock runs `ms`, then the DOM catches up. */
  const tick = (fixture: { detectChanges(): void }, ms: number): void => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };

  /** Into view and through the first delay: the first burst is in flight. */
  const burst = (fixture: { detectChanges(): void }): void => {
    view(fixture, true);
    tick(fixture, GLITCH_DELAY);
  };

  beforeEach(() => {
    StubIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('marks the target, watches for most of it to be in view and sits still until then', async () => {
    const fixture = await render(Host);
    const el = target(fixture);

    expect(el.classList.contains('ngwr-glitch')).toBe(true);
    expect(StubIntersectionObserver.instances[0].options?.threshold).toBeGreaterThanOrEqual(0.5);
    expect(StubIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(el);

    tick(fixture, 60_000);
    expect(bursting(el)).toBe(false);
    expect(copies(el)).toHaveLength(0);
  });

  it('bursts after the first delay, for the first burst length, then rests for the gap and bursts again', async () => {
    const fixture = await render(Host);
    const el = target(fixture);

    view(fixture, true);
    tick(fixture, GLITCH_DELAY - 1);
    expect(bursting(el)).toBe(false);

    tick(fixture, 1);
    expect(bursting(el)).toBe(true);
    expect(el.style.getPropertyValue('--ngwr-glitch-burst')).toBe(`${glitchBurstMs(1)}ms`);
    expect(copies(el)).toHaveLength(2);

    tick(fixture, glitchBurstMs(1) - 1);
    expect(bursting(el)).toBe(true);

    tick(fixture, 1);
    expect(bursting(el)).toBe(false);
    expect(copies(el)).toHaveLength(0);
    expect(el.style.getPropertyValue('--ngwr-glitch-burst')).toBe('');

    tick(fixture, glitchGapMs(1) - 1);
    expect(bursting(el)).toBe(false);

    tick(fixture, 1);
    expect(bursting(el)).toBe(true);
    expect(el.style.getPropertyValue('--ngwr-glitch-burst')).toBe(`${glitchBurstMs(2)}ms`);

    tick(fixture, glitchBurstMs(2));
    expect(bursting(el)).toBe(false);
  });

  it('copies the text into two aria-hidden spans, out of the selection, and leaves the text node as it was', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const text = el.firstChild!;
    expect(text.nodeType).toBe(Node.TEXT_NODE);

    burst(fixture);

    const [a, b] = copies(el);
    expect(a.textContent).toBe('404');
    expect(b.textContent).toBe('404');
    expect(a.getAttribute('aria-hidden')).toBe('true');
    expect(b.getAttribute('aria-hidden')).toBe('true');
    expect(a.classList.contains('ngwr-glitch__copy--a')).toBe(true);
    expect(b.classList.contains('ngwr-glitch__copy--b')).toBe(true);
    expect(el.firstChild).toBe(text);
    expect(text.textContent).toBe('404');
    expect(el.getAttribute('aria-hidden')).toBeNull();
    // The accessible text is the one node, read once.
    expect(Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE)).toEqual([text]);

    tick(fixture, GLITCH_BURST_MAX);
    expect(Array.from(el.childNodes)).toEqual([text]);
  });

  it('keeps a binding live and copies the current text at each burst', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    burst(fixture);
    expect(copies(el)[0].textContent).toBe('404');

    fixture.componentInstance.title.set('410');
    fixture.detectChanges();
    expect(el.firstChild!.textContent).toBe('410');

    tick(fixture, glitchBurstMs(1) + glitchGapMs(1));
    expect(bursting(el)).toBe(true);
    expect(copies(el)[0].textContent).toBe('410');
  });

  it('bursts at once on hover or focus while waiting, never mid-burst or in the cooldown after one', async () => {
    const fixture = await render(FocusableHost);
    const el = target(fixture, 'span');
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('a')!;

    // Off: not in view yet.
    link.dispatchEvent(new Event('pointerenter'));
    expect(bursting(el)).toBe(false);

    // During the first delay: the burst comes forward.
    view(fixture, true);
    link.dispatchEvent(new Event('pointerenter'));
    expect(bursting(el)).toBe(true);
    const first = glitchBurstMs(1);

    // In flight: nothing restarts, the burst keeps its length.
    tick(fixture, first - 1);
    link.dispatchEvent(new Event('pointerenter'));
    link.dispatchEvent(new Event('focusin', { bubbles: true }));
    expect(bursting(el)).toBe(true);
    expect(el.style.getPropertyValue('--ngwr-glitch-burst')).toBe(`${first}ms`);
    tick(fixture, 1);
    expect(bursting(el)).toBe(false);

    // Cooldown: ignored.
    tick(fixture, GLITCH_COOLDOWN - 1);
    link.dispatchEvent(new Event('pointerenter'));
    expect(bursting(el)).toBe(false);

    // Waiting: a focus brings the next burst forward.
    tick(fixture, 1);
    link.dispatchEvent(new Event('focusin', { bubbles: true }));
    expect(bursting(el)).toBe(true);
    expect(el.style.getPropertyValue('--ngwr-glitch-burst')).toBe(`${glitchBurstMs(2)}ms`);
  });

  it('cannot be made to flash more than once in any one second, however the pointer moves', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    view(fixture, true);

    let starts = 0;
    let was = false;
    const window: number[] = [];
    for (let t = 0; t < 30_000; t += 10) {
      el.dispatchEvent(new Event('pointerenter'));
      tick(fixture, 10);
      const now = bursting(el);
      if (now && !was) {
        starts++;
        window.push(t);
        while (window[0] <= t - 1000) window.shift();
        expect(window.length).toBeLessThanOrEqual(1);
      }
      was = now;
    }
    expect(starts).toBeGreaterThan(10);
  });

  it('reads hover and focus on the host itself when nothing above it is focusable', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    view(fixture, true);

    el.dispatchEvent(new Event('pointerenter'));

    expect(bursting(el)).toBe(true);
  });

  it('stops mid-burst when the target leaves the viewport and starts over, with the delay, when it comes back', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    burst(fixture);
    expect(copies(el)).toHaveLength(2);

    view(fixture, false);
    expect(bursting(el)).toBe(false);
    expect(copies(el)).toHaveLength(0);
    expect(el.style.getPropertyValue('--ngwr-glitch-burst')).toBe('');

    tick(fixture, 60_000);
    expect(bursting(el)).toBe(false);

    view(fixture, true);
    tick(fixture, GLITCH_DELAY - 1);
    expect(bursting(el)).toBe(false);
    tick(fixture, 1);
    expect(bursting(el)).toBe(true);
    expect(StubIntersectionObserver.instances[0].disconnect).not.toHaveBeenCalled();
  });

  it('stops while the document is hidden and starts over when it is shown', async () => {
    const page = stub();
    const fixture = await render(Host, [platform(page)]);
    const el = target(fixture);
    burst(fixture);

    page.pageVisible.set(false);
    fixture.detectChanges();
    expect(bursting(el)).toBe(false);
    expect(copies(el)).toHaveLength(0);
    tick(fixture, 60_000);
    expect(bursting(el)).toBe(false);

    page.pageVisible.set(true);
    fixture.detectChanges();
    tick(fixture, GLITCH_DELAY);
    expect(bursting(el)).toBe(true);
  });

  it('stops when motion is reduced while it runs', async () => {
    const page = stub();
    const fixture = await render(Host, [platform(page)]);
    const el = target(fixture);
    burst(fixture);

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();

    expect(bursting(el)).toBe(false);
    expect(copies(el)).toHaveLength(0);
    tick(fixture, 60_000);
    expect(bursting(el)).toBe(false);
  });

  it('glitches the descendant a selector names, observes it, and listens on it, not on the host', async () => {
    const fixture = await render(TargetHost);
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('div')!;
    const title = target(fixture, '.title');
    const desc = target(fixture, '.desc');

    expect(title.classList.contains('ngwr-glitch')).toBe(true);
    expect(host.classList.contains('ngwr-glitch')).toBe(false);
    expect(desc.classList.contains('ngwr-glitch')).toBe(false);
    expect(StubIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(title);

    burst(fixture);
    expect(bursting(title)).toBe(true);
    expect(copies(title)).toHaveLength(2);
    expect(copies(title)[0].textContent).toBe('404');
    expect(copies(desc)).toHaveLength(0);
    expect(bursting(host)).toBe(false);

    // A focus on the host's button is not about the heading; a pointer on the heading is.
    tick(fixture, glitchBurstMs(1) + GLITCH_COOLDOWN);
    expect(bursting(title)).toBe(false);
    host.querySelector('button')!.dispatchEvent(new Event('focusin', { bubbles: true }));
    expect(bursting(title)).toBe(false);
    title.dispatchEvent(new Event('pointerenter'));
    expect(bursting(title)).toBe(true);
  });

  it('does nothing when the selector matches nothing', async () => {
    TestBed.configureTestingModule({ providers: [platform(stub())] as never[] });
    const fixture = TestBed.createComponent(TargetHost);
    fixture.componentInstance.selector.set('.missing');
    fixture.detectChanges();
    await fixture.whenStable();
    vi.useFakeTimers();
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('div')!;

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(host.querySelector('.ngwr-glitch')).toBeNull();
    host.dispatchEvent(new Event('pointerenter'));
    tick(fixture, 60_000);
    expect(host.querySelectorAll(COPY)).toHaveLength(0);
  });

  it('does nothing under reduced motion', async () => {
    const fixture = await render(Host, [platform(stub(true))]);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(el.className).toBe('');
    el.dispatchEvent(new Event('pointerenter'));
    tick(fixture, 60_000);
    expect(copies(el)).toHaveLength(0);
  });

  it('does nothing on the server', async () => {
    const fixture = await render(Host, [{ provide: PLATFORM_ID, useValue: 'server' }]);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(el.className).toBe('');
    tick(fixture, 60_000);
    expect(copies(el)).toHaveLength(0);
  });

  it('does nothing without IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const fixture = await render(Host);
    const el = target(fixture);

    el.dispatchEvent(new Event('pointerenter'));
    tick(fixture, 60_000);

    expect(el.className).toBe('');
    expect(copies(el)).toHaveLength(0);
  });

  it('does nothing under forced colours', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(forced-colors: active)' }))
    );
    const fixture = await render(Host);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(el.className).toBe('');
  });

  it('stops observing, drops its listeners and restores the target on destroy', async () => {
    const fixture = await render(TargetHost);
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('div')!;
    const title = target(fixture, '.title');
    const observer = StubIntersectionObserver.instances[0];
    const text = title.firstChild!;
    burst(fixture);
    expect(copies(title)).toHaveLength(2);

    fixture.destroy();

    expect(observer.disconnect).toHaveBeenCalled();
    expect(title.className).toBe('title');
    expect(title.getAttribute('style')).toBeFalsy();
    expect(Array.from(title.childNodes)).toEqual([text]);

    host.dispatchEvent(new Event('pointerenter'));
    tick(fixture, 60_000);
    expect(title.className).toBe('title');
    expect(copies(title)).toHaveLength(0);
  });
});
