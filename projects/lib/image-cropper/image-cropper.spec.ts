import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrImageCropper } from './image-cropper';
import type { WrCropHandle, WrImageLoadError, WrImageOutputType } from './interfaces';

@Component({
  imports: [WrImageCropper],
  template: `
    <wr-image-cropper
      [src]="src()"
      [aspectRatio]="aspectRatio()"
      [maxOutputSize]="maxOutputSize()"
      [minHeight]="minHeight()"
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
  });

  afterEach(() => fixture.destroy());

  it.each(TYPES)('%s reaches the encoder', type => {
    fixture.componentInstance.type.set(type);
    fixture.detectChanges();

    fixture.componentInstance.cropper().toDataUrl();
    expect(seen).toContain(type);
  });
});
