/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { LOCALE_ID, Pipe, inject } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import type { WrNumberStyle } from './types';

/** Digits with one optional point and a sign: the form `Intl` reads exactly. */
const PLAIN_DECIMAL = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

function toOptions(style: WrNumberStyle, currency: string): Intl.NumberFormatOptions {
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

/**
 * A number through `Intl.NumberFormat`, in the given locale: the same output as
 * the `wrNumber` pipe, for a string built in TypeScript. Takes a style shortcut
 * (with an optional currency code) or a full `Intl.NumberFormatOptions` object.
 * `null`, `undefined`, an empty string and a value that is not a finite number
 * give an empty string.
 *
 * @example
 * ```ts
 * wrFormatNumber(1234.5, 'en-US');                      // "1,234.5"
 * wrFormatNumber(0.875, 'en-US', 'percent');            // "87.5%"
 * wrFormatNumber(19.99, 'de-DE', 'currency', 'EUR');    // "19,99 €"
 * wrFormatNumber(19.99, 'en-US', { minimumFractionDigits: 2 });
 * ```
 */
export function wrFormatNumber(
  value: number | string | null | undefined,
  locale: string,
  styleOrOptions: WrNumberStyle | Intl.NumberFormatOptions = 'decimal',
  currency = 'USD'
): string {
  if (value === null || value === undefined || value === '') return '';
  const text = typeof value === 'string' ? value.trim() : null;
  const n = Number(text ?? value);
  if (!Number.isFinite(n)) return '';

  const options: Intl.NumberFormatOptions =
    typeof styleOrOptions === 'string' ? toOptions(styleOrOptions, currency) : styleOrOptions;

  // A plain decimal string goes to `Intl` as it is: through `Number()`,
  // `'12345678901234567.89'` printed as `12,345,678,901,234,568`. Any other
  // form keeps the number, since ICU throws on an exponent of a billion or more.
  // `format()` has read a string since ES2023 (Chrome 106, Firefox 116, Safari
  // 15.4); the ES2022 lib this builds against types it as a number only.
  const exact = text !== null && PLAIN_DECIMAL.test(text) ? (text as unknown as number) : n;
  return new Intl.NumberFormat(locale, options).format(exact);
}

/**
 * Locale-aware number formatting via `Intl.NumberFormat`. Uses Angular's
 * `LOCALE_ID` as the default locale.
 *
 * Accepts either a style shortcut (with optional currency code) or a full
 * `Intl.NumberFormatOptions` object for fine-grained control.
 * {@link wrFormatNumber} is the same output as a function.
 *
 * @example
 * ```html
 * {{ 1234.5 | wrNumber }}                       <!-- "1,234.5"   -->
 * {{ 0.875  | wrNumber: 'percent' }}            <!-- "87.5%"     -->
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
    return wrFormatNumber(value, this.locale, styleOrOptions, currency);
  }
}

export type { WrNumberStyle } from './types';
