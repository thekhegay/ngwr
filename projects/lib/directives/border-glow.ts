/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { Directive, computed, input } from '@angular/core';

const numAttr =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

/**
 * Rotating conic-gradient border glow. Adds the `wr-border-glow` host class
 * plus three CSS custom properties:
 *
 * - `--wr-border-glow-speed` (animation duration, default `6s`)
 * - `--wr-border-glow-thickness` (border width in px, default `1.5`)
 * - `--wr-border-glow-colors` (the gradient stops; override for custom palettes)
 *
 * Styling lives in `ngwr/animations` — make sure that opt-in stylesheet is
 * loaded for the keyframe + mask machinery.
 *
 * @example
 * ```html
 * <div wrBorderGlow [speed]="8" [thickness]="2">…</div>
 * ```
 */
@Directive({
  selector: '[wrBorderGlow]',
  host: {
    class: 'wr-border-glow',
    '[style.--wr-border-glow-speed]': 'cssSpeed()',
    '[style.--wr-border-glow-thickness]': 'cssThickness()',
  },
})
export class WrBorderGlow {
  /** Animation cycle length in seconds. @default 6 */
  readonly speed = input(6, { transform: numAttr(6) });

  /** Border thickness in pixels. @default 1.5 */
  readonly thickness = input(1.5, { transform: numAttr(1.5) });

  protected readonly cssSpeed = computed(() => `${this.speed()}s`);
  protected readonly cssThickness = computed(() => `${this.thickness()}px`);
}
