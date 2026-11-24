import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrImageCropper } from './image-cropper';
import type { WrCropHandle, WrImageLoadError, WrImageOutputType, WrImageRotation } from './types';

@Component({
  imports: [WrImageCropper],
  template: `
    <wr-image-cropper
      [src]="src()"
      [aspectRatio]="aspectRatio()"
      [maxOutputSize]="maxOutputSize()"
      [minHeight]="minHeight()"
      [(zoom)]="zoom"
      [(rotation)]="rotation"
      (loadError)="errors.push($event)"
      (cropped)="blobs.push($event)"
    />
  `,
})
class Host {
  readonly src = signal<string | File | Blob | null>('/photo.jpg');
  readonly aspectRatio = signal<number | null>(null);
  readonly maxOutputSize = signal<number | string | null>(null);
  readonly minHeight = signal(32);
  readonly zoom = signal(1);
  readonly rotation = signal<WrImageRotation>(0);
  readonly errors: WrImageLoadError[] = [];
  readonly blobs: Blob[] = [];
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

  it('refits the window when the aspect ratio changes after the image loaded', () => {
    load();
    expect(cropper().cropRect()).toEqual({ x: 160, y: 160, width: 480, height: 480 });

    fixture.componentInstance.aspectRatio.set(2);
    fixture.detectChanges();

    const w = Number.parseFloat(window_()!.style.width);
    const h = Number.parseFloat(window_()!.style.height);
    expect(w / h).toBeCloseTo(2, 5);
    expect(cropper().cropRect().width / cropper().cropRect().height).toBeCloseTo(2, 1);
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
   * step is a CONSTANT rather than a pointer delta. The drag half needs the image's box
   * stubbed as well, and has its own block further down.
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
   * Resizing with the pointer, which is where the crop used to come apart: with a ratio
   * the derived axis ran into the image edge and the rect slid off its anchor and past the
   * image, and a pointer carried outside and back redrew every clamped state in reverse.
   *
   * jsdom lays nothing out and has no pointer capture, so the image is given a box by
   * hand — offset from the viewport origin, so a client coordinate and an image
   * coordinate are never the same number — and capture is a stub that remembers who holds
   * it and, like a browser, throws when asked to release a capture nobody holds. Every
   * event goes to the element the drag started on, which is where a captured pointer's
   * events land in a browser. Positions below are written in IMAGE pixels and converted on
   * dispatch. The canvas records nothing and encodes an empty `Blob`, so `(cropped)` can
   * be counted.
   */
  describe('resizing with the pointer', () => {
    const LEFT = 100;
    const TOP = 50;
    const HANDLES: readonly WrCropHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    const SHAPES = [
      { shape: 'landscape', width: 400, height: 250 },
      { shape: 'portrait', width: 250, height: 400 },
    ] as const;
    const CASES = SHAPES.flatMap(size =>
      [null, 1].flatMap(ratio =>
        HANDLES.map(handle => ({ ...size, ratio, handle, name: `${handle}, ${size.shape}, ratio ${ratio ?? 'free'}` }))
      )
    );

    interface Rect {
      x: number;
      y: number;
      w: number;
      h: number;
    }

    let image = { width: 0, height: 0 };
    let released: HTMLElement[];
    let held: Map<HTMLElement, boolean>;

    beforeEach(() => {
      released = [];
      held = new Map();
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () => ({ drawImage: () => undefined }) as unknown as CanvasRenderingContext2D
      );
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback: BlobCallback) =>
        callback(new Blob(['']))
      );
    });

    afterEach(() => vi.restoreAllMocks());

    const stubCapture = (el: HTMLElement): void => {
      held.set(el, false);
      el.setPointerCapture = (): void => {
        held.set(el, true);
      };
      el.hasPointerCapture = (): boolean => held.get(el)!;
      el.releasePointerCapture = (): void => {
        if (!held.get(el)) throw new DOMException('No active capture for that pointer', 'NotFoundError');
        held.set(el, false);
        released.push(el);
      };
    };

    const loadImage = (width: number, height: number, ratio: number | null): void => {
      fixture.componentInstance.aspectRatio.set(ratio);
      fixture.detectChanges();
      image = { width, height };
      const el = img();
      el.getBoundingClientRect = (): DOMRect =>
        ({
          width,
          height,
          x: LEFT,
          y: TOP,
          left: LEFT,
          top: TOP,
          right: LEFT + width,
          bottom: TOP + height,
        }) as DOMRect;
      Object.defineProperty(el, 'naturalWidth', { value: width * 2, configurable: true });
      Object.defineProperty(el, 'naturalHeight', { value: height * 2, configurable: true });
      el.dispatchEvent(new Event('load'));
      fixture.detectChanges();
      for (const target of [window_()!, ...handles()]) stubCapture(target);
    };

    const handle = (name: WrCropHandle): HTMLElement =>
      root().querySelector<HTMLElement>(`.wr-image-cropper__handle--${name}`)!;

    /** Dispatch a pointer event at image coordinates `[x, y]`. */
    const fire = (type: string, target: HTMLElement, [x, y]: readonly [number, number], pointerId = 1): void => {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: LEFT + x,
        clientY: TOP + y,
      });
      Object.defineProperty(event, 'isPrimary', { value: pointerId === 1 });
      Object.defineProperty(event, 'pointerId', { value: pointerId });
      target.dispatchEvent(event);
      fixture.detectChanges();
    };

    const press = (key: string, modifiers: { altKey?: boolean; shiftKey?: boolean } = {}): void => {
      window_()!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers }));
      fixture.detectChanges();
    };

    const rect = (): Rect => {
      const style = window_()!.style;
      return {
        x: Number.parseFloat(style.left),
        y: Number.parseFloat(style.top),
        w: Number.parseFloat(style.width),
        h: Number.parseFloat(style.height),
      };
    };

    /** `(cropped)` resolves through a promise, so give it a turn before counting. */
    const emitted = async (): Promise<number> => {
      await new Promise(resolve => setTimeout(resolve));
      return fixture.componentInstance.blobs.length;
    };

    const gaps = (r: Rect): number[] => [r.x, r.y, image.width - r.x - r.w, image.height - r.y - r.h];

    const centre = (): [number, number] => [image.width / 2, image.height / 2];

    /** Where a handle sits on a rect: the middle of its edge, or its corner. */
    const grip = (name: WrCropHandle, r: Rect): [number, number] => [
      name.includes('e') ? r.x + r.w : name.includes('w') ? r.x : r.x + r.w / 2,
      name.includes('s') ? r.y + r.h : name.includes('n') ? r.y : r.y + r.h / 2,
    ];

    /** The direction a handle pushes its edge — or both edges, for a corner — outward. */
    const outward = (name: WrCropHandle): [number, number] => [
      name.includes('e') ? 1 : name.includes('w') ? -1 : 0,
      name.includes('s') ? 1 : name.includes('n') ? -1 : 0,
    ];

    /**
     * On the line from the image centre toward the handle's edge (or both edges, for a
     * corner): `past` pixels beyond them, or inside them for a negative `past`. An axis
     * the handle does not drive stays on the centre line.
     */
    const toward = (name: WrCropHandle, past: number): [number, number] => [
      name.includes('e') ? image.width + past : name.includes('w') ? -past : image.width / 2,
      name.includes('s') ? image.height + past : name.includes('n') ? -past : image.height / 2,
    ];

    /** The same line, `distance` pixels from the centre AWAY from the handle's edge. */
    const inward = (name: WrCropHandle, distance: number): [number, number] => {
      const [x, y] = centre();
      const [ox, oy] = outward(name);
      return [x - ox * distance, y - oy * distance];
    };

    /**
     * What a drag reaches with the pointer pressed on the handle and taken exactly onto
     * the image's edge — the edge counts as on the image, so this is a drag that never
     * left. Starts from a fresh load, and leaves nothing emitted behind it.
     */
    const reachedAtEdge = async (
      width: number,
      height: number,
      ratio: number | null,
      name: WrCropHandle
    ): Promise<Rect> => {
      loadImage(width, height, ratio);
      fire('pointerdown', handle(name), grip(name, rect()));
      fire('pointermove', handle(name), toward(name, 0));
      const reached = rect();
      fire('pointerup', handle(name), toward(name, 0));
      await emitted();
      fixture.componentInstance.blobs.splice(0);
      return reached;
    };

    const expectAnchored = (name: WrCropHandle, ratio: number | null, start: Rect, r: Rect): void => {
      // The edge or corner opposite the handle does not move.
      if (name.includes('e')) expect(r.x).toBeCloseTo(start.x, 6);
      if (name.includes('w')) expect(r.x + r.w).toBeCloseTo(start.x + start.w, 6);
      if (name.includes('s')) expect(r.y).toBeCloseTo(start.y, 6);
      if (name.includes('n')) expect(r.y + r.h).toBeCloseTo(start.y + start.h, 6);
      // An edge handle leaves the other axis alone — or, with a ratio, grows it about the
      // old midline, sliding along that axis only as far as it must to stay on the image.
      if (name === 'e' || name === 'w') {
        if (ratio === null) expect(r.h).toBe(start.h);
        const y = Math.min(image.height - r.h, Math.max(0, start.y + start.h / 2 - r.h / 2));
        expect(r.y).toBeCloseTo(y, 6);
      }
      if (name === 'n' || name === 's') {
        if (ratio === null) expect(r.w).toBe(start.w);
        const x = Math.min(image.width - r.w, Math.max(0, start.x + start.w / 2 - r.w / 2));
        expect(r.x).toBeCloseTo(x, 6);
      }
      if (ratio !== null) expect(r.w / r.h).toBeCloseTo(ratio, 6);
      // And never past the image.
      for (const gap of gaps(r)) expect(gap).toBeGreaterThanOrEqual(-1e-9);
    };

    it.each(CASES)(
      '$name: holds the anchor and the ratio while pushed into the bounds',
      ({ width, height, ratio, handle: name }) => {
        loadImage(width, height, ratio);
        const start = rect();
        fire('pointerdown', handle(name), centre());

        // From the centre to one pixel short of the edge, in eight steps: the pointer never
        // leaves the image, and by the last step the rect has run into a bound.
        const trail: Rect[] = [];
        for (let i = 1; i <= 8; i++) {
          const [cx, cy] = centre();
          const [ex, ey] = toward(name, -1);
          fire('pointermove', handle(name), [cx + ((ex - cx) * i) / 8, cy + ((ey - cy) * i) / 8]);
          trail.push(rect());
          expectAnchored(name, ratio, start, trail.at(-1)!);
        }

        expect(gaps(trail.at(-1)!).some(gap => Math.abs(gap) <= 1e-6)).toBe(true);

        // A pure function of where the pointer is: back to the first step, back to its rect.
        const [cx, cy] = centre();
        const [ex, ey] = toward(name, -1);
        fire('pointermove', handle(name), [cx + (ex - cx) / 8, cy + (ey - cy) / 8]);
        expect(rect()).toEqual(trail[0]);
      }
    );

    it.each(CASES)(
      '$name: ends on the move that leaves the image, applying that move and nothing after it',
      async ({ width, height, ratio, handle: name }) => {
        const atEdge = await reachedAtEdge(width, height, ratio, name);
        expect(gaps(atEdge).some(gap => Math.abs(gap) <= 1e-6)).toBe(true);

        loadImage(width, height, ratio);
        const start = rect();
        const from = grip(name, start);
        fire('pointerdown', handle(name), from);
        // A quarter of the way to the edge: the pointer is over the image and the rect is
        // short of the image on every side, so keeping it would be visible below.
        const [ex, ey] = toward(name, 0);
        fire('pointermove', handle(name), [from[0] + (ex - from[0]) / 4, from[1] + (ey - from[1]) / 4]);
        const short = rect();
        for (const gap of gaps(short)) expect(gap).toBeGreaterThan(1);

        // Then ONE move to well past the edge — a quick drag, sampled once out there.
        fire('pointermove', handle(name), toward(name, 40));

        expect(rect()).toEqual(atEdge);
        expect(await emitted()).toBe(1);
        expect(released).toContain(handle(name));

        // The capture it released reports back, as a browser's would. Nothing is left to end.
        fire('lostpointercapture', handle(name), toward(name, 40));
        // Further out, back over the image, and to a point that would have shrunk it.
        fire('pointermove', handle(name), toward(name, 80));
        fire('pointermove', handle(name), toward(name, -1));
        fire('pointermove', handle(name), centre());
        fire('pointermove', handle(name), inward(name, 30));
        fire('pointerup', handle(name), inward(name, 30));

        expect(rect()).toEqual(atEdge);
        expect(await emitted()).toBe(1);

        // Only a new pointerdown starts again.
        fire('pointerdown', handle(name), centre());
        fire('pointermove', handle(name), inward(name, 30));
        expect(rect()).not.toEqual(atEdge);
        expect(await emitted()).toBe(1);
      }
    );

    it.each([null, 1])('applies a single move from a corner handle to far past the image, ratio %s', async ratio => {
      const atEdge = await reachedAtEdge(400, 250, ratio, 'se');

      loadImage(400, 250, ratio);
      fire('pointerdown', handle('se'), grip('se', rect()));
      fire('pointermove', handle('se'), toward('se', 150));

      expect(rect()).toEqual(atEdge);
      expect(await emitted()).toBe(1);
    });

    it.each(HANDLES)('%s: counts the edge of the image as on it', async name => {
      loadImage(400, 250, null);
      fire('pointerdown', handle(name), centre());

      fire('pointermove', handle(name), toward(name, 0));
      const atEdge = rect();
      fire('pointermove', handle(name), inward(name, 20));

      expect(rect()).not.toEqual(atEdge);
      expect(await emitted()).toBe(0);
    });

    it.each(CASES)(
      '$name: pressed on the handle past the crop edge, still takes that edge flush to the image',
      async ({ width, height, ratio, handle: name }) => {
        // Half of an edge handle and three quarters of a corner handle lie outside the
        // crop. Pressed out there, the pointer is ahead of the edge it drags by that much,
        // and against the bare image box it left while the crop was still that far short.
        const atEdge = await reachedAtEdge(width, height, ratio, name);

        loadImage(width, height, ratio);
        const [ox, oy] = outward(name);
        const [gx, gy] = grip(name, rect());
        let [x, y] = [gx + ox * 5, gy + oy * 5];
        fire('pointerdown', handle(name), [x, y]);

        // Out in 1px steps, until the pointer is 5px past the image's edge.
        const [tx, ty] = toward(name, 5);
        while ((ox !== 0 && x !== tx) || (oy !== 0 && y !== ty)) {
          if (ox !== 0 && x !== tx) x += ox;
          if (oy !== 0 && y !== ty) y += oy;
          fire('pointermove', handle(name), [x, y]);
        }
        expect(rect()).toEqual(atEdge);
        expect(await emitted()).toBe(0);

        // One pixel further is past the allowance too.
        fire('pointermove', handle(name), [x + ox, y + oy]);
        expect(rect()).toEqual(atEdge);
        expect(await emitted()).toBe(1);
      }
    );

    it('ends at once when a handle pressed off the image moves further off it, and wanders nowhere after', async () => {
      loadImage(400, 250, null);
      // Push the corner into the image's corner and let go.
      fire('pointerdown', handle('se'), grip('se', rect()));
      fire('pointermove', handle('se'), toward('se', 0));
      fire('pointerup', handle('se'), toward('se', 0));
      const corner = rect();
      expect(gaps(corner).slice(2)).toEqual([0, 0]);
      expect(await emitted()).toBe(1);

      // Pressed 3px outside both of the image's edges, on the outer part of the handle.
      fire('pointerdown', handle('se'), [403, 253]);
      // Back toward the image: that still drags.
      fire('pointermove', handle('se'), [402, 252]);
      expect(rect()).toEqual({ ...corner, w: corner.w - 1, h: corner.h - 1 });
      expect(await emitted()).toBe(1);

      // Further below the image than it was pressed: that move is applied, clamped to the
      // image, and the drag is over.
      fire('pointermove', handle('se'), [402, 280]);
      const ended = { ...corner, w: corner.w - 1 };
      expect(rect()).toEqual(ended);
      expect(await emitted()).toBe(2);

      // Below the image, leftward; beside it, upward; then over it. None of it is a drag.
      for (const point of [
        [380, 280],
        [300, 280],
        [260, 280],
        [430, 200],
        [430, 120],
        [300, 150],
      ] as const) {
        fire('pointermove', handle('se'), point);
      }
      fire('pointerup', handle('se'), [300, 150]);
      expect(rect()).toEqual(ended);
      expect(await emitted()).toBe(2);
    });

    it('ignores every pointer but the one that started the drag', async () => {
      loadImage(400, 250, 1);
      fire('pointerdown', handle('se'), grip('se', rect()));
      fire('pointermove', handle('se'), [260, 185]);
      const firstFinger = rect();

      // A second finger slides off the image and lifts — none of it is this drag's.
      fire('pointermove', handle('se'), [-60, 125], 2);
      fire('pointerup', handle('se'), [-60, 125], 2);
      fire('pointercancel', handle('se'), [-60, 125], 2);
      expect(rect()).toEqual(firstFinger);
      expect(await emitted()).toBe(0);

      fire('pointermove', handle('se'), [250, 175]);
      expect(rect()).not.toEqual(firstFinger);
      fire('pointerup', handle('se'), [250, 175]);
      expect(await emitted()).toBe(1);
    });

    it('ends cleanly on pointercancel, releasing the capture it holds', async () => {
      loadImage(400, 250, 1);
      fire('pointerdown', handle('se'), grip('se', rect()));
      fire('pointermove', handle('se'), [230, 155]);
      const kept = rect();

      fire('pointercancel', handle('se'), [230, 155]);
      expect(released).toEqual([handle('se')]);
      fire('pointermove', handle('se'), [260, 185]);
      fire('pointerup', handle('se'), [260, 185]);

      expect(rect()).toEqual(kept);
      expect(await emitted()).toBe(1);
    });

    it('ends cleanly on a capture taken away, without releasing what it no longer holds', async () => {
      loadImage(400, 250, 1);
      fire('pointerdown', handle('se'), grip('se', rect()));
      fire('pointermove', handle('se'), [230, 155]);
      const kept = rect();

      // The browser took the capture back; releasing it again would throw.
      held.set(handle('se'), false);
      fire('lostpointercapture', handle('se'), [230, 155]);
      fire('pointermove', handle('se'), [260, 185]);
      fire('pointerup', handle('se'), [260, 185]);

      expect(released).toEqual([]);
      expect(rect()).toEqual(kept);
      expect(await emitted()).toBe(1);
    });

    it('leaves a move drag as it was: resting against the edge while the pointer is off the image', async () => {
      loadImage(400, 250, null);
      // A 240 x 150 crop at (80, 50).
      fire('pointerdown', window_()!, centre());

      fire('pointermove', window_()!, [450, 125]);
      expect(rect()).toEqual({ x: 160, y: 50, w: 240, h: 150 });
      expect(await emitted()).toBe(0);

      fire('pointermove', window_()!, [160, 125]);
      expect(rect()).toEqual({ x: 40, y: 50, w: 240, h: 150 });

      fire('pointerup', window_()!, [160, 125]);
      expect(await emitted()).toBe(1);
    });

    it('ends a move drag when the ratio changes, so the next move keeps the refit window', () => {
      loadImage(400, 250, null);
      fire('pointerdown', window_()!, centre());

      fixture.componentInstance.aspectRatio.set(2);
      fixture.detectChanges();
      const refit = rect();
      expect(refit.w / refit.h).toBeCloseTo(2, 5);

      fire('pointermove', window_()!, [300, 125]);
      expect(rect()).toEqual(refit);
    });

    /**
     * An edge handle with a ratio sizes the axis it does not drive. Growing that axis
     * evenly about the midline and capping it at twice the distance to the nearer side
     * keeps the midline, and leaves a crop resting against a side unable to grow at all.
     * The 1:1 crop starts at 150 x 150 on (125, 50) and is moved against a side first;
     * under that cap every size expected here stays at 150.
     */
    it.each([
      {
        name: 'e',
        side: 'the top',
        keys: ['ArrowUp', 5],
        from: [275, 75],
        to: [340, 75],
        want: { x: 125, y: 0, w: 215, h: 215 },
      },
      {
        name: 'w',
        side: 'the bottom',
        keys: ['ArrowDown', 5],
        from: [125, 175],
        to: [60, 175],
        want: { x: 60, y: 35, w: 215, h: 215 },
      },
      {
        name: 's',
        side: 'the left',
        keys: ['ArrowLeft', 13],
        from: [75, 200],
        to: [75, 240],
        want: { x: 0, y: 50, w: 190, h: 190 },
      },
      {
        name: 'n',
        side: 'the right',
        keys: ['ArrowRight', 13],
        from: [325, 50],
        to: [325, 10],
        want: { x: 210, y: 10, w: 190, h: 190 },
      },
    ] as const)(
      '$name: grows a ratio crop resting against $side, sliding along it',
      ({ name, keys, from, to, want }) => {
        loadImage(400, 250, 1);
        for (let i = 0; i < keys[1]; i++) press(keys[0], { shiftKey: true });
        fire('pointerdown', handle(name), from);
        fire('pointermove', handle(name), to);

        expect(rect()).toEqual(want);
      }
    );

    it('keeps Alt + arrow resizing on the same anchored maths', () => {
      // A 1:1 crop of 150 at (125, 50) on a 400 x 250 image. The east edge has 275px of
      // room, the height only 250, so the height is what stops it — and it grows evenly
      // about the centre line rather than sliding up and off the image.
      loadImage(400, 250, 1);

      for (let i = 0; i < 20; i++) press('ArrowRight', { altKey: true, shiftKey: true });
      expect(rect()).toEqual({ x: 125, y: 0, w: 250, h: 250 });

      for (let i = 0; i < 25; i++) press('ArrowUp', { altKey: true, shiftKey: true });
      // The south edge again, from the top edge and about the vertical centre line, down to
      // the 32px floor.
      expect(rect()).toEqual({ x: 234, y: 0, w: 32, h: 32 });
    });

    it('lets Alt + arrow grow a ratio crop sitting in a corner', () => {
      loadImage(400, 250, 1);
      for (let i = 0; i < 13; i++) press('ArrowLeft', { shiftKey: true });
      for (let i = 0; i < 5; i++) press('ArrowUp', { shiftKey: true });
      expect(rect()).toEqual({ x: 0, y: 0, w: 150, h: 150 });

      for (let i = 0; i < 3; i++) press('ArrowRight', { altKey: true, shiftKey: true });
      expect(rect()).toEqual({ x: 0, y: 0, w: 180, h: 180 });
      for (let i = 0; i < 10; i++) press('ArrowRight', { altKey: true, shiftKey: true });
      expect(rect()).toEqual({ x: 0, y: 0, w: 250, h: 250 });

      // Smaller about the midline, then taller from the top edge where that left it.
      for (let i = 0; i < 5; i++) press('ArrowLeft', { altKey: true, shiftKey: true });
      expect(rect()).toEqual({ x: 0, y: 25, w: 200, h: 200 });
      for (let i = 0; i < 5; i++) press('ArrowDown', { altKey: true, shiftKey: true });
      expect(rect()).toEqual({ x: 0, y: 25, w: 225, h: 225 });
    });

    it('holds a ratio crop at whichever minimum is larger once scaled by the ratio', () => {
      // 2:1 with a 40px minimum height needs 80px of width, over the 32px minimum width.
      fixture.componentInstance.minHeight.set(40);
      loadImage(400, 250, 2);

      for (let i = 0; i < 40; i++) press('ArrowLeft', { altKey: true, shiftKey: true });

      expect(rect()).toMatchObject({ w: 80, h: 40 });
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

    it('carries a drag under way over to the new box, instead of undoing the rescale', () => {
      load({ display: 400, natural: 800 });
      pointerDown(window_()!);

      resizeTo(200);
      expect(window_()!.style.width).toBe('120px');

      window_()!.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 10, clientY: 0 }));
      fixture.detectChanges();

      // Measured from where the drag began as it is now: 40 + 10, and still 120 wide.
      expect([window_()!.style.left, window_()!.style.width]).toEqual(['50px', '120px']);
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

  /**
   * Zoom, pan and rotation. The crop window stays in STAGE pixels throughout, so what
   * these read is the transform the component writes on the picture (where the image
   * sits under the window) and `cropRect()`, the source region that comes out of the two.
   *
   * A turned image has no measured box here: the sizer that holds the stage open in a
   * browser has no size in jsdom, so the stage is the box it had, swapped and scaled to
   * fit inside itself, unless a test gives the sizer a box before the turn.
   */
  describe('zooming and turning', () => {
    let calls: unknown[][];
    let encoded: { width: number; height: number }[];

    beforeEach(() => {
      calls = [];
      encoded = [];
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () =>
          ({
            translate: (...args: number[]) => calls.push(['translate', ...args]),
            rotate: (...args: number[]) => calls.push(['rotate', ...args]),
            drawImage: (_img: unknown, ...args: number[]) => calls.push(['drawImage', ...args]),
          }) as unknown as CanvasRenderingContext2D
      );
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function (this: HTMLCanvasElement) {
        encoded.push({ width: this.width, height: this.height });
        return 'data:image/png;base64,';
      });
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
        this: HTMLCanvasElement,
        callback: BlobCallback
      ) {
        encoded.push({ width: this.width, height: this.height });
        callback(new Blob(['']));
      });
    });

    afterEach(() => vi.restoreAllMocks());

    const host = (): Host => fixture.componentInstance;
    const stage = (): HTMLElement => root().querySelector<HTMLElement>('.wr-image-cropper__canvas')!;
    const view = (): HTMLElement => root().querySelector<HTMLElement>('.wr-image-cropper__view')!;
    const sizer = (): HTMLCanvasElement => root().querySelector<HTMLCanvasElement>('.wr-image-cropper__sizer')!;
    const box = (): number[] =>
      [window_()!.style.left, window_()!.style.top, window_()!.style.width, window_()!.style.height].map(v =>
        Number.parseFloat(v)
      );
    /**
     * Where the picture's top-left corner sits on the stage: the first `translate()`.
     * jsdom rewrites the list as it stores it, dropping a zero `y` and rounding to four places.
     */
    const pan = (): number[] => {
      const [, x, y] = /translate\(([-\d.e]+)px(?:, ([-\d.e]+)px)?\)/.exec(view().style.transform)!;
      return [Number(x), Number(y ?? 0)];
    };
    const scale = (): number => Number(/scale\(([\d.]+)\)/.exec(view().style.transform)![1]);

    const sized = (el: HTMLElement, width: number, height: number): void => {
      el.getBoundingClientRect = (): DOMRect =>
        ({ width, height, x: 0, y: 0, top: 0, left: 0, right: width, bottom: height }) as DOMRect;
    };

    /** A landscape image: 400 x 200 on screen, 800 x 400 in the file. */
    const loadLandscape = (): void => {
      const el = img();
      sized(el, 400, 200);
      Object.defineProperty(el, 'naturalWidth', { value: 800, configurable: true });
      Object.defineProperty(el, 'naturalHeight', { value: 400, configurable: true });
      el.dispatchEvent(new Event('load'));
      fixture.detectChanges();
    };

    /** Twice: the turn is laid out in one pass and measured after it. */
    const settle = (): void => {
      fixture.detectChanges();
      fixture.detectChanges();
    };

    const fire = (
      type: string,
      target: HTMLElement,
      [x, y]: readonly [number, number],
      { pointerId = 1, isPrimary = true } = {}
    ): MouseEvent => {
      for (const el of [target, stage()]) {
        el.setPointerCapture = (): void => undefined;
        el.hasPointerCapture = (): boolean => false;
        el.releasePointerCapture = (): void => undefined;
      }
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y });
      Object.defineProperty(event, 'pointerId', { value: pointerId });
      Object.defineProperty(event, 'isPrimary', { value: isPrimary });
      target.dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };

    const wheel = (deltaY: number, [x, y]: readonly [number, number], init: WheelEventInit = {}): WheelEvent => {
      const event = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY,
        clientX: x,
        clientY: y,
        ...init,
      });
      stage().dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };

    const key = (name: string, modifiers: KeyboardEventInit = {}): KeyboardEvent => {
      const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...modifiers });
      window_()!.dispatchEvent(event);
      settle();
      return event;
    };

    it('draws the picture untouched at zoom 1, in place of the image it was measured from', () => {
      load();

      expect(img().classList).toContain('wr-image-cropper__image--measured');
      expect(view().getAttribute('crossorigin')).toBe('anonymous');
      expect([view().style.width, view().style.height]).toEqual(['400px', '400px']);
      expect([scale(), ...pan()]).toEqual([1, 0, 0]);
      expect(view().style.transform).toContain('rotate(0deg)');
    });

    it('enlarges the image under a window that stays where it is', () => {
      load({ display: 400, natural: 800 });

      host().zoom.set(2);
      fixture.detectChanges();

      // The window has not moved; the image has grown around the middle of the stage.
      expect(box()).toEqual([80, 80, 240, 240]);
      expect([scale(), ...pan()]).toEqual([2, -200, -200]);
      // The same window is half as much of the source, around the same centre.
      expect(cropper().cropRect()).toEqual({ x: 280, y: 280, width: 240, height: 240 });
      expect(root().querySelector('wr-image-cropper')!.classList).toContain('wr-image-cropper--zoomed');
    });

    it.each([
      [9, 4],
      [0.2, 1],
      [Number.NaN, 1],
    ])('reads a zoom of %s as %s', (given, used) => {
      load({ display: 400, natural: 800 });

      host().zoom.set(given);
      fixture.detectChanges();

      expect(scale()).toBe(used);
      const c = cropper().cropRect();
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x + c.width).toBeLessThanOrEqual(800);
    });

    it('keeps the window inside the image at every zoom, wherever it was dragged', () => {
      load({ display: 400, natural: 800 });
      for (let i = 0; i < 30; i++) key('ArrowRight', { shiftKey: true });
      for (let i = 0; i < 30; i++) key('ArrowDown', { shiftKey: true });

      for (const zoom of [1, 1.5, 2.75, 4]) {
        host().zoom.set(zoom);
        fixture.detectChanges();
        const c = cropper().cropRect();
        expect(c.x + c.width, `zoom ${zoom}`).toBeLessThanOrEqual(800);
        expect(c.y + c.height, `zoom ${zoom}`).toBeLessThanOrEqual(800);
        expect(Math.min(c.x, c.y), `zoom ${zoom}`).toBeGreaterThanOrEqual(0);
      }
    });

    it('zooms with the wheel around the pointer, and writes the model', () => {
      load({ display: 400, natural: 800 });

      const event = wheel(-100, [100, 300]);

      const zoom = Math.exp(0.2);
      expect(event.defaultPrevented).toBe(true);
      expect(host().zoom()).toBeCloseTo(zoom, 10);
      // The image point under the pointer is still under it.
      expect(pan()[0]).toBeCloseTo(100 - 100 * zoom, 3);
      expect(pan()[1]).toBeCloseTo(300 - 300 * zoom, 3);
    });

    it('leaves a wheel it cannot follow to the page', () => {
      load();

      // Zoom 1 is as far out as it goes, so the page scrolls instead.
      expect(wheel(100, [100, 100]).defaultPrevented).toBe(false);
      expect(host().zoom()).toBe(1);

      host().zoom.set(4);
      fixture.detectChanges();
      expect(wheel(-100, [100, 100]).defaultPrevented).toBe(false);
      expect(wheel(100, [100, 100]).defaultPrevented).toBe(true);
    });

    it('zooms from the keyboard around the middle of the window, and says so', () => {
      load({ display: 400, natural: 800 });
      const status = (): string => root().querySelector<HTMLElement>('[role="status"]')!.textContent.trim();

      expect(key('+').defaultPrevented).toBe(true);
      expect(host().zoom()).toBe(1.1);
      expect(status()).toBe('Zoom 110%');
      // The window is centred, so its middle is the stage's: 200 - 200 * 1.1.
      expect(pan()[0]).toBeCloseTo(-20, 3);

      key('=');
      expect(host().zoom()).toBe(1.2);

      key('-');
      key('-');
      key('-');
      expect(host().zoom()).toBe(1);
      expect(status()).toBe('Zoom 100%');
    });

    it('leaves the browser its own zoom and reload keys', () => {
      load();

      expect(key('+', { ctrlKey: true }).defaultPrevented).toBe(false);
      expect(key('-', { metaKey: true }).defaultPrevented).toBe(false);
      expect(key('r', { ctrlKey: true }).defaultPrevented).toBe(false);
      expect(key('r', { metaKey: true }).defaultPrevented).toBe(false);
      expect([host().zoom(), host().rotation()]).toEqual([1, 0]);
    });

    it('describes the zoom and rotation keys with the rest of the key model', () => {
      load();
      const help = root().querySelector<HTMLElement>(`#${CSS.escape(window_()!.getAttribute('aria-describedby')!)}`)!;

      expect(help.textContent).toContain('Arrow keys');
      expect(help.textContent).toContain('Plus and minus zoom the image');
    });

    it('pans a zoomed image by a drag outside the window, and leaves the window alone', async () => {
      load({ display: 400, natural: 800 });
      host().zoom.set(2);
      fixture.detectChanges();

      // (10, 10) is on the dimmed image: the window starts at (80, 80).
      expect(fire('pointerdown', stage(), [10, 10]).defaultPrevented).toBe(true);
      fire('pointermove', stage(), [-40, -20]);

      expect(pan()).toEqual([-250, -230]);
      expect(box()).toEqual([80, 80, 240, 240]);
      expect(cropper().cropRect()).toEqual({ x: 330, y: 310, width: 240, height: 240 });

      // The image cannot be dragged off the stage.
      fire('pointermove', stage(), [2000, -2000]);
      expect(pan()).toEqual([0, -400]);

      expect(host().blobs.length).toBe(0);
      fire('pointerup', stage(), [2000, -2000]);
      await vi.waitFor(() => expect(host().blobs.length).toBe(1));

      // The drag is over: a move with no button down pans nothing.
      fire('pointermove', stage(), [0, 0]);
      expect(pan()).toEqual([0, -400]);
    });

    it('has nothing to pan at zoom 1, and still drags the window from inside it', () => {
      load();

      expect(fire('pointerdown', stage(), [10, 10]).defaultPrevented).toBe(false);
      fire('pointermove', stage(), [60, 60]);
      fire('pointerup', stage(), [60, 60]);
      expect(pan()).toEqual([0, 0]);

      host().zoom.set(2);
      fixture.detectChanges();
      fire('pointerdown', window_()!, [200, 200]);
      fire('pointermove', window_()!, [210, 190]);
      fire('pointerup', window_()!, [210, 190]);

      expect(box()).toEqual([90, 70, 240, 240]);
      expect(pan()).toEqual([-200, -200]);
    });

    it('pushes the zoomed image along when the arrows run the window into an edge', () => {
      load({ display: 400, natural: 800 });
      host().zoom.set(2);
      fixture.detectChanges();

      for (let i = 0; i < 8; i++) key('ArrowLeft', { shiftKey: true });
      expect(box()[0]).toBe(0);
      expect(pan()[0]).toBe(-200);

      key('ArrowLeft', { shiftKey: true });
      key('ArrowLeft', { shiftKey: true });

      expect(box()[0]).toBe(0);
      expect(pan()[0]).toBe(-180);
      expect(cropper().cropRect().x).toBe(180);

      // And no further than the image's own edge.
      for (let i = 0; i < 30; i++) key('ArrowLeft', { shiftKey: true });
      expect(pan()[0]).toBe(0);
      expect(cropper().cropRect().x).toBe(0);
    });

    it('zooms with two fingers around the point between them, whatever the first was doing', async () => {
      load({ display: 400, natural: 800 });

      // The first finger lands on the window and starts dragging it.
      fire('pointerdown', window_()!, [100, 200]);
      // The second is refused by the window and reaches the stage: a pinch, 200px wide.
      expect(fire('pointerdown', window_()!, [300, 200], { pointerId: 2, isPrimary: false }).defaultPrevented).toBe(
        true
      );

      fire('pointermove', window_()!, [400, 200], { pointerId: 2, isPrimary: false });

      expect(host().zoom()).toBeCloseTo(1.5, 10);
      // The midpoint (250, 200) is still over the same image point.
      expect(pan()[0]).toBeCloseTo(250 - 250 * 1.5, 3);
      expect(pan()[1]).toBeCloseTo(200 - 200 * 1.5, 3);

      // The first finger no longer drags the window.
      fire('pointermove', window_()!, [0, 200]);
      expect(box()).toEqual([80, 80, 240, 240]);
      expect(host().zoom()).toBeCloseTo(2, 10);

      fire('pointerup', window_()!, [400, 200], { pointerId: 2, isPrimary: false });
      fire('pointermove', window_()!, [100, 200]);
      expect(host().zoom()).toBeCloseTo(2, 10);
      await vi.waitFor(() => expect(host().blobs.length).toBe(1));
    });

    it('turns the stage on its side with the image, and the window with it', () => {
      loadLandscape();
      expect(box()).toEqual([80, 40, 240, 120]);
      const before = cropper().cropRect();
      expect(before).toEqual({ x: 160, y: 80, width: 480, height: 240 });

      host().rotation.set(90);
      settle();

      // No sizer in jsdom: 200 x 400 scaled to fit inside the 400 x 200 it had.
      expect([stage().style.width, stage().style.height]).toEqual(['100px', '200px']);
      expect(img().classList).toContain('wr-image-cropper__image--parked');
      // The picture keeps its own shape and is turned into the stage's.
      expect([view().style.width, view().style.height]).toEqual(['200px', '100px']);
      // A quarter turn about the corner swings the picture left of the stage; 100px brings it back.
      expect(view().style.transform).toMatch(/translate\(100px(, 0px)?\) rotate\(90deg\)/);
      expect(box()).toEqual([20, 40, 60, 120]);
      // The same source pixels as before the turn.
      expect(cropper().cropRect()).toEqual(before);
    });

    it('measures the turned stage from the sizer, a canvas of the source turned on its side', () => {
      loadLandscape();
      expect(sizer().tagName).toBe('CANVAS');
      expect([sizer().width, sizer().height]).toEqual([400, 800]);
      expect(sizer().classList).not.toContain('wr-image-cropper__sizer--on');

      sized(sizer(), 150, 300);
      host().rotation.set(90);
      settle();

      // The layout holds the stage open, so no size is written on it by hand.
      expect(sizer().classList).toContain('wr-image-cropper__sizer--on');
      expect(stage().style.width).toBe('');
      expect(box()).toEqual([30, 60, 90, 180]);
      expect([view().style.width, view().style.height]).toEqual(['300px', '150px']);
      expect(cropper().cropRect()).toEqual({ x: 160, y: 80, width: 480, height: 240 });
    });

    it('takes the hand-written size off the stage once the sizer can be measured again', () => {
      loadLandscape();
      host().rotation.set(90);
      settle();
      expect(stage().style.width).toBe('100px');

      // Shown again after being hidden: the first box is capped by the written size, so
      // it is dropped and the stage measured without it.
      sized(sizer(), 100, 200);
      (cropper() as unknown as { onResize(): void }).onResize();
      sized(sizer(), 150, 300);
      settle();

      expect(stage().style.width).toBe('');
      expect(box()).toEqual([30, 60, 90, 180]);
    });

    it('lays the turn out at once for rotate(), so an export in the same breath is the turned one', () => {
      loadLandscape();
      for (let i = 0; i < 4; i++) key('ArrowRight', { shiftKey: true });
      expect(cropper().cropRect()).toEqual({ x: 240, y: 80, width: 480, height: 240 });

      // No change detection between the two calls.
      cropper().rotate();
      cropper().toDataUrl();

      expect(cropper().cropRect()).toEqual({ x: 240, y: 80, width: 480, height: 240 });
      expect(encoded).toEqual([{ width: 240, height: 480 }]);
      expect(calls).toEqual([
        ['translate', 120, 240],
        ['rotate', Math.PI / 2],
        ['drawImage', 240, 80, 480, 240, -240, -120, 480, 240],
      ]);
    });

    it('never pairs a new rotation with the old geometry, however the model is written', () => {
      loadLandscape();
      for (let i = 0; i < 4; i++) key('ArrowRight', { shiftKey: true });

      // Written to the model directly: the layout follows on the next change detection,
      // and until then a read is the whole upright crop, not half of each.
      cropper().rotation.set(90);
      cropper().toDataUrl();

      expect(calls).toEqual([['drawImage', 240, 80, 480, 240, 0, 0, 480, 240]]);
    });

    it('turns first and fits the ratio after, when both change at once', async () => {
      loadLandscape();

      host().rotation.set(90);
      host().aspectRatio.set(0.5);
      settle();

      // The turned window is 60 x 120, which is the ratio already. Fitted before the
      // turn, the upright window would have been narrowed first and cut down twice.
      expect(box()).toEqual([20, 40, 60, 120]);
      await vi.waitFor(() => expect(host().blobs.length).toBe(1));
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(host().blobs.length).toBe(1);
      expect(encoded).toEqual([{ width: 240, height: 480 }]);
    });

    it('rounds the edges of the crop in the source, so it never reaches past the image', () => {
      // 340 source pixels on a 320px stage: 1.0625 each, and at zoom 2 half of that.
      load({ display: 320, natural: 340 });
      host().zoom.set(2);
      fixture.detectChanges();
      for (let i = 0; i < 48; i++) key('ArrowLeft', { altKey: true });
      for (let i = 0; i < 40; i++) key('ArrowRight', { shiftKey: true });
      expect(box()).toMatchObject({ 0: 176, 2: 144 });
      expect(pan()[0]).toBe(-320);

      // The window covers [263.5, 340]. Rounded as an origin and a width it was 264 + 77.
      const c = cropper().cropRect();
      expect([c.x, c.width]).toEqual([264, 76]);

      host().rotation.set(180);
      settle();
      const turned = cropper().cropRect();
      expect([turned.x, turned.width]).toEqual([264, 76]);
    });

    it('keeps a pinch to the two fingers that began it', () => {
      load({ display: 400, natural: 800 });
      fire('pointerdown', window_()!, [100, 200]);
      fire('pointerdown', window_()!, [300, 200], { pointerId: 2, isPrimary: false });

      // A third finger comes and goes; the pinch is neither paused nor ended by it.
      fire('pointerdown', window_()!, [200, 50], { pointerId: 3, isPrimary: false });
      fire('pointermove', window_()!, [0, 0], { pointerId: 3, isPrimary: false });
      expect(host().zoom()).toBe(1);
      fire('pointermove', window_()!, [400, 200], { pointerId: 2, isPrimary: false });
      expect(host().zoom()).toBeCloseTo(1.5, 10);
      fire('pointerup', window_()!, [0, 0], { pointerId: 3, isPrimary: false });

      fire('pointermove', window_()!, [500, 200], { pointerId: 2, isPrimary: false });
      expect(host().zoom()).toBeCloseTo(2, 10);

      // One of its own lifting does end it.
      fire('pointercancel', window_()!, [100, 200]);
      fire('pointermove', window_()!, [700, 200], { pointerId: 2, isPrimary: false });
      expect(host().zoom()).toBeCloseTo(2, 10);
    });

    it('drops a pan that was under way when the source changed', () => {
      load({ display: 400, natural: 800 });
      host().zoom.set(2);
      fixture.detectChanges();
      fire('pointerdown', stage(), [10, 10]);
      fire('pointermove', stage(), [0, 0]);

      // The pointer is still captured and still moving while the next image loads.
      host().src.set('/other.jpg');
      fixture.detectChanges();
      fire('pointermove', stage(), [-30, -30]);
      load({ display: 400, natural: 800 });

      expect(pan()).toEqual([-200, -200]);
      expect(cropper().cropRect()).toEqual({ x: 280, y: 280, width: 240, height: 240 });
      fire('pointermove', stage(), [-60, -60]);
      expect(pan()).toEqual([-200, -200]);

      // A fresh pan on the new image works.
      fire('pointerdown', stage(), [10, 10]);
      fire('pointermove', stage(), [0, 0]);
      expect(pan()).toEqual([-210, -210]);
    });

    it('does not export the next image for a zoom made on the last one', async () => {
      load({ display: 400, natural: 800 });
      host().zoom.set(2);
      fixture.detectChanges();

      host().src.set('/other.jpg');
      fixture.detectChanges();
      load({ display: 400, natural: 800 });
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(host().blobs.length).toBe(0);

      // A zoom on the new image still gets its own.
      host().zoom.set(3);
      fixture.detectChanges();
      await vi.waitFor(() => expect(host().blobs.length).toBe(1));
    });

    it('emits only the newest crop when an older one finishes encoding after it', async () => {
      const pending: { blob: Blob; done: BlobCallback }[] = [];
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
        this: HTMLCanvasElement,
        done: BlobCallback
      ) {
        pending.push({ blob: new Blob([String(this.width)]), done });
      });
      load({ display: 400, natural: 800 });

      const older = cropper().refresh();
      host().zoom.set(2);
      fixture.detectChanges();
      const newer = cropper().refresh();

      // The newer one comes back first, then the older.
      pending[1].done(pending[1].blob);
      pending[0].done(pending[0].blob);
      await Promise.all([older, newer]);

      expect(host().blobs).toEqual([pending[1].blob]);
    });

    it('reports a picture that fails to load as a failed source', () => {
      load();

      // The second request for the same URL was not answered from the image list, and failed.
      view().dispatchEvent(new Event('error'));
      fixture.detectChanges();

      expect(host().errors.length).toBe(1);
      expect(cropper().status()).toBe('failed');
      expect(window_()).toBeNull();
    });

    it('comes back to where it started after four quarter turns, either way round', () => {
      loadLandscape();
      const before = cropper().cropRect();

      for (const direction of ['cw', 'ccw'] as const) {
        for (let i = 1; i <= 4; i++) {
          cropper().rotate(direction);
          settle();
          expect(host().rotation()).toBe(direction === 'cw' ? (i * 90) % 360 : (360 - i * 90) % 360);
          expect(cropper().cropRect(), `${direction} ${i}`).toEqual(before);
        }
        expect(box()).toEqual([80, 40, 240, 120]);
        expect(stage().style.width).toBe('');
      }
    });

    it('refits a locked aspect ratio after the turn laid it on its side', () => {
      host().aspectRatio.set(2);
      fixture.detectChanges();
      loadLandscape();
      expect(box()).toEqual([80, 40, 240, 120]);

      host().rotation.set(90);
      settle();

      // Turned, the window was 60 x 120; refitted around its centre it is 60 x 30.
      expect(box()).toEqual([20, 85, 60, 30]);
    });

    it('turns from the keyboard: R clockwise, Shift with R back', () => {
      loadLandscape();
      const status = (): string => root().querySelector<HTMLElement>('[role="status"]')!.textContent.trim();

      expect(key('r').defaultPrevented).toBe(true);
      expect(host().rotation()).toBe(90);
      expect(status()).toBe('Rotated 90°');

      key('R', { shiftKey: true });
      expect(host().rotation()).toBe(0);
      key('R', { shiftKey: true });
      expect(host().rotation()).toBe(270);
      expect(status()).toBe('Rotated 270°');
    });

    it('opens over a turned stage when the image loads already turned', () => {
      host().rotation.set(270);
      fixture.detectChanges();
      loadLandscape();

      expect([stage().style.width, stage().style.height]).toEqual(['100px', '200px']);
      expect(box()).toEqual([20, 40, 60, 120]);
      expect(cropper().cropRect()).toEqual({ x: 160, y: 80, width: 480, height: 240 });
    });

    it('announces the crop as it is seen, turned', () => {
      loadLandscape();
      host().rotation.set(90);
      settle();

      key('ArrowRight');

      // Stage pixels are four source pixels here; left and top are the turned image's.
      expect(root().querySelector<HTMLElement>('[role="status"]')!.textContent.trim()).toBe('84, 160, 240 × 480');
    });

    it('exports a zoomed crop from the smaller source region, at its own size', () => {
      load({ display: 400, natural: 800 });
      host().zoom.set(2);
      fixture.detectChanges();

      cropper().toDataUrl();

      expect(encoded).toEqual([{ width: 240, height: 240 }]);
      expect(calls).toEqual([['drawImage', 280, 280, 240, 240, 0, 0, 240, 240]]);
    });

    it('exports a turned and zoomed crop: the source region, drawn turned', () => {
      loadLandscape();
      host().rotation.set(90);
      settle();
      host().zoom.set(2);
      fixture.detectChanges();

      // The window is 60 x 120 of a 100 x 200 stage showing half of a 400 x 800 turned image.
      expect(cropper().cropRect()).toEqual({ x: 280, y: 140, width: 240, height: 120 });

      cropper().toDataUrl();

      // Portrait out, from a landscape region of the source.
      expect(encoded).toEqual([{ width: 120, height: 240 }]);
      expect(calls).toEqual([
        ['translate', 60, 120],
        ['rotate', Math.PI / 2],
        ['drawImage', 280, 140, 240, 120, -120, -60, 240, 120],
      ]);
    });

    it('caps a turned export by its longest side as it comes out', () => {
      host().maxOutputSize.set(120);
      fixture.detectChanges();
      loadLandscape();
      host().rotation.set(270);
      settle();

      cropper().toDataUrl();

      // 240 x 480 turned, capped to 60 x 120; the source region is still the whole crop.
      expect(encoded).toEqual([{ width: 60, height: 120 }]);
      expect(calls).toEqual([
        ['translate', 30, 60],
        ['rotate', (3 * Math.PI) / 2],
        ['drawImage', 160, 80, 480, 240, -60, -30, 120, 60],
      ]);
    });

    it('exports a half turn at the same size, from the same region', () => {
      loadLandscape();
      host().rotation.set(180);
      settle();

      cropper().toDataUrl();

      expect(stage().style.width).toBe('');
      expect(encoded).toEqual([{ width: 480, height: 240 }]);
      expect(calls[2]).toEqual(['drawImage', 160, 80, 480, 240, -240, -120, 480, 240]);
    });

    it('emits (cropped) once after the zoom and the rotation settle', async () => {
      loadLandscape();

      host().zoom.set(1.5);
      fixture.detectChanges();
      host().zoom.set(2);
      fixture.detectChanges();
      host().rotation.set(90);
      settle();

      await vi.waitFor(() => expect(host().blobs.length).toBe(1));
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(host().blobs.length).toBe(1);
      expect(encoded).toEqual([{ width: 120, height: 240 }]);
    });
  });

  /**
   * A source the browser cannot decode. jsdom fetches nothing and decodes nothing, so
   * the `error` event is dispatched by hand — the same stand-in `load()` above is for a
   * successful decode. What is real is everything the component does with it: the
   * output, the status, and the host modifier a stylesheet or a harness reads.
   */
  describe('when the source cannot be decoded', () => {
    const host = (): Host => fixture.componentInstance;
    const hostEl = (): HTMLElement => root().querySelector<HTMLElement>('wr-image-cropper')!;
    const fail = (): void => {
      img().dispatchEvent(new Event('error'));
      fixture.detectChanges();
    };

    afterEach(() => vi.restoreAllMocks());

    it('reports it once, with the url the image was given', () => {
      fail();
      // A second `error` for the same source says nothing new.
      fail();

      expect(host().errors).toEqual([{ url: '/photo.jpg', name: null, type: null, size: null }]);
      expect(cropper().status()).toBe('failed');
      expect(hostEl().classList).toContain('wr-image-cropper--failed');
      expect(window_()).toBeNull();
      expect(cropper().cropRect()).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    it('describes a File by what it declares, which is all a host has to explain it with', () => {
      // jsdom has no object URLs; the component only needs one to hand to the <img>.
      const created: string[] = [];
      vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
        created.push(`blob:test/${created.length}`);
        return created[created.length - 1];
      });
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

      host().src.set(new File(['not an image'], 'IMG_0001.heic', { type: 'image/heic' }));
      fixture.detectChanges();
      fail();

      expect(host().errors).toEqual([{ url: created[0], name: 'IMG_0001.heic', type: 'image/heic', size: 12 }]);
      // Torn down while the stub is still in place, since destroying revokes the URL.
      fixture.destroy();
    });

    it('forgets the failure the moment the source changes', () => {
      fail();

      host().src.set('/other.jpg');
      fixture.detectChanges();

      expect(cropper().status()).toBe('loading');
      expect(hostEl().classList).not.toContain('wr-image-cropper--failed');

      // And the next source loads as though nothing had happened.
      load();
      expect(cropper().status()).toBe('loaded');
      expect(window_()).not.toBeNull();
      expect(host().errors.length).toBe(1);
    });

    it('reports the next source that fails as well', () => {
      fail();
      host().src.set('/other.jpg');
      fixture.detectChanges();
      fail();

      expect(host().errors.map(e => e.url)).toEqual(['/photo.jpg', '/other.jpg']);
    });

    it('says nothing for an image that decodes', () => {
      expect(cropper().status()).toBe('loading');

      load();

      expect(cropper().status()).toBe('loaded');
      expect(host().errors).toEqual([]);
      expect(hostEl().classList).not.toContain('wr-image-cropper--failed');
    });

    it('is empty, not failed, with no source at all', () => {
      host().src.set(null);
      fixture.detectChanges();

      expect(cropper().status()).toBe('empty');
      expect(hostEl().classList).not.toContain('wr-image-cropper--failed');
    });
  });

  /**
   * Exporting. The bytes are a browser's job and jsdom encodes nothing, so what is
   * pinned here is the request mode a real browser needs to export at all, and what a
   * developer is told when there is nothing to export or the encode fails.
   */
  describe('exporting', () => {
    afterEach(() => vi.restoreAllMocks());

    it('requests the image with CORS, so a source on another origin can be exported', () => {
      // Without it a cross-origin image taints the canvas even when the server sends
      // CORS headers, and every `toBlob()` / `toDataUrl()` throws a SecurityError.
      expect(img().getAttribute('crossorigin')).toBe('anonymous');
    });

    it('says there is no image to export, rather than failing inside Angular', async () => {
      fixture.componentInstance.src.set(null);
      fixture.detectChanges();

      // A required view query used to throw NG0951 here.
      expect(() => cropper().toDataUrl()).toThrow(/no loaded image to export \(status "empty"\)/);
      await expect(cropper().toBlob()).rejects.toThrow(/no loaded image to export/);
    });

    it('says the same for a source that failed, rather than letting the canvas throw', async () => {
      img().dispatchEvent(new Event('error'));
      fixture.detectChanges();

      expect(() => cropper().toDataUrl()).toThrow(/no loaded image to export \(status "failed"\)/);
      await expect(cropper().toBlob()).rejects.toThrow(/no loaded image to export/);
    });

    it('tells the developer when the crop cannot be encoded, instead of swallowing it', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () => ({ drawImage: () => undefined }) as unknown as CanvasRenderingContext2D
      );
      const refused = new DOMException('Tainted canvases may not be exported.', 'SecurityError');
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(() => {
        throw refused;
      });
      load();

      window_()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      window_()!.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }));
      await vi.waitFor(() => expect(warn).toHaveBeenCalled());

      expect(warn.mock.calls[0]).toEqual([expect.stringContaining('(cropped) did not fire'), refused]);
      expect(fixture.componentInstance.blobs).toEqual([]);
    });

    it('re-emits nothing, and warns about nothing, with no image', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      fixture.componentInstance.src.set(null);
      fixture.detectChanges();

      await cropper().refresh();

      expect(warn).not.toHaveBeenCalled();
      expect(fixture.componentInstance.blobs).toEqual([]);
    });
  });

  describe('exporting to a file', () => {
    const encodeAs = (type: string): void => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () => ({ drawImage: () => undefined }) as unknown as CanvasRenderingContext2D
      );
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback: BlobCallback) =>
        callback(new Blob([''], { type }))
      );
      load();
    };

    afterEach(() => vi.restoreAllMocks());

    it('appends the extension of the encoded type to a bare name', async () => {
      encodeAs('image/jpeg');

      const file = await cropper().toFile('avatar', 'image/jpeg');

      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('avatar.jpg');
      expect(file.type).toBe('image/jpeg');
    });

    it('replaces the extension the caller passed', async () => {
      encodeAs('image/webp');

      expect((await cropper().toFile('avatar.png', 'image/webp')).name).toBe('avatar.webp');
    });

    it('names the file after the type the browser fell back to, not the one asked for', async () => {
      encodeAs('image/png');

      const file = await cropper().toFile('avatar.webp', 'image/webp');

      expect(file.name).toBe('avatar.png');
      expect(file.type).toBe('image/png');
    });

    it('rejects with no image, like toBlob', async () => {
      fixture.componentInstance.src.set(null);
      fixture.detectChanges();

      await expect(cropper().toFile('a')).rejects.toThrow(/no loaded image to export/);
    });
  });

  /**
   * `[maxOutputSize]`. jsdom has no 2D context, so the canvas is given a recording one:
   * the assertions are the canvas's pixel SIZE and the `drawImage` call, which together
   * say whether the export is the same region drawn smaller — the contract — or a
   * smaller region, which would pass a size-only check.
   *
   * Displayed at 400 for a natural 800, so the initial crop's source rect is fixed by
   * the aspect ratio: 2 gives 480 × 240 at (160, 280), 0.5 gives 240 × 480 at (280, 160).
   */
  describe('capping the export size', () => {
    let draws: number[][];
    let encoded: { width: number; height: number }[];

    beforeEach(() => {
      draws = [];
      encoded = [];
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () =>
          ({
            drawImage: (_img: unknown, ...args: number[]) => draws.push(args),
          }) as unknown as CanvasRenderingContext2D
      );
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function (this: HTMLCanvasElement) {
        encoded.push({ width: this.width, height: this.height });
        return 'data:image/png;base64,';
      });
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
        this: HTMLCanvasElement,
        callback: BlobCallback
      ) {
        encoded.push({ width: this.width, height: this.height });
        callback(new Blob(['']));
      });
    });

    afterEach(() => vi.restoreAllMocks());

    const loadWith = (aspectRatio: number, maxOutputSize: number | string | null): void => {
      fixture.componentInstance.aspectRatio.set(aspectRatio);
      fixture.componentInstance.maxOutputSize.set(maxOutputSize);
      fixture.detectChanges();
      load({ display: 400, natural: 800 });
    };

    it('exports at the source resolution without a cap, as it always has', () => {
      loadWith(2, null);

      cropper().toDataUrl();

      expect(encoded).toEqual([{ width: 480, height: 240 }]);
      expect(draws).toEqual([[160, 280, 480, 240, 0, 0, 480, 240]]);
    });

    it('scales a larger crop down to the cap, keeping its aspect ratio and its region', () => {
      loadWith(2, 100);

      cropper().toDataUrl();

      expect(encoded).toEqual([{ width: 100, height: 50 }]);
      // The whole crop is still the source; only the destination shrank.
      expect(draws).toEqual([[160, 280, 480, 240, 0, 0, 100, 50]]);
      expect(cropper().cropRect()).toEqual({ x: 160, y: 280, width: 480, height: 240 });
    });

    it('caps the LONGEST side, which for a portrait crop is the height', () => {
      loadWith(0.5, 100);

      cropper().toDataUrl();

      expect(encoded).toEqual([{ width: 50, height: 100 }]);
    });

    it('never upscales a crop already inside the cap', () => {
      loadWith(2, 1000);

      cropper().toDataUrl();

      expect(encoded).toEqual([{ width: 480, height: 240 }]);
    });

    it('rounds the short side to a whole pixel', () => {
      // Ratio 3 gives a 480 x 160 crop; at a cap of 100 the height is 33.3.
      loadWith(3, 100);

      cropper().toDataUrl();

      expect(encoded).toEqual([{ width: 100, height: 33 }]);
    });

    it('holds for toBlob and for the (cropped) a gesture emits', async () => {
      loadWith(2, 100);

      await cropper().toBlob();
      window_()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      window_()!.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }));
      await vi.waitFor(() => expect(fixture.componentInstance.blobs.length).toBe(1));

      expect(encoded).toEqual([
        { width: 100, height: 50 },
        { width: 100, height: 50 },
      ]);
    });

    it.each([0, -50, '', 'wide'])('treats %j as no cap rather than a one-pixel export', cap => {
      loadWith(2, cap);

      cropper().toDataUrl();

      expect(encoded).toEqual([{ width: 480, height: 240 }]);
    });
  });
});

