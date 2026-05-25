/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

import { WrIconComponent, type WrIconName } from 'ngwr/icon';

export type WrBlockFeature = {
  readonly title: string;
  readonly description?: string;
  readonly icon?: WrIconName;
};

/**
 * Feature-grid section — N-column responsive layout with icon / title /
 * description per cell.
 *
 * @example
 * ```html
 * <wr-block-features
 *   title="Why pick ngwr"
 *   [features]="[
 *     { title: 'Signals-first', description: '…', icon: 'flash' },
 *     { title: 'Standalone', description: '…', icon: 'cube' }
 *   ]"
 * />
 * ```
 *
 * @see https://ngwr.dev/docs/components/blocks
 */
@Component({
  selector: 'wr-block-features',
  templateUrl: './features.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-block-features' },
  imports: [WrIconComponent],
})
export class WrBlockFeaturesComponent {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly features = input<readonly WrBlockFeature[]>([]);

  /** Columns at desktop width. @default 3 */
  readonly columns = input(3, {
    transform: (v: unknown): number => Math.min(6, Math.max(1, coerceNumberProperty(v, 3))),
  });

  protected readonly columnsStyle = computed(() => `repeat(${this.columns()}, minmax(0, 1fr))`);
}
