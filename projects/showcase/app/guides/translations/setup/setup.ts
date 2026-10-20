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
    static: `import { provideWrI18n, provideWrI18nBaseCatalogs, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrEn } from 'ngwr/i18n/en';
import { wrRu } from 'ngwr/i18n/ru';

bootstrapApplication(AppComponent, {
  providers: [
    provideWrI18n({ defaultLocale: 'en', availableLocales: ['en', 'ru'] }),
    provideWrI18nBaseCatalogs({ en: wrEn, ru: wrRu }),
    provideWrI18nStaticLoader({
      en: { app: { title: 'My app' } },
      ru: { app: { title: 'Моё приложение' } },
    }),
  ],
});`,
    http: `import { provideHttpClient } from '@angular/common/http';
import { provideWrI18n, provideWrI18nBaseCatalogs, provideWrI18nHttpLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
    provideWrI18nBaseCatalogs({ ru: wrRu }),
    provideWrI18nHttpLoader({ path: '/assets/i18n/{locale}.json' }),
  ],
});`,
    missing: `provideWrI18n({
  defaultLocale: 'en',
  availableLocales: ['en', 'ru'],
  missingHandler: (key) => '⚠️ ' + key,
});`,
  };
}
