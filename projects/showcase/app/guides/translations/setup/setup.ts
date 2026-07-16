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
    missing: `provideWrI18n({
  defaultLocale: 'en',
  availableLocales: ['en', 'ru'],
  missingHandler: (key) => '⚠️ ' + key,
});`,
  };
}
