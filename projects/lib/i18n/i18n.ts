/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { LOCALE_ID, Service, type Signal, computed, effect, inject, isDevMode, signal } from '@angular/core';

import { type Observable, firstValueFrom } from 'rxjs';

import { WrStorage } from 'ngwr/storage';

import { WR_I18N_BASE_CATALOGS } from './i18n-base-catalogs';
import { WR_I18N_CONFIG, type WrI18nCatalog, type WrI18nParams } from './i18n-config';
import { WR_I18N_LOADER } from './i18n-loader';

/** Cache key shape: `<locale>::<scope|''>`. @internal */
function cacheKey(locale: string, scope: string | null): string {
  return `${locale}::${scope ?? ''}`;
}

/**
 * A locale and the language under it: `'ru-RU'` gives `['ru-RU', 'ru']`.
 *
 * Every lookup and every load walks this, so a catalog registered as `ru`
 * answers an app running `ru-RU`. Without it the two spellings are unrelated
 * strings, and the miss is silent — `t()` returns the key, `useI18nText` reads
 * that as "missing" and serves the English fallback, so a fully translated app
 * renders English with nothing logged. It only ever truncates: an `en` lookup
 * never reaches an `en-US` catalog, because a language is not a region.
 *
 * @internal
 */
function localeChain(locale: string): readonly string[] {
  const dash = locale.indexOf('-');
  return dash > 0 ? [locale, locale.slice(0, dash)] : [locale];
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
 * Translations are looked up scope-first then root, per locale, and the locale
 * itself is tried as the full tag before the bare language underneath it — so
 * an app running `ru-RU` resolves against a catalog registered as `ru`, and a
 * regional catalog is never shadowed by a scope in the base language. For an
 * app that spells its locale one way, which is every app that existed before
 * the chain, the order is exactly what it always was.
 *
 * ## Which locale wins
 *
 * ngwr has three locale inputs and they used to be three unrelated answers — an
 * app that set `LOCALE_ID: 'ru-RU'` correctly still rendered an English
 * calendar, because the date token defaulted to `navigator.language`. The
 * precedence is now stated, highest first:
 *
 * 1. **A subsystem's own explicit option.** `provideWrDateAdapter({ locale })`
 *    pins dates; `provideWrI18n({ defaultLocale })` pins the catalog. The most
 *    specific statement wins, because it can only have been deliberate.
 * 2. **`WrI18n.locale()` — the runtime value.** The only one of the three that
 *    can change without a reload, so it is what a language switcher writes.
 * 3. **`LOCALE_ID`.** Angular's app-wide constant, and the seed for both of the
 *    above when neither was given. One statement, one answer.
 * 4. `'en-US'`, which is what `LOCALE_ID` itself falls back to.
 *
 * `navigator.language` is deliberately NOT in that list. It is the browser's
 * preference, not the application's, and reading it made prerendered output and
 * the hydrated page disagree.
 *
 * **What a runtime switch reaches, and what it does not.** `use()` repaints
 * every catalog string. It does not move `LOCALE_ID`, which is a constant, so
 * anything keyed on it — `wrDate` / `wrNumber` / `wrPlural`, `wr-input-number`,
 * `wr-statistic`, `wr-counter` — and anything keyed on `WR_DATE_LOCALE` — the
 * date adapter, and so `wr-calendar` and `wr-date-picker` — stays where it was.
 * `use()` says so once in dev mode rather than leaving it to be discovered.
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
 * @see https://ngwr.dev/reference/services/i18n
 */
@Service()
export class WrI18n {
  private readonly config = inject(WR_I18N_CONFIG);
  private readonly loader = inject(WR_I18N_LOADER);
  private readonly storage = inject(WrStorage);

  /**
   * Angular's own locale. Read for the dev-mode drift warning only — the
   * resolved default already folded it in through `WR_I18N_CONFIG`. @internal
   */
  private readonly localeId = inject(LOCALE_ID);

  /**
   * Catalogs registered via `provideWrI18nBaseCatalogs()` — the floor under the
   * loader's own catalogs, so ngwr's built-in strings survive an app that only
   * ships its own keys. @internal
   */
  private readonly baseCatalogs = inject(WR_I18N_BASE_CATALOGS, { optional: true }) ?? [];

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
      void this.loadChain(lc, null);
      for (const sc of this.scopes) void this.loadChain(lc, sc);
    });
  }

  // Locale

  /**
   * Switch active locale. Ignored when not whitelisted.
   *
   * Text only — see the class docs for what a runtime switch cannot reach. The
   * dev-mode warning below is the whole reporting of that limit; without it the
   * failure is a screen showing German labels beside `3/15/2026`, with nothing
   * anywhere saying why.
   */
  use(locale: string): void {
    if (!this.config.availableLocales.includes(locale)) return;
    const previous = this._locale();
    this._locale.set(locale);
    if (this.config.storageKey) this.storage.set(this.config.storageKey, locale);
    if (isDevMode() && previous !== locale) this.warnOnLocaleIdDrift(locale);
  }

  /** Available locales — pass-through from config. */
  available(): readonly string[] {
    return this.config.availableLocales;
  }

  // Scopes

  /**
   * Register a scope so its catalog loads alongside the root one. Idempotent.
   * Returns a promise resolving once the current locale's scope catalog is in
   * the cache — handy for feature `canActivate` guards.
   */
  registerScope(scope: string): Promise<WrI18nCatalog> {
    this.scopes.add(scope);
    const lc = this._locale();
    // Resolve on the exact tag: the promise is what a `canActivate` waits on,
    // and the base-language catalog is only ever a fallback under it.
    const exact = this.loadCatalog(lc, scope);
    void this.loadChain(lc, scope);
    return exact;
  }

  // Translate

  /**
   * Eager translate — returns the current value or the missing-handler
   * fallback. Does NOT auto-load missing catalogs; combine with the
   * reactive `translate(...)` if you want load-on-demand.
   */
  t(key: string, params?: WrI18nParams, scope?: string): string {
    // Read revision so callers inside computed/effect re-run on updates.
    this.revision();
    const lc = this._locale();

    const chain = localeChain(lc);
    let hit: string | null = null;
    for (const candidate of chain) {
      if (scope) hit = walk(this.catalogs.get(cacheKey(candidate, scope)) ?? null, key);
      hit ??= walk(this.catalogs.get(cacheKey(candidate, null)) ?? null, key);
      if (hit !== null) break;
    }
    // Base catalogs are the floor: consulted only once the loader's own catalogs
    // have missed, so an app's keys always win, but ngwr's built-in strings are
    // still there when the app's catalog doesn't carry them.
    hit ??= this.walkBase(chain, key);

    if (hit === null) {
      // Fire a background load so a future read can resolve it.
      void this.loadChain(lc, scope ?? null);
      return this.config.missingHandler(key, lc);
    }
    return wrInterpolate(hit, params);
  }

  /** Reactive translate — re-evaluates on locale or catalog updates. */
  translate(key: string, params?: WrI18nParams, scope?: string): Signal<string> {
    return computed(() => this.t(key, params, scope));
  }

  // Internals

  /**
   * Look a key up in the registered base catalogs, later contributions first so
   * a feature can shadow an earlier one.
   */
  private walkBase(chain: readonly string[], key: string): string | null {
    for (const locale of chain) {
      for (let i = this.baseCatalogs.length - 1; i >= 0; i--) {
        const hit = walk(this.baseCatalogs[i][locale] ?? null, key);
        if (hit !== null) return hit;
      }
    }
    return null;
  }

  private initialLocale(): string {
    if (this.config.storageKey) {
      const saved = this.storage.get<string>(this.config.storageKey);
      if (saved && this.config.availableLocales.includes(saved)) return saved;
    }
    return this.config.defaultLocale;
  }

  /**
   * Load a `(locale, scope)` catalog and, when the locale carries a region, the
   * bare-language one under it. Both go in the cache; `t()` reads them in that
   * order.
   */
  private loadChain(locale: string, scope: string | null): Promise<unknown> {
    return Promise.all(localeChain(locale).map(candidate => this.loadCatalog(candidate, scope)));
  }

  /** One warning per service, not one per switch. @internal */
  private warnedLocaleIdDrift = false;

  /**
   * Say once, in dev, that a runtime switch moved the text and nothing else.
   *
   * The mismatch is otherwise invisible in the way that costs the most time:
   * the catalog strings all change, which reads as "the switch worked", and the
   * dates and numbers beside them are still correct-looking output in the old
   * locale. Silent when the new locale IS `LOCALE_ID`, because then nothing is
   * out of step and a warning that fires when everything agrees is one people
   * learn to ignore. Production builds drop the call entirely via `isDevMode()`
   * tree-shaking.
   */
  private warnOnLocaleIdDrift(locale: string): void {
    if (this.warnedLocaleIdDrift || locale === this.localeId) return;
    this.warnedLocaleIdDrift = true;
    // eslint-disable-next-line no-console -- dev-mode validation
    console.warn(
      `[NGWR] WrI18n.use('${locale}') switched the catalog, but LOCALE_ID is still '${this.localeId}'. ` +
        `LOCALE_ID is an Angular constant and WR_DATE_LOCALE resolves from it once at bootstrap, so ` +
        `formatted dates and numbers do not follow the switch and stay on '${this.localeId}': the date ` +
        `adapter (and so wr-calendar / wr-date-picker), the wrDate / wrNumber / wrPlural pipes, ` +
        `wr-input-number, wr-statistic, wr-counter, wr-pagination's total and wr-file-upload's sizes. ` +
        `Reload the app with the new LOCALE_ID to move those, or keep runtime switching to text.`
    );
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
