/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the CircularText effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/text-animations/circular-text
 *
 * Reactbits drives the rotation with `motion/react`, which lets the spin
 * angle persist across speed changes. CSS keyframes can't do that — when
 * `animation-duration` changes mid-flight, the browser recomputes the
 * progress as `(elapsed % newDuration) / newDuration`, which visibly
 * jumps the rotation. So this port drives the rotation through the
 * Web Animations API and preserves the current angle when hover swaps
 * the duration. Bonkers `scale` is still CSS-driven (no conflict — the
 * rotation lives on an inner wrapper).
 */

import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  type ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { numAttr } from 'ngwr/utils';

import type { WrCircularTextHover } from './interfaces';

interface Char {
  readonly ch: string;
  readonly transform: string;
}

/**
 * Text laid out around a circle, with the whole circle spinning. Hover
 * behaviour swaps the spin rate (or pauses it) — the current rotation
 * angle is preserved across the swap so there's no visible jump.
 *
 * @example
 * ```html
 * <wr-circular-text text="HELLO * NGWR * " />
 * <wr-circular-text text="GO BONKERS" onHover="goBonkers" [spinDuration]="12" />
 * ```
 *
 * @see https://www.reactbits.dev/text-animations/circular-text
 */
@Component({
  selector: 'wr-circular-text',
  templateUrl: './circular-text.html',
  styleUrl: './circular-text.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-circular-text',
    '[class.wr-circular-text--bonkers]': "onHover() === 'goBonkers'",
  },
})
export class WrCircularText {
  /** Text to lay out around the circle. */
  readonly text = input.required<string>();

  /** Seconds per full revolution at rest. @default 20 */
  readonly spinDuration = input(20, { transform: numAttr(20) });

  /** Hover behaviour. `null` disables hover reactivity. @default 'speedUp' */
  readonly onHover = input<WrCircularTextHover>('speedUp');

  protected readonly chars = computed<readonly Char[]>(() => {
    const letters = Array.from(this.text());
    const len = letters.length;
    if (len === 0) return [];
    return letters.map((ch, i) => {
      const rotation = (360 / len) * i;
      // Rotate around the spinner's centre, then push each char outward
      // by the orbit radius (set via CSS var). All chars end up on a
      // circle of constant radius — not a diagonal line.
      const transform = `rotate(${rotation}deg) translateY(calc(-1 * var(--wr-circular-text-radius)))`;
      return { ch, transform };
    });
  });

  private readonly spinEl = viewChild.required<ElementRef<HTMLElement>>('spin');

  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly platform = inject(WrPlatform);
  private rotation: Animation | null = null;
  private hovered = false;

  /** Active spin duration in seconds — base, or hover-modified. */
  private effectiveDuration(): number | 'pause' {
    const base = this.spinDuration();
    if (!this.hovered) return base;
    switch (this.onHover()) {
      case 'speedUp':
        return base / 4;
      case 'slowDown':
        return base * 2;
      case 'pause':
        return 'pause';
      case 'goBonkers':
        return base / 20;
      default:
        return base;
    }
  }

  constructor() {
    if (!this.isBrowser) return;

    afterNextRender(() => {
      this.startOrSwap();

      const host = this.spinEl().nativeElement.parentElement!;
      const onEnter = (): void => {
        this.hovered = true;
        this.startOrSwap();
      };
      const onLeave = (): void => {
        this.hovered = false;
        this.startOrSwap();
      };
      host.addEventListener('mouseenter', onEnter);
      host.addEventListener('mouseleave', onLeave);
      this.destroyRef.onDestroy(() => {
        host.removeEventListener('mouseenter', onEnter);
        host.removeEventListener('mouseleave', onLeave);
        this.rotation?.cancel();
      });
    });

    // React to input changes (spinDuration, onHover) — and the OS
    // reduced-motion setting — without losing angle.
    effect(() => {
      this.spinDuration();
      this.onHover();
      this.platform.prefersReducedMotion();
      queueMicrotask(() => this.startOrSwap());
    });
  }

  /**
   * Start the rotation, or swap its duration while preserving the
   * current angle. If the new mode is `pause`, just pause the animation.
   */
  private startOrSwap(): void {
    if (!this.spinEl()) return;

    // Reduced motion: hold the ring still — the circular layout is the
    // point of the component; only the revolution is decorative.
    if (this.platform.prefersReducedMotion()) {
      this.rotation?.pause();
      return;
    }

    const target = this.effectiveDuration();

    if (target === 'pause') {
      this.rotation?.pause();
      return;
    }

    const newDurMs = Math.max(1, target * 1000);

    // First start — no previous animation to preserve.
    if (!this.rotation) {
      this.rotation = this.spinEl().nativeElement.animate(
        [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
        { duration: newDurMs, iterations: Infinity, easing: 'linear' }
      );
      return;
    }

    // Compute the current angle (0..1 of a full turn) under the old
    // timing, then restart with the new duration seeked to the same
    // angle — keeps the visual continuous across speed changes.
    const oldEffect = this.rotation.effect as KeyframeEffect | null;
    const oldDurMs = (oldEffect?.getTiming().duration as number) || newDurMs || newDurMs;
    const oldTime = (this.rotation.currentTime as number) ?? 0;
    const ratio = (((oldTime % oldDurMs) + oldDurMs) % oldDurMs) / oldDurMs;

    this.rotation.cancel();
    this.rotation = this.spinEl().nativeElement.animate(
      [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
      { duration: newDurMs, iterations: Infinity, easing: 'linear' }
    );
    this.rotation.currentTime = ratio * newDurMs;
  }
}

export type { WrCircularTextHover } from './interfaces';
