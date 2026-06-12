/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the ShinyText effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/text-animations/shiny-text
 *
 * The reactbits version uses `motion/react` to drive `background-position`
 * via rAF. This port is pure CSS — the same effect via a keyframe that
 * sweeps `background-position`, parameterised by `[speed]` / `[delay]` /
 * `[yoyo]` / `[direction]`.
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import { numAttr } from 'ngwr/utils';

/**
 * Animated shimmer-over-text effect. A bright stripe sweeps across the
 * text using `background-clip: text` + an animated `background-position`.
 *
 * @example
 * ```html
 * <wr-shiny-text text="Premium" />
 * <wr-shiny-text
 *   text="Custom"
 *   color="#444"
 *   shineColor="#a0e0ff"
 *   [speed]="3"
 *   [delay]="0.5"
 *   [yoyo]="true"
 *   [pauseOnHover]="true"
 * />
 * ```
 *
 * @see https://www.reactbits.dev/text-animations/shiny-text
 */
@Component({
  selector: 'wr-shiny-text',
  template: '{{ text() }}',
  styleUrl: './shiny-text.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-shiny-text',
    '[class.wr-shiny-text--paused]': 'disabled()',
    '[class.wr-shiny-text--pause-on-hover]': 'pauseOnHover()',
    '[class.wr-shiny-text--yoyo]': 'yoyo()',
    '[class.wr-shiny-text--reverse]': "direction() === 'right'",
    '[style.background-image]': 'gradient()',
    '[style.animation-duration]': "totalDuration() + 's'",
  },
})
export class WrShinyText {
  /** Text to render. */
  readonly text = input.required<string>();

  /** Pause the animation. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Time for the bright stripe to traverse the text, in seconds. @default 2 */
  readonly speed = input(2, { transform: numAttr(2) });

  /** Base text colour (outside the bright stripe). @default '#b5b5b5' */
  /** Base text colour. When unset, the theme decides. */
  readonly color = input<string | null>(null);

  /** Bright stripe colour. @default '#ffffff' */
  /** Sweep highlight colour. When unset, the theme decides. */
  readonly shineColor = input<string | null>(null);

  /** Gradient angle in degrees. @default 120 */
  readonly spread = input(120, { transform: numAttr(120) });

  /** Bounce the stripe back-and-forth instead of restarting. @default false */
  readonly yoyo = input(false, { transform: coerceBooleanProperty });

  /** Pause the animation while hovered. @default false */
  readonly pauseOnHover = input(false, { transform: coerceBooleanProperty });

  /** Sweep direction. @default 'left' */
  readonly direction = input<'left' | 'right'>('left');

  /** Pause between sweeps in seconds. @default 0 */
  readonly delay = input(0, { transform: numAttr(0) });

  /** Total animation cycle (speed + delay) in seconds. */
  protected readonly totalDuration = computed(() => this.speed() + this.delay());

  protected readonly gradient = computed(() => {
    const base = this.color() ?? 'var(--wr-shiny-text-base)';
    const shine = this.shineColor() ?? 'var(--wr-shiny-text-shine)';
    return `linear-gradient(${this.spread()}deg, ${base} 0%, ${base} 35%, ${shine} 50%, ${base} 65%, ${base} 100%)`;
  });
}
