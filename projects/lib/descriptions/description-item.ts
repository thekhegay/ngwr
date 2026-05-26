/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

/**
 * One row in a {@link WrDescriptions}. The label comes from the
 * `label` input; the value is the projected content.
 */
@Component({
  selector: 'wr-description-item',
  template:
    '<dt class="wr-descriptions__label">{{ label() }}</dt><dd class="wr-descriptions__value"><ng-content /></dd>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-descriptions__row' },
})
export class WrDescriptionItem {
  readonly label = input<string>('');
}
