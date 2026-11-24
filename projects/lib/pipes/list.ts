/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { LOCALE_ID, Pipe, inject } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import { wrIntlListFormat } from 'ngwr/utils';

import type { WrListType } from './types';

/**
 * A list joined through `Intl.ListFormat`, in the given locale: the same output
 * as the `wrList` pipe, for a string built in TypeScript. Takes a type shortcut
 * or a full `Intl.ListFormatOptions` object. Blank items are left out, and a
 * lone string is a list of one. `null`, `undefined` and a list with nothing in
 * it give an empty string.
 *
 * The items are strings only: a number or a date has a locale form of its own,
 * so format it first (`wrFormatNumber`, `wrFormatDate`).
 *
 * @example
 * ```ts
 * wrFormatList(['Ada', 'Alan', 'Grace'], 'en-GB');                // "Ada, Alan and Grace"
 * wrFormatList(['Ada', 'Alan', 'Grace'], 'en-GB', 'disjunction'); // "Ada, Alan or Grace"
 * wrFormatList(['Ада', 'Алан', 'Грейс'], 'ru');                   // "Ада, Алан и Грейс"
 * wrFormatList(['5 kg', '200 g'], 'en-GB', { type: 'unit', style: 'narrow' }); // "5 kg 200 g"
 * ```
 */
export function wrFormatList(
  value: Iterable<string> | null | undefined,
  locale: string,
  typeOrOptions: WrListType | Intl.ListFormatOptions = 'conjunction'
): string {
  if (value === null || value === undefined) return '';
  // A string is iterable too, and would come out one character per item.
  const items = (typeof value === 'string' ? [value] : Array.from(value)).filter(item => item.trim() !== '');
  if (items.length === 0) return '';

  const options: Intl.ListFormatOptions = typeof typeOrOptions === 'string' ? { type: typeOrOptions } : typeOrOptions;
  return wrIntlListFormat(locale, options).format(items);
}

/**
 * Locale-aware list joining via `Intl.ListFormat`: the separator, the last
 * "and" / "or" and the comma before it are the language's own, which
 * `join(', ')` gets wrong in every one of them. Uses Angular's `LOCALE_ID` as
 * the default locale.
 *
 * Accepts either a type shortcut or a full `Intl.ListFormatOptions` object.
 * {@link wrFormatList} is the same output as a function.
 *
 * @example
 * ```html
 * {{ names | wrList }}                   <!-- "Ada, Alan, and Grace" -->
 * {{ names | wrList: 'disjunction' }}    <!-- "Ada, Alan, or Grace"  -->
 * {{ parts | wrList: { type: 'unit', style: 'narrow' } }}
 * ```
 */
@Pipe({ name: 'wrList' })
export class WrList implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(
    value: Iterable<string> | null | undefined,
    typeOrOptions: WrListType | Intl.ListFormatOptions = 'conjunction'
  ): string {
    return wrFormatList(value, this.locale, typeOrOptions);
  }
}

export type { WrListType } from './types';
