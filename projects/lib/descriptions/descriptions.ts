/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import { wrCheckStyles } from 'ngwr/utils';

/**
 * Read-only labeled key / value list. Project `<wr-description-item>`
 * children. `title` is optional. Default layout stacks vertically; set
 * `[inline]="true"` for label-left / value-right rows, and `columns` for a
 * grid of several items per row.
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
 * @see https://ngwr.dev/reference/components/descriptions
 */
@Component({
  selector: 'wr-descriptions',
  templateUrl: './descriptions.html',
  encapsulation: ViewEncapsulation.None,
  // See `WrAlert`: a static `title=` feeds the input AND lands on the host,
  // where the browser draws it as a tooltip over the whole component.
  host: {
    class: 'wr-descriptions',
    '[class]': 'classes()',
    '[attr.title]': 'null',
    '[style.--wr-descriptions-columns]': 'grid() ? columns() : null',
  },
})
export class WrDescriptions {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('descriptions');
  }

  /** Optional title shown above the list. */
  readonly title = input<string>('');

  /** Two-column rows (label left, value right) instead of stacked. @default false */
  readonly inline = input(false, { transform: coerceBooleanProperty });

  /** Add visible borders around each row. @default false */
  readonly bordered = input(false, { transform: coerceBooleanProperty });

  /**
   * Reflow `inline` rows back to a stacked layout, and a `columns` grid back
   * to one column, when the box itself is narrow (a container query on its
   * own width, not the viewport — so it adapts inside a narrow card or side
   * panel). Makes the box fill its container's width. @default false
   */
  readonly responsive = input(false, { transform: coerceBooleanProperty });

  /**
   * How many items a row holds, as equal columns. An item takes more of them
   * with its `span`.
   *
   * @default 1
   */
  readonly columns = input(1, {
    transform: (value: unknown): number => Math.max(1, Math.floor(coerceNumberProperty(value, 1))),
  });

  protected readonly grid = computed(() => this.columns() > 1);

  protected readonly classes = computed(() => {
    const parts: string[] = [];
    if (this.inline()) parts.push('wr-descriptions--inline');
    if (this.bordered()) parts.push('wr-descriptions--bordered');
    if (this.responsive()) parts.push('wr-descriptions--responsive');
    if (this.grid()) parts.push('wr-descriptions--columns');
    return parts.join(' ');
  });
}
