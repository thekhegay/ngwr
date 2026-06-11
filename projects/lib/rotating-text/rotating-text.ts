/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the RotatingText effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/text-animations/rotating-text
 *
 * The reactbits version uses `motion/react` + `AnimatePresence`. This
 * port is dependency-free — vanilla DOM split + Web Animations API for
 * the enter/exit transitions.
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
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
  output,
  signal,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';

const num =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

const DEFAULT_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

interface Word {
  readonly characters: readonly string[];
  readonly needsSpace: boolean;
}

function graphemes(text: string): readonly string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return Array.from(seg.segment(text), s => s.segment);
  }
  return Array.from(text);
}

function splitWords(text: string, by: WrRotatingTextSplit): readonly Word[] {
  if (!text) return [];
  if (by === 'lines') {
    const lines = text.split('\n');
    return lines.map((line, i) => ({ characters: [line], needsSpace: i !== lines.length - 1 }));
  }
  if (by === 'words') {
    const words = text.split(' ');
    return words.map((w, i) => ({ characters: [w], needsSpace: i !== words.length - 1 }));
  }
  // characters: split each word into graphemes, keep word boundaries for spacing.
  const words = text.split(' ');
  return words.map((w, i) => ({ characters: graphemes(w), needsSpace: i !== words.length - 1 }));
}

/**
 * Cycles through a list of strings, animating each transition
 * character-by-character (or word/line). Auto-advances on a timer by
 * default; can also be controlled imperatively via `next()` /
 * `previous()` / `jumpTo()` / `reset()`.
 *
 * @example
 * ```html
 * <wr-rotating-text [texts]="['design', 'ship', 'iterate']" />
 *
 * // Manual control:
 * @ViewChild(WrRotatingText) rotator!: WrRotatingText;
 * onClick(): void { this.rotator.next(); }
 * ```
 *
 * @see https://www.reactbits.dev/text-animations/rotating-text
 */
@Component({
  selector: 'wr-rotating-text',
  templateUrl: './rotating-text.html',
  styleUrl: './rotating-text.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-rotating-text' },
})
export class WrRotatingText {
  /** Strings to cycle. Required. */
  readonly texts = input.required<readonly string[]>();

  /** Auto-advance interval in ms. @default 2000 */
  readonly rotationInterval = input(2000, { transform: num(2000) });

  /** Granularity of the split. @default 'characters' */
  readonly splitBy = input<WrRotatingTextSplit>('characters');

  /** Auto-advance on a timer. @default true */
  readonly auto = input(true, { transform: coerceBooleanProperty });

  /** Loop back to the first string after the last. @default true */
  readonly loop = input(true, { transform: coerceBooleanProperty });

  /** Per-swap tween duration in seconds. @default 0.6 */
  readonly duration = input(0.6, { transform: num(0.6) });

  /** CSS easing of the per-piece tween. @default 'cubic-bezier(0.16, 1, 0.3, 1)' (~power3.out) */
  readonly easing = input(DEFAULT_EASING);

  /** Per-piece stagger in seconds. @default 0 */
  readonly staggerDuration = input(0, { transform: num(0) });

  /** Stagger origin. @default 'first' */
  readonly staggerFrom = input<WrRotatingTextStaggerFrom>('first');

  /** Emitted with the new index on every rotation. */
  readonly nextChange = output<number>();

  protected readonly index = signal(0);

  protected readonly current = computed(() => {
    const arr = this.texts();
    return arr.length === 0 ? '' : arr[Math.min(this.index(), arr.length - 1)];
  });

  protected readonly words = computed<readonly Word[]>(() => splitWords(this.current(), this.splitBy()));

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly platform = inject(WrPlatform);

  private timerId: ReturnType<typeof setInterval> | undefined;
  private isAnimating = false;

  constructor() {
    if (!this.isBrowser) return;

    afterNextRender(() => this.animateIn());

    // Restart the timer when interval / auto change.
    effect(() => {
      this.rotationInterval();
      this.auto();
      this.restartTimer();
    });

    this.destroyRef.onDestroy(() => clearInterval(this.timerId));
  }

  // ───────── Public imperative API ─────────

