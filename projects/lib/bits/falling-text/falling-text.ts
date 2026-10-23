/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the FallingText effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/text-animations/falling-text
 *
 * The reactbits version uses matter-js (~140 KB) for the physics. This
 * port ships a minimal AABB physics simulator (gravity + air drag + wall
 * / floor collision + body-vs-body resolution + cursor drag) so there's
 * no runtime dependency.
 */

import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { numAttr } from 'ngwr/utils';

import type { WrFallingTextTrigger } from './types';

interface Body {
  el: HTMLElement;
  x: number; // centre x
  y: number; // centre y
  vx: number;
  vy: number;
  angle: number;
  angVel: number;
  w: number;
  h: number;
  /** Last `transform` written to `el`. The loop parks when no body's changes. */
  transform: string;
}

const RESTITUTION = 0.55;
const AIR_DRAG = 0.005;
const FRICTION = 0.4; // tangential damping on wall/floor hits
const DRAG_STIFFNESS = 0.6;

/** Resolve AABB-vs-AABB collision between two bodies via min-overlap axis. */
function resolveCollision(a: Body, b: Body): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const overlapX = a.w / 2 + b.w / 2 - Math.abs(dx);
  const overlapY = a.h / 2 + b.h / 2 - Math.abs(dy);
  if (overlapX <= 0 || overlapY <= 0) return;

  if (overlapX < overlapY) {
    // Resolve along x.
    const push = overlapX / 2;
    if (dx > 0) {
      a.x -= push;
      b.x += push;
    } else {
      a.x += push;
      b.x -= push;
    }
    const avg = (a.vx + b.vx) / 2;
    a.vx = avg * RESTITUTION - (a.vx - avg) * RESTITUTION;
    b.vx = avg * RESTITUTION - (b.vx - avg) * RESTITUTION;
  } else {
    const push = overlapY / 2;
    if (dy > 0) {
      a.y -= push;
      b.y += push;
    } else {
      a.y += push;
      b.y -= push;
    }
    const avg = (a.vy + b.vy) / 2;
    a.vy = avg * RESTITUTION - (a.vy - avg) * RESTITUTION;
    b.vy = avg * RESTITUTION - (b.vy - avg) * RESTITUTION;
  }

  // Tiny torque so stacked bodies wiggle naturally.
  a.angVel += (Math.random() - 0.5) * 0.2;
  b.angVel += (Math.random() - 0.5) * 0.2;
}

/**
 * Words fall like physical bodies — gravity, wall/floor collision, and
 * cursor drag-to-pick-up. Words start at their typeset position then
 * release into the simulator on trigger.
 *
 * Triggers:
 *  - `'auto'`   release immediately on mount
 *  - `'scroll'` release on viewport entry
 *  - `'hover'`  release on first hover
 *  - `'click'`  release on first click
 *
 * Highlight specific words by passing prefix-matched keywords via
 * `[highlightWords]` — matched spans get `wr-falling-text__word--hl`.
 *
 * @example
 * ```html
 * <wr-falling-text
 *   text="React-Bits is a library of animated and interactive React components."
 *   [highlightWords]="['React', 'animated', 'components']"
 *   trigger="hover"
 *   [gravity]="0.6"
 * />
 * ```
 *
 * @see https://www.reactbits.dev/text-animations/falling-text
 */
@Component({
  selector: 'wr-falling-text',
  templateUrl: './falling-text.html',
  styleUrl: './falling-text.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-falling-text', '[class.wr-falling-text--released]': 'released()' },
})
export class WrFallingText {
  /** Text to render. Words are separated by spaces. */
  readonly text = input.required<string>();

  /** Prefix-match keywords; any word starting with one of these gets the highlight class. */
  readonly highlightWords = input<readonly string[]>([]);

  /** When to release the words into the simulator. @default 'auto' */
  readonly trigger = input<WrFallingTextTrigger>('auto');

  /** Gravity in pixels/sec². @default 980 */
  readonly gravity = input(980, { transform: numAttr(980) });

  /** Font size as a CSS length. @default '1rem' */
  readonly fontSize = input('1rem');

  private readonly wordsRef = viewChild.required<ElementRef<HTMLDivElement>>('wordsContainer');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly platform = inject(WrPlatform);

  private started = false;
  private teardownLoop: (() => void) | undefined;

  /**
   * Whether the words are in the simulator. Drives `--released`, which is what
   * hands a word's touches to the drag: until then the block is ordinary text, and
   * a swipe that starts on it scrolls the page.
   */
  protected readonly released = signal(false);

  protected readonly words = computed<readonly { text: string; highlighted: boolean }[]>(() => {
    const hl = this.highlightWords();
    return this.text()
      .split(' ')
      .filter(w => w.length > 0)
      .map(text => ({ text, highlighted: hl.some(h => text.startsWith(h)) }));
  });

