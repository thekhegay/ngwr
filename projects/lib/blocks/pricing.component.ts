/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, input, output } from '@angular/core';

export type WrBlockPricingTier = {
  readonly id: string;
  readonly name: string;
  readonly price: string;
  readonly priceSuffix?: string;
  readonly description?: string;
  readonly features: readonly string[];
  readonly highlighted?: boolean;
  readonly ctaLabel?: string;
};

/**
 * Pricing-tier card row. Pass an array of tiers; `(pick)` emits the id
 * when a tier's CTA is clicked.
 *
 * @example
 * ```html
 * <wr-block-pricing
 *   title="Simple pricing"
 *   [tiers]="tiers"
 *   (pick)="onChoosePlan($event)"
 * />
 * ```
 *
 * @see https://ngwr.dev/docs/components/blocks
 */
@Component({
  selector: 'wr-block-pricing',
  templateUrl: './pricing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-block-pricing' },
})
export class WrBlockPricingComponent {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly tiers = input<readonly WrBlockPricingTier[]>([]);

  /** Fires when a tier's CTA is clicked — emits the tier id. */
  readonly pick = output<string>();

  protected onPick(id: string): void {
    this.pick.emit(id);
  }
}
