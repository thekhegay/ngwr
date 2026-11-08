import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrSignalSweep } from './signal-sweep';

@Component({
  imports: [WrSignalSweep],
  template: `<h1>Bind to <span wrSignalSweep [delay]="0">Signal Forms</span>.</h1>`,
})
class Host {}

class StubIntersectionObserver {
  static instances: StubIntersectionObserver[] = [];
  readonly disconnect = vi.fn();
  constructor(private readonly callback: IntersectionObserverCallback) {
    StubIntersectionObserver.instances.push(this);
  }
  readonly observe = vi.fn();
  fire(isIntersecting: boolean): void {
    const entry = { isIntersecting } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

const platform = (reduced: boolean): unknown => ({
  provide: WrPlatform,
  useValue: { prefersReducedMotion: signal(reduced), pageVisible: signal(true) },
});

describe('WrSignalSweep', () => {
  const render = async (providers: unknown[]): Promise<ReturnType<typeof TestBed.createComponent<Host>>> => {
    TestBed.configureTestingModule({ providers: providers as never[] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  const span = (fixture: { nativeElement: HTMLElement }): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>('span')!;

  beforeEach(() => {
    vi.useFakeTimers();
    StubIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('runs once on first view and settles when the animation ends', async () => {
    const fixture = await render([platform(false)]);
    expect(span(fixture).classList.contains('wr-signal-sweep--run')).toBe(false);

    StubIntersectionObserver.instances[0].fire(true);
    vi.advanceTimersByTime(0);
    fixture.detectChanges();

    expect(span(fixture).classList.contains('wr-signal-sweep--run')).toBe(true);
    expect(StubIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(span(fixture).textContent).toBe('Signal Forms');
    expect(span(fixture).children.length).toBe(0);

    span(fixture).dispatchEvent(new Event('animationend'));
    fixture.detectChanges();

    expect(span(fixture).classList.contains('wr-signal-sweep--run')).toBe(false);
  });

  it('does not run under reduced motion', async () => {
    const fixture = await render([platform(true)]);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(span(fixture).className).toBe('wr-signal-sweep');
  });

  it('does nothing on the server', async () => {
    const fixture = await render([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(span(fixture).className).toBe('wr-signal-sweep');
  });

  it('stops observing and waiting on destroy', async () => {
    const fixture = await render([platform(false)]);
    const observer = StubIntersectionObserver.instances[0];

    fixture.destroy();

    expect(observer.disconnect).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
