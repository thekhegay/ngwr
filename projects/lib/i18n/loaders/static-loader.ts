/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Observable, of } from 'rxjs';

import { type WrI18nCatalog } from '../i18n-config';
import { type WrI18nLoader } from '../i18n-loader';

/** Map of `scope -> catalog`. The `root` slot is the unscoped catalog. */
export type WrI18nScopedCatalogs = Readonly<Record<string, WrI18nCatalog>>;

/** Catalogs keyed by locale, optionally namespaced by scope. */
export type WrI18nStaticCatalogs = Readonly<Record<string, WrI18nCatalog | WrI18nScopedCatalogs>>;

/**
 * Loader for catalogs already in memory (imported from JSON or generated).
 * Falls back to an empty catalog when the locale or scope is missing.
 */
export class WrI18nStaticLoader implements WrI18nLoader {
  constructor(private readonly catalogs: WrI18nStaticCatalogs) {}

  load(locale: string, scope: string | null): Observable<WrI18nCatalog> {
    const bucket = this.catalogs[locale];
    if (!bucket) return of({});

    if (scope === null) {
      // Root catalog: if the bucket is a plain catalog, return as-is;
      // if it's a scope map, return its `root` slot (or {}).
      if (this.looksScoped(bucket)) {
        return of(bucket['root'] ?? {});
      }
      return of(bucket);
    }

    if (!this.looksScoped(bucket)) return of({});
    return of(bucket[scope] ?? {});
  }

  private looksScoped(bucket: WrI18nCatalog | WrI18nScopedCatalogs): bucket is WrI18nScopedCatalogs {
    // Heuristic: a scope map's values are objects; a flat catalog's may be strings.
    for (const v of Object.values(bucket)) {
      if (typeof v === 'string') return false;
    }
    return true;
  }
}
