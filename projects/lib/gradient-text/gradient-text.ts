/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the GradientText effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/text-animations/gradient-text
 *
 * The reactbits version uses `motion/react` to drive `background-position`
 * via rAF. This port is pure CSS — same effect via keyframes on
 * `background-position`, parameterised by inputs.
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

const DEFAULT_COLORS: readonly string[] = ['#5227FF', '#FF9FFC', '#B497CF'];

const num =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

/**
 * Animated multi-stop gradient text. The gradient slides across the text
 * via `background-clip: text`. Optional `[showBorder]` wraps the text in
 * a dark pill with the same animated gradient as a border ring.
 *
 * @example
 * ```html
 * <wr-gradient-text>Hello, ngwr!</wr-gradient-text>
 * <wr-gradient-text
 *   [colors]="['#5227FF', '#FF9FFC', '#B497CF']"
 *   direction="diagonal"
 *   [animationSpeed]="6"
 *   [showBorder]="true"
 * >
 *   Premium feature
 * </wr-gradient-text>
 * ```
 *
 * @see https://www.reactbits.dev/text-animations/gradient-text
 */
@Component({
  selector: 'wr-gradient-text',
  templateUrl: './gradient-text.html',
  styleUrl: './gradient-text.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-gradient-text',
    '[class.wr-gradient-text--border]': 'showBorder()',
    '[class.wr-gradient-text--pause-on-hover]': 'pauseOnHover()',
    '[class.wr-gradient-text--yoyo]': 'yoyo()',
    '[class.wr-gradient-text--vertical]': "direction() === 'vertical'",
    '[class.wr-gradient-text--diagonal]': "direction() === 'diagonal'",
    '[style.--wr-gradient-text-image]': 'gradient()',
    '[style.--wr-gradient-text-size]': 'size()',
    '[style.--wr-gradient-text-duration]': "animationSpeed() + 's'",
  },
})
export class WrGradientText {
  /** Gradient stops. @default ['#5227FF', '#FF9FFC', '#B497CF'] */
  readonly colors = input<readonly string[]>(DEFAULT_COLORS);

  /** Seconds per full sweep (or per half if `[yoyo]` is on). @default 8 */
  readonly animationSpeed = input(8, { transform: num(8) });

  /** Wrap the text in a dark pill with the gradient as a border. @default false */
  readonly showBorder = input(false, { transform: coerceBooleanProperty });

  /** Gradient slide direction. @default 'horizontal' */
  readonly direction = input<WrGradientTextDirection>('horizontal');

  /** Pause the animation while hovered. @default false */
  readonly pauseOnHover = input(false, { transform: coerceBooleanProperty });

  /** Bounce back-and-forth instead of restarting. @default true */
  readonly yoyo = input(true, { transform: coerceBooleanProperty });

  protected readonly gradient = computed(() => {
    const cols = this.colors().length > 0 ? this.colors() : DEFAULT_COLORS;
    // Duplicate the first colour at the end for seamless looping.
    const stops = [...cols, cols[0]].join(', ');
    const angle = this.directionAngle();
    return `linear-gradient(${angle}, ${stops})`;
  });

  protected readonly size = computed(() => {
    switch (this.direction()) {
      case 'vertical':
        return '100% 300%';
      case 'diagonal':
        return '300% 300%';
      case 'horizontal':
      default:
        return '300% 100%';
    }
  });

  private directionAngle(): string {
    switch (this.direction()) {
      case 'vertical':
        return 'to bottom';
      case 'diagonal':
        return 'to bottom right';
      case 'horizontal':
      default:
        return 'to right';
    }
  }
}

export type WrGradientTextDirection = 'horizontal' | 'vertical' | 'diagonal';
