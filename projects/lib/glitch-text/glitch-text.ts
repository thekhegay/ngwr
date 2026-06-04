/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the GlitchText effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/text-animations/glitch-text
 *
 * Pure CSS — two `::before` / `::after` clones offset by ±10px with
 * coloured `text-shadow`s, both running a clip-path keyframe to slice
 * random horizontal bands.
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

const num =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

/**
 * Glitchy text effect — colour-split horizontal-tear glitch on the
 * provided text. Defaults to playing constantly; toggle `[enableOnHover]`
 * to make it idle until the user hovers.
 *
 * @example
 * ```html
 * <wr-glitch-text text="404" />
 * <wr-glitch-text text="ERROR" [speed]="0.5" [enableOnHover]="true" />
 * ```
 *
 * @see https://www.reactbits.dev/text-animations/glitch-text
 */
@Component({
  selector: 'wr-glitch-text',
  template: '{{ text() }}',
  styleUrl: './glitch-text.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-glitch-text',
    '[class.wr-glitch-text--hover-only]': 'enableOnHover()',
    '[attr.data-text]': 'text()',
    '[style.--wr-glitch-text-before-duration]': "(speed() * 2) + 's'",
    '[style.--wr-glitch-text-after-duration]': "(speed() * 3) + 's'",
    '[style.--wr-glitch-text-before-shadow]': 'beforeShadow()',
    '[style.--wr-glitch-text-after-shadow]': 'afterShadow()',
  },
})
export class WrGlitchText {
  /** Text to glitch. Required — the value populates `data-text` for the pseudo clones. */
  readonly text = input.required<string>();

  /** Time multiplier — higher = slower glitching. @default 1 */
  readonly speed = input(1, { transform: num(1) });

  /** Show the red / cyan colour-split shadows. @default true */
  readonly enableShadows = input(true, { transform: coerceBooleanProperty });

  /** Only glitch on hover (idle until then). @default true */
  readonly enableOnHover = input(true, { transform: coerceBooleanProperty });

  protected readonly beforeShadow = computed(() => (this.enableShadows() ? '5px 0 cyan' : 'none'));
  protected readonly afterShadow = computed(() => (this.enableShadows() ? '-5px 0 red' : 'none'));
}
