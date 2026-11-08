/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { FOCUSABLE } from 'ngwr/animations/core';
import { WrPlatform } from 'ngwr/platform';
import { numAttr, randomId, wrCheckStyles } from 'ngwr/utils';

/** The ring at rest, in degrees per second: one turn in 36 s. */
const CIRCLE_TEXT_SPEED = 10;

/** The ring under a pointer or focus, in degrees per second: one turn in 9 s. */
const CIRCLE_TEXT_HOVER_SPEED = 40;

/** The side of the drawing, in user units; everything below is in those units and scales with the box. */
const VIEW = 100;

/** The baseline circle. Leaves 9 units outside it for the glyphs, which rise about 0.8 of the 9-unit font. */
const RADIUS = 41;

/** The circumference: what the text is stretched or squeezed to, so its end lands on its start. */
const CIRCUMFERENCE = Math.round(2 * Math.PI * RADIUS * 100) / 100;

/**
 * The baseline, clockwise from nine o'clock, as two half arcs: a single arc
 * whose end is its start draws nothing.
 */
const PATH = `M ${VIEW / 2 - RADIUS} ${VIEW / 2} a ${RADIUS} ${RADIUS} 0 1 1 ${2 * RADIUS} 0 a ${RADIUS} ${RADIUS} 0 1 1 ${-2 * RADIUS} 0`;

/**
 * Time constant of the speed glide, in seconds: a change of target is 63% done
 * after this long and 95% done after three times it.
 */
const GLIDE = 0.4;

/** The longest step one frame may integrate, in seconds: a stalled frame moves the ring a little, never a lot. */
const MAX_STEP = 0.1;

/** Closer than this to the target, in degrees per second, the speed is the target. */
const SNAP = 0.01;

/** Separators and blanks at the end of the text, which the eye reads as the seam and a screen reader would read aloud. */
const TRAILING = /[\s\p{P}\p{S}]+$/u;

/** An optional size in px: `null`, `undefined` or an empty attribute means "the stylesheet's". */
const optionalPx = (value: unknown): number | null => (value == null || value === '' ? null : numAttr(0)(value));

/**
 * A short label set around a circle, like a seal, turning slowly, with a slot
 * in the middle for a mark that does not turn.
 *
 * The ring is an SVG `<textPath>` on a circle, so the glyphs are vectors at any
 * size, and the text is stretched to the circle's exact circumference with
 * `textLength` and `lengthAdjust="spacing"`, so the browser spreads the glyphs
 * evenly and the last one is followed by the first with the same gap as any
 * two inside. The separator between repeats is part of the text the author
 * passes, trailing blank included: `Open source · MIT · ` closes the loop as
 * `… MIT · OPEN SOURCE …`. The length is declared on the `<textPath>`, where
 * SVG 2 puts it, and again on the `<text>`, where SVG 1.1 did: an engine that
 * reads both fits the inner first and finds nothing left to do for the outer.
 * All of it is static markup, so the server renders the finished ring and a
 * browser that never runs the loop shows it whole and even.
 *
 * The turn is one `requestAnimationFrame` loop that integrates an angular
 * velocity: each frame the speed eases toward its target (`speed` at rest,
 * `hoverSpeed` while a pointer is over the host or focus is in it or in its
 * closest focusable ancestor) by an exponential step, and the angle grows by
 * speed times the frame's length. The angle is only ever added to, so a change
 * of target bends the motion and never jumps it, which swapping a CSS
 * `animation-duration` would. The angle is written as a transform on the
 * `<svg>`, so the compositor turns a finished picture and no text is laid out
 * twice. The loop runs only while the host is on screen and the document is
 * visible, and goes idle when the target is zero and reached.
 *
 * A screen reader hears the label once: the `<svg>` is `role="img"` named by
 * `label`, or by the text with its trailing separator cut, and the `<text>` is
 * `aria-hidden`, so no engine exposes the ring's glyphs on their own. The ring
 * is not selectable; the slot's content is the author's and keeps its own
 * semantics. Under `prefers-reduced-motion: reduce`, on the server and without
 * `IntersectionObserver` the ring sits still, fully drawn. Colour is
 * `currentColor` through `--wr-circle-text-color`, the box is
 * `--wr-circle-text-size` or `size`, the type is the theme's tokens.
 */
@Component({
  selector: 'wr-circle-text',
  templateUrl: './circle-text.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-circle-text',
    '[class.wr-circle-text--run]': 'running()',
    // Its own name, not the hook's: a `null` binding would wipe a value the
    // author set on the element. The sheet reads this first, then the hook.
    '[style.--wr-circle-text-input-size.px]': 'size()',
  },
})
export class WrCircleText {
  /** The text around the ring, separators included, ending on the separator that joins its end to its start. */
  readonly text = input.required<string>();

  /** What a screen reader hears. Defaults to the text with its trailing separator cut. */
  readonly label = input<string | null>(null);

