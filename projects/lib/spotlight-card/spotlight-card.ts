/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the SpotlightCard effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/components/spotlight-card
 */

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
    '(mousemove)': 'onMouseMove($event)',
  },
})
export class WrSpotlightCard {
  /** Highlight colour (any CSS colour). @default 'rgba(255, 255, 255, 0.25)' */
  readonly spotlightColor = input('rgba(255, 255, 255, 0.25)');

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  protected onMouseMove(event: MouseEvent): void {
    const host = this.el.nativeElement;
    const rect = host.getBoundingClientRect();
    host.style.setProperty('--wr-spotlight-x', `${event.clientX - rect.left}px`);
    host.style.setProperty('--wr-spotlight-y', `${event.clientY - rect.top}px`);
  }
}
