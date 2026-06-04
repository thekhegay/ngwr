/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the SplitText effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/text-animations/split-text
 *
 * The reactbits version uses GSAP's paid `SplitText` plugin. This port is
 * GSAP-free — splits via plain DOM spans, animates via the Web Animations
 * API, triggers on viewport entry via `IntersectionObserver`.
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
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

const num =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

type Piece = { readonly kind: 'piece'; readonly text: string } | { readonly kind: 'space'; readonly text: string };

/** Split `text` into render pieces, preserving whitespace as `kind: 'space'`. */
function splitPieces(text: string, unit: WrSplitTextUnit): readonly Piece[] {
  if (!text) return [];
  if (unit === 'words') {
    // Split on whitespace, keeping spaces as separate pieces.
    return text.split(/(\s+)/).flatMap<Piece>(seg => {
      if (seg.length === 0) return [];
      if (/^\s+$/.test(seg)) return [{ kind: 'space', text: seg } as const];
      return [{ kind: 'piece', text: seg } as const];
    });
  }
  // chars: each character is its own piece; whitespace becomes 'space'.
  return [...text].map<Piece>(ch => (/\s/.test(ch) ? { kind: 'space', text: ch } : { kind: 'piece', text: ch }));
}

function motionToStyle(m: WrSplitTextMotion): { opacity: number; transform: string } {
  const opacity = m.opacity ?? 1;
  const parts: string[] = [];
  if (m.x !== undefined || m.y !== undefined) {
    parts.push(`translate3d(${m.x ?? 0}px, ${m.y ?? 0}px, 0)`);
  }
  if (m.scale !== undefined) parts.push(`scale(${m.scale})`);
  if (m.rotate !== undefined) parts.push(`rotate(${m.rotate}deg)`);
  return { opacity, transform: parts.length ? parts.join(' ') : 'none' };
}

/**
 * Animated text reveal — splits the input string into chars or words and
 * staggers each piece in from a `from` motion state to a `to` motion
 * state when the host scrolls into view. Whitespace is preserved.
 *
 * @example
 * ```html
 * <wr-split-text
 *   text="Hello, ngwr!"
 *   splitType="chars"
 *   [delay]="40"
 *   [duration]="1.2"
 *   [from]="{ opacity: 0, y: 40 }"
 *   [to]="{ opacity: 1, y: 0 }"
 *   (animationComplete)="onDone()"
 * />
 * ```
 *
 * @see https://www.reactbits.dev/text-animations/split-text
 */
@Component({
  selector: 'wr-split-text',
  templateUrl: './split-text.html',
  styleUrl: './split-text.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-split-text', '[style.text-align]': 'textAlign()' },
})
export class WrSplitText {
  /** Text to animate. Required. */
  readonly text = input.required<string>();

  /** Split granularity. @default 'chars' */
  readonly splitType = input<WrSplitTextUnit>('chars');

  /** Stagger delay between pieces in ms. @default 50 */
  readonly delay = input(50, { transform: num(50) });

  /** Animation duration in seconds (matches reactbits' API). @default 1.25 */
  readonly duration = input(1.25, { transform: num(1.25) });

  /** CSS easing function. @default 'cubic-bezier(0.16, 1, 0.3, 1)' (~power3.out) */
  readonly easing = input('cubic-bezier(0.16, 1, 0.3, 1)');

  /** Start state for each piece. @default { opacity: 0, y: 40 } */
  readonly from = input<WrSplitTextMotion>({ opacity: 0, y: 40 });

  /** End state for each piece. @default { opacity: 1, y: 0 } */
  readonly to = input<WrSplitTextMotion>({ opacity: 1, y: 0 });

  /** `IntersectionObserver.threshold` — 0..1. @default 0.1 */
  readonly threshold = input(0.1, { transform: num(0.1) });

  /** `IntersectionObserver.rootMargin`. @default '-100px' */
  readonly rootMargin = input('-100px');

  /** Text alignment of the host. @default 'center' */
  readonly textAlign = input<'left' | 'center' | 'right' | 'justify'>('center');

  /** Emitted once all pieces finish animating. */
  readonly animationComplete = output<void>();

  /** Pieces to render. Each piece is `{ kind: 'piece', text }` or `{ kind: 'space' }`. */
  protected readonly pieces = computed(() => splitPieces(this.text(), this.splitType()));

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private hasAnimated = false;

  constructor() {
    if (!this.isBrowser) return;

    afterNextRender(() => this.startObserver());

    // Re-run animation if `text` (and therefore the split pieces) changes.
    effect(() => {
      this.text();
      this.splitType();
      this.hasAnimated = false;
      queueMicrotask(() => this.startObserver());
    });
  }

  private startObserver(): void {
    const host = this.host.nativeElement;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    const ready = fonts?.status === 'loaded' ? Promise.resolve() : (fonts?.ready ?? Promise.resolve());

    const observe = (): void => {
      if (this.hasAnimated) return;
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
    };

    void ready.then(observe);
  }

  private animate(): void {
    if (this.hasAnimated) return;
    this.hasAnimated = true;

    const host = this.host.nativeElement;
    const targets = host.querySelectorAll<HTMLElement>('.wr-split-text__piece');
    if (targets.length === 0) {
      this.animationComplete.emit();
      return;
    }

    const fromStyle = motionToStyle(this.from());
    const toStyle = motionToStyle(this.to());
    const durationMs = this.duration() * 1000;
    const stagger = this.delay();
    const easing = this.easing();

    let remaining = targets.length;
    targets.forEach((el, i) => {
      // Set initial state immediately so there's no flash of final state
      // before the animation kicks in.
      el.style.opacity = String(fromStyle.opacity);
      el.style.transform = fromStyle.transform;
      const animation = el.animate(
        [
          { opacity: fromStyle.opacity, transform: fromStyle.transform },
          { opacity: toStyle.opacity, transform: toStyle.transform },
        ],
        { duration: durationMs, delay: i * stagger, easing, fill: 'forwards' }
      );
      animation.onfinish = (): void => {
        // Commit final styles + clean up the WAAPI tween.
        el.style.opacity = String(toStyle.opacity);
        el.style.transform = toStyle.transform;
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

/** Granularity of the split. `lines` is not yet supported in this port. */
export type WrSplitTextUnit = 'chars' | 'words';

/**
 * One end of the animation. Properties not listed default to the steady
 * state (opacity 1, no transform). `x` / `y` are pixels, `scale` is a
 * unitless factor, `rotate` is degrees.
 */
export interface WrSplitTextMotion {
  readonly opacity?: number;
  readonly x?: number;
  readonly y?: number;
  readonly scale?: number;
  readonly rotate?: number;
}
