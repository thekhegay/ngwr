import { Component } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';
import { QUALITY } from '#core/generated/quality';

/** One shipped catalog, as the page lists it. */
interface ShippedLocale {
  readonly code: string;
  /** The language's own name for itself, from `Intl` rather than from a table. */
  readonly native: string;
  /** And its English name, for a reader scanning for their own. */
  readonly english: string;
  /** The export a consumer imports — `wrZhTw` for `zh-TW`. */
  readonly symbol: string;
}

/** `zh-TW` -> `wrZhTw`, the same rule the catalogs are named by. */
function symbolFor(code: string): string {
  return `wr${code
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')}`;
}

@Component({
  selector: 'ngwr-translate-setup-page',
  templateUrl: './setup.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent],
})
export default class TranslateSetupPage {
  /**
   * The catalogs in the box, from `pnpm gen:quality`, which counts the folders
   * rather than reading a list — so this table cannot fall behind the package.
   *
   * The NAMES come from `Intl.DisplayNames` for the same reason: a hand-written
   * column of twenty language names is twenty chances to misspell somebody's
   * language, and the browser already knows all of them.
   */
  protected readonly shipped: readonly ShippedLocale[] = QUALITY.locales.map(code => ({
    code,
    native: new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code,
    english: new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code,
    symbol: symbolFor(code),
  }));

  protected readonly snippets = {
    static: `import { provideHttpClient } from '@angular/common/http';
import {
  provideWrI18n,
  provideWrI18nStaticLoader,
} from 'ngwr/i18n';
import { wrEn } from 'ngwr/i18n/en';
import { wrRu } from 'ngwr/i18n/ru';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideWrI18n({
      defaultLocale: 'en',
      availableLocales: ['en', 'ru'],
    }),
    provideWrI18nStaticLoader({
      en: { ...wrEn, app: { title: 'My app' } },
      ru: { ...wrRu, app: { title: 'Моё приложение' } },
    }),
  ],
});`,
    http: `provideWrI18nHttpLoader({
  path: '/assets/i18n/{locale}.json',
  // Optional — different template for scoped catalogs:
  // rootPath: '/assets/i18n/root/{locale}.json',
});

// Then per-feature lazy load:
i18n.registerScope('checkout');
// → fetches /assets/i18n/checkout/{locale}.json`,
    httpBuiltIns: `// A loader REPLACES the catalog for a locale, it does not extend it — so a
// JSON file holding only your own keys would leave every ngwr built-in label
// on its hardcoded English fallback, silently.
//
// Register the shipped catalogs as a BASE and they fill in underneath:
import { provideWrI18n, provideWrI18nBaseCatalogs, provideWrI18nHttpLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
    provideWrI18nBaseCatalogs({ ru: wrRu }),   // <- the one line
    provideWrI18nHttpLoader({ path: '/assets/i18n/{locale}.json' }),
  ],
});

// Your /assets/i18n/ru.json now only needs YOUR keys. Yours always win;
// the base is a floor, not an override. Pass only the locales you ship —
// the rest stay out of the bundle.
//
// Prefer plain files? The same catalogs are published as JSON:
//   node_modules/ngwr/i18n/{en,ru}.json`,
    missing: `provideWrI18n({
  defaultLocale: 'en',
  availableLocales: ['en', 'ru'],
  missingHandler: (key) => '⚠️ ' + key,
});`,
  };
}
