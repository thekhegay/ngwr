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
    httpBuiltIns: `// IMPORTANT: the loader REPLACES the catalog, it does not extend it.
// A JSON file with only your own keys leaves every ngwr built-in string
// falling back to its hardcoded English default — silently, no warning.
//
// ngwr ships its catalogs as JSON for exactly this path, so merge them in:
//   node_modules/ngwr/i18n/en.json
//   node_modules/ngwr/i18n/ru.json

// e.g. a tiny prebuild step
import wrEn from 'ngwr/i18n/en.json' with { type: 'json' };
import wrRu from 'ngwr/i18n/ru.json' with { type: 'json' };
import { writeFileSync } from 'node:fs';

writeFileSync('public/i18n/en.json', JSON.stringify({ ...wrEn, app: myEn }));
writeFileSync('public/i18n/ru.json', JSON.stringify({ ...wrRu, app: myRu }));`,
    missing: `provideWrI18n({
  defaultLocale: 'en',
  availableLocales: ['en', 'ru'],
  missingHandler: (key) => '⚠️ ' + key,
});`,
  };
}
