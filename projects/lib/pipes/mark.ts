/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Pipe, type PipeTransform, inject } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

/** Escapes RegExp metacharacters so user input is safe to inline. @internal */
const RE_META = /[\\^$.*+?()[\]{}|]/g;

/** HTML-entities for the four chars that matter inside our `<mark>` wrap. @internal */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Wrap every occurrence of `query` in `<mark>` tags. Useful for highlighting
 * search-term matches in autocomplete results, lists, and table cells.
 *
 * The output is `SafeHtml` — bind with `[innerHTML]`. Input is escaped first
 * so user-supplied values can't inject markup.
 *
 * @example
 * ```html
 * <span [innerHTML]="row.name | wrMark: query()"></span>
 *
 * <!-- Case-sensitive: -->
 * <span [innerHTML]="row.name | wrMark: query() : true"></span>
 * ```
 */
@Pipe({ name: 'wrMark' })
export class WrMark implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  /**
   * @param value Source text.
   * @param query Search term to highlight. Empty/null skips the wrap.
   * @param caseSensitive Match exactly. @default false
   */
  transform(value: string | null | undefined, query: string | null | undefined, caseSensitive = false): SafeHtml {
    if (value === null || value === undefined) return '';
    const text = String(value);
    if (!query) return text;

    // Match the RAW text and escape the pieces afterwards, never the other way
    // round. Escaping first rewrites `&` as `&amp;`, and a query of `m` then lands
    // INSIDE that entity: the `<mark>` splits it and the browser paints the
    // entity's own letters, so `Tom & Jerry` renders as `Tom &amp; Jerry`. The
    // mirror failure is a match that can never happen — `<`, `>` and `"` no longer
    // exist in escaped text. The pipe's promise is untouched: every piece that came
    // from `value` still goes through `escapeHtml`, matched or not, so the only
    // tags in the output are the `<mark>`s built here.
    const pattern = new RegExp(`(${query.replace(RE_META, '\\$&')})`, caseSensitive ? 'g' : 'gi');
    const html = text
      .split(pattern)
      .map((part, index) => (index % 2 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)))
      .join('');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
