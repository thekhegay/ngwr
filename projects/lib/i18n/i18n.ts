/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Service, type Signal, computed, effect, inject, signal } from '@angular/core';

import { type Observable, firstValueFrom } from 'rxjs';

import { WrStorage } from 'ngwr/storage';

import { WR_I18N_CONFIG, type WrI18nCatalog, type WrI18nParams } from './i18n-config';
import { WR_I18N_LOADER } from './i18n-loader';

/** Cache key shape: `<locale>::<scope|''>`. @internal */
function cacheKey(locale: string, scope: string | null): string {
  return `${locale}::${scope ?? ''}`;
}

/** Walk a dotted path through a catalog tree. Returns string | null. @internal */
function walk(cat: WrI18nCatalog | null, key: string): string | null {
  if (!cat) return null;
  let node: string | WrI18nCatalog | undefined = cat;
  for (const part of key.split('.')) {
    if (node === undefined || typeof node === 'string') return null;
    node = node[part];
  }
  return typeof node === 'string' ? node : null;
}

/**
 * `{{name}}` interpolation. Missing params resolve to `''`. Exported so
 * helpers in `util.ts` can interpolate the fallback template when no
 * `WrI18n` provider is wired up.
 *
 * @internal
 */
export function wrInterpolate(template: string, params: WrI18nParams | undefined): string {
  if (!params) return template;
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, name: string) => {
    const v = params[name];
    if (v === undefined || v === null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    try {
      return JSON.stringify(v);
    } catch {
      return '';
    }
  });
}

/**
 * Reactive i18n service. Holds:
 *
 * - the active locale as a `Signal<string>`
 * - per-`(locale, scope)` catalogs in a `Map` (loaded once, then cached)
 * - a per-locale signal counter so every `translate()` reading the signal
 *   re-evaluates the moment a new catalog finishes loading
 *
 * Translations are looked up scope-first, then root. `t('forms.save', { ... })`
 * with `scope: 'forms'` will try the scoped catalog before falling back to
 * `forms.save` in the root catalog — useful for per-feature overrides.
 *
 * @example
 * ```ts
 * const i18n = inject(WrI18n);
 * i18n.use('ru');                                  // switch locale
 * i18n.t('cart.checkout');                         // → 'Оформить заказ'
 * i18n.t('greeting', { name: 'Ada' });             // → 'Hello, Ada!'
 *
 * effect(() => console.log(i18n.translate('hi')())); // re-runs on locale change
 * ```
 *
 * @see https://ngwr.dev/services/i18n
 */
@Service()
export class WrI18n {
  private readonly config = inject(WR_I18N_CONFIG);
  private readonly loader = inject(WR_I18N_LOADER);
  private readonly storage = inject(WrStorage);

  /** Per-(locale,scope) catalogs, populated by `loadCatalog`. @internal */
  private readonly catalogs = new Map<string, WrI18nCatalog>();

  /** Bumped after each catalog write so reactive translates recompute. @internal */
  private readonly revision = signal(0);

  /** In-flight load promises — dedupes parallel `t()` callers. @internal */
  private readonly inflight = new Map<string, Promise<WrI18nCatalog>>();

  /** Registered scopes — auto-loaded whenever the locale changes. @internal */
  private readonly scopes = new Set<string>();

  /** Active locale. Writes go through `use()` so storage stays in sync. */
  private readonly _locale = signal<string>(this.initialLocale());
  readonly locale: Signal<string> = this._locale.asReadonly();

  constructor() {
    // Eagerly load the root catalog + every registered scope for the
    // current locale. Subsequent locale changes refire the same effect.
    effect(() => {
      const lc = this._locale();
      void this.loadCatalog(lc, null);
      for (const sc of this.scopes) void this.loadCatalog(lc, sc);
    });
  }

  // ──────── Locale ────────

  /** Switch active locale. Ignored when not whitelisted. */
  use(locale: string): void {
    if (!this.config.availableLocales.includes(locale)) return;
    this._locale.set(locale);
    if (this.config.storageKey) this.storage.set(this.config.storageKey, locale);
  }

  /** Available locales — pass-through from config. */
  available(): readonly string[] {
    return this.config.availableLocales;
  }

  // ──────── Scopes ────────

  /**
   * Register a scope so its catalog loads alongside the root one. Idempotent.
   * Returns a promise resolving once the current locale's scope catalog is in
   * the cache — handy for feature `canActivate` guards.
   */
  registerScope(scope: string): Promise<WrI18nCatalog> {
    this.scopes.add(scope);
    return this.loadCatalog(this._locale(), scope);
  }

  // ──────── Translate ────────

  /**
   * Eager translate — returns the current value or the missing-handler
   * fallback. Does NOT auto-load missing catalogs; combine with the
   * reactive `translate(...)` if you want load-on-demand.
   */
  t(key: string, params?: WrI18nParams, scope?: string): string {
    // Read revision so callers inside computed/effect re-run on updates.
    this.revision();
    const lc = this._locale();

    let hit = scope ? walk(this.catalogs.get(cacheKey(lc, scope)) ?? null, key) : null;
    hit ??= walk(this.catalogs.get(cacheKey(lc, null)) ?? null, key);

    if (hit === null) {
      // Fire a background load so a future read can resolve it.
      void this.loadCatalog(lc, scope ?? null);
      return this.config.missingHandler(key, lc);
    }
    return wrInterpolate(hit, params);
  }

  /** Reactive translate — re-evaluates on locale or catalog updates. */
  translate(key: string, params?: WrI18nParams, scope?: string): Signal<string> {
    return computed(() => this.t(key, params, scope));
  }

  // ──────── Internals ────────

  private initialLocale(): string {
    if (this.config.storageKey) {
      const saved = this.storage.get<string>(this.config.storageKey);
      if (saved && this.config.availableLocales.includes(saved)) return saved;
    }
    return this.config.defaultLocale;
  }

  private loadCatalog(locale: string, scope: string | null): Promise<WrI18nCatalog> {
    const ck = cacheKey(locale, scope);
    const cached = this.catalogs.get(ck);
    if (cached) return Promise.resolve(cached);

    const pending = this.inflight.get(ck);
    if (pending) return pending;

    const stream: Observable<WrI18nCatalog> = this.loader.load(locale, scope);
    const promise = firstValueFrom(stream)
      .then(catalog => {
        this.catalogs.set(ck, catalog);
        this.revision.update(v => v + 1);
        return catalog;
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console -- intentional diagnostic for missing catalog
        console.warn(`[ngwr/i18n] failed to load (${locale}, ${scope ?? 'root'})`, err);
        const empty: WrI18nCatalog = {};
        this.catalogs.set(ck, empty);
        return empty;
      })
      .finally(() => {
        this.inflight.delete(ck);
      });

    this.inflight.set(ck, promise);
    return promise;
  }
}
