import { Component, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AURORA_BANDS, AURORA_RUN, Aurora } from './aurora';

@Component({
  imports: [Aurora],
  template: `<section class="wrap">
    <ngwr-aurora />
    <p>Why ngwr</p>
  </section>`,
})
class Host {}

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

describe('Aurora', () => {
  const render = async (
    providers: unknown[] = [platform(stub())]
  ): Promise<ReturnType<typeof TestBed.createComponent<Host>>> => {
    TestBed.configureTestingModule({ providers: providers as never[] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  const target = (fixture: { nativeElement: HTMLElement }): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>('.ngwr-aurora')!;

  const bands = (el: HTMLElement): HTMLElement[] => Array.from(el.querySelectorAll<HTMLElement>('.ngwr-aurora__band'));

  const view = (fixture: { detectChanges(): void }, intersecting: boolean): void => {
    StubIntersectionObserver.instances[0].fire(intersecting);
    fixture.detectChanges();
  };

  const running = (el: HTMLElement): boolean => el.classList.contains(AURORA_RUN);

  beforeEach(() => {
    StubIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('renders one element per band, each with its own modifier, from the first render', async () => {
    const fixture = await render();
    const el = target(fixture);
    const layers = bands(el);

    expect(el.className).toBe('ngwr-aurora');
    expect(layers).toHaveLength(AURORA_BANDS);
    layers.forEach((band, i) => {
      expect(band.classList.contains(`ngwr-aurora__band--${i + 1}`)).toBe(true);
      expect(band.textContent).toBe('');
    });
  });

  it('is decorative: hidden from assistive tech, no text, nothing focusable, no inline styles', async () => {
    const fixture = await render();
    const el = target(fixture);

    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.textContent).toBe('');
    expect(el.querySelector('[tabindex], a, button')).toBeNull();
    expect(el.getAttribute('tabindex')).toBeNull();
    expect(el.getAttribute('style')).toBeNull();
    expect(el.nextElementSibling?.textContent).toBe('Why ngwr');
  });

  it('watches for any part of the host in view and runs once it is', async () => {
    const fixture = await render();
    const el = target(fixture);
    const observer = StubIntersectionObserver.instances[0];

    expect(observer.observe).toHaveBeenCalledWith(el);
    expect(observer.options?.threshold ?? 0).toBe(0);
    expect(running(el)).toBe(false);

    view(fixture, true);
    expect(running(el)).toBe(true);
  });

  it('pauses when the host leaves the viewport and runs again when it comes back, without observing anew', async () => {
    const fixture = await render();
    const el = target(fixture);
    view(fixture, true);

    view(fixture, false);
    expect(running(el)).toBe(false);

    view(fixture, true);
    expect(running(el)).toBe(true);
    expect(StubIntersectionObserver.instances).toHaveLength(1);
    expect(StubIntersectionObserver.instances[0].disconnect).not.toHaveBeenCalled();
  });

  it('pauses while the document is hidden and runs again when it is shown', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    const el = target(fixture);
    view(fixture, true);

    page.pageVisible.set(false);
    fixture.detectChanges();
    expect(running(el)).toBe(false);

    page.pageVisible.set(true);
    fixture.detectChanges();
    expect(running(el)).toBe(true);
  });

  it('pauses when motion is reduced while it runs and keeps the bands', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    const el = target(fixture);
    view(fixture, true);

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();

    expect(running(el)).toBe(false);
    expect(el.className).toBe('ngwr-aurora');
    expect(bands(el)).toHaveLength(AURORA_BANDS);
  });

  it('keeps the still picture and never runs under reduced motion', async () => {
    const fixture = await render([platform(stub(true))]);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(el.className).toBe('ngwr-aurora');
    expect(bands(el)).toHaveLength(AURORA_BANDS);
  });

  it('renders the bands on the server and observes nothing', async () => {
    const fixture = await render([{ provide: PLATFORM_ID, useValue: 'server' }]);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(el.className).toBe('ngwr-aurora');
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(bands(el)).toHaveLength(AURORA_BANDS);
  });

  it('stays still without IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const fixture = await render();
    const el = target(fixture);

    expect(el.className).toBe('ngwr-aurora');
    expect(bands(el)).toHaveLength(AURORA_BANDS);
  });

  it('never runs under forced colours, where the stylesheet draws nothing', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(forced-colors: active)' }))
    );
    const fixture = await render();
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(el.className).toBe('ngwr-aurora');
  });

  it('stops observing and takes the running state off on destroy', async () => {
    const fixture = await render();
    const el = target(fixture);
    const observer = StubIntersectionObserver.instances[0];
    view(fixture, true);
    expect(running(el)).toBe(true);

    fixture.destroy();

    expect(observer.disconnect).toHaveBeenCalled();
    expect(el.className).toBe('ngwr-aurora');
  });
});
