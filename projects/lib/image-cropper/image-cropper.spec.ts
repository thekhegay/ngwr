import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
});
