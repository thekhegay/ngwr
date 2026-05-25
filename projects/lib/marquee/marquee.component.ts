/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

export type WrMarqueeDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Infinite scrolling marquee. Project content (logos, cards, text) once;
 * the component duplicates the row so the loop is seamless.
 *
 * @example
 * ```html
 * <wr-marquee>
 *   @for (logo of logos; track logo) {
 *     <img [src]="logo" alt="" />
 *   }
 * </wr-marquee>
 *
 * <wr-marquee direction="right" speed="40" pauseOnHover>…</wr-marquee>
 * ```
 *
 * @see https://ngwr.dev/docs/components/marquee
 */
@Component({
  selector: 'wr-marquee',
  templateUrl: './marquee.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()', '[style.--wr-marquee-duration]': 'durationStyle()' },
})
export class WrMarqueeComponent {
  /** Direction of travel. @default 'left' */
  readonly direction = input<WrMarqueeDirection>('left');

  /** Seconds for one full loop. Lower = faster. @default 20 */
  readonly speed = input(20, { transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 20)) });

  /** Pause the animation while the host is hovered. @default true */
  readonly pauseOnHover = input(true, { transform: coerceBooleanProperty });

  /** Gap between content + its mirror copy (any CSS length). @default '2rem' */
  readonly gap = input<string>('2rem');

  protected readonly classes = computed(() => {
    const parts = ['wr-marquee', `wr-marquee--${this.direction()}`];
    if (this.pauseOnHover()) parts.push('wr-marquee--pause-on-hover');
    return parts.join(' ');
  });

  protected readonly durationStyle = computed(() => `${this.speed()}s`);
  protected readonly gapStyle = computed(() => this.gap());
}
