/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ElementRef, ViewEncapsulation, afterEveryRender, computed, inject, input } from '@angular/core';

import type { WrColor } from 'ngwr/theme';

import type { WrDividerAlign, WrDividerType } from './interfaces';

/**
 * Horizontal separator line. Projected content renders as a label
 * inline with the line (split into two halves on either side).
 *
 * @example
 * ```html
 * <wr-divider />
 * <wr-divider type="dashed" color="primary" [width]="2" />
 * <wr-divider>OR</wr-divider>
 * <wr-divider align="start">Section</wr-divider>
 * ```
 *
 * @see https://ngwr.dev/reference/components/divider
 */
@Component({
  selector: 'wr-divider',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'separator',
    '[class]': 'classes()',
    '[style.--wr-divider-width.px]': 'width()',
  },
})
export class WrDivider {
  /**
   * Color of the divider line. Omit for the neutral default.
   *
   * @default null
   */
  readonly color = input<WrColor | null>(null);

  /**
   * Line style.
   *
   * @default 'solid'
   */
  readonly type = input<WrDividerType>('solid');

  /**
   * Line width in pixels.
   *
   * @default 1
   */
  readonly width = input(1, { transform: (v: unknown): number => coerceNumberProperty(v, 1) });

  /**
   * Label position. Only meaningful when the divider has projected
   * content — otherwise the line is symmetric and alignment has no
   * visible effect.
   *
   * @default 'center'
   */
  readonly align = input<WrDividerAlign>('center');

  protected readonly classes = computed(() => {
    const parts = ['wr-divider', `wr-divider--${this.type()}`];
    const color = this.color();
    if (color) parts.push(`wr-divider--${color}`);
    const align = this.align();
    if (align !== 'center') parts.push(`wr-divider--${align}`);
    return parts.join(' ');
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The consumer's own `aria-label`, resolved on the first sync — `undefined`
   * until then, which is how "not looked at yet" stays distinct from "they wrote
   * none".
   */
  private authored: string | null | undefined;

  constructor() {
    afterEveryRender(() => this.syncLabel());
  }

  /**
   * Name the separator with the label it projects.
   *
   * `role="separator"` makes the host's children presentational and a separator
   * takes its accessible name from the author alone — so `<wr-divider>OR</wr-divider>`
   * reaches assistive tech as an unnamed rule while everyone else reads "OR".
   * Copying the label into `aria-label` is the only way to expose it without giving
   * up the role, and the two can never disagree because one is the source of the
   * other.
   *
   * Written to the DOM after every render rather than through a host binding, for
   * two reasons a binding cannot cover: the label is projected content, so an
   * interpolation or an `@if` can change it while the divider stays put; and a
   * binding resolving to `null` would strip an `aria-label` the consumer wrote
   * themselves — theirs is the author name already and is never touched.
   */
  private syncLabel(): void {
    const el = this.host.nativeElement;
    if (this.authored === undefined) this.authored = el.getAttribute('aria-label');
    if (this.authored !== null) return;

    const label = el.textContent?.trim();
    if (label) el.setAttribute('aria-label', label);
    else el.removeAttribute('aria-label');
  }
}
