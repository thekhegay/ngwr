/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, inject, input } from '@angular/core';

import { wrCheckStyles } from 'ngwr/utils';

import { WrDescriptions } from './descriptions';

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
  host: { class: 'wr-descriptions__row', '[style.--wr-descriptions-span]': 'track()' },
})
export class WrDescriptionItem {
  private readonly list = inject(WrDescriptions, { optional: true });

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('descriptions');
  }

  /**
   * The term shown beside the projected value — "Email", "Created". Keep it a
   * noun: it is read as the name of the value, not as a sentence.
   */
  readonly label = input<string>('');

  /**
   * Columns the item takes in a list with `columns`. A number above the
   * list's `columns` takes the whole row.
   *
   * @default 1
   */
  readonly span = input(1, {
    transform: (value: unknown): number => Math.max(1, Math.floor(coerceNumberProperty(value, 1))),
  });

  protected readonly track = computed(() => {
    const span = Math.min(this.span(), this.list?.columns() ?? 1);
    return span > 1 ? span : null;
  });
}
