/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

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
  templateUrl: './option-group.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-option-group', role: 'group' },
})
export class WrOptionGroupComponent {
  /** Section heading shown above the options. */
  readonly label = input.required<string>();
}
