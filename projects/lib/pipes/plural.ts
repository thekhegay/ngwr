/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { LOCALE_ID, Pipe, inject } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import type { WrPluralForms, WrPluralOptions } from './types';

/**
 * A count and its word form through `Intl.PluralRules`, in the given locale:
 * the same output as the `wrPlural` pipe, for a string built in TypeScript.
 * `options.locale` still wins over `locale`, as it wins over `LOCALE_ID` in the
 * pipe. `null`, `undefined` and a value that is not a finite number give an
 * empty string.
 *
 * @example
 * ```ts
 * wrFormatPlural(1, 'en', { one: 'comment', other: 'comments' });     // "1 comment"
 * wrFormatPlural(5, 'ru', { one: 'файл', few: 'файла', other: 'файлов' }); // "5 файлов"
 * wrFormatPlural(5, 'en', forms, { includeValue: false });            // "comments"
 * ```
 */
export function wrFormatPlural(
  value: number | null | undefined,
  locale: string,
  forms: WrPluralForms,
  options: WrPluralOptions = {}
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  const tag = options.locale ?? locale;
  const category = new Intl.PluralRules(tag).select(value);
  const word = forms[category] ?? forms.other;
  if (options.includeValue === false) return word;
  return `${new Intl.NumberFormat(tag).format(value)} ${word}`;
}

/**
 * Locale-aware pluralization via `Intl.PluralRules`. Picks the right word
 * form for the count — including languages with more than two forms
 * (Russian, Polish, Arabic, …) — without hand-rolled `n % 10` rules.
 *
 * Categories follow CLDR: `zero` / `one` / `two` / `few` / `many` /
 * `other`. Missing categories fall back to `other`. {@link wrFormatPlural} is
 * the same output as a function.
 *
 * @example
 * ```html
 * {{ 1 | wrPlural: { one: 'comment', other: 'comments' } }}
 * <!-- "1 comment" -->
 *
 * {{ 5 | wrPlural: { one: 'файл', few: 'файла', other: 'файлов' } }}
 * <!-- "5 файлов" (with LOCALE_ID = ru) -->
 *
 * {{ count() | wrPlural: forms : { includeValue: false } }}
 * <!-- word only -->
 * ```
 */
@Pipe({ name: 'wrPlural' })
export class WrPlural implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: number | null | undefined, forms: WrPluralForms, options: WrPluralOptions = {}): string {
    return wrFormatPlural(value, this.locale, forms, options);
  }
}

export type { WrPluralForms, WrPluralOptions } from './types';