  /** The box, in px. Unset, the stylesheet's `--wr-circle-text-size` decides. */
  readonly size = input(null, { transform: optionalPx });

  /** Turn at rest, in degrees per second; negative turns the other way, zero sits still. @default 10 */
  readonly speed = input(CIRCLE_TEXT_SPEED, { transform: numAttr(CIRCLE_TEXT_SPEED) });

  /** Turn under a pointer or with focus in the host, in degrees per second. @default 40 */
  readonly hoverSpeed = input(CIRCLE_TEXT_HOVER_SPEED, { transform: numAttr(CIRCLE_TEXT_HOVER_SPEED) });

  protected readonly pathId = randomId('wr-circle-text');
  protected readonly pathRef = `#${this.pathId}`;
  protected readonly path = PATH;
  protected readonly view = `0 0 ${VIEW} ${VIEW}`;
  protected readonly length = CIRCUMFERENCE;

  protected readonly name = computed(() => this.label() ?? this.text().replace(TRAILING, ''));

  private readonly intersecting = signal(false);
  private readonly fast = signal(false);

  /** One place decides whether the loop runs: in view, page visible, motion allowed. */
  protected readonly running = computed(
    () => this.intersecting() && this.platform.pageVisible() && !this.platform.prefersReducedMotion()
  );

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ring = viewChild.required<ElementRef<SVGSVGElement>>('ring');
  private readonly platform = inject(WrPlatform);
  private observer: IntersectionObserver | null = null;
  private listeners: AbortController | null = null;
  private frame: number | null = null;
  /** The timestamp of the last frame, or `null` when the next one is the first after a start. */
  private last: number | null = null;
  private angle = 0;
  private velocity = 0;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/circle-text');
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      if (this.platform.prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
      // Any part of the ring on screen counts: a loop that should not burn
      // frames off screen, not a reveal that waits for the whole thing.
      this.observer = new IntersectionObserver(entries =>
        this.intersecting.set(entries[entries.length - 1]?.isIntersecting ?? false)
      );
      this.observer.observe(this.host.nativeElement);
      this.listen();
    });

    // A change of target while idle at zero needs a frame to pick it up, so the
    // targets are read here too.
    effect(() => {
      const on = this.running();
      this.fast();
      this.speed();
      this.hoverSpeed();
      untracked(() => (on ? this.start() : this.stop()));
    });

    inject(DestroyRef).onDestroy(() => {
      this.observer?.disconnect();
      this.observer = null;
      this.listeners?.abort();
      this.listeners = null;
      this.stop();
    });
  }

  /** The closest focusable ancestor is what a keyboard reaches, so it is what focus is read on; the pointer is read there too. */
  private listen(): void {
    const host = this.host.nativeElement;
    const target = host.closest<HTMLElement>(FOCUSABLE) ?? host;
    this.listeners = new AbortController();
    const options = { signal: this.listeners.signal, passive: true };
    target.addEventListener('pointerenter', () => this.fast.set(true), options);
    target.addEventListener('pointerleave', () => this.fast.set(false), options);
    target.addEventListener('focusin', () => this.fast.set(true), options);
    target.addEventListener('focusout', () => this.fast.set(false), options);
  }

  /** Ask for a frame, unless one is pending. */
  private start(): void {
    if (this.frame !== null) return;
    this.last = null;
    this.frame = requestAnimationFrame(t => this.tick(t));
  }

  /** Drop the pending frame. The angle stays where it is, so a restart continues from it. */
  private stop(): void {
    if (this.frame === null) return;
    cancelAnimationFrame(this.frame);
    this.frame = null;
    this.last = null;
  }

  /**
   * One frame: ease the speed toward its target, advance the angle by the
   * speed over the frame's length, paint. The first frame after a start has
   * no length, so a pause of any length moves nothing when the loop resumes.
   */
  private tick(now: number): void {
    const dt = this.last === null ? 0 : Math.min(Math.max(0, now - this.last) / 1000, MAX_STEP);
    this.last = now;
    const target = this.fast() ? this.hoverSpeed() : this.speed();
    this.velocity += (target - this.velocity) * (1 - Math.exp(-dt / GLIDE));
    if (Math.abs(target - this.velocity) < SNAP) this.velocity = target;
    this.angle = (((this.angle + this.velocity * dt) % 360) + 360) % 360;
    this.paint();
    if (this.velocity === 0 && target === 0) {
      // Still, and asked to be: no frame until a target changes.
      this.frame = null;
      return;
    }
    this.frame = requestAnimationFrame(t => this.tick(t));
  }

  /** Written to the DOM by hand: a binding would wait for change detection, and this is every frame. */
  private paint(): void {
    this.ring().nativeElement.style.transform = `rotate(${this.angle}deg)`;
  }
}

export { CIRCLE_TEXT_HOVER_SPEED, CIRCLE_TEXT_SPEED, CIRCUMFERENCE as CIRCLE_TEXT_LENGTH };