/**
 * Every documented `[outputType]`, and an honest statement of what that proves.
 *
 * jsdom has no 2D context, so nothing here renders and the BYTES cannot be
 * checked — the encoded result is a browser's job and this spec does not claim
 * otherwise. What it does pin is the plumbing: the configured type reaches
 * `toDataURL` instead of a hardcoded one. That is a real regression to catch,
 * because an input that silently stops being forwarded looks identical from the
 * outside: every export still succeeds, and every one of them is a PNG.
 */
describe('WrImageCropper forwards every documented output type', () => {
  @Component({
    imports: [WrImageCropper],
    template: `<wr-image-cropper src="data:image/png;base64,iVBORw0KGgo=" [outputType]="type()" />`,
  })
  class TypeHost {
    readonly type = signal<WrImageOutputType>('image/png');
    readonly cropper = viewChild.required(WrImageCropper);
  }

  const TYPES: readonly WrImageOutputType[] = ['image/png', 'image/jpeg', 'image/webp'];
  let fixture: ReturnType<typeof TestBed.createComponent<TypeHost>>;
  let seen: unknown[];

  beforeEach(() => {
    seen = [];
    // The canvas never paints here; it only has to record what it was asked for.
    HTMLCanvasElement.prototype.toDataURL = function (type?: string): string {
      seen.push(type);
      return `data:${type ?? 'image/png'};base64,`;
    };

    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(TypeHost);
    fixture.detectChanges();
    // jsdom never loads an image; an export needs one that has.
    (fixture.nativeElement as HTMLElement).querySelector('img')!.dispatchEvent(new Event('load'));
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it.each(TYPES)('%s reaches the encoder', type => {
    fixture.componentInstance.type.set(type);
    fixture.detectChanges();

    fixture.componentInstance.cropper().toDataUrl();
    expect(seen).toContain(type);
  });
});
