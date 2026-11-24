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
  Injector,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { wrClamp, wrFileNameForType, wrRandomId, wrCheckStyles } from 'ngwr/utils';

import type {
  WrCropHandle,
  WrCropRect,
  WrImageCropperStatus,
  WrImageLoadError,
  WrImageOutputType,
  WrImageRotation,
} from './types';

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

/** The furthest `zoom` goes: past four source pixels per fitted one a crop is mostly blur. */
const MAX_ZOOM = 4;

/** What one press of `+` or `-` adds to `zoom`. */
const ZOOM_KEY_STEP = 0.1;

/** Zoom per wheel pixel, as an exponent: one mouse notch (100px) is about a fifth. */
const WHEEL_RATE = 0.002;

/** A browser pinch arrives as a wheel with Ctrl held and much smaller deltas. */
const WHEEL_RATE_PINCH = 0.01;

/** How long `zoom` and `rotation` have to rest before `(cropped)` renders the result. */
const EMIT_DELAY = 120;

function coerceZoom(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? wrClamp(n, 1, MAX_ZOOM) : 1;
}

/** Any number of degrees as the nearest quarter turn in [0, 360). */
function coerceRotation(value: unknown): WrImageRotation {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return ((((Math.round(n / 90) * 90) % 360) + 360) % 360) as WrImageRotation;
}

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

interface PointPx {
  x: number;
  y: number;
}

/** `size` scaled down, never up, until it fits inside `box`. */
function fitWithin(size: SizePx, box: SizePx): SizePx {
  const k = Math.min(1, box.w / size.w, box.h / size.h);
  return { w: size.w * k, h: size.h * k };
}

/**
 * The whole source pixels between two edges on one axis of an image `size` pixels long:
 * `[start, length]`. The edges are rounded and kept on the image. A span that is not
 * empty but rounds to nothing, a crop thinner than a pixel, takes the one pixel it lies
 * in: a zero-sized source rect draws nothing at all.
 */
function pixelSpan(from: number, to: number, size: number): [number, number] {
  const start = wrClamp(Math.round(from), 0, size);
  const end = wrClamp(Math.round(to), 0, size);
  if (end > start || !(to > from) || size < 1) return [start, end - start];
  return [wrClamp(Math.floor((from + to) / 2), 0, size - 1), 1];
}

/**
 * Where the zoomed image's top-left corner sits on the stage. `center` is the point of
 * the image under the middle of the stage, as a fraction of the image, so it survives a
 * resize and a zoom unchanged; the clamp is what keeps the image covering the stage.
 */
