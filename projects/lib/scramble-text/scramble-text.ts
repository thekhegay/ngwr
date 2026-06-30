/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the ScrambledText effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/text-animations/scrambled-text
 *
 * The reactbits version uses GSAP's paid SplitText + ScrambleTextPlugin.
 * This port is dependency-free — splits via vanilla DOM, scrambles via a
 * per-char `setInterval` loop, restores on settle.
 */

import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  inject,
  input,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { numAttr } from 'ngwr/utils';

interface ActiveScramble {
  swapId: ReturnType<typeof setInterval>;
  settleId: ReturnType<typeof setTimeout>;
}

/** Cached per-char geometry, refreshed on scroll/resize instead of per pointermove. */
interface CharEntry {
  el: HTMLElement;
  cx: number;
  cy: number;
  original: string;
}

function pickRandom(pool: string, exclude: string): string {
  if (pool.length === 0) return exclude;
  if (pool.length === 1) return pool;
  // Avoid landing on the original mid-scramble — looks like nothing happened.
  let pick = pool.charAt(Math.floor(Math.random() * pool.length));
  for (let tries = 0; tries < 3 && pick === exclude; tries++) {
    pick = pool.charAt(Math.floor(Math.random() * pool.length));
  }
  return pick;
}

/**
 * Cursor-proximity scrambler. Each character inside the projected text
 * scrambles through `scrambleChars` whenever the pointer moves within
 * `radius` px of it, then settles back to the original. Closer pointer →
 * longer scramble.
 *
 * @example
 * ```html
 * <wr-scramble-text
 *   [radius]="120"
 *   [duration]="1.4"
 *   scrambleChars="!&%*"
 * >
 *   Hover this paragraph to scramble characters near the cursor.
 * </wr-scramble-text>
 * ```
 *
 * @see https://www.reactbits.dev/text-animations/scrambled-text
 */
@Component({
  selector: 'wr-scramble-text',
  template: '<span class="wr-scramble-text__inner" #inner><ng-content /></span>',
  styleUrl: './scramble-text.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-scramble-text',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerleave)': 'invalidateRects()',
  },
})
export class WrScrambleText {
  /** Proximity radius in pixels. @default 100 */
  readonly radius = input(100, { transform: numAttr(100) });

  /** Max scramble duration in seconds (scaled by proximity — closer = longer). @default 1.2 */
  readonly duration = input(1.2, { transform: numAttr(1.2) });

  /** Approximate seconds between random-char swaps. Lower = faster scramble. @default 0.05 */
  readonly speed = input(0.05, { transform: numAttr(0.05) });

  /** Pool of glyphs to scramble through. @default '.:' */
  readonly scrambleChars = input('.:');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly platform = inject(WrPlatform);
  private readonly zone = inject(NgZone);

  /** One entry per active scramble, keyed by char span. */
  private readonly active = new Map<HTMLElement, ActiveScramble>();

  /** Cached char spans + their viewport centres. Re-computed after render. */
  private chars: readonly CharEntry[] = [];

  /** When true, char centres are stale (post-scroll/resize) and re-read lazily. */
  private rectsDirty = true;

  /** Pending rAF id; pointermoves coalesce into a single per-frame pass. */
  private frameId = 0;

  /** Latest pointer coords, consumed by the next rAF tick. */
  private px = 0;
  private py = 0;

