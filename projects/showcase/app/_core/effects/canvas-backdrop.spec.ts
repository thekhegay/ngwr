import {
  Component,
  type ElementRef,
  ErrorHandler,
  PLATFORM_ID,
  type WritableSignal,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type CanvasBackdrop,
  type CanvasBackdropScene,
  MAX_DPR,
  MAX_FRAME_MS,
  MAX_PIXELS,
  canvasBackdropRatio,
  createCanvasBackdrop,
} from './canvas-backdrop';

/** A scene that records every call and is `active` while `moving` is set. */
class Scene implements CanvasBackdropScene {
  moving = false;
  readonly colors = vi.fn();
  readonly layout = vi.fn();
  readonly advance = vi.fn();
  readonly draw = vi.fn();
  readonly rest = vi.fn(() => {
    this.moving = false;
  });
  readonly mounted = vi.fn();
  active(): boolean {
    return this.moving;
  }
}

let scene: Scene;

@Component({
  selector: 'ngwr-test-backdrop',
  template: '<canvas #canvas></canvas>',
})
class Backdrop {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  readonly backdrop: CanvasBackdrop = createCanvasBackdrop(() => this.canvasRef().nativeElement, scene);
}

@Component({
  imports: [Backdrop],
  template: '<section class="wrap"><ngwr-test-backdrop /></section>',
})
class Host {
  readonly child = viewChild.required(Backdrop);
}

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

interface PlatformStub {
  readonly prefersReducedMotion: WritableSignal<boolean>;
  readonly pageVisible: WritableSignal<boolean>;
}

const stub = (reduced = false): PlatformStub => ({ prefersReducedMotion: signal(reduced), pageVisible: signal(true) });

const platform = (value: PlatformStub): unknown => ({ provide: WrPlatform, useValue: value });

describe('canvasBackdropRatio', () => {
  it('follows the device ratio up to two', () => {
    expect(canvasBackdropRatio(800, 400, 1)).toBe(1);
    expect(canvasBackdropRatio(800, 400, 1.5)).toBe(1.5);
    expect(canvasBackdropRatio(800, 400, 3)).toBe(MAX_DPR);
  });

  it('lowers the ratio for a tall box so the store stays within its pixel budget, never below one', () => {
    const ratio = canvasBackdropRatio(375, 4500, 2);
    expect(ratio).toBeLessThan(2);
    expect(375 * ratio * (4500 * ratio)).toBeLessThanOrEqual(MAX_PIXELS * 1.01);

    expect(canvasBackdropRatio(100, 100_000, 2)).toBe(1);
  });
});

