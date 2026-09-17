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
 * A bare `<div>` wrapper in the actions slot, one with no `class` and no
 * `style`, is laid out as a wrapping row with the actions region's own gap, so
 * the buttons inside it are spaced exactly like buttons projected one by one.
 * The gap follows `--wr-density-gap`. Give the wrapper a class or a style and
 * its layout is yours: the header sets nothing on it. The extra row spaces its
 * own children and leaves a wrapper alone, since that is where metadata prose
 * goes, so project tags through an `<ng-container>` as below.
 *
 * @example
 * ```html
 * <wr-page-header title="Settings" subtitle="Manage your workspace">
 *   <nav wrPageHeaderBreadcrumbs>…</nav>
 *   <div wrPageHeaderActions>
 *     <button wr-btn>Invite</button>
 *     <button wr-btn color="primary">Save</button>
 *   </div>
 *   <ng-container wrPageHeaderExtra>
 *     <wr-tag>v2.4</wr-tag>
 *     <wr-tag color="success">Stable</wr-tag>
 *   </ng-container>
 * </wr-page-header>
 * ```
 *
 * @see https://ngwr.dev/reference/components/page-header
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
