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

import type { WrCropHandle, WrCropRect, WrImageCropperStatus, WrImageLoadError, WrImageOutputType } from './interfaces';

/**
 * `[maxOutputSize]`'s transform. Anything that is not a positive, finite number —
 * `null`, an empty attribute, `0`, a typo — means "no cap" rather than a 1px export:
 * a bad config should cost resolution nobody asked to lose, not the whole image.
 */
function coerceMaxOutputSize(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = coerceNumberProperty(value, Number.NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
}

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

interface SizePx {
  w: number;
  h: number;
}

/** Distances, in CSS pixels, past each side of a box. */
interface SidesPx {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const NO_SIDES: SidesPx = { left: 0, top: 0, right: 0, bottom: 0 };

/**
 * The rect a resize gesture produces: a pure function of the rect the gesture started
 * from and the TOTAL pointer offset, so the same pointer position always gives the same
 * rect however the pointer got there.
 *
 * The anchor never moves. It is the edge or corner opposite the handle — for `se` the
 * top-left corner, for `e` the west edge's line. The old version clamped `x`, `y`, `w`
 * and `h` one at a time after deriving the second axis, so once the derived axis ran
 * into the image edge the rect slid AWAY from its anchor and, past the far bound, off
 * the image entirely.
 *
 * With a ratio the size is the largest along that ratio which fits from the anchor —
 * the smaller of the width-limited and height-limited sizes — and no smaller than both
 * minimums allow. Where the image cannot fit the minimum from this anchor, the bound
 * wins: a crop past the edge of the image is worse than one under the minimum.
 *
 * An edge handle with a ratio also sizes the axis it does not drive, and that axis has
 * the image's WHOLE extent to grow into: the rect stays centred on its old midline where
 * it can and slides along that axis only as far as it must to stay on the image. Capping
 * the size at twice the distance from the midline to the nearer side instead would leave
 * a square crop resting against the top edge unable to widen at all.
 */
function resizeFrom(
  r: RectPx,
  handle: WrCropHandle,
  dx: number,
  dy: number,
  bounds: SizePx,
  min: SizePx,
  ratio: number | null
): RectPx {
  const east = handle.includes('e');
  const west = handle.includes('w');
  const south = handle.includes('s');
  const north = handle.includes('n');
  const right = r.x + r.w;
  const bottom = r.y + r.h;

  if (!ratio || ratio <= 0) {
    let { x, y, w, h } = r;
    if (east) w = clamp(r.w + dx, min.w, bounds.w - r.x);
    if (west) {
      w = clamp(r.w - dx, min.w, right);
      x = right - w;
    }
    if (south) h = clamp(r.h + dy, min.h, bounds.h - r.y);
    if (north) {
      h = clamp(r.h - dy, min.h, bottom);
      y = bottom - h;
    }
    return { x, y, w, h };
  }

  // Room from the anchor to the image edge on each axis the handle drives; the whole
  // image on an axis it does not.
  const roomW = east ? bounds.w - r.x : west ? right : bounds.w;
  const roomH = south ? bounds.h - r.y : north ? bottom : bounds.h;
  // Corners follow the horizontal delta, as they always have; `n` / `s` the vertical one.
  const wanted = east ? r.w + dx : west ? r.w - dx : (south ? r.h + dy : r.h - dy) * ratio;
  const w = clamp(wanted, Math.max(min.w, min.h * ratio), Math.min(roomW, roomH * ratio));
  const h = w / ratio;

  return {
    x: east ? r.x : west ? right - w : clamp(r.x + r.w / 2 - w / 2, 0, bounds.w - w),
    y: south ? r.y : north ? bottom - h : clamp(r.y + r.h / 2 - h / 2, 0, bounds.h - h),
    w,
    h,
  };
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
 * A source the browser cannot decode fires `(loadError)` once, sets `status()` to
 * `'failed'` and puts `wr-image-cropper--failed` on the host. The component renders
 * no message of its own for it — what went wrong and what to do next is the host's
 * to say.
 *
 * @example
 * ```html
 * <wr-image-cropper
 *   [src]="file"
 *   [aspectRatio]="1"
 *   (cropped)="onBlob($event)"
 *   (loadError)="onUnreadable($event)"
 * />
 * ```
 *
 * @see https://ngwr.dev/reference/components/image-cropper
 */
@Component({
  selector: 'wr-image-cropper',
  templateUrl: './image-cropper.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-image-cropper',
    '[class.wr-image-cropper--failed]': "status() === 'failed'",
  },
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

  /**
   * Longest side of the exported image, in pixels — for `(cropped)`, `toBlob()` and
   * `toDataUrl()` alike. A crop larger than this is scaled down to fit, keeping its
   * aspect ratio; a smaller one is exported as it is, never upscaled. The crop itself
   * — `cropRect()`, in source pixels — is not affected. `null` (or anything that is
   * not a positive number) exports at the source image's own resolution.
   * @default null
   */
  readonly maxOutputSize = input<number | null>(null, { transform: coerceMaxOutputSize });

  /** Emits a Blob after each drag end. */
  readonly cropped = output<Blob>();

  /**
   * Fires once when the browser cannot decode the current `src` — a format it does
   * not support, a broken file, a URL that fails. Nothing is rendered for it; show
   * your own message. A new `src` clears the failure.
   */
  readonly loadError = output<WrImageLoadError>();

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

  /** The element the live drag set pointer capture on, so the end releases that one. */
  private captureTarget: HTMLElement | null = null;

  /** The pointer the live drag belongs to. Every other pointer's events are ignored. */
  private pointerId: number | null = null;

  /** How far past each side of the crop the live resize was pressed — see `onPointerMove`. */
  private overhang: SidesPx = NO_SIDES;

  private readonly destroyRef = inject(DestroyRef);

  private readonly statusState = signal<WrImageCropperStatus>('empty');

  /**
   * Where the source stands: `'empty'`, `'loading'`, `'loaded'` or `'failed'`. Reset
   * to `'loading'` (or `'empty'`) whenever `src` changes, so a failure never outlives
   * the source that caused it.
   */
  readonly status = this.statusState.asReadonly();

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
        this.statusState.set('empty');
        return;
      }
      // A new source starts over: a failure belongs to the source that caused it, and
      // left in place it would mark a perfectly good next image as broken until the
      // browser answered for that one too.
      this.statusState.set('loading');
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
    this.statusState.set('loaded');
    this.natural.set(natural);
    this.display.set(display);
    this.cropDisplay.set(this.initialCrop(display));
    this.watchResize(img);
  }

  /**
   * The `<img>` could not decode its source.
   *
   * Before this handler existed a failed decode left the component exactly as it
   * looks while loading — an image with no size, no crop window, nothing emitted —
   * so a host had no way to tell "still decoding" from "never going to", and a user
   * who picked a `.heic` the browser cannot read saw an empty box and no reason.
   *
   * Once per source: `status` is reset by a new `src` and by nothing else, so a
   * second `error` for the same source says nothing new and is not re-emitted.
   */
  protected onImageError(): void {
    const url = this.objectUrl();
    if (!url || this.statusState() === 'failed') return;
    this.statusState.set('failed');
    this.resetGeometry();

    const src = this.src();
    const isBlob = typeof src !== 'string' && src !== null;
    this.loadError.emit({
      url,
      name: typeof File !== 'undefined' && src instanceof File ? src.name : null,
      type: isBlob ? src.type : null,
      size: isBlob ? src.size : null,
    });
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
    this.pointerId = event.pointerId;
    this.startPointer = { x: event.clientX, y: event.clientY };
    this.startRect = { ...this.cropDisplay() };
    this.captureTarget = event.currentTarget as HTMLElement;
    this.captureTarget.setPointerCapture(event.pointerId);
    this.overhang = handle === 'move' ? NO_SIDES : this.pastCrop(event);
  }

  /**
   * A resize ENDS when the pointer leaves the image, exactly as `pointerup` would end it:
   * the move that carried it out is applied — clamped to the image like any other — and
   * then the drag is over. Nothing after that resumes it or changes the crop, pointer
   * back over the image or not, until a new `pointerdown`. A move drag is not affected:
   * its size is fixed, so it simply rests against the edge.
   *
   * The move that leaves is applied rather than dropped because pointer moves are
   * SAMPLES. Dropped, a quick drag toward a corner would stop wherever its last sample
   * inside happened to fall — a single move from a handle to past the image would change
   * nothing at all — and even a slow one would stop a fraction of a pixel short of the
   * edge. A drag that leaves across one edge still ends there: heading for a corner at a
   * slant that crosses the bottom first, the crop's right edge stays where it was then.
   *
   * "The image" is the `<img>`'s own box — the bounds `applyMove` / `applyResize` clamp
   * the crop to — with its edges counting as inside, since the crop may reach them. The
   * box is re-measured on every move and compared with `clientX` / `clientY`: both are
   * viewport coordinates, so a scroll mid-drag cannot put them out of step. The moves
   * outside reach this handler at all only because the drag holds pointer capture.
   *
   * One allowance, fixed at `pointerdown`: the box is widened on each side by however far
   * past that side of the CROP the press landed — at most as far as the pressed handle
   * reaches past it. Half of an edge handle, and three quarters of a corner handle, lies
   * outside the crop, so a press there already has the pointer ahead of the edge it drags.
   * Measured without the allowance, that pointer would leave the image while the crop was
   * still short of the image's edge by the same distance, with nothing able to close the
   * gap; and a handle resting on the image's edge, pressed on its outer part, would begin
   * its drag already outside. A press on a handle's inner part widens nothing.
   */
  protected onPointerMove(event: PointerEvent): void {
    if (!this.active || event.pointerId !== this.pointerId) return;
    const dx = event.clientX - this.startPointer.x;
    const dy = event.clientY - this.startPointer.y;
    if (this.active === 'move') {
      this.applyMove(dx, dy);
      return;
    }
    this.applyResize(this.active, dx, dy);
    if (!this.withinImage(event)) this.onPointerUp(event);
  }

  /**
   * Ends the drag — for `pointerup`, `pointercancel`, a capture lost to something else,
   * and a resize whose pointer left the image. Once per drag: the capture released here
   * fires `lostpointercapture` afterwards, and by then there is nothing left to end.
   *
   * Only for the pointer that started it. A second finger is refused a drag of its own at
   * `pointerdown`, but its moves and its lifting reach these handlers all the same, and
   * would otherwise drive or end the first finger's drag.
   */
  protected onPointerUp(event: PointerEvent): void {
    if (!this.active || event.pointerId !== this.pointerId) return;
    const target = this.captureTarget;
    this.active = null;
    this.pointerId = null;
    this.captureTarget = null;
    this.overhang = NO_SIDES;
    // Asked first: a capture that is already gone has nothing to release, and releasing
    // one for a pointer that is no longer active throws.
    if (target?.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    void this.emitCropped();
  }

  /** How far past each side of the crop window the pointer is, in CSS pixels. */
  private pastCrop(event: PointerEvent): SidesPx {
    const box = this.imgEl().nativeElement.getBoundingClientRect();
    const c = this.startRect;
    return {
      left: Math.max(0, box.left + c.x - event.clientX),
      top: Math.max(0, box.top + c.y - event.clientY),
      right: Math.max(0, event.clientX - (box.left + c.x + c.w)),
      bottom: Math.max(0, event.clientY - (box.top + c.y + c.h)),
    };
  }

  /** Whether the pointer is on the image, edges and the press's `overhang` included. */
  private withinImage(event: PointerEvent): boolean {
    const box = this.imgEl().nativeElement.getBoundingClientRect();
    const o = this.overhang;
    return (
      event.clientX >= box.left - o.left &&
      event.clientX <= box.right + o.right &&
      event.clientY >= box.top - o.top &&
      event.clientY <= box.bottom + o.bottom
    );
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
    const min = { w: this.minWidth(), h: this.minHeight() };
    this.cropDisplay.set(resizeFrom(this.startRect, handle, dx, dy, this.display(), min, this.aspectRatio()));
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

  /**
   * The exported image's pixel size: the crop in source pixels, scaled down so its
   * longer side fits `maxOutputSize`. `Math.min(1, …)` is the never-upscale rule — a
   * crop already inside the cap keeps its own size, which is also the whole of the
   * uncapped path.
   */
  private outputSize(c: WrCropRect): { width: number; height: number } {
    const cap = this.maxOutputSize();
    const longest = Math.max(c.width, c.height);
    const scale = cap === null || longest === 0 ? 1 : Math.min(1, cap / longest);
    return {
      width: Math.max(1, Math.round(c.width * scale)),
      height: Math.max(1, Math.round(c.height * scale)),
    };
  }

  private toCanvas(): HTMLCanvasElement {
    const img = this.imgEl().nativeElement;
    const c = this.cropRect();
    const canvas = document.createElement('canvas');
    const size = this.outputSize(c);
    canvas.width = size.width;
    canvas.height = size.height;
    // The SOURCE rect stays the whole crop and the destination is the canvas, so a
    // capped export is the same region drawn smaller rather than a smaller region.
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
