/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import {
  Component,
  DestroyRef,
  type ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { clamp, randomId } from 'ngwr/utils';

import type { WrCropHandle, WrCropRect, WrImageOutputType } from './interfaces';

/**
 * Stands in for the consumer input `useI18nText` expects. None of this
 * component's three strings has a `*Label` input behind it — the catalog is the
 * override channel — so they share one empty override.
 */
const NO_OVERRIDE = signal<string | null>(null).asReadonly();

/** Keyboard step in display pixels, and what Shift promotes it to. */
const KEY_STEP = 1;
const KEY_STEP_COARSE = 10;

interface RectPx {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Image crop UI. Pass `[src]` (URL, `File`, or `Blob`); the user drags
 * the crop window or any of its eight handles. Optionally lock the crop
 * to a fixed `[aspectRatio]`.
 *
 * The crop window is also the one tab stop: arrow keys move it, Alt with an
 * arrow key resizes it, and Shift makes either step ten pixels instead of one.
 *
 * `(cropped)` fires after each drag end — or each run of arrow keys — with a
 * freshly-rendered `Blob` of the cropped region. For one-off reads use
 * `toBlob()` / `toDataUrl()`.
 *
 * @example
 * ```html
 * <wr-image-cropper
 *   [src]="file"
 *   [aspectRatio]="1"
 *   (cropped)="onBlob($event)"
 * />
 * ```
 *
 * @see https://ngwr.dev/reference/components/image-cropper
 */
@Component({
  selector: 'wr-image-cropper',
  templateUrl: './image-cropper.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-image-cropper' },
})
export class WrImageCropper {
  /** Image source — URL string, `File`, or `Blob`. */
  readonly src = input<string | File | Blob | null>(null);

  /** Aspect ratio (width / height). `null` = free. @default null */
  readonly aspectRatio = input<number | null>(null);

  /** Minimum crop width in display pixels. @default 32 */
  readonly minWidth = input(32, { transform: (v: unknown): number => Math.max(8, coerceNumberProperty(v, 32)) });

  /** Minimum crop height in display pixels. @default 32 */
  readonly minHeight = input(32, { transform: (v: unknown): number => Math.max(8, coerceNumberProperty(v, 32)) });

  /** Default output type for `(cropped)`. @default 'image/png' */
  readonly outputType = input<WrImageOutputType>('image/png');

  /** JPEG / WebP quality for `(cropped)` in [0, 1]. @default 0.92 */
  readonly outputQuality = input(0.92);

  /** Emits a Blob after each drag end. */
  readonly cropped = output<Blob>();

  protected readonly imgEl = viewChild.required<ElementRef<HTMLImageElement>>('img');

  /** Resolved object URL for `src` (so File / Blob render in `<img>`). */
  protected readonly emptyText = useI18nText(NO_OVERRIDE, 'imageCropper.empty', 'No image');

  /** Accessible name of the crop window — the component's only tab stop. */
  protected readonly resolvedWindowLabel = useI18nText(NO_OVERRIDE, 'imageCropper.window', 'Crop region');

  /** The key model, referenced by the window's `aria-describedby`. */
  protected readonly resolvedKeyHelp = useI18nText(
    NO_OVERRIDE,
    'imageCropper.keyHelp',
    'Arrow keys move the crop. Hold Alt with an arrow key to resize it, and Shift for larger steps. ' +
      'The crop is announced as left, top, width and height in image pixels.'
  );

  /** Id linking the crop window to the help text. Random rather than counted:
   *  the crop UI only exists after a real image load, so it never prerenders. */
  protected readonly helpId = randomId('wr-image-cropper-help');

  /** Live-region text — written by the keyboard path only (see `onWindowKeydown`). */
  protected readonly announcement = signal<string>('');

  protected readonly objectUrl = signal<string | null>(null);

  /** Previous object URL we created — kept off-signal so the resolve
   *  effect doesn't depend on its own writes (which would loop). */
  private previousObjectUrl: string | null = null;

  /** Natural (source) pixel dimensions. */
  protected readonly natural = signal<{ w: number; h: number }>({ w: 0, h: 0 });

  /** Display (rendered) pixel dimensions. */
  protected readonly display = signal<{ w: number; h: number }>({ w: 0, h: 0 });

  /** Crop rect in display coordinates. */
  protected readonly cropDisplay = signal<RectPx>({ x: 0, y: 0, w: 0, h: 0 });

  /** Watches the rendered image box — see `watchResize`. */
  private resizeObserver: ResizeObserver | null = null;

  /** Currently active drag handle. */
  private active: WrCropHandle | null = null;
  private startPointer: { x: number; y: number } = { x: 0, y: 0 };
  private startRect: RectPx = { x: 0, y: 0, w: 0, h: 0 };

  private readonly destroyRef = inject(DestroyRef);

  /** Resolved crop rect in natural (source) pixel coordinates. */
  readonly cropRect = computed<WrCropRect>(() => {
    const display = this.display();
    const natural = this.natural();
    const c = this.cropDisplay();
    if (display.w === 0 || display.h === 0) return { x: 0, y: 0, width: 0, height: 0 };
    const sx = natural.w / display.w;
    const sy = natural.h / display.h;
    return {
      x: Math.round(c.x * sx),
      y: Math.round(c.y * sy),
      width: Math.round(c.w * sx),
      height: Math.round(c.h * sy),
    };
  });

  constructor() {
    // Resolve the source into a usable URL the <img> can render.
    // We only read `src()` here — `previousObjectUrl` is a plain field, so
    // writing to `objectUrl` doesn't re-trigger this effect (and hang the
    // tab on file upload).
    effect(() => {
      const src = this.src();
      if (this.previousObjectUrl) {
        URL.revokeObjectURL(this.previousObjectUrl);
        this.previousObjectUrl = null;
      }
      // The crop is measured against the image that WAS showing, and `cropRect` is a
      // public signal a consumer can read at any moment. Left in place it kept
      // reporting a rect scaled to the previous image for the whole gap between a new
      // `src` and its load event — long enough to crop the wrong thing.
      this.resetGeometry();
      if (!src) {
        this.objectUrl.set(null);
        return;
      }
      if (typeof src === 'string') {
        this.objectUrl.set(src);
      } else {
        const url = URL.createObjectURL(src);
        this.previousObjectUrl = url;
        this.objectUrl.set(url);
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.previousObjectUrl) URL.revokeObjectURL(this.previousObjectUrl);
      this.resizeObserver?.disconnect();
    });
  }

  // Image load

  /**
   * Back to "nothing measured yet", which is also what an absent `src` means.
   *
   * `display` is the field that gates everything downstream — the crop UI renders on
   * `display().w > 0` and `cropRect` returns zeros without it — so it is the only one
   * a test can observe. The other two are reset for coherence: the resize observer
   * below also writes `display`, and left alone they would resurrect a crop measured
   * against the previous image (which is why `onResize` refuses to run on a zeroed
   * `display` — see there).
   */
  private resetGeometry(): void {
    this.natural.set({ w: 0, h: 0 });
    this.display.set({ w: 0, h: 0 });
    this.cropDisplay.set({ x: 0, y: 0, w: 0, h: 0 });
  }

  protected onImageLoad(): void {
    const img = this.imgEl().nativeElement;
    const rect = img.getBoundingClientRect();
    const display = { w: rect.width, h: rect.height };
    // Some SVGs and odd images report zero natural dimensions — fall back
    // to the rendered size so the crop math stays well-defined.
    const natural = {
      w: img.naturalWidth || display.w,
      h: img.naturalHeight || display.h,
    };
    this.natural.set(natural);
    this.display.set(display);
    this.cropDisplay.set(this.initialCrop(display));
    this.watchResize(img);
  }

  /**
   * Keep `display` on the box the image is actually rendered at.
   *
   * The stylesheet sizes the image responsively — `max-width: 100%`,
   * `max-height: 70dvh`, `height: auto` — so the single measurement taken in the
   * `(load)` handler stops being true as soon as the container or the viewport
   * changes. Everything the user sees and touches is in DISPLAY pixels: the crop
   * window's inline `left` / `top` / `width` / `height`, the backdrop cut-out, and
   * the bounds `applyMove` / `applyResize` clamp against. Measured once, a narrowed
   * window leaves the crop painted past the edge of the image and draggable off it.
   *
   * Re-observed per load rather than once, because a new `src` may mount a new
   * `<img>`; the old observation would then be on a detached element.
   */
  private watchResize(el: HTMLImageElement): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver?.disconnect();
    // Re-read the same way `onImageLoad` does rather than take the entry's
    // `contentRect`, so the two measurements can't disagree about the box.
    const ro = new ResizeObserver(() => this.onResize(el));
    ro.observe(el);
    this.resizeObserver = ro;
  }

  /**
   * Rescale the crop by however much the image did, so the user keeps the region
   * they picked instead of having it re-centred: `cropRect()` — the source-pixel
   * value a consumer acts on — comes out the same across the resize.
   */
  private onResize(el: HTMLImageElement): void {
    const previous = this.display();
    // Nothing measured yet, or measured and then dropped by `resetGeometry` while a
    // new `src` loads. There is no crop to carry over, and the load will measure.
    if (previous.w === 0 || previous.h === 0) return;
    const rect = el.getBoundingClientRect();
    // A hidden image (a closed tab, `display: none`) reports zeros. Scaling by that
    // would collapse the crop and there would be nothing to scale back from, so hold
    // the last real box until it is shown again.
    if (rect.width === 0 || rect.height === 0) return;
    if (rect.width === previous.w && rect.height === previous.h) return;

    const sx = rect.width / previous.w;
    const sy = rect.height / previous.h;
    const c = this.cropDisplay();
    this.display.set({ w: rect.width, h: rect.height });
    this.cropDisplay.set({ x: c.x * sx, y: c.y * sy, w: c.w * sx, h: c.h * sy });
  }

  /** Compute a sensible initial crop — centered, respecting aspectRatio. */
  private initialCrop(display: { w: number; h: number }): RectPx {
    const ratio = this.aspectRatio();
    let w = display.w * 0.6;
    let h = display.h * 0.6;
    if (ratio && ratio > 0) {
      const candidate = w / ratio;
      if (candidate > h) w = h * ratio;
      else h = w / ratio;
    }
    return {
      x: (display.w - w) / 2,
      y: (display.h - h) / 2,
      w,
      h,
    };
  }

  // Drag handlers

  protected readonly handles: readonly WrCropHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  protected onPointerDown(handle: WrCropHandle, event: PointerEvent): void {
    // Any pointerdown used to start a drag, so the right button moved the crop window and
    // a second finger could take over a drag already in progress.
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.stopPropagation();
    this.active = handle;
    this.startPointer = { x: event.clientX, y: event.clientY };
    this.startRect = { ...this.cropDisplay() };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.active) return;
    const dx = event.clientX - this.startPointer.x;
    const dy = event.clientY - this.startPointer.y;
    if (this.active === 'move') this.applyMove(dx, dy);
    else this.applyResize(this.active, dx, dy);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.active) return;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    this.active = null;
    void this.emitCropped();
  }

  // Keyboard

  /** Whether a key has moved the crop since the last `keyup`. */
  private keyboardDirty = false;

  /**
   * The component's only keyboard path. Arrow keys move the crop window; Alt
   * with an arrow key resizes it from the east / south edge; Shift makes either
   * one ten display pixels instead of one — the coarse modifier `wr-slider`,
   * `wr-knob` and `wr-splitter` all use, which is why Alt and not Shift carries
   * the mode switch here.
   *
   * Nothing mirrors under `dir="rtl"`: the image is not flipped and the window
   * is placed with a physical `left`, so ArrowLeft moves the crop visually left
   * in both directions.
   *
   * Both branches go through `applyMove` / `applyResize`, so the `aspectRatio`
   * lock, the `minWidth` / `minHeight` floors and the canvas bounds hold for a
   * keystroke exactly as they do for a drag. Those two measure from `startRect`
   * rather than from the live rect, so it is re-seeded per keystroke — a 1px
   * delta against the rect from the first press would make a held arrow stall
   * after one pixel instead of accumulating.
   */
  protected onWindowKeydown(event: KeyboardEvent): void {
    const step = event.shiftKey ? KEY_STEP_COARSE : KEY_STEP;
    let dx = 0;
    let dy = 0;
    switch (event.key) {
      case 'ArrowLeft':
        dx = -step;
        break;
      case 'ArrowRight':
        dx = step;
        break;
      case 'ArrowUp':
        dy = -step;
        break;
      case 'ArrowDown':
        dy = step;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.startRect = { ...this.cropDisplay() };
    if (event.altKey) this.applyResize(dx !== 0 ? 'e' : 's', dx, dy);
    else this.applyMove(dx, dy);

    this.keyboardDirty = true;
    const c = this.cropRect();
    // Bare numbers on purpose — `resolvedKeyHelp` has already told the reader
    // what the four are, and a sentence here would be a translated string.
    this.announcement.set(`${c.x}, ${c.y}, ${c.width} × ${c.height}`);
  }

  /**
   * Emit once per gesture, not once per keystroke. A held arrow repeats its
   * keydown many times a second and each `emitCropped` renders a canvas and
   * encodes a Blob; `keyup` fires once when the run ends, which is the keyboard's
   * equivalent of the `pointerup` the drag path emits on.
   */
  protected onWindowKeyup(): void {
    if (!this.keyboardDirty) return;
    this.keyboardDirty = false;
    void this.emitCropped();
  }

  private applyMove(dx: number, dy: number): void {
    const display = this.display();
    const r = this.startRect;
    const next = {
      x: clamp(r.x + dx, 0, display.w - r.w),
      y: clamp(r.y + dy, 0, display.h - r.h),
      w: r.w,
      h: r.h,
    };
    this.cropDisplay.set(next);
  }

  private applyResize(handle: WrCropHandle, dx: number, dy: number): void {
    const display = this.display();
    const min = { w: this.minWidth(), h: this.minHeight() };
    const ratio = this.aspectRatio();
    const r = this.startRect;
    let x = r.x;
    let y = r.y;
    let w = r.w;
    let h = r.h;

    if (handle.includes('e')) w = clamp(r.w + dx, min.w, display.w - r.x);
    if (handle.includes('w')) {
      const nextW = clamp(r.w - dx, min.w, r.x + r.w);
      x = r.x + (r.w - nextW);
      w = nextW;
    }
    if (handle.includes('s')) h = clamp(r.h + dy, min.h, display.h - r.y);
    if (handle.includes('n')) {
      const nextH = clamp(r.h - dy, min.h, r.y + r.h);
      y = r.y + (r.h - nextH);
      h = nextH;
    }

    if (ratio && ratio > 0) {
      // Lock the orthogonal axis to maintain ratio. For corner handles,
      // pick whichever delta drives the larger change so we don't bounce.
      if (handle === 'e' || handle === 'w') {
        const newH = w / ratio;
        const dh = newH - r.h;
        if (handle === 'e' || handle === 'w') {
          y = r.y - dh / 2;
          h = newH;
        }
      } else if (handle === 'n' || handle === 's') {
        const newW = h * ratio;
        const dw = newW - r.w;
        x = r.x - dw / 2;
        w = newW;
      } else {
        // Corner — drive by width, then derive height.
        const newH = w / ratio;
        if (handle.includes('n')) y = r.y + r.h - newH;
        h = newH;
      }
      // Re-clamp after ratio adjustment so we never spill out of the canvas.
      x = clamp(x, 0, display.w - w);
      y = clamp(y, 0, display.h - h);
      w = clamp(w, min.w, display.w - x);
      h = clamp(h, min.h, display.h - y);
    }

    this.cropDisplay.set({ x, y, w, h });
  }

  // Public API

  /** Render the current crop as a Blob. */
  async toBlob(type: WrImageOutputType = this.outputType(), quality: number = this.outputQuality()): Promise<Blob> {
    const canvas = this.toCanvas();
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (blob) resolve(blob);
          else reject(new Error('toBlob returned null'));
        },
        type,
        quality
      );
    });
  }

  /** Render the current crop as a data URL. */
  toDataUrl(type: WrImageOutputType = this.outputType(), quality: number = this.outputQuality()): string {
    return this.toCanvas().toDataURL(type, quality);
  }

  /** Re-emit the crop without waiting for a drag (e.g. after a programmatic change). */
  async refresh(): Promise<void> {
    await this.emitCropped();
  }

  // Internals

  private toCanvas(): HTMLCanvasElement {
    const img = this.imgEl().nativeElement;
    const c = this.cropRect();
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, c.width);
    canvas.height = Math.max(1, c.height);
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(img, c.x, c.y, c.width, c.height, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  private async emitCropped(): Promise<void> {
    try {
      const blob = await this.toBlob();
      this.cropped.emit(blob);
    } catch {
      // Swallow — invalid state (image not loaded, crop empty, etc.).
    }
  }
}
