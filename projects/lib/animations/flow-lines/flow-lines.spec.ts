import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrFlowLines } from './flow-lines';

@Component({
  imports: [WrFlowLines],
  template: `<div class="wrap"><wr-flow-lines /></div>`,
})
class Host {}

interface FakeContext {
  readonly stroke: ReturnType<typeof vi.fn>;
  readonly moveTo: ReturnType<typeof vi.fn>;
  readonly quadraticCurveTo: ReturnType<typeof vi.fn>;
  readonly [method: string]: ReturnType<typeof vi.fn>;
}

/** jsdom has no 2D context; this one records what gets drawn. */
const fakeContext = (): FakeContext => ({
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  stroke: vi.fn(),
});

class StubResizeObserver {
  static instances: StubResizeObserver[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  constructor(private readonly callback: ResizeObserverCallback) {
    StubResizeObserver.instances.push(this);
  }
  fire(width: number, height: number): void {
    const entry = { contentRect: { width, height } } as unknown as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }
}

class StubIntersectionObserver {
  static instances: StubIntersectionObserver[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  constructor(private readonly callback: IntersectionObserverCallback) {
    StubIntersectionObserver.instances.push(this);
  }
  fire(isIntersecting: boolean): void {
    const entry = { isIntersecting } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

const platform = (reduced: boolean): unknown => ({
  provide: WrPlatform,
  useValue: { prefersReducedMotion: signal(reduced), pageVisible: signal(true) },
});

describe('WrFlowLines', () => {
  let ctx: FakeContext;
  let raf: ReturnType<typeof vi.fn>;
  let caf: ReturnType<typeof vi.fn>;

  const render = async (providers: unknown[]): Promise<ReturnType<typeof TestBed.createComponent<Host>>> => {
    TestBed.configureTestingModule({ providers: providers as never[] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    // Stubbed after the first render, so Angular's own scheduling does not count.
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', caf);
    return fixture;
  };

  const wrap = (fixture: { nativeElement: HTMLElement }): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>('.wrap')!;
  const field = (fixture: { nativeElement: HTMLElement }): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>('wr-flow-lines')!;

  beforeEach(() => {
    ctx = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ctx as unknown as CanvasRenderingContext2D
    );
    raf = vi.fn(() => 7);
    caf = vi.fn();
    StubResizeObserver.instances = [];
    StubIntersectionObserver.instances = [];
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('renders only its host on the server', async () => {
    const fixture = await render([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(field(fixture).children.length).toBe(0);
    expect(field(fixture).getAttribute('aria-hidden')).toBe('true');
    expect(StubResizeObserver.instances).toHaveLength(0);
    expect(StubIntersectionObserver.instances).toHaveLength(0);
  });

  it('appends a canvas in the browser and watches its size and visibility', async () => {
    const fixture = await render([platform(false)]);

    expect(field(fixture).querySelector('canvas.wr-flow-lines__canvas')).not.toBeNull();
    expect(StubResizeObserver.instances[0].observe).toHaveBeenCalledWith(field(fixture));
    expect(StubIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(field(fixture));
  });

  it('draws one line per 10px of width, as curves, and never starts the loop under reduced motion', async () => {
    const fixture = await render([platform(true)]);
    StubResizeObserver.instances[0].fire(800, 400);
    StubIntersectionObserver.instances[0].fire(true);

    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledTimes(81);
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();

    wrap(fixture).dispatchEvent(new MouseEvent('pointermove', { clientX: 10, clientY: 10 }));

    expect(raf).not.toHaveBeenCalled();
  });

  it('runs while on screen and stops when it leaves the viewport', async () => {
    await render([platform(false)]);
    StubResizeObserver.instances[0].fire(800, 400);
    expect(raf).not.toHaveBeenCalled();

    StubIntersectionObserver.instances[0].fire(true);
    expect(raf).toHaveBeenCalledTimes(1);

    StubIntersectionObserver.instances[0].fire(false);
    expect(caf).toHaveBeenCalledWith(7);
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it('keeps asking for the next frame while running', async () => {
    await render([platform(false)]);
    StubResizeObserver.instances[0].fire(800, 400);
    StubIntersectionObserver.instances[0].fire(true);
    const frame = raf.mock.calls[0][0] as FrameRequestCallback;

    frame(16);
    frame(32);

    expect(raf).toHaveBeenCalledTimes(3);
    expect(ctx.stroke).toHaveBeenCalledTimes(3);
  });

  it('releases everything on destroy', async () => {
    const fixture = await render([platform(false)]);
    const target = wrap(fixture);
    const removed = vi.spyOn(target, 'removeEventListener');
    StubResizeObserver.instances[0].fire(800, 400);
    StubIntersectionObserver.instances[0].fire(true);

    fixture.destroy();

    expect(caf).toHaveBeenCalledWith(7);
    expect(StubResizeObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(StubIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(removed).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removed).toHaveBeenCalledWith('pointerleave', expect.any(Function));
  });
});
