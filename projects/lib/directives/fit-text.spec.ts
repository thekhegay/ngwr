import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrFitText } from './fit-text';

/**
 * jsdom lays nothing out, so the line boxes are modelled: `lines` holds the
 * width of each rendered line and `Range.getClientRects` answers with one rect
 * per line. The model answers only while the host's inline width is cleared,
 * which is what a browser needs to re-wrap the text in a wider parent; measured
 * against the width the directive wrote last, it reports one line as wide as
 * the page. Every width asserted is the directive's arithmetic on `lines`.
 *
 * `requestAnimationFrame` and `ResizeObserver` are stubbed so a frame and a
 * resize happen when the spec says. `MutationObserver` is jsdom's own.
 */
@Component({
  imports: [WrFitText],
  template: `
    <div class="parent">
      <span class="pill" [wrFitText]="on()" [style]="box()">{{ text() }}</span>
    </div>
  `,
})
class Host {
  readonly on = signal(true);
  readonly text = signal('three lines of text');
  readonly box = signal('box-sizing: border-box; padding: 0 8px; border: 2px solid');
}

const LINE = 20;
const globals = globalThis as Record<string, unknown>;

describe('WrFitText', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let lines: number[];
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  let resizeObservers: StubResizeObserver[];
  let disconnectText: MockInstance<MutationObserver['disconnect']>;

  const pristineRects = Object.getOwnPropertyDescriptor(Range.prototype, 'getClientRects');

  class StubResizeObserver {
    readonly targets: Element[] = [];
    connected = false;

    constructor(private readonly callback: ResizeObserverCallback) {
      resizeObservers.push(this);
    }

    observe(target: Element): void {
      this.connected = true;
      this.targets.push(target);
    }

    disconnect(): void {
      this.connected = false;
    }

    resize(width: number): void {
      this.callback([{ contentRect: { width } } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
  }

  const pill = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.pill')!;
  const parent = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.parent')!;

  const runFrame = (): void => {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(0);
  };

  /** Let jsdom deliver its mutation records, which it does in a microtask. */
  const mutations = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
  };

  const mount = async (setup?: (host: Host) => void): Promise<void> => {
    fixture = TestBed.createComponent(Host);
    setup?.(fixture.componentInstance);
    fixture.detectChanges();
    await fixture.whenStable();
    await mutations();
  };

  beforeEach(() => {
    lines = [120, 180, 60];
    frames = new Map();
    nextFrame = 0;
    resizeObservers = [];

    vi.stubGlobal('ResizeObserver', StubResizeObserver);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number): void => void frames.delete(id));
    disconnectText = vi.spyOn(MutationObserver.prototype, 'disconnect');

    Object.defineProperty(Range.prototype, 'getClientRects', {
      configurable: true,
      value(this: Range): DOMRect[] {
        const host = this.commonAncestorContainer as HTMLElement;
        const widths = host.style.width ? [9999] : lines;
        return widths.map((width, index) => new DOMRect(10, index * LINE, width, LINE));
      },
    });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    fixture?.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    if (pristineRects) Object.defineProperty(Range.prototype, 'getClientRects', pristineRects);
    else delete (Range.prototype as Partial<Range>).getClientRects;
    globals['ngServerMode'] = false;
  });

  it('sets the width to the widest line plus padding and border in a border-box', async () => {
    await mount();

    // 180 + 8 + 8 padding + 2 + 2 border, and the pixel that keeps the line from wrapping again.
    expect(pill().style.width).toBe('201px');
  });

  it('writes the content width alone in a content-box', async () => {
    await mount(host => host.box.set('box-sizing: content-box; padding: 0 8px; border: 2px solid'));

    expect(pill().style.width).toBe('181px');
  });

  it('rounds a fractional line up', async () => {
    lines = [100.2, 150.4];
    await mount(host => host.box.set('box-sizing: content-box'));

    expect(pill().style.width).toBe('152px');
  });

  it('leaves a block on one line alone', async () => {
    lines = [140];
    await mount();

    expect(pill().style.width).toBe('');
  });

  it('reads several rects on one line as one line', async () => {
    // What a `<b>` in the middle of a sentence gives: three rects, none below the first.
    Object.defineProperty(Range.prototype, 'getClientRects', {
      configurable: true,
      value: (): DOMRect[] => [
        new DOMRect(10, 0, 40, LINE),
        new DOMRect(50, 2, 30, LINE - 4),
        new DOMRect(80, 0, 60, LINE),
      ],
    });
    await mount();

    expect(pill().style.width).toBe('');
  });

  it('measures again when the text changes', async () => {
    await mount();

    lines = [90, 70];
    fixture.componentInstance.text.set('shorter text');
    fixture.detectChanges();
    await mutations();
    expect(pill().style.width, 'waits for the frame').toBe('201px');

    runFrame();
    expect(pill().style.width).toBe('111px');
  });

  it('drops the width when the text stops wrapping', async () => {
    await mount();

    lines = [90];
    fixture.componentInstance.text.set('short');
    fixture.detectChanges();
    await mutations();
    runFrame();

    expect(pill().style.width).toBe('');
  });

  it('watches the parent and measures again when it is resized', async () => {
    await mount();
    const [observer] = resizeObservers;
    expect(observer.targets).toEqual([parent()]);

    observer.resize(400);
    runFrame();
    expect(pill().style.width).toBe('201px');

    // A wider parent takes a word back: the model answers only because the
    // width written above was cleared before the lines were read.
    lines = [220, 140];
    observer.resize(600);
    runFrame();
    expect(pill().style.width).toBe('241px');
  });

  it('does not measure for a resize that left the parent as wide as it was', async () => {
    await mount();
    const [observer] = resizeObservers;
    observer.resize(400);
    runFrame();

    const write = vi.spyOn(pill().style, 'width', 'set');
    observer.resize(400);

    expect(frames.size).toBe(0);
    expect(write).not.toHaveBeenCalled();
  });

  it('measures once per frame when several triggers fire together', async () => {
    await mount();
    const [observer] = resizeObservers;
    const read = vi.spyOn(Range.prototype, 'getClientRects');

    observer.resize(400);
    observer.resize(500);
    fixture.componentInstance.text.set('other text');
    fixture.detectChanges();
    await mutations();

    expect(frames.size).toBe(1);
    runFrame();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('removes its width when switched off and fits again when switched on', async () => {
    await mount();

    fixture.componentInstance.on.set(false);
    fixture.detectChanges();
    runFrame();
    expect(pill().style.width).toBe('');

    fixture.componentInstance.on.set(true);
    fixture.detectChanges();
    runFrame();
    expect(pill().style.width).toBe('201px');
  });

  it('writes nothing while off, whatever fires', async () => {
    await mount(host => host.on.set(false));
    pill().style.width = '300px';

    resizeObservers[0].resize(400);
    runFrame();

    expect(pill().style.width).toBe('300px');
  });

  it('disconnects both observers and drops the pending frame on destroy', async () => {
    await mount();
    const [observer] = resizeObservers;
    observer.resize(400);
    expect(frames.size).toBe(1);
    disconnectText.mockClear();

    fixture.destroy();

    expect(observer.connected).toBe(false);
    expect(disconnectText).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });

  it('does nothing on the server', async () => {
    // `afterNextRender` is a no-op under `ngServerMode`, the global Angular branches on.
    globals['ngServerMode'] = true;
    const read = vi.spyOn(Range.prototype, 'getClientRects');
    await mount();

    expect(resizeObservers).toHaveLength(0);
    expect(read).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
    expect(pill().style.width).toBe('');
  });
});
