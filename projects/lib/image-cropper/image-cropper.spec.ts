import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrImageCropper } from './image-cropper';

@Component({
  imports: [WrImageCropper],
  template: `<wr-image-cropper [src]="src()" [aspectRatio]="aspectRatio()" />`,
})
class Host {
  readonly src = signal<string | File | Blob | null>('/photo.jpg');
  readonly aspectRatio = signal<number | null>(null);
}

/**
 * Almost everything this component does is measured, and jsdom measures nothing:
 * `getBoundingClientRect()` is zeros and `naturalWidth` is 0, so a real image load leaves
 * `display` at 0 and the crop UI never renders at all. The image is therefore given a
 * SIZE by hand — the two numbers `onImageLoad` reads — which is the smallest stub that
 * makes the crop maths observable, and nothing else here pretends to check layout.
 *
 * What that buys is the scale conversion: `cropRect` reports NATURAL pixels, and it is
 * the value a consumer acts on, so the display-to-source ratio is the contract.
 */
describe('WrImageCropper', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const img = (): HTMLImageElement => root().querySelector<HTMLImageElement>('.wr-image-cropper__image')!;
  const window_ = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-image-cropper__window');
  const handles = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-image-cropper__handle')];
  const cropper = (): WrImageCropper => fixture.debugElement.children[0].componentInstance as WrImageCropper;

  /** Give the `<img>` the rendered and natural sizes `onImageLoad` reads, then load it. */
  const load = ({ display = 400, natural = 800 } = {}): void => {
    const el = img();
    el.getBoundingClientRect = (): DOMRect =>
      ({ width: display, height: display, x: 0, y: 0, top: 0, left: 0, right: display, bottom: display }) as DOMRect;
    Object.defineProperty(el, 'naturalWidth', { value: natural, configurable: true });
    Object.defineProperty(el, 'naturalHeight', { value: natural, configurable: true });
    el.dispatchEvent(new Event('load'));
    fixture.detectChanges();
  };

  const pointerDown = (target: HTMLElement, { button = 0, isPrimary = true } = {}): MouseEvent => {
    target.setPointerCapture = () => undefined;
    target.releasePointerCapture = () => undefined;
    const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button });
    Object.defineProperty(event, 'isPrimary', { value: isPrimary });
    target.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('shows the image but no crop UI until it has a measured size', () => {
    expect(img()).not.toBeNull();
    expect(window_()).toBeNull();
    expect(cropper().cropRect()).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('opens a centred crop window over the loaded image', () => {
    load();

    expect(window_()).not.toBeNull();
    // 60% of a 400px box, centred: 240 wide at x = 80.
    expect(window_()!.style.width).toBe('240px');
    expect(window_()!.style.left).toBe('80px');
    expect(handles().length).toBe(8);
  });

  it('reports the crop in the source image its own pixels', () => {
    // Displayed at 400 for a natural 800, so every display pixel is two source pixels.
    load({ display: 400, natural: 800 });
    expect(cropper().cropRect()).toEqual({ x: 160, y: 160, width: 480, height: 480 });
  });

  it('honours a locked aspect ratio in the initial window', () => {
    fixture.componentInstance.aspectRatio.set(2);
    fixture.detectChanges();
    load();

    const w = Number.parseFloat(window_()!.style.width);
    const h = Number.parseFloat(window_()!.style.height);
    expect(w / h).toBeCloseTo(2, 5);
  });

  it('forgets the old geometry the moment the source changes', () => {
    // The crop is measured against the image that was showing. Left in place, `cropRect`
    // kept reporting a rect scaled to the PREVIOUS image for the whole gap between a new
    // `src` and its load event — a window a consumer can read, and crop from.
    load({ display: 400, natural: 800 });
    expect(cropper().cropRect().width).toBe(480);

    fixture.componentInstance.src.set('/other.jpg');
    fixture.detectChanges();

    expect(cropper().cropRect()).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(window_()).toBeNull();
  });

  it('starts a drag from the primary button only', () => {
    load();
    const secondary = pointerDown(window_()!, { button: 2 });
    expect(secondary.defaultPrevented).toBe(false);

    const secondFinger = pointerDown(window_()!, { isPrimary: false });
    expect(secondFinger.defaultPrevented).toBe(false);

    const primary = pointerDown(window_()!);
    expect(primary.defaultPrevented).toBe(true);
  });

  it('clears the crop when the source goes away', () => {
    load();
    fixture.componentInstance.src.set(null);
    fixture.detectChanges();

    expect(img()).toBeNull();
    expect(cropper().cropRect()).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  /**
   * The keyboard path. Everything below reads real numbers even in jsdom, because the
   * step is a CONSTANT rather than a pointer delta — which is exactly why the drag
   * half of this component still has no test beyond its button gate.
   *
   * What is NOT here is the `(cropped)` emit on keyup: it renders a canvas, jsdom has
   * no 2D context, and `emitCropped` swallows the failure by design. A test for it
   * would answer the same on a component that never emitted at all.
   */
  describe('from the keyboard', () => {
    const press = (key: string, modifiers: { altKey?: boolean; shiftKey?: boolean } = {}): KeyboardEvent => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers });
      window_()!.dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };
    const box = (): { left: string; top: string; width: string; height: string } => ({
      left: window_()!.style.left,
      top: window_()!.style.top,
      width: window_()!.style.width,
      height: window_()!.style.height,
    });

    it('puts the crop window in the tab order and names it', () => {
      load();

      expect(window_()!.getAttribute('tabindex')).toBe('0');
      expect(window_()!.getAttribute('role')).toBe('group');
      expect(window_()!.getAttribute('aria-label')).toBe('Crop region');
    });

    it('describes the key model from an element that exists', () => {
      load();
      const id = window_()!.getAttribute('aria-describedby')!;
      const help = root().querySelector<HTMLElement>(`#${CSS.escape(id)}`);

      expect(help).not.toBeNull();
      expect(help!.textContent).toContain('Arrow keys');
    });

    it('leaves the eight handles out of the tab order and out of the tree', () => {
      // Eight extra tab stops per cropper would be hostile; the keys resize from
      // the east and south edges, and a west or north drag comes out as a resize
      // plus a move.
      load();

      for (const handle of handles()) {
        expect(handle.hasAttribute('tabindex')).toBe(false);
        expect(handle.getAttribute('aria-hidden')).toBe('true');
      }
    });

    it('moves the crop one pixel per arrow key', () => {
      load();

      press('ArrowRight');
      expect(box()).toMatchObject({ left: '81px', top: '80px' });

      press('ArrowDown');
      expect(box()).toMatchObject({ left: '81px', top: '81px' });
    });

    it('accumulates while the key is held', () => {
      // `applyMove` measures from `startRect`, which the handler re-seeds per
      // keystroke. Read once at the first press, the crop would stall at one pixel.
      load();

      press('ArrowRight');
      press('ArrowRight');
      press('ArrowRight');

      expect(box().left).toBe('83px');
    });

    it('takes ten pixels with Shift, the coarse step every other control here uses', () => {
      load();

      press('ArrowLeft', { shiftKey: true });
      expect(box().left).toBe('70px');
    });

    it('resizes with Alt rather than moving', () => {
      load();

      press('ArrowRight', { altKey: true });
      expect(box()).toMatchObject({ left: '80px', width: '241px' });

      press('ArrowDown', { altKey: true });
      expect(box()).toMatchObject({ top: '80px', height: '241px' });
    });

    it('stops at the canvas edge instead of walking the crop off it', () => {
      load();

      for (let i = 0; i < 30; i++) press('ArrowRight', { shiftKey: true });

      // 400px box, 240px crop — the far edge is x = 160.
      expect(box().left).toBe('160px');
    });

    it('holds the aspect-ratio lock a drag would hold', () => {
      fixture.componentInstance.aspectRatio.set(2);
      fixture.detectChanges();
      load();

      press('ArrowRight', { altKey: true });

      const w = Number.parseFloat(box().width);
      const h = Number.parseFloat(box().height);
      expect(w / h).toBeCloseTo(2, 5);
    });

    it('refuses to shrink past minWidth', () => {
      load();

      for (let i = 0; i < 40; i++) press('ArrowLeft', { altKey: true, shiftKey: true });

      expect(box().width).toBe('32px');
    });

    it('announces the crop in source pixels, and only after a key', () => {
      load({ display: 400, natural: 800 });
      const status = (): HTMLElement => root().querySelector<HTMLElement>('[role="status"]')!;

      // A pointer drag says nothing here, and the initial crop is not news.
      expect(status().textContent.trim()).toBe('');

      press('ArrowRight');

      // One display pixel is two source pixels at this scale.
      expect(status().textContent.trim()).toBe('162, 160, 480 × 480');
    });

    it('leaves every other key to the page', () => {
      load();
      const before = box();

      const event = press('Enter');

      expect(event.defaultPrevented).toBe(false);
      expect(box()).toEqual(before);
    });
  });

  /**
   * The image is sized responsively (`max-width: 100%`, `max-height: 70dvh`), so the
   * box read in the `(load)` handler is only true until the container or the viewport
   * moves. jsdom lays nothing out and implements no `ResizeObserver`, so both halves
   * are supplied by hand — the observer, whose callback the test fires itself, and the
   * new rect it then reads. What that still buys is real: everything below is a
   * DISPLAY-pixel number the component wrote, and the source-pixel `cropRect()` it
   * derives from them.
   */
  describe('as the image is resized under it', () => {
    let fireResize: () => void;
    let disconnects: number;

    beforeEach(() => {
      fireResize = (): void => undefined;
      disconnects = 0;
      class Observer {
        private readonly callback: () => void;
        constructor(callback: () => void) {
          this.callback = callback;
        }
        observe(): void {
          fireResize = (): void => this.callback();
        }
        unobserve(): void {
          /* the component only ever disconnects */
        }
        disconnect(): void {
          disconnects++;
        }
      }
      vi.stubGlobal('ResizeObserver', Observer);
    });

    afterEach(() => vi.unstubAllGlobals());

    /** Re-measure the `<img>` at a new square size, then let the observer notice. */
    const resizeTo = (display: number): void => {
      const el = img();
      el.getBoundingClientRect = (): DOMRect =>
        ({ width: display, height: display, x: 0, y: 0, top: 0, left: 0, right: display, bottom: display }) as DOMRect;
      fireResize();
      fixture.detectChanges();
    };

    it('rescales the crop window with the image, keeping the region the user picked', () => {
      load({ display: 400, natural: 800 });
      expect(window_()!.style.width).toBe('240px');
      expect(cropper().cropRect()).toEqual({ x: 160, y: 160, width: 480, height: 480 });

      // Halve the rendered box — a narrowed container, or a shorter viewport against
      // the `max-height`. Measured once, the window kept painting at 240px over a
      // 200px image and hung off two of its edges.
      resizeTo(200);

      expect(window_()!.style.width).toBe('120px');
      expect(window_()!.style.left).toBe('40px');
      // And the point of rescaling rather than re-measuring alone: the source region
      // is the value a consumer crops from, and it did not move.
      expect(cropper().cropRect()).toEqual({ x: 160, y: 160, width: 480, height: 480 });
    });

    it('clamps a later keystroke against the new box, not the old one', () => {
      load({ display: 400, natural: 800 });
      resizeTo(200);

      for (let i = 0; i < 30; i++) {
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, shiftKey: true });
        window_()!.dispatchEvent(event);
      }
      fixture.detectChanges();

      // 200px image, 120px crop — the far edge is x = 80. Against the stale 400 the
      // crop walked to 280 and left the image entirely.
      expect(window_()!.style.left).toBe('80px');
    });

    it('holds the last real box when the image measures zero', () => {
      // A hidden image (a closed tab, `display: none`) reports zeros. Scaling by that
      // would collapse the crop with nothing to scale back from.
      load({ display: 400, natural: 800 });
      resizeTo(0);

      expect(window_()!.style.width).toBe('240px');
      expect(cropper().cropRect().width).toBe(480);
    });

    it('lets go of the observer when it is destroyed', () => {
      load();
      fixture.destroy();

      expect(disconnects).toBeGreaterThan(0);
    });
  });
});