  constructor() {
    if (!this.isBrowser) return;

    // Armed after the words have rendered, and re-armed whenever the trigger or
    // the words change. Both used to be read once, at boot: a trigger switched
    // afterwards was ignored, and a new text reused the absolutised spans by
    // index — old positions, old widths, and any extra word left standing
    // outside the simulation. A change now puts the words back into the text
    // flow and arms the trigger it names from scratch.
    afterRenderEffect(onCleanup => {
      const trigger = this.trigger();
      this.words();
      const disarm = untracked(() => {
        this.reset();
        return this.arm(trigger);
      });
      onCleanup(() => disarm?.());
    });

    this.destroyRef.onDestroy(() => this.teardownLoop?.());
  }

  /** Wait for `trigger`; returns what stops waiting. */
  private arm(trigger: WrFallingTextTrigger): (() => void) | undefined {
    // Without an observer (jsdom) a scroll trigger counts as already in view.
    if (trigger === 'auto' || (trigger === 'scroll' && typeof IntersectionObserver === 'undefined')) {
      this.start();
      return undefined;
    }
    const hostEl = this.host.nativeElement;
    if (trigger === 'scroll') {
      const io = new IntersectionObserver(
        (entries, obs) => {
          if (entries.some(e => e.isIntersecting)) {
            obs.disconnect();
            this.start();
          }
        },
        { threshold: 0.1 }
      );
      io.observe(hostEl);
      return () => io.disconnect();
    }
    // hover / click — wait for the host event.
    const handler = trigger === 'hover' ? 'mouseenter' : 'click';
    const startOnce = (): void => this.start();
    hostEl.addEventListener(handler, startOnce, { once: true });
    return () => hostEl.removeEventListener(handler, startOnce);
  }

  /** Stop the simulation and hand the words back to the text flow. */
  private reset(): void {
    this.teardownLoop?.();
    this.teardownLoop = undefined;
    if (!this.started) return;
    this.started = false;
    this.released.set(false);
    for (const el of this.wordsRef().nativeElement.querySelectorAll<HTMLElement>('.wr-falling-text__word')) {
      for (const property of ['position', 'left', 'top', 'transform', 'will-change', 'transform-origin']) {
        el.style.removeProperty(property);
      }
    }
  }

  // Physics

  private start(): void {
    if (this.started) return;
    // Reduced motion: tumbling words are pure decoration — leave the
    // text standing in its normal layout no matter the trigger.
    if (this.platform.prefersReducedMotion()) return;
    this.started = true;

    const hostEl = this.host.nativeElement;
    const wordsContainer = this.wordsRef().nativeElement;
    const containerRect = hostEl.getBoundingClientRect();
    let width = containerRect.width;
    let height = containerRect.height;
    if (width <= 0 || height <= 0) return;

    // Snapshot each word's position relative to the container, then absolutise.
    const wordEls = Array.from(wordsContainer.querySelectorAll<HTMLElement>('.wr-falling-text__word'));
    if (wordEls.length === 0) return;

    const bodies: Body[] = wordEls.map(el => {
      const r = el.getBoundingClientRect();
      const cx = r.left - containerRect.left + r.width / 2;
      const cy = r.top - containerRect.top + r.height / 2;
      return {
        el,
        x: cx,
        y: cy,
        vx: (Math.random() - 0.5) * 5 * 60, // px/s
        vy: 0,
        angle: 0,
        angVel: (Math.random() - 0.5) * 2,
        w: r.width,
        h: r.height,
        transform: '',
      };
    });

    // Absolutely position all word spans so we can move them freely. The
    // rotation origin is fixed: `w` / `h` are measured once here and never
    // reassigned, so writing it alongside every transform re-set the same
    // string sixty times a second.
    bodies.forEach(b => {
      b.el.style.position = 'absolute';
      b.el.style.left = '0';
      b.el.style.top = '0';
      b.el.style.willChange = 'transform';
      b.el.style.transformOrigin = `${b.w / 2}px ${b.h / 2}px`;
      this.commit(b);
    });
    this.released.set(true);

    let raf = 0;
    let lastTs = 0;
    const tick = (ts: number): void => {
      const dt = lastTs === 0 ? 1 / 60 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      const g = this.gravity();
      for (const b of bodies) {
        // Integrate.
        b.vy += g * dt;
        b.vx *= 1 - AIR_DRAG;
        b.vy *= 1 - AIR_DRAG;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.angle += b.angVel * dt;
        b.angVel *= 1 - AIR_DRAG;

        // Walls + floor + ceiling.
        if (b.x - b.w / 2 < 0) {
          b.x = b.w / 2;
          b.vx = Math.abs(b.vx) * RESTITUTION;
          b.angVel *= FRICTION;
        }
        if (b.x + b.w / 2 > width) {
          b.x = width - b.w / 2;
          b.vx = -Math.abs(b.vx) * RESTITUTION;
          b.angVel *= FRICTION;
        }
        if (b.y + b.h / 2 > height) {
          b.y = height - b.h / 2;
          b.vy = -Math.abs(b.vy) * RESTITUTION;
          b.vx *= FRICTION;
          b.angVel *= FRICTION;
        }
        if (b.y - b.h / 2 < 0) {
          b.y = b.h / 2;
          b.vy = Math.abs(b.vy) * RESTITUTION;
        }
      }

      // Body-vs-body collisions — O(n²), fine for ~30 words.
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          resolveCollision(bodies[i], bodies[j]);
        }
      }

