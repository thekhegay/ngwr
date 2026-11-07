/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, input } from '@angular/core';

import { wrCheckStyles } from 'ngwr/utils';

/**
 * Top-of-page heading block. Four named slots via attribute selectors:
 * `[wrPageHeaderBreadcrumbs]` (top row), `[wrPageHeaderActions]` (right
 * side), `[wrPageHeaderExtra]` (row of tags / metadata) and
 * `[wrPageHeaderFilters]` (a last row of controls, full width, wrapping; present
 * only when projected). Title + subtitle come from inputs.
 *
 * `compact` puts the breadcrumbs beside the title on one line and the subtitle
 * after it, with a smaller title. The line wraps when there is no room: long
 * crumbs wrap inside their own box, and the title drops below them once less
 * than 16rem is left beside them. `responsive` works the same with and without
 * it.
 *
 * `sticky` keeps the header in view while the page scrolls: CSS
 * `position: sticky` at `--wr-page-header-sticky-top` (default `0`; set it to
 * your app bar's height to sit under it), `z-index` from
 * `--wr-page-header-sticky-z`, an opaque `--wr-page-header-sticky-bg`. Sticky
 * pins against the nearest ancestor that scrolls, and an ancestor with
 * `overflow: hidden` (or `auto`, `scroll`, `clip` on either axis) is that
 * ancestor even when it never scrolls: the header then sticks inside a box that
 * does not move, which reads as sticky doing nothing. Keep every ancestor between
 * the header and the scroller at `overflow: visible`.
 *
 * A sticky header covers the top of the scroller, and the browser scrolls a
 * newly focused element only until it is inside the scrollport, so a control
 * tabbed to from above can land under the header. The component cannot set
 * `scroll-padding` on a scroller it does not own: set
 * `scroll-padding-block-start` on the scroller (`html` for the page) to the
 * header's height plus `--wr-page-header-sticky-top`, and focus, anchors and
 * `scrollIntoView()` all stop short of it.
 *
 * A bare `<div>` wrapper in the actions or the filters slot, one with no `class`
 * and no `style`, is laid out as a wrapping row with the region's own gap, so
 * the controls inside it are spaced exactly like controls projected one by one.
 * The gap follows `--wr-density-gap`. Give the wrapper a class or a style and
 * its layout is yours: the header sets nothing on it. The extra row spaces its
 * own children and leaves a wrapper alone, since that is where metadata prose
 * goes, so project tags through an `<ng-container>` as below.
 *
 * @example
 * ```html
 * <wr-page-header title="Settings" subtitle="Manage your workspace" compact sticky>
 *   <nav wrPageHeaderBreadcrumbs>…</nav>
 *   <div wrPageHeaderActions>
 *     <button wr-btn>Invite</button>
 *     <button wr-btn color="primary">Save</button>
 *   </div>
 *   <ng-container wrPageHeaderExtra>
 *     <wr-tag>v2.4</wr-tag>
 *     <wr-tag color="success">Stable</wr-tag>
 *   </ng-container>
 *   <div wrPageHeaderFilters>
 *     <wr-select placeholder="Status" />
 *     <wr-input placeholder="Search" />
 *   </div>
 * </wr-page-header>
 * ```
 *
 * @see https://ngwr.dev/reference/components/page-header
 */
@Component({
  selector: 'wr-page-header',
  templateUrl: './page-header.html',
  encapsulation: ViewEncapsulation.None,
  // See `WrAlert`: a static `title=` feeds the input AND lands on the host,
  // where the browser draws it as a tooltip over the whole component.
  host: {
    class: 'wr-page-header',
    '[class.wr-page-header--responsive]': 'responsive()',
    '[class.wr-page-header--compact]': 'compact()',
    '[class.wr-page-header--sticky]': 'sticky()',
    '[attr.title]': 'null',
  },
})
export class WrPageHeader {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('page-header');
  }

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

  /**
   * One-line head: the breadcrumbs beside the title instead of above it, the
   * subtitle after the title, a smaller title. Wraps when there is no room.
   * @default false
   */
  readonly compact = input(false, { transform: coerceBooleanProperty });

  /**
   * Keep the header in view while the page scrolls (`position: sticky` at
   * `--wr-page-header-sticky-top`, under `--wr-page-header-sticky-z`).
   * @default false
   */
  readonly sticky = input(false, { transform: coerceBooleanProperty });
}