  constructor() {
    if (!this.isBrowser) return;
    afterNextRender(() => this.split());

    // Scroll/resize shift char positions; mark the cache stale rather than
    // re-reading layout on every pointermove (which forces a reflow per char).
    const onViewportChange = (): void => this.invalidateRects();
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', onViewportChange, { capture: true, passive: true });
      window.addEventListener('resize', onViewportChange, { passive: true });
    });

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('scroll', onViewportChange, { capture: true });
      window.removeEventListener('resize', onViewportChange);
      if (this.frameId) cancelAnimationFrame(this.frameId);
      this.clearAll();
    });
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.chars.length === 0) return;
    // Reduced motion: pointer proximity stops scrambling — text stays put.
    if (this.platform.prefersReducedMotion()) return;

    // Coalesce the burst of pointermoves into one pass per frame: pointermove
    // can fire many times between paints, but we only need the latest position.
    this.px = event.clientX;
    this.py = event.clientY;
    if (this.frameId) return;
    this.zone.runOutsideAngular(() => {
      this.frameId = requestAnimationFrame(() => {
        this.frameId = 0;
        this.scrambleNearPointer();
      });
    });
  }

  /** Marks cached char centres stale so the next frame re-reads layout once. */
  protected invalidateRects(): void {
    this.rectsDirty = true;
  }

  /** Single per-frame proximity pass against cached char centres. */
  private scrambleNearPointer(): void {
    if (this.rectsDirty) this.measure();

    const radius = this.radius();
    const radiusSq = radius * radius;
    const duration = this.duration() * 1000;
    const swapInterval = Math.max(16, this.speed() * 1000);
    const pool = this.scrambleChars();
    const px = this.px;
    const py = this.py;

    for (const entry of this.chars) {
      const dx = px - entry.cx;
      const dy = py - entry.cy;
      const distSq = dx * dx + dy * dy;
      if (distSq > radiusSq) continue;

      const { el, original } = entry;

      // Cancel any in-flight scramble for this char — we're restarting.
      this.cancelOne(el);

      // Proximity factor: 0 at the edge, 1 at the centre.
      const proximity = 1 - Math.sqrt(distSq) / radius;
      const scrambleMs = duration * proximity;

      const swapId = setInterval(() => {
        el.textContent = pickRandom(pool, original);
      }, swapInterval);

      const settleId = setTimeout(() => {
        clearInterval(swapId);
        el.textContent = original;
        this.active.delete(el);
      }, scrambleMs);

      this.active.set(el, { swapId, settleId });
    }
  }

  /** Read every char centre in one batched layout pass, then mark cache fresh. */
  private measure(): void {
    for (const entry of this.chars) {
      const rect = entry.el.getBoundingClientRect();
      entry.cx = rect.left + rect.width / 2;
      entry.cy = rect.top + rect.height / 2;
    }
    this.rectsDirty = false;
  }

  /** Walk the projected text and wrap each non-whitespace character in a span. */
  private split(): void {
    const inner = this.host.nativeElement.querySelector<HTMLElement>('.wr-scramble-text__inner');
    if (!inner) return;
    const raw = inner.textContent ?? '';
    if (!raw) return;

    const frag = document.createDocumentFragment();
    for (const ch of [...raw]) {
      if (/\s/.test(ch)) {
        frag.appendChild(document.createTextNode(ch));
      } else {
        const span = document.createElement('span');
        span.className = 'wr-scramble-text__char';
        span.textContent = ch;
        span.dataset['scrambleOriginal'] = ch;
        frag.appendChild(span);
      }
    }
    inner.replaceChildren(frag);
    this.chars = Array.from(inner.querySelectorAll<HTMLElement>('.wr-scramble-text__char'), el => ({
      el,
      cx: 0,
      cy: 0,
      original: el.dataset['scrambleOriginal'] ?? '',
    }));
    // Centres are read lazily on the first pointer frame.
    this.rectsDirty = true;
  }

  private cancelOne(el: HTMLElement): void {
    const entry = this.active.get(el);
    if (!entry) return;
    clearInterval(entry.swapId);
    clearTimeout(entry.settleId);
    this.active.delete(el);
  }

  private clearAll(): void {
    for (const [el, entry] of this.active) {
      clearInterval(entry.swapId);
      clearTimeout(entry.settleId);
      el.textContent = el.dataset['scrambleOriginal'] ?? '';
    }
    this.active.clear();
  }
}
