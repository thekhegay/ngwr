/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

import type { WrTypographyAlign, WrTypographyTone, WrTypographyVariant } from './types';

/**
 * Semantic typography element. Renders a `<span>` by default and applies
 * the visual treatment for the chosen `variant` (e.g. `'h1'`, `'lead'`,
 * `'caption'`). Pair with `as` to switch the rendered tag without losing
 * the visual style.
 *
 * Reads from the same `--wr-text-*` / `--wr-font-weight-*` / `--wr-leading-*`
 * tokens used by the opt-in typography utility classes — themeable by
 * overriding tokens at `:root`.
 *
 * @example
 * ```html
 * <wr-typography variant="display">Build interfaces</wr-typography>
 * <wr-typography variant="h2" tone="primary">that feel alive.</wr-typography>
 * <wr-typography variant="lead">A developer-first library.</wr-typography>
 * <wr-typography variant="caption" tone="medium">v1.6.0 — released today</wr-typography>
 * ```
 *
 * @see https://ngwr.dev/docs/components/typography
 */
@Component({
  selector: 'wr-typography, [wr-typography]',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrTypographyComponent {
  /** Visual variant. @default 'body' */
  readonly variant = input<WrTypographyVariant>('body');

  /** Color tone. @default 'dark' */
  readonly tone = input<WrTypographyTone>('dark');

  /** Horizontal alignment. */
  readonly align = input<WrTypographyAlign | null>(null);

  /** Truncate to single line with ellipsis. @default false */
  readonly truncate = input<boolean>(false);

  /** Render with monospace font. @default false (auto-true for `code`) */
  readonly mono = input<boolean>(false);

  protected readonly classes = computed(() => {
    const parts = ['wr-typography', `wr-typography--${this.variant()}`, `wr-typography--tone-${this.tone()}`];
    const align = this.align();
    if (align) parts.push(`wr-typography--align-${align}`);
    if (this.truncate()) parts.push('wr-typography--truncate');
    if (this.mono() || this.variant() === 'code') parts.push('wr-typography--mono');
    return parts.join(' ');
  });
}
