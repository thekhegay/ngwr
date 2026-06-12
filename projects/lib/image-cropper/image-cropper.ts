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

import type { WrCropHandle, WrCropRect, WrImageOutputType } from './types';

interface RectPx {
  x: number;
  y: number;
  w: number;
  h: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Image crop UI. Pass `[src]` (URL, `File`, or `Blob`); the user drags
 * the crop window or any of its eight handles. Optionally lock the crop
 * to a fixed `[aspectRatio]`.
 *
 * `(cropped)` fires after each drag end with a freshly-rendered `Blob`
 * of the cropped region. For one-off reads use `toBlob()` / `toDataUrl()`.
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
 * @see https://ngwr.dev/docs/components/image-cropper
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
    });
  }

  // Image load

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
