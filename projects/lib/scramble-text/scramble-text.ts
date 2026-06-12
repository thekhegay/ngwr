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

  /** One entry per active scramble, keyed by char span. */
  private readonly active = new Map<HTMLElement, ActiveScramble>();

  /** Cached list of char spans. Re-computed after each render. */
  private chars: readonly HTMLElement[] = [];

  constructor() {
    if (!this.isBrowser) return;
    afterNextRender(() => this.split());
    this.destroyRef.onDestroy(() => this.clearAll());
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.chars.length === 0) return;
    // Reduced motion: pointer proximity stops scrambling — text stays put.
    if (this.platform.prefersReducedMotion()) return;
    const radius = this.radius();
    const duration = this.duration() * 1000;
    const swapInterval = Math.max(16, this.speed() * 1000);
    const pool = this.scrambleChars();

    for (const charEl of this.chars) {
      const rect = charEl.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist > radius) continue;

      // Cancel any in-flight scramble for this char — we're restarting.
      this.cancelOne(charEl);

      // Proximity factor: 0 at the edge, 1 at the centre.
      const proximity = 1 - dist / radius;
      const scrambleMs = duration * proximity;
      const original = charEl.dataset['scrambleOriginal'] ?? '';

      const swapId = setInterval(() => {
        charEl.textContent = pickRandom(pool, original);
      }, swapInterval);

      const settleId = setTimeout(() => {
        clearInterval(swapId);
        charEl.textContent = original;
        this.active.delete(charEl);
      }, scrambleMs);

      this.active.set(charEl, { swapId, settleId });
    }
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
    this.chars = Array.from(inner.querySelectorAll<HTMLElement>('.wr-scramble-text__char'));
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
