/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { LOCALE_ID, Pipe, inject } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import type { WrNumberStyle } from './interfaces';

/**
 * Locale-aware number formatting via `Intl.NumberFormat`. Uses Angular's
 * `LOCALE_ID` as the default locale.
 *
 * Accepts either a style shortcut (with optional currency code) or a full
 * `Intl.NumberFormatOptions` object for fine-grained control.
 *
 * @example
 * ```html
 * {{ 1234.5 | wrNumber }}                       <!-- "1,234.5"   -->
 * {{ 0.875  | wrNumber: 'percent' }}            <!-- "88%"       -->
 * {{ 19.99  | wrNumber: 'currency': 'USD' }}    <!-- "$19.99"    -->
 * {{ 19.99  | wrNumber: { minimumFractionDigits: 2 } }}
 * ```
 */
@Pipe({ name: 'wrNumber' })
export class WrNumber implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(
    value: number | string | null | undefined,
    styleOrOptions: WrNumberStyle | Intl.NumberFormatOptions = 'decimal',
    currency = 'USD'
  ): string {
    if (value === null || value === undefined || value === '') return '';
    const n = Number(value);
    if (!Number.isFinite(n)) return '';

    const options: Intl.NumberFormatOptions =
      typeof styleOrOptions === 'string' ? this.toOptions(styleOrOptions, currency) : styleOrOptions;

    return new Intl.NumberFormat(this.locale, options).format(n);
  }

  private toOptions(style: WrNumberStyle, currency: string): Intl.NumberFormatOptions {
    switch (style) {
      case 'percent':
        return { style: 'percent', maximumFractionDigits: 2 };
      case 'currency':
        return { style: 'currency', currency };
      case 'decimal':
      default:
        return { style: 'decimal' };
    }
  }
}

export type { WrNumberStyle } from './interfaces';
