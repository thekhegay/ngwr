/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Observable, of } from 'rxjs';

import { type WrI18nCatalog } from '../i18n-config';
import { type WrI18nLoader } from '../i18n-loader';

/** Root catalogs keyed by locale: `{ en: catalog, ru: catalog, … }`. */
export type WrI18nStaticCatalogs = Readonly<Record<string, WrI18nCatalog>>;

/** Per-scope catalogs: `{ checkout: { en: catalog, ru: catalog }, … }`. */
export type WrI18nStaticScopedCatalogs = Readonly<Record<string, WrI18nStaticCatalogs>>;

/**
 * Loader for catalogs already in memory (imported from JSON or generated).
 *
 * - Pass `catalogs` for the root catalog of every locale.
 * - Pass `scopes` if you ship per-feature catalogs the loader should serve
 *   to `WrI18n.registerScope(name)` calls.
 *
 * Missing locale or scope resolves to `{}` — the missing-key handler then
 * decides what to render.
 */
export class WrI18nStaticLoader implements WrI18nLoader {
  constructor(
    private readonly catalogs: WrI18nStaticCatalogs,
    private readonly scopes: WrI18nStaticScopedCatalogs = {}
  ) {}

  load(locale: string, scope: string | null): Observable<WrI18nCatalog> {
    if (scope === null) return of(this.catalogs[locale] ?? {});
    return of(this.scopes[scope]?.[locale] ?? {});
  }
}
