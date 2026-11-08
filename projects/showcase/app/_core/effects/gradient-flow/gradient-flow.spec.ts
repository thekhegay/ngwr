import { Component, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GRADIENT_FLOW_RUN, GradientFlow } from './gradient-flow';

@Component({
  imports: [GradientFlow],
  template: `<h3 ngwrGradientFlow>{{ name() }}</h3>`,
})
class Host {
  readonly name = signal('ngtrue');
}

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

describe('GradientFlow', () => {
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
    fixture.nativeElement.querySelector<HTMLElement>('.ngwr-gradient-flow')!;

  const view = (fixture: { detectChanges(): void }, intersecting: boolean): void => {
    StubIntersectionObserver.instances[0].fire(intersecting);
    fixture.detectChanges();
  };

  const running = (el: HTMLElement): boolean => el.classList.contains(GRADIENT_FLOW_RUN);

  beforeEach(() => {
    StubIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('carries the static gradient class from the first render and watches for any part of the host in view', async () => {
    const fixture = await render();
    const el = target(fixture);

    expect(el.className).toBe('ngwr-gradient-flow');
    expect(StubIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(el);
    expect(StubIntersectionObserver.instances[0].options?.threshold ?? 0).toBe(0);
  });

  it('runs while in view and never touches the text', async () => {
    const fixture = await render();
    const el = target(fixture);
    const nodes = Array.from(el.childNodes);

    view(fixture, true);

    expect(running(el)).toBe(true);
    expect(Array.from(el.childNodes)).toEqual(nodes);
    expect(el.children).toHaveLength(0);
    expect(el.textContent).toBe('ngtrue');
    expect(el.getAttribute('aria-hidden')).toBeNull();
    expect(el.getAttribute('style')).toBeNull();
  });

  it('keeps a binding live inside the host', async () => {
    const fixture = await render();
    const el = target(fixture);
    view(fixture, true);

    fixture.componentInstance.name.set('ngwr');
    fixture.detectChanges();

    expect(el.textContent).toBe('ngwr');
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

  it('pauses when motion is reduced while it runs', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    const el = target(fixture);
    view(fixture, true);

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();

    expect(running(el)).toBe(false);
    expect(el.className).toBe('ngwr-gradient-flow');
  });

  it('keeps the static gradient and never runs under reduced motion', async () => {
    const fixture = await render([platform(stub(true))]);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(el.className).toBe('ngwr-gradient-flow');
  });

  it('renders the static gradient class on the server and nothing else', async () => {
    const fixture = await render([{ provide: PLATFORM_ID, useValue: 'server' }]);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(el.className).toBe('ngwr-gradient-flow');
  });

  it('stays static without IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const fixture = await render();
    const el = target(fixture);

    expect(el.className).toBe('ngwr-gradient-flow');
  });

  it('stays static under forced colours', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(forced-colors: active)' }))
    );
    const fixture = await render();
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(el.className).toBe('ngwr-gradient-flow');
  });

  it('stops observing and takes the running state off on destroy', async () => {
    const fixture = await render();
    const el = target(fixture);
    const observer = StubIntersectionObserver.instances[0];
    view(fixture, true);
    expect(running(el)).toBe(true);

    fixture.destroy();

    expect(observer.disconnect).toHaveBeenCalled();
    expect(el.className).toBe('ngwr-gradient-flow');
  });
});