  next(): void {
    const arr = this.texts();
    if (arr.length === 0) return;
    const cur = this.index();
    const last = arr.length - 1;
    const target = cur === last ? (this.loop() ? 0 : cur) : cur + 1;
    if (target !== cur) void this.transitionTo(target);
  }

  previous(): void {
    const arr = this.texts();
    if (arr.length === 0) return;
    const cur = this.index();
    const last = arr.length - 1;
    const target = cur === 0 ? (this.loop() ? last : cur) : cur - 1;
    if (target !== cur) void this.transitionTo(target);
  }

  jumpTo(target: number): void {
    const arr = this.texts();
    if (arr.length === 0) return;
    const clamped = Math.max(0, Math.min(target, arr.length - 1));
    if (clamped !== this.index()) void this.transitionTo(clamped);
  }

  reset(): void {
    if (this.index() !== 0) void this.transitionTo(0);
  }

  // ───────── Internals ─────────

  private restartTimer(): void {
    clearInterval(this.timerId);
    if (!this.auto()) return;
    this.timerId = setInterval(() => this.next(), this.rotationInterval());
  }

  private async transitionTo(target: number): Promise<void> {
    if (this.isAnimating) return;
    this.isAnimating = true;

    await this.animateOut();
    this.index.set(target);
    this.nextChange.emit(target);
    // Wait one microtask so the new spans are rendered, then animate in.
    queueMicrotask(() => {
      this.animateIn();
      this.isAnimating = false;
    });
  }

  private animateIn(): void {
    const targets = this.host.nativeElement.querySelectorAll<HTMLElement>('.wr-rotating-text__char');
    if (targets.length === 0) return;

    // Reduced motion: the word swap itself is content and keeps cycling,
    // but each swap is instant — no per-char rise/fall tween.
    if (this.platform.prefersReducedMotion()) {
      targets.forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'translate3d(0, 0, 0)';
      });
      return;
    }

    const stagger = this.staggerDuration() * 1000;
    targets.forEach((el, i) => {
      const delay = this.delayFor(i, targets.length, stagger);
      el.style.opacity = '0';
      el.style.transform = 'translate3d(0, 100%, 0)';
      const anim = el.animate(
        [
          { opacity: 0, transform: 'translate3d(0, 100%, 0)' },
          { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        ],
        { duration: this.duration() * 1000, delay, easing: this.easing(), fill: 'forwards' }
      );
      anim.onfinish = (): void => {
        el.style.opacity = '1';
        el.style.transform = 'translate3d(0, 0, 0)';
        try {
          anim.cancel();
        } catch {
          /* noop */
        }
      };
    });
  }

  private animateOut(): Promise<void> {
    const targets = this.host.nativeElement.querySelectorAll<HTMLElement>('.wr-rotating-text__char');
    if (targets.length === 0) return Promise.resolve();
    if (this.platform.prefersReducedMotion()) return Promise.resolve();
    const stagger = this.staggerDuration() * 1000;
    const promises: Promise<void>[] = [];
    targets.forEach((el, i) => {
      const delay = this.delayFor(i, targets.length, stagger);
      const anim = el.animate(
        [
          { opacity: 1, transform: 'translate3d(0, 0, 0)' },
          { opacity: 0, transform: 'translate3d(0, -120%, 0)' },
        ],
        { duration: this.duration() * 1000, delay, easing: this.easing(), fill: 'forwards' }
      );
      promises.push(
        new Promise<void>(resolve => {
          anim.onfinish = (): void => {
            try {
              anim.cancel();
            } catch {
              /* noop */
            }
            resolve();
          };
        })
      );
    });
    return Promise.all(promises).then(() => undefined);
  }

  private delayFor(i: number, total: number, stagger: number): number {
    if (stagger === 0) return 0;
    switch (this.staggerFrom()) {
      case 'last':
        return (total - 1 - i) * stagger;
      case 'center': {
        const center = Math.floor(total / 2);
        return Math.abs(center - i) * stagger;
      }
      case 'first':
      default:
        return i * stagger;
    }
  }
}

export type WrRotatingTextSplit = 'characters' | 'words' | 'lines';
export type WrRotatingTextStaggerFrom = 'first' | 'last' | 'center';
