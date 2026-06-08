/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, input } from '@angular/core';

/**
 * Breadcrumb navigation. Project `<wr-breadcrumbs-item>` children — they
 * render as `<li>` rows inside an `<ol>`, separated by the configured
 * glyph (default `/`). The container exposes the `nav[aria-label]`
 * landmark required by WCAG.
 *
 * @example
 * ```html
 * <wr-breadcrumbs>
 *   <wr-breadcrumbs-item routerLink="/">Home</wr-breadcrumbs-item>
 *   <wr-breadcrumbs-item routerLink="/docs">Docs</wr-breadcrumbs-item>
 *   <wr-breadcrumbs-item>Current</wr-breadcrumbs-item>
 * </wr-breadcrumbs>
 *
 * <!-- Custom separator -->
 * <wr-breadcrumbs separator="›">…</wr-breadcrumbs>
 * ```
 *
 * @see https://ngwr.dev/components/breadcrumbs
 */
@Component({
  selector: 'wr-breadcrumbs',
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-breadcrumbs',
    '[style.--wr-breadcrumbs-separator]': "'\"' + separator() + '\"'",
  },
})
export class WrBreadcrumbs {
  /** Separator glyph between items. Any short string. @default '/' */
  readonly separator = input('/');

  /** Accessible label for the `nav` landmark. @default 'Breadcrumbs' */
  readonly ariaLabel = input('Breadcrumbs');
}
