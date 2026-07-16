import { Component, inject, signal } from '@angular/core';

import { WrI18n, WrTDirective, WrTPipe } from 'ngwr/i18n';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-svc-i18n-page',
  templateUrl: './i18n.html',
  imports: [
    WrTPipe,
    WrTDirective,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class I18nServicePage {
  private readonly i18n = inject(WrI18n);

  protected readonly locale = this.i18n.locale;
  protected readonly available = this.i18n.available();
  protected readonly name = signal('Ada');

  protected use(locale: string): void {
    this.i18n.use(locale);
  }

  protected readonly snippets = {
    install: `import { provideHttpClient } from '@angular/common/http';
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
    pipe: `<h1>{{ 'app.title' | wrT }}</h1>
<p>{{ 'app.hello' | wrT: { name: user().name } }}</p>
<button>{{ 'common.save' | wrT }}</button>`,
    directive: `<h1 [wrT]="'app.title'"></h1>
<p [wrT]="'app.hello'" [wrTParams]="{ name: user().name }"></p>`,
    service: `const i18n = inject(WrI18n);
i18n.use('ru');                                 // switch locale
i18n.t('app.hello', { name: 'Ada' });           // → 'Привет, Ada!'

// Reactive lookup — re-runs on locale change:
const title = i18n.translate('app.title');
effect(() => console.log(title()));`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'locale',
      description: 'Active locale signal. Read-only — use `use(locale)` to write.',
      type: 'Signal<string>',
      default: 'defaultLocale',
    },
    {
      name: 'use(locale)',
      description: 'Switch the active locale. Ignored if outside `availableLocales`. Persists via WrStorage.',
      type: '(locale: string) => void',
      default: '—',
    },
    {
      name: 't(key, params?, scope?)',
      description: 'Eager translate. Returns the value, or the missing-handler fallback.',
      type: '(key, params?, scope?) => string',
      default: '—',
    },
    {
      name: 'translate(key, params?, scope?)',
      description: 'Reactive translate — `Signal<string>` that re-evaluates on locale + catalog changes.',
      type: '(key, params?, scope?) => Signal<string>',
      default: '—',
    },
    {
      name: 'registerScope(scope)',
      description: 'Register a feature scope. Catalogs auto-load on every locale change.',
      type: '(scope: string) => Promise<WrI18nCatalog>',
      default: '—',
    },
    {
      name: 'available()',
      description: 'Available locales — pass-through from config.',
      type: '() => readonly string[]',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'i18n tutorial',
      url: ['/guides', 'i18n'],
      description: 'Step-by-step walkthrough — provider wiring, locale switcher, scopes, custom missing-key handler.',
    },
    {
      kind: 'Service',
      title: 'WrStorage',
      url: ['/reference/services', 'storage'],
      description: 'Used to persist the active locale across reloads. Swap the engine to change where.',
    },
  ];
}
