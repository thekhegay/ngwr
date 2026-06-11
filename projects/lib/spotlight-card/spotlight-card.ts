/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the SpotlightCard effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/components/spotlight-card
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, ElementRef, inject, input } from '@angular/core';

/**
 * Cursor-tracked spotlight card. A soft radial highlight follows the
 * pointer inside the card; fades in on hover, out on leave.
 *
 * Project any content as children — the spotlight overlay sits behind
 * the projected DOM (via a `::before` pseudo with `pointer-events: none`)
 * so clicks pass through naturally.
 *
 * @example
 * ```html
 * <wr-spotlight-card spotlightColor="rgba(120, 180, 255, 0.25)">
 *   <h3>Hover me</h3>
 * </wr-spotlight-card>
 * ```
 *
 * @see https://www.reactbits.dev/components/spotlight-card
 */
@Component({
  selector: 'wr-spotlight-card',
  template: '<ng-content />',
  styleUrl: './spotlight-card.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-spotlight-card',
    '[style.--wr-spotlight-color]': 'spotlightColor()',
    '[style.--wr-spotlight-radius]': 'radius() + "%"',
    '(mousemove)': 'onMouseMove($event)',
  },
})
export class WrSpotlightCard {
  /**
   * Highlight colour (any CSS colour). When unset, the theme decides:
   * a soft dark tint on light surfaces, white-alpha on dark.
   */
  readonly spotlightColor = input<string | null>(null);

  /** Where the spotlight fades out, as a percentage of the gradient. @default 80 */
  readonly radius = input(80, { transform: (v: unknown): number => coerceNumberProperty(v, 80) });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  protected onMouseMove(event: MouseEvent): void {
    const host = this.el.nativeElement;
    const rect = host.getBoundingClientRect();
    host.style.setProperty('--wr-spotlight-x', `${event.clientX - rect.left}px`);
    host.style.setProperty('--wr-spotlight-y', `${event.clientY - rect.top}px`);
  }
}
