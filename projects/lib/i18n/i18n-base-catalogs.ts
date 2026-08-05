/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import { type WrI18nCatalog } from './i18n-config';

/** Base catalogs keyed by locale, contributed by {@link provideWrI18nBaseCatalogs}. */
export type WrI18nBaseCatalogs = Readonly<Record<string, WrI18nCatalog>>;

/**
 * Catalogs consulted *underneath* whatever the loader returned — the place for
 * ngwr's own built-in strings.
 *
 * A loader **replaces** the catalog for a locale rather than extending it, so an
 * app whose JSON holds only its own keys used to lose every built-in label to
 * its hardcoded English fallback, silently. Registering `wrRu` / `wrEn` here
 * puts them back without the app having to merge anything itself.
 *
 * `multi`, so several features can each contribute; later contributions win on
 * a key collision, and anything the loader returned still wins over all of them.
 *
 * It has to be handed in by the consumer rather than wired up inside
 * `provideWrI18n()`: the catalogs are their own entry points (`ngwr/i18n/ru`)
 * and they already import from `ngwr/i18n`, so importing them back here is a
 * circular entry-point dependency that ng-packagr rejects outright. Passing
 * them in also keeps the locales you don't ship out of your bundle.
 */
export const WR_I18N_BASE_CATALOGS = new InjectionToken<readonly WrI18nBaseCatalogs[]>('WR_I18N_BASE_CATALOGS');