      let moved = false;
      for (const b of bodies) moved = this.commit(b) || moved;

      // Park once the words have come to rest. `AIR_DRAG` damps velocities
      // asymptotically so they approach zero and never reach it, and rest is
      // therefore read off the transform the frame WOULD write rather than off
      // the velocities: a word lying on the floor is re-clamped to the same `y`
      // every frame, so its string stops changing while `vy` keeps oscillating
      // around the bounce. Unparked, the integration and the O(n²) pass ran for
      // the life of the page with nothing on screen moving. Words packed
      // tightly enough to keep jostling never satisfy this and keep running —
      // correctly, they are still moving.
      if (!moved) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Drag state.
    let drag: { body: Body; offX: number; offY: number } | null = null;

    const onPointerDown = (e: PointerEvent): void => {
      const local = this.toLocal(e, hostEl);
      // Pick the topmost (last) body whose AABB contains the pointer.
      for (let i = bodies.length - 1; i >= 0; i--) {
        const b = bodies[i];
        if (
          local.x >= b.x - b.w / 2 &&
          local.x <= b.x + b.w / 2 &&
          local.y >= b.y - b.h / 2 &&
          local.y <= b.y + b.h / 2
        ) {
          drag = { body: b, offX: local.x - b.x, offY: local.y - b.y };
          hostEl.setPointerCapture(e.pointerId);
          // A grab has to wake a parked loop, or the drag springs move a body
          // nothing ever commits — same shape as `WrClickSpark.onClick`.
          if (!raf) {
            lastTs = 0;
            raf = requestAnimationFrame(tick);
          }
          break;
        }
      }
    };
    const onPointerMove = (e: PointerEvent): void => {
      if (!drag) return;
      const local = this.toLocal(e, hostEl);
      const targetX = local.x - drag.offX;
      const targetY = local.y - drag.offY;
      // Spring toward the target — produces a satisfying tug rather than a snap.
      drag.body.vx += (targetX - drag.body.x) * DRAG_STIFFNESS;
      drag.body.vy += (targetY - drag.body.y) * DRAG_STIFFNESS;
    };
    const onPointerUp = (e: PointerEvent): void => {
      if (!drag) return;
      hostEl.releasePointerCapture(e.pointerId);
      drag = null;
    };
    hostEl.addEventListener('pointerdown', onPointerDown);
    hostEl.addEventListener('pointermove', onPointerMove);
    hostEl.addEventListener('pointerup', onPointerUp);
    hostEl.addEventListener('pointercancel', onPointerUp);

    // The walls are the host's box, which a resized window or a rotated phone
    // moves: measured once, a word at the old right wall sat clipped past the
    // new one. The next frames push everything back inside.
    const ro =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            const rect = hostEl.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;
            width = rect.width;
            height = rect.height;
            if (!raf) {
              lastTs = 0;
              raf = requestAnimationFrame(tick);
            }
          });
    ro?.observe(hostEl);

    this.teardownLoop = (): void => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      hostEl.removeEventListener('pointerdown', onPointerDown);
      hostEl.removeEventListener('pointermove', onPointerMove);
      hostEl.removeEventListener('pointerup', onPointerUp);
      hostEl.removeEventListener('pointercancel', onPointerUp);
    };
  }

  /** Apply the body's position + angle to the DOM. `false` when it has not moved. */
  private commit(b: Body): boolean {
    const transform = `translate(${b.x - b.w / 2}px, ${b.y - b.h / 2}px) rotate(${b.angle}rad)`;
    if (transform === b.transform) return false;
    b.transform = transform;
    b.el.style.transform = transform;
    return true;
  }

  private toLocal(e: PointerEvent | MouseEvent, host: HTMLElement): { x: number; y: number } {
    const rect = host.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
}

export type { WrFallingTextTrigger } from './types';
