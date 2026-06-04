/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, input } from '@angular/core';

import { provideWrIcons, WrIcon, type WrIconName, folder } from 'ngwr/icon';

/**
 * Empty-state placeholder. Drop into any container where the underlying
 * data is missing (search yielded nothing, table is empty, etc.).
 *
 * Slots:
 *
 * - **Default** — primary description / instructions.
 * - **`[wrEmptyActions]`** — action row rendered below the description.
 *
 * @example
 * ```html
 * <wr-empty icon="search" title="No results">
 *   Try a different query or clear filters.
 *   <ng-container wrEmptyActions>
 *     <wr-btn (click)="reset()">Reset filters</wr-btn>
 *   </ng-container>
 * </wr-empty>
 * ```
 *
 * @see https://ngwr.dev/docs/components/empty
 */
@Component({
  selector: 'wr-empty',
  templateUrl: './empty.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-empty', role: 'status' },
  imports: [WrIcon],
  providers: [provideWrIcons([folder])],
})
export class WrEmpty {
  /** Icon name shown above the title. @default 'folder' */
  readonly icon = input<WrIconName | null>('folder');

  /** Headline. @default 'No data' */
  readonly title = input<string>('No data');
}
