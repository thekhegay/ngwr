/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import { type Observable } from 'rxjs';

import { type WrI18nCatalog } from './i18n-config';

/**
 * Loads a catalog for a `(locale, scope)` pair. `scope` is `null` for the
 * root catalog. Implementations may return the catalog synchronously
 * (via `of(...)`) for static catalogs or asynchronously (via HTTP) for
 * lazy fetches.
 */
export interface WrI18nLoader {
  load(locale: string, scope: string | null): Observable<WrI18nCatalog>;
}

export const WR_I18N_LOADER = new InjectionToken<WrI18nLoader>('WR_I18N_LOADER');
