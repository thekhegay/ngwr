/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, input } from '@angular/core';

/**
 * One row in a {@link WrDescriptions}. The label comes from the
 * `label` input; the value is the projected content.
 */
@Component({
  selector: 'wr-description-item',
  template:
    '<div class="wr-descriptions__label" role="term">{{ label() }}</div>' +
    '<div class="wr-descriptions__value" role="definition"><ng-content /></div>',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-descriptions__row' },
})
export class WrDescriptionItem {
  readonly label = input<string>('');
}