function panFor(center: PointPx, zoom: number, stage: SizePx): PointPx {
  return {
    x: wrClamp(stage.w / 2 - center.x * zoom * stage.w, stage.w - zoom * stage.w, 0),
    y: wrClamp(stage.h / 2 - center.y * zoom * stage.h, stage.h - zoom * stage.h, 0),
  };
}

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
    if (east) w = wrClamp(r.w + dx, min.w, bounds.w - r.x);
    if (west) {
      w = wrClamp(r.w - dx, min.w, right);
      x = right - w;
    }
    if (south) h = wrClamp(r.h + dy, min.h, bounds.h - r.y);
    if (north) {
      h = wrClamp(r.h - dy, min.h, bottom);
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
  const w = wrClamp(wanted, Math.max(min.w, min.h * ratio), Math.min(roomW, roomH * ratio));
  const h = w / ratio;

  return {
    x: east ? r.x : west ? right - w : wrClamp(r.x + r.w / 2 - w / 2, 0, bounds.w - w),
    y: south ? r.y : north ? bottom - h : wrClamp(r.y + r.h / 2 - h / 2, 0, bounds.h - h),
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
 * `[(zoom)]` enlarges the image under the crop window and `[(rotation)]` (or `rotate()`)
 * turns it by quarter turns. The wheel zooms around the pointer, two fingers pinch, and
 * `+`, `-` and `R` do the same from the keyboard. A zoomed image is panned by dragging
 * outside the crop window, or by pushing the window against an edge with the arrow keys.
 * There is no toolbar: build one from `zoom`, `rotation` and `rotate()`.
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
 * The image is requested with `crossorigin="anonymous"`, because a canvas will not
 * export pixels from another origin otherwise. A URL on another origin therefore has
 * to be served with `Access-Control-Allow-Origin`; one that is not fails to load and
 * fires `(loadError)`, where it used to show and then refuse every export.
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
    '[class.wr-image-cropper--zoomed]': 'zoomLevel() > 1',
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

  /**
   * How much the image is enlarged under the crop window, from `1` (the whole image
   * fitted to the stage) to `4`. The window keeps its place and covers less of the
   * source. A value outside the range is read as the nearest end.
   * @default 1
   */
  readonly zoom = model(1);

  /**
   * Clockwise quarter turns of the image, in degrees. At `90` and `270` the stage takes
   * the turned image's shape. The crop window turns with the image and is then refitted
   * to `aspectRatio`. The export is the turned image.
   * @default 0
   */
  readonly rotation = model<WrImageRotation>(0);

  /** Emits a Blob after each drag end, and after `zoom` or `rotation` settles. */
  readonly cropped = output<Blob>();

  /**
   * Fires once when the browser cannot decode the current `src` — a format it does
   * not support, a broken file, a URL that fails. Nothing is rendered for it; show
   * your own message. A new `src` clears the failure.
   */
  readonly loadError = output<WrImageLoadError>();

  protected readonly imgEl = viewChild.required<ElementRef<HTMLImageElement>>('img');

  /**
   * A blank `<canvas>` with the source's dimensions, swapped while the image is turned.
   * Once the image has been measured it holds the stage open in the image's place, so the
   * stylesheet fits it to the container exactly as it fitted the image, and the image is
   * free to be zoomed, panned and turned over it. A canvas because it has a natural size
   * the moment it is rendered: nothing to fetch, to wait for, or for a content security
   * policy to refuse. Never drawn on, so it holds no pixels.
   */
  private readonly sizerEl = viewChild<ElementRef<HTMLCanvasElement>>('sizer');

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

  /** The second half of the key model: the zoom and rotation keys. */
  protected readonly resolvedTransformHelp = useI18nText(
    NO_OVERRIDE,
    'imageCropper.transformHelp',
    'Plus and minus zoom the image. R turns it clockwise, and Shift with R the other way.'
  );

  private readonly zoomedText = useI18nFormatter('imageCropper.zoomed', 'Zoom {{percent}}%');
  private readonly rotatedText = useI18nFormatter('imageCropper.rotated', 'Rotated {{degrees}}°');

  /** Id linking the crop window to the help text. Random rather than counted:
   *  the crop UI only exists after a real image load, so it never prerenders. */
  protected readonly helpId = wrRandomId('wr-image-cropper-help');

  /** Live-region text — written by the keyboard path only (see `onWindowKeydown`). */
  protected readonly announcement = signal<string>('');

  protected readonly objectUrl = signal<string | null>(null);

  /** Previous object URL we created — kept off-signal so the resolve
   *  effect doesn't depend on its own writes (which would loop). */
  private previousObjectUrl: string | null = null;

  /** Natural (source) pixel dimensions. */
  protected readonly natural = signal<{ w: number; h: number }>({ w: 0, h: 0 });

  /**
   * The stage: the box the image fills at zoom 1, turned as `rotation` says, in display
   * pixels. The crop is clamped to it, and a zoomed image always covers it.
   */
  protected readonly display = signal<{ w: number; h: number }>({ w: 0, h: 0 });

  /** Crop rect in display coordinates, measured from the stage's top-left corner. */
  protected readonly cropDisplay = signal<RectPx>({ x: 0, y: 0, w: 0, h: 0 });

  /** `zoom` as the component uses it: a finite number in [1, 4]. */
  protected readonly zoomLevel = computed(() => coerceZoom(this.zoom()));

  /** `rotation` as it was asked for: one of the four quarter turns. */
  private readonly angle = computed(() => coerceRotation(this.rotation()));

  /**
   * The rotation the geometry is laid out for. It follows `angle` through `turnTo`, which
   * moves the stage, the crop and the pan with it in one step, so everything that reads
   * the geometry reads this: a crop laid out for one rotation is never paired with another.
   */
  private readonly laidAngle = signal<WrImageRotation>(0);

  /** Whether the image lies on its side, so its width runs down the stage. */
  protected readonly turned = computed(() => this.laidAngle() % 180 !== 0);

  /** The point of the turned image under the middle of the stage: see `panFor`. */
  private readonly center = signal<PointPx>({ x: 0.5, y: 0.5 });

  private readonly pan = computed(() => panFor(this.center(), this.zoomLevel(), this.display()));

  /** Whether the image has a measured stage, and so has left the layout to the sizer. */
  protected readonly measured = computed(() => this.display().w > 0);

  /** Whether the turned sizer measured nothing, as in a test or a hidden container. */
  private readonly unmeasured = signal(false);

  /**
   * The stage's size written by hand, for a turned image whose sizer has no box to take
   * it from. Only then: written while the sizer can be measured, it would cap the very
   * box being measured.
   */
  protected readonly stageBox = computed(() =>
    this.turned() && this.measured() && this.unmeasured() ? this.display() : null
  );

  /**
   * How the `<img>` is laid over the stage once it is measured: its own size at zoom 1,
   * and the transform that zooms, pans and turns it. The one decoded image is both what
   * the user sees and what `toCanvas` draws, so the two cannot differ.
   */
  protected readonly view = computed(() => {
    const d = this.display();
    if (d.w === 0 || d.h === 0) return null;
    const p = this.pan();
    const zoom = this.zoomLevel();
    const angle = this.laidAngle();
    const w = this.turned() ? d.h : d.w;
    const h = this.turned() ? d.w : d.h;
    // A turn about the top-left corner swings the picture off the stage; this brings it back.
    const tx = angle === 90 ? h : angle === 180 ? w : 0;
    const ty = angle === 180 ? h : angle === 270 ? w : 0;
    return {
      w,
      h,
      transform: `translate(${p.x}px, ${p.y}px) scale(${zoom}) translate(${tx}px, ${ty}px) rotate(${angle}deg)`,
    };
  });

  /** Watches the rendered image box — see `watchResize`. */
  private resizeObserver: ResizeObserver | null = null;

  /** Currently active drag: a handle, the window, or the image itself. */
  private active: WrCropHandle | 'pan' | null = null;
  private startPointer: { x: number; y: number } = { x: 0, y: 0 };

  /** Where the live drag's pointer was last seen: what a drag is rebased to in `onResize`. */
  private lastPointer: PointPx = { x: 0, y: 0 };
  private startRect: RectPx = { x: 0, y: 0, w: 0, h: 0 };

  /** Where the image sat when a pan drag began. */
  private startPan: PointPx = { x: 0, y: 0 };

  /** Every pointer that is down on the stage, by id: two of them make a pinch. */
  private readonly pointers = new Map<number, PointPx & { type: string }>();

  /**
   * The live pinch: the two pointers it belongs to, the distance between them and the
   * zoom when it began.
   */
  private pinch: { ids: readonly [number, number]; distance: number; zoom: number } | null = null;

  private emitTimer: ReturnType<typeof setTimeout> | null = null;

  /** Counts `(cropped)` renders, so one overtaken by a newer one is dropped: see `emitCropped`. */
  private emitRun = 0;

  /** The element the live drag set pointer capture on, so the end releases that one. */
  private captureTarget: HTMLElement | null = null;

  /** The pointer the live drag belongs to. Every other pointer's events are ignored. */
  private pointerId: number | null = null;

  /** How far past each side of the crop the live resize was pressed — see `onPointerMove`. */
  private overhang: SidesPx = NO_SIDES;

  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  private readonly statusState = signal<WrImageCropperStatus>('empty');

  /**
   * Where the source stands: `'empty'`, `'loading'`, `'loaded'` or `'failed'`. Reset
   * to `'loading'` (or `'empty'`) whenever `src` changes, so a failure never outlives
   * the source that caused it.
   */
  readonly status = this.statusState.asReadonly();

  /**
   * Resolved crop rect in natural (source) pixel coordinates: the region of the source
   * as it is stored, before `rotation()` turns it. At `90` and `270` its width is
   * therefore the crop window's height.
   *
   * The window's EDGES are carried back to the source and rounded there, and the size is
   * what lies between them. Rounding an origin and a size separately can add up to a
   * pixel past the image, and rounding in turned coordinates can shift the region by one
   * on the way back.
   */
  readonly cropRect = computed<WrCropRect>(() => {
    const display = this.display();
    const n = this.natural();
    const c = this.cropDisplay();
    if (display.w === 0 || display.h === 0) return { x: 0, y: 0, width: 0, height: 0 };
    const turned = this.turned();
    const zoom = this.zoomLevel();
    const pan = this.pan();
    const sx = (turned ? n.h : n.w) / display.w;
    const sy = (turned ? n.w : n.h) / display.h;
    // The window's edges on the image as it is seen, in source-sized pixels.
    const left = ((c.x - pan.x) / zoom) * sx;
    const top = ((c.y - pan.y) / zoom) * sy;
    const right = left + (c.w / zoom) * sx;
    const bottom = top + (c.h / zoom) * sy;
    let x: [number, number];
    let y: [number, number];
    switch (this.laidAngle()) {
      case 90:
        x = [top, bottom];
        y = [n.h - right, n.h - left];
        break;
      case 180:
        x = [n.w - right, n.w - left];
        y = [n.h - bottom, n.h - top];
        break;
      case 270:
        x = [n.w - bottom, n.w - top];
        y = [left, right];
        break;
      default:
        x = [left, right];
        y = [top, bottom];
    }
    const [x0, width] = pixelSpan(x[0], x[1], n.w);
    const [y0, height] = pixelSpan(y[0], y[1], n.h);
    return { x: x0, y: y0, width, height };
  });

  /**
   * The same region in the pixels of the image as the user sees it, turned: what the
   * export's size and the announcement are made from.
   */
  private readonly turnedRect = computed<WrCropRect>(() => {
    const r = this.cropRect();
    const n = this.natural();
    switch (this.laidAngle()) {
      case 90:
        return { x: n.h - r.y - r.height, y: r.x, width: r.height, height: r.width };
      case 180:
        return { x: n.w - r.x - r.width, y: n.h - r.y - r.height, width: r.width, height: r.height };
      case 270:
        return { x: r.y, y: n.w - r.x - r.width, width: r.height, height: r.width };
      default:
        return r;
    }
  });

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('image-cropper');
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

    // A ratio changed after the image loaded refits the window; the load itself and a drag
    // read it directly. One effect with the rotation, because a turn refits too and has to
    // come first: a ratio applied to the window before it is turned is applied to the wrong
    // side of it. The turn's own `(cropped)` comes from the effect below.
    effect(() => {
      const ratio = this.aspectRatio();
      const angle = this.angle();
      untracked(() => {
        if (!this.turnTo(angle) && this.refit(ratio)) void this.emitCropped();
      });
    });

    // `zoom` and `rotation` are models, so a slider or a button changes them as freely as
    // a gesture does. One trailing emit covers every route, and a run of wheel ticks or
    // slider steps renders one canvas instead of one each.
    effect(() => {
      this.zoomLevel();
      this.angle();
      untracked(() => this.scheduleEmit());
    });

    this.destroyRef.onDestroy(() => {
      if (this.emitTimer !== null) clearTimeout(this.emitTimer);
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
    // Whatever was under way belongs to the image that is going: a captured pointer
    // would keep panning a stage of no size, and a pending or half-encoded `(cropped)`
    // would come out as the next image's.
    this.endGesture();
    if (this.emitTimer !== null) clearTimeout(this.emitTimer);
    this.emitTimer = null;
    this.emitRun++;
    this.natural.set({ w: 0, h: 0 });
    this.display.set({ w: 0, h: 0 });
    this.cropDisplay.set({ x: 0, y: 0, w: 0, h: 0 });
    this.center.set({ x: 0.5, y: 0.5 });
    this.unmeasured.set(false);
  }

  protected onImageLoad(): void {
    const img = this.imgEl().nativeElement;
    const rect = img.getBoundingClientRect();
    const upright = { w: rect.width, h: rect.height };
    // Some SVGs and odd images report zero natural dimensions — fall back
    // to the rendered size so the crop math stays well-defined.
    const natural = {
      w: img.naturalWidth || upright.w,
      h: img.naturalHeight || upright.h,
    };
    // Loaded already turned: the sizer does not exist until `natural` is known, so the
    // stage starts as `turnedGuess` and is measured once the sizer has rendered.
    this.laidAngle.set(this.angle());
    const display = this.turned() && upright.w > 0 && upright.h > 0 ? this.turnedGuess(upright) : upright;
    this.statusState.set('loaded');
    this.natural.set(natural);
    this.display.set(display);
    this.cropDisplay.set(this.initialCrop(display));
    this.watchResize(img);
    this.measureAfterRender();
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
    const ro = new ResizeObserver(() => this.onResize());
    ro.observe(el);
    this.resizeObserver = ro;
  }

  /**
   * Rescale the crop by however much the image did, so the user keeps the region
   * they picked instead of having it re-centred: `cropRect()` — the source-pixel
   * value a consumer acts on — comes out the same across the resize.
   */
  private onResize(): void {
    const previous = this.display();
    // Nothing measured yet, or measured and then dropped by `resetGeometry` while a
    // new `src` loads. There is no crop to carry over, and the load will measure.
    if (previous.w === 0 || previous.h === 0) return;
    // The sizer holds the stage open. The image cannot be asked: it is transformed, and
    // `getBoundingClientRect()` reports a transformed box.
    const turned = this.turned();
    let rect = this.sizerEl()?.nativeElement.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      // A hidden sizer (a closed tab, `display: none`) reports zeros, and then so does
      // the image. Scaling by that would collapse the crop and there would be nothing to
      // scale back from, so hold the last real box until it is shown again.
      if (turned) {
        this.unmeasured.set(true);
        return;
      }
      // A unit test has no layout and gives the image a box by hand, as the harness
      // tells it to. Upright, that box is the stage's.
      rect = this.imgEl().nativeElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
    }
    if (turned && this.unmeasured()) {
      // The sizer has a box again, but one capped by the size written on the stage for
      // the time it had none. Take that size off and measure what the layout gives.
      this.unmeasured.set(false);
      this.measureAfterRender();
      return;
    }
    if (rect.width === previous.w && rect.height === previous.h) return;

    const sx = rect.width / previous.w;
    const sy = rect.height / previous.h;
    const c = this.cropDisplay();
    this.display.set({ w: rect.width, h: rect.height });
    this.cropDisplay.set({ x: c.x * sx, y: c.y * sy, w: c.w * sx, h: c.h * sy });
    // A live drag measures from where it began, in the pixels of the stage as it was.
    // It begins again here, from the rescaled crop and the pointer's last position, so
    // its next move neither puts the old size back nor replays the distance covered.
    if (this.active) {
      this.startRect = { ...this.cropDisplay() };
      this.startPan = this.pan();
      this.startPointer = { ...this.lastPointer };
    }
  }

  /**
   * Measure the stage once the template has put the right element in the layout, and
   * watch the sizer from then on: it is rendered only after the image has loaded.
   */
  private measureAfterRender(): void {
    afterNextRender(
      () => {
        const sizer = this.sizerEl()?.nativeElement;
        if (sizer) this.resizeObserver?.observe(sizer);
        this.onResize();
      },
      { injector: this.injector }
    );
  }

  /**
   * The stage for a turned image before anything has measured one: the box swapped and
   * scaled to fit inside the box it had. Whatever let that box be as wide and as tall as
   * it is lets this one be too, so it never overflows; the sizer then finds the room the
   * turned shape really has.
   */
  private turnedGuess(box: SizePx): SizePx {
    return fitWithin({ w: box.h, h: box.w }, box);
  }

  /**
   * Lay the geometry out for a new `rotation`. The crop and the visible part of the image
   * are carried as fractions of the image and turned with it, a quarter turn at a time, so
   * the window stays over the pixels it was over. A locked `aspectRatio` is turned on its
   * side by that, and `refit` restores it the way it does when the ratio itself changes.
   *
   * Answers whether it turned anything. Called by the effect that follows `rotation`, and
   * by `rotate()` at once, so a read straight after it sees the turned geometry.
   */
  private turnTo(angle: WrImageRotation): boolean {
    const from = this.laidAngle();
    if (from === angle) return false;
    const d = this.display();
    if (this.statusState() !== 'loaded' || d.w === 0 || d.h === 0) {
      this.laidAngle.set(angle);
      return false;
    }
    this.endGesture();

    // Read before `laidAngle` moves, though none of it depends on the angle: `pan` is a
    // function of the centre, the zoom and the stage.
    const zoom = this.zoomLevel();
    const pan = this.pan();
    const c = this.cropDisplay();
    let crop = {
      x: (c.x - pan.x) / (zoom * d.w),
      y: (c.y - pan.y) / (zoom * d.h),
      w: c.w / (zoom * d.w),
      h: c.h / (zoom * d.h),
    };
    let center = { x: (d.w / 2 - pan.x) / (zoom * d.w), y: (d.h / 2 - pan.y) / (zoom * d.h) };
    const turns = ((angle - from) / 90 + 4) % 4;
    for (let i = 0; i < turns; i++) {
      crop = { x: 1 - crop.y - crop.h, y: crop.x, w: crop.h, h: crop.w };
      center = { x: 1 - center.y, y: center.x };
    }

    const stage = turns % 2 === 1 ? this.turnedGuess(d) : d;
    const next = panFor(center, zoom, stage);
    const w = Math.min(stage.w, crop.w * zoom * stage.w);
    const h = Math.min(stage.h, crop.h * zoom * stage.h);
    this.laidAngle.set(angle);
    this.unmeasured.set(false);
    this.display.set(stage);
    this.center.set(center);
    this.cropDisplay.set({
      x: wrClamp(crop.x * zoom * stage.w + next.x, 0, stage.w - w),
      y: wrClamp(crop.y * zoom * stage.h + next.y, 0, stage.h - h),
      w,
      h,
    });
    this.refit(this.aspectRatio());
    this.measureAfterRender();
    return true;
  }

  /** Shrink the crop window to `ratio`, around its centre. Answers whether it had to. */
  private refit(ratio: number | null): boolean {
    if (this.statusState() !== 'loaded' || !ratio || !(ratio > 0)) return false;
    const c = this.cropDisplay();
    if (c.w <= 0 || c.h <= 0) return false;
    let w = c.w;
    let h = c.h;
    if (w / ratio > h) w = h * ratio;
    else h = w / ratio;
    if (Math.abs(w - c.w) < 0.01 && Math.abs(h - c.h) < 0.01) return false;
    // A drag measures from `startRect`, so its next move would undo the refit.
    this.endDrag();
    this.cropDisplay.set({ x: c.x + (c.w - w) / 2, y: c.y + (c.h - h) / 2, w, h });
    return true;
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
    this.track(event);
    // A mouse pressed while two fingers pinch is not part of that gesture, and starts none.
    if (this.pinch) return;
    event.preventDefault();
    event.stopPropagation();
    this.active = handle;
    this.pointerId = event.pointerId;
    this.startPointer = { x: event.clientX, y: event.clientY };
    this.lastPointer = { ...this.startPointer };
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
    if (!this.active || this.active === 'pan' || event.pointerId !== this.pointerId) return;
    this.lastPointer = { x: event.clientX, y: event.clientY };
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
    if (!this.active || this.active === 'pan' || event.pointerId !== this.pointerId) return;
    this.endDrag();
    void this.emitCropped();
  }

  /** Clears the live drag and lets go of its pointer capture. */
  private endDrag(): void {
    const target = this.captureTarget;
    const pointerId = this.pointerId;
    this.active = null;
    this.pointerId = null;
    this.captureTarget = null;
    this.overhang = NO_SIDES;
    // Asked first: a capture that is already gone has nothing to release, and releasing
    // one for a pointer that is no longer active throws.
    if (pointerId !== null && target?.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
  }

  // The stage: pan, pinch and the wheel

  /**
   * Remember a pointer that went down on the stage. A primary pointer is the first one of
   * its type down by definition, so whatever of that type is still listed was never seen
   * lifting (it left the stage first) and is dropped rather than left to pair up into a
   * pinch. Only of that type: a mouse is primary too, and pressing it must not end a pinch
   * two fingers are still holding.
   */
  private track(event: PointerEvent): void {
    if (event.isPrimary) {
      for (const [id, pointer] of this.pointers) {
        if (pointer.type !== event.pointerType) continue;
        this.pointers.delete(id);
        if (this.pinch?.ids.includes(id)) this.pinch = null;
      }
    }
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, type: event.pointerType });
  }

  /**
   * A press that the crop window did not take: one on the dimmed image around it, or a
   * second finger anywhere, which the window refuses and lets bubble here.
   *
   * The dimmed image is where a pan starts, which is what keeps the window's own drag and
   * its handles as they were. A second finger turns whatever the first was doing into a
   * pinch. The first finger's drag is dropped without letting go of its pointer capture:
   * the capture is what keeps its moves arriving once it slides off the stage.
   */
  protected onStagePointerDown(event: PointerEvent): void {
    if (event.button !== 0 || this.display().w === 0) return;
    this.track(event);
    // A pinch belongs to its two pointers; any other press waits for it to end.
    if (this.pinch) return;
    const same = [...this.pointers].filter(([, pointer]) => pointer.type === event.pointerType);
    if (same.length === 2) {
      event.preventDefault();
      const [[, a], [, b]] = same;
      this.active = null;
      this.pointerId = null;
      this.captureTarget = null;
      this.overhang = NO_SIDES;
      const ids: [number, number] = [same[0][0], same[1][0]];
      this.pinch = { ids, distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: this.zoomLevel() };
      return;
    }
    // At zoom 1 the image fills the stage exactly and there is nowhere to pan to.
    if (!event.isPrimary || this.zoomLevel() === 1) return;
    event.preventDefault();
    this.active = 'pan';
    this.pointerId = event.pointerId;
    this.startPointer = { x: event.clientX, y: event.clientY };
    this.lastPointer = { ...this.startPointer };
    this.startPan = this.pan();
    this.captureTarget = event.currentTarget as HTMLElement;
    this.captureTarget.setPointerCapture(event.pointerId);
  }

  /** Every pointer's moves bubble here, the crop window's included; only a pan or a pinch acts on them. */
  protected onStagePointerMove(event: PointerEvent): void {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (this.pinch) {
      // Its own two fingers only: a third contact neither pauses the pinch nor steers it.
      const a = this.pointers.get(this.pinch.ids[0]);
      const b = this.pointers.get(this.pinch.ids[1]);
      if (!a || !b || !this.pinch.ids.includes(event.pointerId)) return;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      this.zoomAt((this.pinch.zoom * distance) / this.pinch.distance, this.onStage((a.x + b.x) / 2, (a.y + b.y) / 2));
      return;
    }
    if (this.active !== 'pan' || event.pointerId !== this.pointerId) return;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.setPan(
      this.startPan.x + event.clientX - this.startPointer.x,
      this.startPan.y + event.clientY - this.startPointer.y
    );
  }

  protected onStagePointerUp(event: PointerEvent): void {
    if (!this.pointers.delete(event.pointerId)) return;
    if (this.pinch) {
      // Either of its two fingers lifting ends it, and the one left down does nothing
      // until it presses again. Any other finger lifting is not the pinch's business.
      if (!this.pinch.ids.includes(event.pointerId)) return;
      this.pinch = null;
      this.scheduleEmit();
      return;
    }
    if (this.active !== 'pan' || event.pointerId !== this.pointerId) return;
    this.endDrag();
    void this.emitCropped();
  }

  /**
   * The wheel zooms around the pointer. The listener is on the stage, so a wheel anywhere
   * else scrolls the page as usual, and so does one here once the zoom is at the end the
   * wheel is pushing towards: the default is prevented only when the zoom moved.
   */
  protected onWheel(event: WheelEvent): void {
    if (this.display().w === 0 || event.deltaY === 0) return;
    // `deltaMode` 1 counts lines rather than pixels.
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1);
    const rate = event.ctrlKey ? WHEEL_RATE_PINCH : WHEEL_RATE;
    const zoomed = this.zoomAt(this.zoomLevel() * Math.exp(-delta * rate), this.onStage(event.clientX, event.clientY));
    if (zoomed) event.preventDefault();
  }

  /**
   * The stage's top-left corner in the viewport: the sizer's, which holds the stage open.
   * A unit test has no layout and gives the image a box instead, so a sizer with no box
   * hands the question to the image.
   */
  private stageOrigin(): { left: number; top: number } {
    const box = this.sizerEl()?.nativeElement.getBoundingClientRect();
    return box && box.width > 0 ? box : this.imgEl().nativeElement.getBoundingClientRect();
  }

  /** A viewport point in stage coordinates. */
  private onStage(clientX: number, clientY: number): PointPx {
    const box = this.stageOrigin();
    return { x: clientX - box.left, y: clientY - box.top };
  }

  /**
   * Set `zoom`, keeping the image point under `at` where it is. Answers whether it changed.
   *
   * The pan goes first. `zoom` is a model and emits inside `set()`, so a listener that
   * reads the crop there must find the pan that belongs to the zoom it was just told.
   */
  private zoomAt(zoom: number, at: PointPx): boolean {
    const from = this.zoomLevel();
    const to = coerceZoom(zoom);
    if (to === from) return false;
    const pan = this.pan();
    this.setPan(at.x - ((at.x - pan.x) / from) * to, at.y - ((at.y - pan.y) / from) * to, to);
    this.zoom.set(to);
    return true;
  }

  /**
   * Move the image's top-left corner to `(x, y)` on the stage, as near as the stage
   * allows at `zoom`: the current one, or the one about to be set.
   */
  private setPan(x: number, y: number, zoom = this.zoomLevel()): void {
    const d = this.display();
    // No stage, no pan: dividing by its size below would store a centre that is not a number.
    if (d.w === 0 || d.h === 0) return;
    const px = wrClamp(x, d.w - zoom * d.w, 0);
    const py = wrClamp(y, d.h - zoom * d.h, 0);
    this.center.set({ x: (d.w / 2 - px) / (zoom * d.w), y: (d.h / 2 - py) / (zoom * d.h) });
  }

  /** Drop whatever the pointers were doing: a turn re-lays everything they measure from. */
  private endGesture(): void {
    this.endDrag();
    this.pinch = null;
    this.pointers.clear();
  }

  /** Render `(cropped)` once `zoom` and `rotation` have stopped changing. */
  private scheduleEmit(): void {
    if (this.statusState() !== 'loaded') return;
    if (this.emitTimer !== null) clearTimeout(this.emitTimer);
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null;
      void this.emitCropped();
    }, EMIT_DELAY);
  }

  /** The stage's box in the viewport: its corner, and its own size. */
  private stageRect(): { left: number; top: number; right: number; bottom: number } {
    const box = this.stageOrigin();
    const d = this.display();
    return { left: box.left, top: box.top, right: box.left + d.w, bottom: box.top + d.h };
  }

  /** How far past each side of the crop window the pointer is, in CSS pixels. */
  private pastCrop(event: PointerEvent): SidesPx {
    const box = this.stageRect();
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
    const box = this.stageRect();
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
    if (this.onTransformKey(event)) return;
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
    else {
      this.applyMove(dx, dy);
      // A window stopped by the stage's edge pushes the zoomed image along instead, so
      // the arrows alone reach every part of it.
      const c = this.cropDisplay();
      const restX = this.startRect.x + dx - c.x;
      const restY = this.startRect.y + dy - c.y;
      if (this.zoomLevel() > 1 && (restX !== 0 || restY !== 0)) {
        const pan = this.pan();
        this.setPan(pan.x - restX, pan.y - restY);
      }
    }

    this.keyboardDirty = true;
    const c = this.turnedRect();
    // Bare numbers on purpose — `resolvedKeyHelp` has already told the reader
    // what the four are, and a sentence here would be a translated string.
    this.announcement.set(`${c.x}, ${c.y}, ${c.width} × ${c.height}`);
  }

  /**
   * The keys that are not arrows: `+` (or `=`, the same key unshifted) and `-` zoom
   * around the middle of the crop window, `R` turns the image clockwise and Shift with
   * `R` the other way. Nothing with Ctrl, Meta or Alt held, which are the browser's own
   * zoom and reload. `(cropped)` follows from the models changing, not from `keyup`.
   */
  private onTransformKey(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    const key = event.key;
    const step = key === '+' || key === '=' ? ZOOM_KEY_STEP : key === '-' || key === '_' ? -ZOOM_KEY_STEP : 0;
    if (step !== 0) {
      event.preventDefault();
      const c = this.cropDisplay();
      // Rounded, so ten presses from 1 land on 2 and not on 1.9999999999999998.
      this.zoomAt(Math.round((this.zoomLevel() + step) * 100) / 100, { x: c.x + c.w / 2, y: c.y + c.h / 2 });
      this.announcement.set(this.zoomedText({ percent: Math.round(this.zoomLevel() * 100) }));
      return true;
    }
    if (key === 'r' || key === 'R') {
      event.preventDefault();
      this.rotate(event.shiftKey ? 'ccw' : 'cw');
      this.announcement.set(this.rotatedText({ degrees: this.angle() }));
      return true;
    }
    return false;
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
      x: wrClamp(r.x + dx, 0, display.w - r.w),
      y: wrClamp(r.y + dy, 0, display.h - r.h),
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

  /**
   * Render the current crop as a Blob. Rejects while `status()` is anything but
   * `'loaded'`, since there is no image to draw.
   */
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

  /**
   * Render the current crop as a `File`. The extension of `name` is replaced by that of
   * the type the browser actually encoded, which can differ from `type`: a browser falls
   * back to PNG for a type it cannot encode. Rejects like `toBlob()`.
   */
  async toFile(
    name: string,
    type: WrImageOutputType = this.outputType(),
    quality: number = this.outputQuality()
  ): Promise<File> {
    const blob = await this.toBlob(type, quality);
    return new File([blob], wrFileNameForType(name, blob.type), { type: blob.type });
  }

  /**
   * Render the current crop as a data URL. Throws while `status()` is anything but
   * `'loaded'`, since there is no image to draw.
   */
  toDataUrl(type: WrImageOutputType = this.outputType(), quality: number = this.outputQuality()): string {
    return this.toCanvas().toDataURL(type, quality);
  }

  /**
   * Turn the image a quarter turn: clockwise, or counter-clockwise with `'ccw'`. The same
   * as writing the next value to `rotation`.
   */
  rotate(direction: 'cw' | 'ccw' = 'cw'): void {
    this.rotation.set(((this.angle() + (direction === 'ccw' ? 270 : 90)) % 360) as WrImageRotation);
    // The effect would get here on the next change detection; a caller that exports in
    // the same breath needs the geometry turned now.
    this.turnTo(this.angle());
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
    // Without this, no image threw NG0951 from the required `imgEl` query, and a
    // `'failed'` one the canvas's own complaint about a broken image: two internals
    // messages for one plain fact.
    const status = this.status();
    if (status !== 'loaded') {
      throw new Error(`[NGWR] <wr-image-cropper>: there is no loaded image to export (status "${status}").`);
    }
    const img = this.imgEl().nativeElement;
    const c = this.cropRect();
    const canvas = document.createElement('canvas');
    // Sized from the crop as it is seen: turned on its side, the width is the source's height.
    const size = this.outputSize(this.turnedRect());
    canvas.width = size.width;
    canvas.height = size.height;
    // The SOURCE rect stays the whole crop and the destination is the canvas, so a
    // capped export is the same region drawn smaller rather than a smaller region.
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    const angle = this.laidAngle();
    if (angle === 0) {
      ctx.drawImage(img, c.x, c.y, c.width, c.height, 0, 0, canvas.width, canvas.height);
      return canvas;
    }
    // Turn about the middle of the canvas, then draw the source region centred on it, in
    // the box it fills before the turn.
    const w = this.turned() ? canvas.height : canvas.width;
    const h = this.turned() ? canvas.width : canvas.height;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(img, c.x, c.y, c.width, c.height, -w / 2, -h / 2, w, h);
    return canvas;
  }

  private async emitCropped(): Promise<void> {
    if (this.status() !== 'loaded') return;
    // Encoding is asynchronous and takes as long as it takes, so an older crop can come
    // back after a newer one. Only the latest request emits, and a new source disowns
    // them all, or the consumer would be left holding a crop that is no longer the crop.
    const run = ++this.emitRun;
    try {
      const blob = await this.toBlob();
      if (run === this.emitRun) this.cropped.emit(blob);
    } catch (error) {
      // An image IS loaded, so a failure here is the browser refusing to encode it,
      // and `(cropped)` not firing has to be visible to the developer. It used to be
      // swallowed, which is how a tainted cross-origin canvas went unnoticed.
      if (isDevMode()) {
        // eslint-disable-next-line no-console -- dev-mode diagnostics
        console.warn('[NGWR] <wr-image-cropper>: the crop could not be encoded, so (cropped) did not fire.', error);
      }
    }
  }
}
