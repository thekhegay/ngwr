/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, input } from '@angular/core';

/**
 * Top-of-page heading block. Three named slots via attribute selectors:
 * `[wrPageHeaderBreadcrumbs]` (top row), `[wrPageHeaderActions]` (right
 * side), `[wrPageHeaderExtra]` (bottom row of tags / metadata). Title +
 * subtitle come from inputs.
 *
 * @example
 * ```html
 * <wr-page-header title="Settings" subtitle="Manage your workspace">
 *   <nav wrPageHeaderBreadcrumbs>…</nav>
 *   <div wrPageHeaderActions>
 *     <button wrButton>Invite</button>
 *     <button wrButton color="primary">Save</button>
 *   </div>
 *   <div wrPageHeaderExtra>
 *     <wr-tag>v2.4</wr-tag>
 *     <wr-tag color="success">Stable</wr-tag>
 *   </div>
 * </wr-page-header>
 * ```
 *
 * @see https://ngwr.dev/components/page-header
 */
@Component({
  selector: 'wr-page-header',
  templateUrl: './page-header.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-page-header', '[class.wr-page-header--responsive]': 'responsive()' },
})
export class WrPageHeader {
  /** Primary title shown as an h1. */
  readonly title = input<string>('');

  /** Secondary line below the title. */
  readonly subtitle = input<string>('');

  /**
   * Stack the title and actions vertically when the header's own box is too
   * narrow to sit them side by side (a container query on its own width, not
   * the viewport — so it adapts inside a narrow column or split pane).
   * @default false
   */
  readonly responsive = input(false, { transform: coerceBooleanProperty });
}
