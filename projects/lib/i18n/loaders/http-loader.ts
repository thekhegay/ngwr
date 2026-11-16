/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';

import { type Observable } from 'rxjs';

import { type WrI18nCatalog } from '../i18n-config';
import { type WrI18nLoader } from '../i18n-loader';

/** Configuration for {@link WrI18nHttpLoader}. */
export interface WrI18nHttpLoaderConfig {
  /**
   * URL template. Tokens:
   * - `{locale}` — required, BCP-47 tag (e.g. `en`).
   * - `{scope}` — optional, scope name. Use the `rootPath` if you need a
   *   different path entirely for the root catalog.
   *
   * @example
   * ```ts
   * { path: '/assets/i18n/{locale}.json' }                  // root only
   * { path: '/assets/i18n/{scope}/{locale}.json',
   *   rootPath: '/assets/i18n/{locale}.json' }              // root + scopes
   * ```
   */
  readonly path: string;
  /** Path template for the root catalog. Defaults to `path`. */
  readonly rootPath?: string;
}

/**
 * Loader that fetches catalogs via `HttpClient`. A failure errors the stream;
 * the service logs it, serves the key and retries on the next `use()`.
 */
export class WrI18nHttpLoader implements WrI18nLoader {
  private readonly http = inject(HttpClient);

  constructor(private readonly config: WrI18nHttpLoaderConfig) {}

  load(locale: string, scope: string | null): Observable<WrI18nCatalog> {
    const template = scope === null ? (this.config.rootPath ?? this.config.path) : this.config.path;
    const url = template.replaceAll('{locale}', locale).replaceAll('{scope}', scope ?? '');
    return this.http.get<WrI18nCatalog>(url);
  }
}
