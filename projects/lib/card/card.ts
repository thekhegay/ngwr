/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

/**
 * Surface container with optional header, body, and footer slots.
 *
 * Compose with `<wr-card-header>`, the projected body content, and
 * `<wr-card-footer>`. Each slot is a tiny component that just projects
 * its content under the matching BEM class — consumers keep full control
 * of the markup inside.
 *
 * @example Basic
 * ```html
 * <wr-card>
 *   <wr-card-header>
 *     <h3>Settings</h3>
 *   </wr-card-header>
 *   <p>Body content.</p>
 *   <wr-card-footer>
 *     <button wr-btn>Save</button>
 *   </wr-card-footer>
 * </wr-card>
 * ```
 *
 * @see https://ngwr.dev/components/card
 */
@Component({
  selector: 'wr-card',
  templateUrl: './card.html',
  styleUrl: './card.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[attr.aria-busy]': 'loading() ? true : null',
  },
})
export class WrCard {
  /** Render a 1px border around the surface. @default true */
  readonly bordered = input(true, { transform: coerceBooleanProperty });

  /** Lift / shadow the card on hover. @default false */
  readonly hoverable = input(false, { transform: coerceBooleanProperty });

  /** Overlay with a centred spinner — for in-place data loads. @default false */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /** Compact paddings — half the default vertical / horizontal spacing. @default false */
  readonly compact = input(false, { transform: coerceBooleanProperty });

  protected readonly classes = computed(() => {
    const parts = ['wr-card'];
    if (this.bordered()) parts.push('wr-card--bordered');
    if (this.hoverable()) parts.push('wr-card--hoverable');
    if (this.loading()) parts.push('wr-card--loading');
    if (this.compact()) parts.push('wr-card--compact');
    return parts.join(' ');
  });
}

/** Header slot — projects content under `.wr-card__header`. */
@Component({
  selector: 'wr-card-header',
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-card__header' },
})
export class WrCardHeader {}

/** Footer slot — projects content under `.wr-card__footer`. */
@Component({
  selector: 'wr-card-footer',
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-card__footer' },
})
export class WrCardFooter {}
