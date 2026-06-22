/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

/**
 * Read-only labeled key / value list. Project `<wr-description-item>`
 * children. `title` is optional. Default layout stacks vertically; set
 * `[inline]="true"` for label-left / value-right rows.
 *
 * @example
 * ```html
 * <wr-descriptions title="Account" inline>
 *   <wr-description-item label="Name">Ada Lovelace</wr-description-item>
 *   <wr-description-item label="Email">ada@example.com</wr-description-item>
 *   <wr-description-item label="Joined">2024-03-12</wr-description-item>
 * </wr-descriptions>
 * ```
 *
 * @see https://ngwr.dev/components/descriptions
 */
@Component({
  selector: 'wr-descriptions',
  templateUrl: './descriptions.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrDescriptions {
  /** Optional title shown above the list. */
  readonly title = input<string>('');

  /** Two-column rows (label left, value right) instead of stacked. @default false */
  readonly inline = input(false, { transform: coerceBooleanProperty });

  /** Add visible borders around each row. @default false */
  readonly bordered = input(false, { transform: coerceBooleanProperty });

  /**
   * Reflow `inline` rows back to a stacked layout when the box itself is
   * narrow (a container query on its own width, not the viewport — so it
   * adapts inside a narrow card or side panel). Makes the box fill its
   * container's width. @default false
   */
  readonly responsive = input(false, { transform: coerceBooleanProperty });

  protected readonly classes = computed(() => {
    const parts = ['wr-descriptions'];
    if (this.inline()) parts.push('wr-descriptions--inline');
    if (this.bordered()) parts.push('wr-descriptions--bordered');
    if (this.responsive()) parts.push('wr-descriptions--responsive');
    return parts.join(' ');
  });
}
