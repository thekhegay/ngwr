/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import { useI18nText } from 'ngwr/i18n';

/** Escape a string for use inside a double-quoted CSS `<string>`. */
function cssString(value: string): string {
  return value.replace(/[\\"]/g, '\\$&').replace(/[\n\r\f]/g, char => `\\${char.codePointAt(0)!.toString(16)} `);
}

/**
 * Breadcrumb navigation. Project `<wr-breadcrumbs-item>` children — each keeps
 * its own element and takes `role="listitem"` inside the `<ol>` rather than
 * rendering an `<li>`, separated by the configured glyph (default `/`). The
 * container exposes the `nav[aria-label]` landmark required by WCAG.
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
 * @see https://ngwr.dev/reference/components/breadcrumbs
 */
@Component({
  selector: 'wr-breadcrumbs',
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-breadcrumbs',
    '[style.--wr-breadcrumbs-separator]': 'separatorValue()',
  },
})
export class WrBreadcrumbs {
  /** Separator glyph between items. Any short string. @default '/' */
  readonly separator = input('/');

  /**
   * Accessible label for the `nav` landmark. Falls back to `breadcrumbs.label`,
   * then `'Breadcrumbs'`.
   */
  readonly ariaLabel = input<string | null>(null);

  // The English default used to live on the input itself, which made this the one
  // landmark in the library a catalog could not reach: `wr-anchor` and `wr-sidebar`
  // announced in Russian on the same page while this one stayed "Breadcrumbs", and
  // the only escape was restating `[ariaLabel]` on every trail.
  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'breadcrumbs.label', 'Breadcrumbs');

  // The glyph is WRAPPED in quotes here and unwrapped by `content:` in the
  // stylesheet, so an unescaped `"` inside it closes the library's own string
  // and the rest of the value is parsed as CSS — `/" url("…") "` computes to
  // `content: "/" url("…") ""`, an image the browser fetches. Escaping is the
  // whole fix, and it is lossless: a separator that IS a quote still renders.
  protected readonly separatorValue = computed(() => `"${cssString(this.separator())}"`);
}
