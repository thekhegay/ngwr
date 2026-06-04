/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, input } from '@angular/core';

/**
 * Breadcrumb navigation. Project `<wr-breadcrumb-item>` children — they
 * render as `<li>` rows inside an `<ol>`, separated by the configured
 * glyph (default `/`). The container exposes the `nav[aria-label]`
 * landmark required by WCAG.
 *
 * @example
 * ```html
 * <wr-breadcrumb>
 *   <wr-breadcrumb-item routerLink="/">Home</wr-breadcrumb-item>
 *   <wr-breadcrumb-item routerLink="/docs">Docs</wr-breadcrumb-item>
 *   <wr-breadcrumb-item>Current</wr-breadcrumb-item>
 * </wr-breadcrumb>
 *
 * <!-- Custom separator -->
 * <wr-breadcrumb separator="›">…</wr-breadcrumb>
 * ```
 *
 * @see https://ngwr.dev/components/breadcrumb
 */
@Component({
  selector: 'wr-breadcrumb',
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-breadcrumb',
    '[style.--wr-breadcrumb-separator]': "'\"' + separator() + '\"'",
  },
})
export class WrBreadcrumb {
  /** Separator glyph between items. Any short string. @default '/' */
  readonly separator = input('/');

  /** Accessible label for the `nav` landmark. @default 'Breadcrumb' */
  readonly ariaLabel = input('Breadcrumb');
}
