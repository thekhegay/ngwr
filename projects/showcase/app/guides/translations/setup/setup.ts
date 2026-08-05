import { Component } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-translate-setup-page',
  templateUrl: './setup.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent],
})
export default class TranslateSetupPage {
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
