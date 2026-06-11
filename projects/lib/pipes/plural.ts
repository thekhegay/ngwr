/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { LOCALE_ID, Pipe, inject } from '@angular/core';
import type { PipeTransform } from '@angular/core';

/** Word forms keyed by CLDR plural category. Only `other` is required. */
export type WrPluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { readonly other: string };

export interface WrPluralOptions {
  /** Prefix the formatted count before the word. @default true */
  readonly includeValue?: boolean;
  /** Locale override; defaults to Angular's `LOCALE_ID`. */
  readonly locale?: string;
}

/**
 * Locale-aware pluralization via `Intl.PluralRules`. Picks the right word
 * form for the count — including languages with more than two forms
 * (Russian, Polish, Arabic, …) — without hand-rolled `n % 10` rules.
 *
 * Categories follow CLDR: `zero` / `one` / `two` / `few` / `many` /
 * `other`. Missing categories fall back to `other`.
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
    if (value === null || value === undefined || !Number.isFinite(value)) return '';
    const locale = options.locale ?? this.locale;
    const category = new Intl.PluralRules(locale).select(value);
    const word = forms[category] ?? forms.other;
    if (options.includeValue === false) return word;
    return `${new Intl.NumberFormat(locale).format(value)} ${word}`;
  }
}
