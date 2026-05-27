/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the CircularText effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/text-animations/circular-text
 *
 * The reactbits version uses `motion/react`. This port is pure CSS — a
 * keyframe rotates the whole host; hover swaps the animation duration
 * (or pauses it / scales the host) per `[onHover]` mode.
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

export type WrCircularTextHover = 'speedUp' | 'slowDown' | 'pause' | 'goBonkers' | null;

const num =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

interface Char {
  readonly ch: string;
  readonly transform: string;
}

/**
 * Text laid out around a circle, with the whole circle spinning on a
 * keyframe. Hover behaviour swaps the spin rate (or pauses) without
 * resetting the rotation angle.
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-circular-text',
    '[class.wr-circular-text--speed-up]': "onHover() === 'speedUp'",
    '[class.wr-circular-text--slow-down]': "onHover() === 'slowDown'",
    '[class.wr-circular-text--pause]': "onHover() === 'pause'",
    '[class.wr-circular-text--bonkers]': "onHover() === 'goBonkers'",
    '[style.--wr-circular-text-duration]': "spinDuration() + 's'",
  },
})
export class WrCircularText {
  /** Text to lay out around the circle. */
  readonly text = input.required<string>();

  /** Seconds per full revolution at rest. @default 20 */
  readonly spinDuration = input(20, { transform: num(20) });

  /** Hover behaviour. `null` disables hover reactivity. @default 'speedUp' */
  readonly onHover = input<WrCircularTextHover>('speedUp');

  protected readonly chars = computed<readonly Char[]>(() => {
    const letters = Array.from(this.text());
    const len = letters.length;
    if (len === 0) return [];
    return letters.map((ch, i) => {
      const rotation = (360 / len) * i;
      // Rotate around the host's centre, then push each char outward by
      // the orbit radius (set via CSS var). All chars end up on a circle
      // of constant radius — not a diagonal line.
      const transform = `rotate(${rotation}deg) translateY(calc(-1 * var(--wr-circular-text-radius)))`;
      return { ch, transform };
    });
  });
}
