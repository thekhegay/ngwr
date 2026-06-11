/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the StarBorder effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/animations/star-border
 *
 * Extends the original with `mode` (always animating vs hover-only) and
 * `rays` (mirrored pair vs a single ray).
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, input } from '@angular/core';

const num =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

/** When the rays animate. */
export type WrStarBorderMode = 'infinite' | 'hover';

/** Ray layout — both edges (reactbits default) or just the bottom one. */
export type WrStarBorderRays = 'mirror' | 'single';

/**
 * Star border — radial "comet" rays orbiting the top and bottom edges of
 * a rounded container. Project any content; it sits on a themed inner
 * panel above the rays.
 *
 * Works as an element or as an attribute on buttons / links.
 *
 * @example
 * ```html
 * <wr-star-border>Star border</wr-star-border>
 * <button wr-star-border mode="hover" rays="single">Hover me</button>
 * ```
 *
 * @see https://ngwr.dev/animations/star-border
 */
@Component({
  selector: 'wr-star-border, [wr-star-border]',
  templateUrl: './star-border.html',
  styleUrl: './star-border.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[style.--wr-star-border-color]': 'color()',
    '[style.--wr-star-border-speed]': 'speed() + "s"',
    '[style.padding]': 'thickness() + "px 0"',
  },
})
export class WrStarBorder {
  /** Ray colour. When unset, the theme decides: primary on light, white on dark. */
  readonly color = input<string | null>(null);

  /** Seconds per ray sweep. @default 6 */
  readonly speed = input(6, { transform: num(6) });

  /** Vertical bleed of the rays past the inner panel, in px. @default 1 */
  readonly thickness = input(1, { transform: num(1) });

  /** `'infinite'` animates always; `'hover'` only while hovered. @default 'infinite' */
  readonly mode = input<WrStarBorderMode>('infinite');

  /** `'mirror'` runs rays along both edges; `'single'` only the bottom. @default 'mirror' */
  readonly rays = input<WrStarBorderRays>('mirror');

  protected readonly classes = (): string => {
    const parts = ['wr-star-border'];
    if (this.mode() === 'hover') parts.push('wr-star-border--hover');
    if (this.rays() === 'single') parts.push('wr-star-border--single');
    return parts.join(' ');
  };
}
