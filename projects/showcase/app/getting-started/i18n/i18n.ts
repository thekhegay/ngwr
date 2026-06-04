import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrButton } from 'ngwr/button';
import { WrI18n, WrTDirective, WrTPipe } from 'ngwr/i18n';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-gs-i18n-page',
  templateUrl: './i18n.html',
  imports: [
    RouterLink,
    WrButton,
    WrTPipe,
    WrTDirective,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
  ],
})
export default class I18nTutorialPage {
  private readonly i18n = inject(WrI18n);

  protected readonly locale = this.i18n.locale;
  protected readonly available = this.i18n.available();
  protected readonly name = signal('Ada');

  protected use(locale: string): void {
    this.i18n.use(locale);
  }

  protected readonly snippets = {
    install: `pnpm add ngwr`,

    provider: `import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
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

    // Spread the base catalogs ngwr ships with so built-in component
    // strings (table empty state, pagination labels, select placeholder…)
    // already resolve. Add your own keys alongside.
    provideWrI18nStaticLoader({
      en: { ...wrEn, app: { title: 'My app', hello: 'Hello, {{name}}!' } },
      ru: { ...wrRu, app: { title: 'Моё приложение', hello: 'Привет, {{name}}!' } },
    }),
  ],
});`,

    pipe: `<!-- Pipe form — reactive, re-evaluates on locale + catalog changes. -->
<h1>{{ 'app.title' | wrT }}</h1>
<p>{{ 'app.hello' | wrT: { name: user().name } }}</p>
<button>{{ 'common.save' | wrT }}</button>`,

    directive: `<!-- Directive form — sets textContent of the host. Tidier when the
     whole element is a translation. -->
<h1 [wrT]="'app.title'"></h1>
<p
  [wrT]="'app.hello'"
  [wrTParams]="{ name: user().name }"
></p>`,

    service: `import { inject } from '@angular/core';
import { WrI18n } from 'ngwr/i18n';

const i18n = inject(WrI18n);

// Eager — returns the value or the missing-handler fallback.
i18n.t('app.hello', { name: 'Ada' });   // → 'Hello, Ada!'

// Reactive — a signal that recomputes on locale change.
const title = i18n.translate('app.title');
effect(() => console.log(title()));

// Switch locale. Persists via WrStorage.
i18n.use('ru');
i18n.available();  // → readonly ['en', 'ru']`,

    switcher: `import { Component, inject } from '@angular/core';
import { WrI18n } from 'ngwr/i18n';

@Component({
  selector: 'app-locale-switch',
  template: \`
    @for (lc of locales; track lc) {
      <button (click)="use(lc)">{{ lc }}</button>
    }
  \`,
})
export class LocaleSwitch {
  private readonly i18n = inject(WrI18n);
  protected readonly locales = this.i18n.available();
  protected use(lc: string) { this.i18n.use(lc); }
}`,

    http: `// HTTP loader — fetch catalogs as JSON. Requires provideHttpClient.
provideWrI18nHttpLoader({
  path: '/assets/i18n/{locale}.json',
});

// Layout:
//   public/assets/i18n/en.json
//   public/assets/i18n/ru.json
//
// Each file is a plain JSON catalog:
//   {
//     "app": { "title": "My app", "hello": "Hello, {{name}}!" }
//   }`,

    scopes: `// Scopes = per-feature catalogs you load lazily. Register from a
// feature module / route's canActivate to defer the fetch.
provideWrI18nHttpLoader({
  path: '/assets/i18n/{scope}/{locale}.json',
  rootPath: '/assets/i18n/{locale}.json',
});

// In the feature:
const i18n = inject(WrI18n);
await i18n.registerScope('checkout');
// → fetches /assets/i18n/checkout/en.json (and switches when the locale does)

// Use scoped keys explicitly:
{{ 'forms.save' | wrT: null : 'checkout' }}`,

    catalog: `// Catalog shape — nested or flat. Dotted keys walk the tree.
{
  "common": {
    "ok": "OK",
    "cancel": "Cancel",
    "loading": "Loading…"
  },
  "app": {
    "title": "My app",
    "hello": "Hello, {{name}}!",
    "greeting": "Good {{partOfDay}}, {{name}}"
  }
}

// '{{name}}' interpolation tokens get replaced at render time.
// Missing params resolve to ''.`,

    missing: `// Default behavior: missing keys return the key itself ('app.title'),
// which makes typos visible. Provide your own handler for prod logging
// or a localized fallback.
provideWrI18n({
  missingHandler: (key, locale) => {
    if (!production) console.warn(\`[i18n] missing "\${key}" in \${locale}\`);
    return key;
  },
});`,
  };
}
