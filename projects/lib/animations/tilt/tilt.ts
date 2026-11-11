/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, PLATFORM_ID, afterNextRender, inject } from '@angular/core';

import { type WrPointerFollower, WrPointerTracker } from '../internal';

/**
 * The most the card leans, in degrees, reached with the pointer at an edge.
 * Small on purpose: a lean is a hint that the card is a thing with depth, and
 * at this angle the text's lines stay level enough to read through it. Not
 * smaller: at four degrees over a thousand pixels the near edge of a card grew
 * by a percent, a pixel on a card of a hundred, and nobody saw the card move.
 */
const MAX_ANGLE = 10;

/**
 * The viewing distance, in px, for the lean's foreshortening. Close enough
 * that the near edge of a card grows by about four percent at the full angle
 * and the far edge shrinks by as much, eight or nine pixels across a card of
 * a hundred, so the lean reads as a lean; far enough that the card reads as
 * tilted, not as coming out of the page. `tiltDepth` is the number.
 */
const PERSPECTIVE = 800;

/**
 * The ease's time constant, in ms: each frame the rendered angle closes the
 * gap to the target by `1 - exp(-dt / TAU)`. Over 100ms the gap drops by two
 * thirds, over 300ms it is gone to the eye. The same on the way back to flat.
 */
const TAU = 100;

/** A frame after a throttled tab or a long task moves the angle at most this far, in ms of easing. */
const MAX_FRAME_MS = 100;

/** Under this gap, in degrees, the angle is at its target: the loop stops. */
const SETTLE = 0.02;

/** One step of the ease, for a frame `dt` ms after the last. */
export function tiltRate(dt: number): number {
  return 1 - Math.exp(-Math.min(Math.max(dt, 0), MAX_FRAME_MS) / TAU);
}

/**
 * The angles for a pointer at `(clientX, clientY)` over a card at `rect`: the
 * edge under the pointer dips away, as if pressed. Positive `rotateX` brings
 * the bottom edge forward, so the pointer below the centre makes it negative;
 * positive `rotateY` sends the right edge back, so the pointer right of the
 * centre makes it positive. The corners give `max` on both axes, the centre
 * gives zero, a point past an edge (a late `pointerleave`) is clamped to the
 * edge. A card with no size (a hidden pane) gives zero.
 */
export function tiltAngles(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  max = MAX_ANGLE
): { x: number; y: number } {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  const nx = Math.min(Math.max(((clientX - rect.left) / rect.width) * 2 - 1, -1), 1);
  const ny = Math.min(Math.max(((clientY - rect.top) / rect.height) * 2 - 1, -1), 1);
  // `|| 0` turns the `-0` of a centred pointer into `0`.
  return { x: -max * ny || 0, y: max * nx || 0 };
}

/**
 * How far the lean shows, as the difference between the scale of the near
 * edge and of the far edge of a card `size` px across, turned by `angle`
 * degrees at the viewing distance: the foreshortening the eye reads as depth.
 * `0.08` is an edge grown by four percent against one shrunk by four; under
 * about `0.05` the card looks still.
 */
export function tiltDepth(size: number, angle = MAX_ANGLE, perspective = PERSPECTIVE): number {
  const z = (size / 2) * Math.sin((angle * Math.PI) / 180);
  return perspective / (perspective - z) - perspective / (perspective + z);
}

/** The inline `transform` for a pair of angles. */
export function tiltTransform(x: number, y: number): string {
  const deg = (value: number): string => (Math.round(value * 100) / 100).toFixed(2);
  return `perspective(${PERSPECTIVE}px) rotateX(${deg(x)}deg) rotateY(${deg(y)}deg)`;
}

/**
 * A card leans toward the pointer in 3D while the pointer is over it, and
 * settles back flat when it leaves. The lean is small (`MAX_ANGLE`) and the
 * card's box never changes: `transform` only, so nothing around it moves and
 * the card's own hover and focus styles stay as they are.
 *
 * The pointer plumbing is the shared {@link WrPointerTracker}: one frame per
 * burst of moves, the host's rect read at enter and on scroll or resize, a
 * touch pointer ignored. Each frame takes the target angles from the latest
 * point and eases the rendered angles toward them, an exponential step sized
 * by the frame's real duration (`tiltRate`), then writes one `transform`. The
 * loop runs only while the rendered angles are short of the target, so a still
 * pointer costs no frames. On leave the target is flat and the same ease
 * brings the card back; when it lands, the inline `transform` and
 * `will-change` come off, so at rest the card is exactly as its stylesheet
 * says and its text is rasterised the ordinary way.
 *
 * The ease is in the frame loop and not a CSS transition for two reasons: a
 * `transition` on the host would replace the card's own (`border-color` on
 * the link card), and a transition restarted on every write lags a fast
 * pointer with a visible catch-up. The loop eases every frame from wherever
 * the angle is, so a fast move and a slow one feel the same.
 *
 * Keyboard focus tilts nothing: the focus ring is the hint. Nothing runs
 * under `prefers-reduced-motion: reduce`, under `forced-colors: active` or on
 * the server. No stylesheet, so nothing to `@use`: the host class `wr-tilt` is a
 * hook for a consumer, the directive paints inline.
 */
@Directive({
  selector: '[wrTilt]',
  host: { class: 'wr-tilt' },
})
export class WrTilt implements WrPointerFollower {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly doc = inject(DOCUMENT);
  private tracker: WrPointerTracker | null = null;
  /** The rendered angles, in degrees. */
  private x = 0;
  private y = 0;
  /** The last frame's timestamp; `0` while the loop is idle, so the first frame after a pause steps as a normal one. */
  private last = 0;

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      const view = this.doc.defaultView;
      if (!view) return;
      if (view.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      if (view.matchMedia?.('(forced-colors: active)').matches) return;
      this.tracker = new WrPointerTracker(this.host.nativeElement, view, this);
      this.tracker.start();
    });

    inject(DestroyRef).onDestroy(() => {
      this.tracker?.stop();
      this.tracker = null;
      this.rest();
    });
  }

  enter(): void {
    this.host.nativeElement.style.setProperty('will-change', 'transform');
  }

  frame(time: number): void {
    const tracker = this.tracker;
    if (!tracker) return;
    const target = tracker.rect ? tiltAngles(tracker.clientX, tracker.clientY, tracker.rect) : { x: 0, y: 0 };
    const rate = tiltRate(this.last === 0 ? 16 : time - this.last);
    this.x += (target.x - this.x) * rate;
    this.y += (target.y - this.y) * rate;

    const settled = Math.abs(target.x - this.x) < SETTLE && Math.abs(target.y - this.y) < SETTLE;
    if (settled) {
      this.x = target.x;
      this.y = target.y;
      this.last = 0;
    } else {
      this.last = time;
      tracker.schedule();
    }

    if (settled && !tracker.inside) {
      this.rest();
      return;
    }
    this.host.nativeElement.style.setProperty('transform', tiltTransform(this.x, this.y));
  }

  /** The pointer left: ease back to flat over the next frames. */
  leave(): void {
    this.tracker?.schedule();
  }

  /** Flat, with nothing inline: the card is its stylesheet's again. */
  private rest(): void {
    this.x = 0;
    this.y = 0;
    this.last = 0;
    const style = this.host.nativeElement.style;
    style.removeProperty('transform');
    style.removeProperty('will-change');
  }
}

export { MAX_ANGLE as TILT_MAX_ANGLE, PERSPECTIVE as TILT_PERSPECTIVE, SETTLE as TILT_SETTLE };
