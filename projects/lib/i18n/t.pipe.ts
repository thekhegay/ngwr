/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Pipe, type PipeTransform, inject } from '@angular/core';

import { WrI18n } from './i18n';
import { type WrI18nParams } from './i18n-config';

/**
 * Translate a key. Impure — re-evaluates on every CD so locale switches
 * and catalog loads propagate without a manual refresh.
 *
 * @example
 * ```html
 * <h1>{{ 'home.title' | wrT }}</h1>
 * <p>{{ 'greeting' | wrT: { name: user().name } }}</p>
 * <button>{{ 'forms.save' | wrT: null : 'checkout' }}</button>
 * ```
 */
// eslint-disable-next-line @angular-eslint/no-pipe-impure -- intentional: locale + catalog updates must propagate even when args are stable
@Pipe({ name: 'wrT', pure: false })
export class WrTPipe implements PipeTransform {
  private readonly i18n = inject(WrI18n);

  transform(key: string, params?: WrI18nParams | null, scope?: string): string {
    return this.i18n.t(key, params ?? undefined, scope);
  }
}
