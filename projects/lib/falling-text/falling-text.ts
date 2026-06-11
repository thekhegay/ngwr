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

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';

const num =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

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
  host: { class: 'wr-falling-text' },
})
export class WrFallingText {
  /** Text to render. Words are separated by spaces. */
  readonly text = input.required<string>();

  /** Prefix-match keywords; any word starting with one of these gets the highlight class. */
  readonly highlightWords = input<readonly string[]>([]);

  /** When to release the words into the simulator. @default 'auto' */
  readonly trigger = input<WrFallingTextTrigger>('auto');

  /** Gravity in pixels/sec². @default 980 */
  readonly gravity = input(980, { transform: num(980) });

  /** Font size as a CSS length. @default '1rem' */
  readonly fontSize = input('1rem');

  private readonly wordsRef = viewChild.required<ElementRef<HTMLDivElement>>('wordsContainer');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly platform = inject(WrPlatform);

  private started = false;
  private teardownLoop: (() => void) | undefined;

  protected readonly words = computed<readonly { text: string; highlighted: boolean }[]>(() => {
    const hl = this.highlightWords();
    return this.text()
      .split(' ')
      .filter(w => w.length > 0)
      .map(text => ({ text, highlighted: hl.some(h => text.startsWith(h)) }));
  });

  constructor() {
    if (!this.isBrowser) return;

    afterNextRender(() => {
      const trigger = this.trigger();
      if (trigger === 'auto') {
        this.start();
        return;
      }
      if (trigger === 'scroll') {
        const io = new IntersectionObserver(
          (entries, obs) => {
            for (const e of entries) {
              if (e.isIntersecting) {
                obs.disconnect();
                this.start();
                break;
              }
            }
          },
          { threshold: 0.1 }
        );
        io.observe(this.host.nativeElement);
        this.destroyRef.onDestroy(() => io.disconnect());
        return;
      }
      // hover / click — wait for host event
      const startOnce = (): void => {
        if (this.started) return;
        this.start();
      };
      const handler = trigger === 'hover' ? 'mouseenter' : 'click';
      this.host.nativeElement.addEventListener(handler, startOnce, { once: true });
      this.destroyRef.onDestroy(() => this.host.nativeElement.removeEventListener(handler, startOnce));
    });

    this.destroyRef.onDestroy(() => this.teardownLoop?.());
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
    const width = containerRect.width;
    const height = containerRect.height;
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
      };
    });

    // Absolutely position all word spans so we can move them freely.
    bodies.forEach(b => {
      b.el.style.position = 'absolute';
      b.el.style.left = '0';
      b.el.style.top = '0';
      b.el.style.willChange = 'transform';
      this.commit(b);
    });

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

      for (const b of bodies) this.commit(b);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    this.teardownLoop = (): void => {
      cancelAnimationFrame(raf);
      hostEl.removeEventListener('pointerdown', onPointerDown);
      hostEl.removeEventListener('pointermove', onPointerMove);
      hostEl.removeEventListener('pointerup', onPointerUp);
      hostEl.removeEventListener('pointercancel', onPointerUp);
    };
  }

  /** Apply the body's position + angle to the DOM. */
  private commit(b: Body): void {
    b.el.style.transform = `translate(${b.x - b.w / 2}px, ${b.y - b.h / 2}px) rotate(${b.angle}rad)`;
    b.el.style.transformOrigin = `${b.w / 2}px ${b.h / 2}px`;
  }

  private toLocal(e: PointerEvent | MouseEvent, host: HTMLElement): { x: number; y: number } {
    const rect = host.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
}

export type WrFallingTextTrigger = 'auto' | 'scroll' | 'hover' | 'click';