describe('createCanvasBackdrop', () => {
  let ctx: { setTransform: ReturnType<typeof vi.fn> };
  let getContext: MockInstance<HTMLCanvasElement['getContext']>;
  let frames: FrameRequestCallback[];
  let raf: ReturnType<typeof vi.fn>;
  let caf: ReturnType<typeof vi.fn>;
  let thrown: unknown[];
  let dpr: PropertyDescriptor | undefined;

  const render = async (
    providers: unknown[] = [platform(stub())]
  ): Promise<ReturnType<typeof TestBed.createComponent<Host>>> => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandler, useValue: { handleError: (error: unknown) => thrown.push(error) } },
        ...(providers as never[]),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', caf);
    return fixture;
  };

  const backdrop = (fixture: { componentInstance: Host }): CanvasBackdrop => fixture.componentInstance.child().backdrop;
  const canvas = (fixture: { nativeElement: HTMLElement }): HTMLCanvasElement =>
    fixture.nativeElement.querySelector<HTMLCanvasElement>('canvas')!;

  const tick = (now: number): void => {
    const pending = frames;
    frames = [];
    pending.forEach(frame => frame(now));
  };

  const layout = (width: number, height: number): void => {
    StubResizeObserver.instances[0].fire(width, height);
    tick(0);
    raf.mockClear();
  };

  const inView = (): void => StubIntersectionObserver.instances[0].fire(true);

  beforeEach(() => {
    thrown = [];
    scene = new Scene();
    ctx = { setTransform: vi.fn() };
    getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => ctx as unknown as CanvasRenderingContext2D);
    frames = [];
    raf = vi.fn((frame: FrameRequestCallback) => frames.push(frame));
    caf = vi.fn();
    StubResizeObserver.instances = [];
    StubIntersectionObserver.instances = [];
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
    dpr = Object.getOwnPropertyDescriptor(document.defaultView!, 'devicePixelRatio');
  });

  afterEach(() => {
    if (dpr) Object.defineProperty(document.defaultView!, 'devicePixelRatio', dpr);
    else Reflect.deleteProperty(document.defaultView!, 'devicePixelRatio');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
    expect(thrown).toEqual([]);
  });

  it('does nothing on the server: no context, no observers, no scene calls, and sync is inert', async () => {
    const fixture = await render([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(getContext).not.toHaveBeenCalled();
    expect(StubResizeObserver.instances).toHaveLength(0);
    expect(scene.colors).not.toHaveBeenCalled();
    expect(backdrop(fixture).ctx).toBeNull();
    scene.moving = true;
    backdrop(fixture).sync();
    expect(raf).not.toHaveBeenCalled();
  });

  it('mounts after the first render: context, colours, observers on the host, then the scene hook', async () => {
    const fixture = await render();
    const host = (fixture.nativeElement as HTMLElement).querySelector('ngwr-test-backdrop');

    expect(getContext).toHaveBeenCalledWith('2d');
    expect(backdrop(fixture).ctx).toBe(ctx);
    expect(scene.colors).toHaveBeenCalledWith(canvas(fixture));
    expect(StubResizeObserver.instances[0].observe).toHaveBeenCalledWith(host);
    expect(StubIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(host);
    expect(scene.mounted).toHaveBeenCalledTimes(1);
    expect(scene.mounted.mock.invocationCallOrder[0]).toBeGreaterThan(scene.colors.mock.invocationCallOrder[0]);
  });

  it('sizes the store at the capped ratio, sets the transform, lays the scene out and draws it once', async () => {
    Object.defineProperty(document.defaultView!, 'devicePixelRatio', { value: 3, configurable: true });
    const fixture = await render();

    layout(800, 400);

    expect(canvas(fixture).width).toBe(800 * MAX_DPR);
    expect(canvas(fixture).height).toBe(400 * MAX_DPR);
    expect(ctx.setTransform).toHaveBeenCalledWith(MAX_DPR, 0, 0, MAX_DPR, 0, 0);
    expect(scene.layout).toHaveBeenCalledWith(800, 400);
    expect(scene.draw).toHaveBeenCalledTimes(1);
    expect(scene.draw).toHaveBeenCalledWith(ctx, 800, 400);
    expect(backdrop(fixture).width).toBe(800);
    expect(backdrop(fixture).height).toBe(400);
  });

  it('keeps a tall box within the pixel budget', async () => {
    Object.defineProperty(document.defaultView!, 'devicePixelRatio', { value: 2, configurable: true });
    const fixture = await render();

    layout(375, 4500);

    const { width, height } = canvas(fixture);
    expect(width * height).toBeLessThanOrEqual(MAX_PIXELS * 1.01);
    expect(width).toBeGreaterThanOrEqual(375);
  });

  it('folds a burst of size changes into one layout on the next frame and ignores an empty box', async () => {
    await render();

    StubResizeObserver.instances[0].fire(200, 100);
    StubResizeObserver.instances[0].fire(0, 0);
    StubResizeObserver.instances[0].fire(520, 260);
    expect(raf).toHaveBeenCalledTimes(1);
    expect(scene.layout).not.toHaveBeenCalled();

    tick(0);
    expect(scene.layout).toHaveBeenCalledTimes(1);
    expect(scene.layout).toHaveBeenCalledWith(520, 260);

    StubResizeObserver.instances[0].fire(0, 0);
    tick(16);
    expect(scene.layout).toHaveBeenCalledTimes(1);
  });

  it('does not start the loop for a still scene', async () => {
    await render();
    layout(400, 300);
    inView();

    expect(raf).not.toHaveBeenCalled();
    expect(scene.advance).not.toHaveBeenCalled();
  });

  it('runs while the scene is active, hands it frames no longer than the cap, and stops on its own at rest', async () => {
    const fixture = await render();
    layout(400, 300);
    inView();
    scene.draw.mockClear();

    scene.moving = true;
    backdrop(fixture).sync();
    expect(raf).toHaveBeenCalledTimes(1);
    expect(backdrop(fixture).running).toBe(true);

    tick(16);
    tick(32);
    // A frame after a long pause moves the scene by the cap, not the pause.
    tick(2000);
    expect(scene.advance).toHaveBeenCalledTimes(3);
    expect(scene.advance.mock.calls[2][0]).toBe(MAX_FRAME_MS);
    expect(scene.draw).toHaveBeenCalledTimes(3);
    expect(raf).toHaveBeenCalledTimes(4);

    scene.moving = false;
    tick(2016);
    // The last frame still drew the scene at rest, then asked for no more.
    expect(scene.draw).toHaveBeenCalledTimes(4);
    expect(raf).toHaveBeenCalledTimes(4);
    expect(backdrop(fixture).running).toBe(false);
    expect(caf).not.toHaveBeenCalled();
  });

  it('does not run off screen, starts when scrolled into view, and pauses while the document is hidden', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    layout(400, 300);

    scene.moving = true;
    backdrop(fixture).sync();
    expect(raf).not.toHaveBeenCalled();

    inView();
    expect(raf).toHaveBeenCalledTimes(1);
    const first = raf.mock.results[0].value as number;

    page.pageVisible.set(false);
    fixture.detectChanges();
    expect(caf).toHaveBeenCalledWith(first);
    expect(backdrop(fixture).running).toBe(false);

    page.pageVisible.set(true);
    fixture.detectChanges();
    expect(backdrop(fixture).running).toBe(true);
    const second = raf.mock.results[raf.mock.results.length - 1].value as number;

    StubIntersectionObserver.instances[0].fire(false);
    expect(caf).toHaveBeenCalledWith(second);
  });

  it('never runs under reduced motion and puts a moving scene to rest, drawn once', async () => {
    const fixture = await render([platform(stub(true))]);
    layout(400, 300);
    inView();
    scene.draw.mockClear();

    scene.moving = true;
    backdrop(fixture).sync();

    expect(raf).not.toHaveBeenCalled();
    expect(scene.rest).toHaveBeenCalledTimes(1);
    expect(scene.draw).toHaveBeenCalledTimes(1);
  });

  it('puts the scene to rest when motion is reduced mid-flight', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    layout(400, 300);
    inView();
    scene.moving = true;
    backdrop(fixture).sync();
    tick(16);
    const loop = raf.mock.results[raf.mock.results.length - 1].value as number;

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();

    expect(caf).toHaveBeenCalledWith(loop);
    expect(scene.rest).toHaveBeenCalledTimes(1);
    expect(scene.moving).toBe(false);
  });

  it('re-reads the colours when the scheme changes and redraws a still scene', async () => {
    await render();
    layout(400, 300);
    scene.colors.mockClear();
    scene.draw.mockClear();

    // jsdom computes `color-scheme` from an inline style; the mutation record lands in a microtask.
    document.documentElement.style.colorScheme = 'dark';
    await new Promise(resolve => setTimeout(resolve));

    expect(scene.colors).toHaveBeenCalledTimes(1);
    expect(scene.draw).toHaveBeenCalledTimes(1);
    document.documentElement.style.colorScheme = '';
    await new Promise(resolve => setTimeout(resolve));
  });

  it('draws a still scene on request and nothing before the first layout', async () => {
    const fixture = await render();

    backdrop(fixture).draw();
    expect(scene.draw).not.toHaveBeenCalled();

    layout(400, 300);
    scene.draw.mockClear();
    backdrop(fixture).draw();
    expect(scene.draw).toHaveBeenCalledTimes(1);
  });

  it('mounts nothing under forced colours', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(forced-colors: active)' }))
    );
    const fixture = await render();

    expect(getContext).not.toHaveBeenCalled();
    expect(StubResizeObserver.instances).toHaveLength(0);
    expect(scene.mounted).not.toHaveBeenCalled();
    expect(backdrop(fixture).ctx).toBeNull();
    scene.moving = true;
    backdrop(fixture).sync();
    expect(raf).not.toHaveBeenCalled();
  });

  it('survives a browser that gives it no context', async () => {
    getContext.mockImplementation(() => null);
    const fixture = await render();

    expect(StubResizeObserver.instances).toHaveLength(0);
    expect(scene.colors).not.toHaveBeenCalled();
    expect(scene.mounted).not.toHaveBeenCalled();
    scene.moving = true;
    backdrop(fixture).sync();
    expect(raf).not.toHaveBeenCalled();
  });

  it('releases the loop, the pending layout and the observers on destroy', async () => {
    const fixture = await render();
    layout(400, 300);
    inView();
    scene.moving = true;
    backdrop(fixture).sync();
    StubResizeObserver.instances[0].fire(500, 300);
    expect(raf).toHaveBeenCalledTimes(2);

    fixture.destroy();

    expect(caf).toHaveBeenCalledTimes(2);
    expect(StubResizeObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(StubIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(backdrop(fixture).ctx).toBeNull();

    scene.draw.mockClear();
    tick(100);
    expect(scene.draw).not.toHaveBeenCalled();
  });
});
