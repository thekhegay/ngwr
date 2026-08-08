/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import { of, type Observable } from 'rxjs';

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

/**
 * The active loader.
 *
 * Defaults to one that serves an empty catalog, which is what makes
 * `provideWrI18n()` genuinely optional: every ngwr component routes its
 * built-in strings through `useI18nText` / `readI18nText`, those inject
 * `WrI18n` optionally — and because `WrI18n` is `providedIn: 'root'`, an
 * optional inject still CONSTRUCTS it. Without a default here that construction
 * threw `NG0201: No provider found for WR_I18N_LOADER`, so an app that had
 * simply not configured i18n could not render `<wr-alert>` at all.
 *
 * With the empty catalog, every lookup misses, `t()` hands back the key, and
 * the helpers fall through to the component's own English default — the
 * documented no-i18n behaviour.
 */
export const WR_I18N_LOADER = new InjectionToken<WrI18nLoader>('WR_I18N_LOADER', {
  providedIn: 'root',
  factory: () => ({ load: () => of({}) }),
});
