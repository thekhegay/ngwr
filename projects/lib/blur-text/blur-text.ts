/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the BlurText effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/text-animations/blur-text
 *
 * The reactbits version uses `motion/react` (framer-motion successor).
 * This port is dependency-free — uses the Web Animations API for the
 * three-keyframe blur-and-fade-in, triggered by `IntersectionObserver`.
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
  effect,
  inject,
  input,
  output,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';

type Unit = 'chars' | 'words';
type Direction = 'top' | 'bottom';
type Piece = { readonly kind: 'piece'; readonly text: string } | { readonly kind: 'space'; readonly text: string };

const num =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

function splitPieces(text: string, unit: Unit): readonly Piece[] {
  if (!text) return [];
  if (unit === 'words') {
    return text.split(/(\s+)/).flatMap<Piece>(seg => {
      if (seg.length === 0) return [];
      if (/^\s+$/.test(seg)) return [{ kind: 'space', text: seg }];
      return [{ kind: 'piece', text: seg }];
    });
  }
  return [...text].map<Piece>(ch => (/\s/.test(ch) ? { kind: 'space', text: ch } : { kind: 'piece', text: ch }));
}

/**
 * Reveals text by splitting it into chars or words and animating each
 * piece in from a blurred / offset state through a brief mid-step into
 * the steady state. Triggers when the host enters the viewport.
 *
 * @example
 * ```html
 * <wr-blur-text
 *   text="Welcome to ngwr"
 *   animateBy="words"
 *   direction="top"
 *   [delay]="120"
 *   [stepDuration]="0.4"
 * />
 * ```
 *
 * @see https://www.reactbits.dev/text-animations/blur-text
 */
@Component({
  selector: 'wr-blur-text',
  templateUrl: './blur-text.html',
  styleUrl: './blur-text.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-blur-text' },
})
export class WrBlurText {
  /** Text to animate. Required. */
  readonly text = input.required<string>();

  /** Split granularity. @default 'words' */
  readonly animateBy = input<Unit>('words');

  /** Entry direction. `'top'` slides down into place; `'bottom'` slides up. @default 'top' */
  readonly direction = input<Direction>('top');

  /** Per-piece stagger in ms. @default 200 */
  readonly delay = input(200, { transform: num(200) });

  /** Duration of each keyframe step in seconds (total = 2 × stepDuration). @default 0.35 */
  readonly stepDuration = input(0.35, { transform: num(0.35) });

  /** CSS easing function. @default 'linear' (matches reactbits' identity easing) */
  readonly easing = input('linear');

  /** `IntersectionObserver.threshold` (0..1). @default 0.1 */
  readonly threshold = input(0.1, { transform: num(0.1) });

  /** `IntersectionObserver.rootMargin`. @default '0px' */
  readonly rootMargin = input('0px');

  /** Emitted once all pieces finish animating. */
  readonly animationComplete = output<void>();

  protected readonly pieces = computed(() => splitPieces(this.text(), this.animateBy()));

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly platform = inject(WrPlatform);

  private hasAnimated = false;

  constructor() {
    if (!this.isBrowser) return;
    afterNextRender(() => this.startObserver());
    effect(() => {
      this.text();
      this.animateBy();
      this.hasAnimated = false;
      queueMicrotask(() => this.startObserver());
    });
  }

  private startObserver(): void {
    if (this.hasAnimated) return;
    const host = this.host.nativeElement;
    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            obs.disconnect();
            this.animate();
            break;
          }
        }
      },
      { threshold: this.threshold(), rootMargin: this.rootMargin() }
    );
    io.observe(host);
    this.destroyRef.onDestroy(() => io.disconnect());
  }

  private animate(): void {
    if (this.hasAnimated) return;
    this.hasAnimated = true;

    // Reduced motion: pieces already render clear and in place — skip
    // the blur tween and report completion right away.
    if (this.platform.prefersReducedMotion()) {
      this.animationComplete.emit();
      return;
    }

    const targets = this.host.nativeElement.querySelectorAll<HTMLElement>('.wr-blur-text__piece');
    if (targets.length === 0) {
      this.animationComplete.emit();
      return;
    }

    const dir = this.direction();
    const stepMs = this.stepDuration() * 1000;
    const totalMs = stepMs * 2;
    const stagger = this.delay();
    const easing = this.easing();

    // Three-keyframe shape per reactbits:
    //   0    → fully blurred, offset, transparent
    //   50%  → half-blur, half-opacity, small reverse offset
    //   100% → clear, opaque, at rest
    const startY = dir === 'top' ? -50 : 50;
    const midY = dir === 'top' ? 5 : -5;
    const keyframes: Keyframe[] = [
      { opacity: 0, filter: 'blur(10px)', transform: `translate3d(0, ${startY}px, 0)` },
      { opacity: 0.5, filter: 'blur(5px)', transform: `translate3d(0, ${midY}px, 0)`, offset: 0.5 },
      { opacity: 1, filter: 'blur(0px)', transform: 'translate3d(0, 0, 0)' },
    ];

    let remaining = targets.length;
    targets.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.filter = 'blur(10px)';
      el.style.transform = `translate3d(0, ${startY}px, 0)`;
      const animation = el.animate(keyframes, {
        duration: totalMs,
        delay: i * stagger,
        easing,
        fill: 'forwards',
      });
      animation.onfinish = (): void => {
        el.style.opacity = '1';
        el.style.filter = 'blur(0px)';
        el.style.transform = 'translate3d(0, 0, 0)';
        try {
          animation.cancel();
        } catch {
          /* noop */
        }
        remaining -= 1;
        if (remaining === 0) this.animationComplete.emit();
      };
    });
  }
}
