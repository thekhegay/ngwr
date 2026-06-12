/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Directive, computed, input } from '@angular/core';

import type { WrTypographyAlign, WrTypographyTone, WrTypographyVariant } from './interfaces';

/**
 * Semantic typography directive. Attaches to any native element and
 * applies the visual treatment for the chosen `variant` (`h1`–`h6`,
 * `display`, `lead`, `body`, `small`, `caption`, `overline`, `code`).
 *
 * Reads from the same `--wr-text-*` / `--wr-font-weight-*` / `--wr-leading-*`
 * tokens used by the opt-in typography utility classes — themeable by
 * overriding tokens at `:root`.
 *
 * @example
 * ```html
 * <h1 wrTypography variant="display">Build interfaces</h1>
 * <h2 wrTypography variant="h2" tone="primary">that feel alive.</h2>
 * <p wrTypography variant="lead">A developer-first library.</p>
 * <span wrTypography variant="caption" tone="medium">v1.6.0 — released today</span>
 * <code wrTypography variant="code">inject(WrTheme)</code>
 * ```
 *
 * @see https://ngwr.dev/typography/overview
 */
@Directive({
  selector: '[wrTypography]',
  host: { '[class]': 'classes()' },
})
export class WrTypography {
  /** Visual variant. @default 'body' */
  readonly variant = input<WrTypographyVariant>('body');

  /**
   * Color tone. `null` (default) keeps the variant's own color — the base
   * dark for headings/body, medium for lead/caption, primary for links.
   */
  readonly tone = input<WrTypographyTone | null>(null);

  /** Horizontal alignment. */
  readonly align = input<WrTypographyAlign | null>(null);

  /** Truncate to single line with ellipsis. @default false */
  readonly truncate = input(false, { transform: coerceBooleanProperty });

  /** Render with monospace font. @default false (auto-true for `code`) */
  readonly mono = input(false, { transform: coerceBooleanProperty });

  protected readonly classes = computed(() => {
    const parts = ['wr-typography', `wr-typography--${this.variant()}`];
    const tone = this.tone();
    if (tone) parts.push(`wr-typography--tone-${tone}`);
    const align = this.align();
    if (align) parts.push(`wr-typography--align-${align}`);
    if (this.truncate()) parts.push('wr-typography--truncate');
    if (this.mono() || this.variant() === 'code') parts.push('wr-typography--mono');
    return parts.join(' ');
  });
}
