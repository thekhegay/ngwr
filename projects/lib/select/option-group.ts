/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, input } from '@angular/core';

import { randomId } from 'ngwr/utils';

/**
 * Visually groups options under a label inside a `<wr-select>`.
 *
 * @example
 * ```html
 * <wr-option-group label="Sizes">
 *   <wr-option value="sm">Small</wr-option>
 *   <wr-option value="md">Medium</wr-option>
 * </wr-option-group>
 * ```
 */
@Component({
  selector: 'wr-option-group',
  templateUrl: './option-group.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-option-group', role: 'group', '[attr.aria-labelledby]': 'labelId' },
})
export class WrOptionGroup {
  /** Section heading shown above the options. */
  readonly label = input.required<string>();

  /**
   * `role="group"` alone announces an unnamed group — the visible heading has to
   * be wired to it for the name to reach a screen reader.
   */
  protected readonly labelId = randomId('wr-option-group-label');
}
