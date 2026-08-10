/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, input } from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { WrIcon, type WrIconName } from 'ngwr/icon';

/**
 * Empty-state placeholder. Drop into any container where the underlying
 * data is missing (search yielded nothing, table is empty, etc.).
 *
 * Slots:
 *
 * - **Default** — primary description / instructions.
 * - **`[wrEmptyActions]`** — action row rendered below the description.
 *
 * Localization: the default headline reads from the `empty.noData` key in
 * the registered `WrI18n` catalog, falling back to `'No data'` when no
 * `WrI18n` is provided. The `[title]` input always wins when set.
 *
 * @example
 * ```html
 * <wr-empty iconName="search" title="No results">
 *   Try a different query or clear filters.
 *   <ng-container wrEmptyActions>
 *     <wr-btn (click)="reset()">Reset filters</wr-btn>
 *   </ng-container>
 * </wr-empty>
 * ```
 *
 * @see https://ngwr.dev/reference/components/empty
 */
@Component({
  selector: 'wr-empty',
  templateUrl: './empty.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-empty', role: 'status' },
  imports: [WrIcon],
})
export class WrEmpty {
  /**
   * Render the built-in folder glyph. Pass `false` to show no icon at all.
   * Ignored when `iconName` is set — the same contract as `<wr-alert>`.
   *
   * This used to be typed as an icon NAME, which it never was: whatever name
   * you passed, the template drew the folder. Any truthy value still shows it,
   * so nothing that compiled before behaves differently.
   *
   * @default true
   */
  readonly icon = input(true, { transform: coerceBooleanProperty });

  /**
   * Show any registered ngwr icon instead of the built-in glyph.
   *
   * @default null
   */
  readonly iconName = input<WrIconName | null>(null);

  /** Headline. Falls back to `empty.noData` from WrI18n, then `'No data'`. */
  readonly title = input<string | null>(null);

  protected readonly resolvedTitle = useI18nText(this.title, 'empty.noData', 'No data');
}
