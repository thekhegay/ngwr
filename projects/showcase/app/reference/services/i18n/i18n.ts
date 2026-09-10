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
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-svc-i18n-page',
  templateUrl: './i18n.html',
  imports: [
    WrTPipe,
    WrTDirective,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocApiComponent,
    DocCodeComponent,
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
    injectionContext: `import { Component, inject } from '@angular/core';
import { WrI18n, readI18nText } from 'ngwr/i18n';

@Component({ /* … */ })
export class InvoiceCard {
  private readonly i18n = inject(WrI18n);

  // Field initializer — an injection context. Fine.
  protected readonly heading = readI18nText('invoice.heading', 'Invoice');

  protected onCopy(): void {
    // readI18nText('invoice.copied', 'Copied') here throws NG0203:
    // a click handler is not an injection context.
    this.toast.show(this.i18n.t('invoice.copied'));   // this is the way
  }
}

// Outside a component altogether — a resolver, an interceptor, a helper:
const label = runInInjectionContext(injector, () => readI18nText('x', 'X'));`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'WrI18n', description: 'Injectable service.', type: 'service', default: '—' },
    {
      name: 'locale',
      description: 'Active locale signal. Read-only — use `use(locale)` to write.',
      type: 'Signal<string>',
      default: 'defaultLocale',
      sub: true,
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

  protected readonly directiveApi = API.WrTDirective;

  /** Providers that wire the service up. Previously only documented in the guide. */
  protected readonly providerApi: readonly DocApiRow[] = [
    {
      name: 'provideWrI18n(options?)',
      description:
        "Root provider. Pass `defaultLocale`, `availableLocales`, an optional `missingHandler`, and an optional `loader`. Every field is optional — called bare it takes `defaultLocale` from Angular's `LOCALE_ID`.",
      type: '(options: ProvideWrI18nOptions = {}) => EnvironmentProviders',
      default: '—',
    },
    {
      name: 'provideWrI18nStaticLoader(catalogs, scopes?)',
      description:
        'Inline catalogs at bootstrap. Best for small apps and SSR. `catalogs` is keyed by locale; `scopes` is keyed by scope name and then by locale, for a lazy feature that ships its own strings.',
      type: '(catalogs: WrI18nStaticCatalogs, scopes?: WrI18nStaticScopedCatalogs) => Provider',
      default: '—',
    },
    {
      name: 'provideWrI18nHttpLoader({ path, rootPath? })',
      description: 'Fetch JSON catalogs at runtime. `{locale}` and `{scope}` tokens interpolate.',
      type: '({ path, rootPath? }) => Provider',
      default: '—',
    },
  ];

  /** The template-side surface of the same service. */
  protected readonly templateApi: readonly DocApiRow[] = [
    {
      name: 'WrTPipe — `| wrT[: params][: scope]`',
      description: 'Impure pipe. Re-evaluates on every CD cycle.',
      type: 'pipe',
      default: '—',
    },
    {
      name: 'WrTDirective — `[wrT]="key" [wrTParams] [wrTScope]`',
      description: 'Writes `textContent` of the host element on locale change.',
      type: 'directive',
      default: '—',
    },
    {
      name: 'useI18nFormatter(key, fallback)',
      description:
        'Returns a `(params) => string` helper for the given key. The second argument is the English fallback the helper serves when no catalog carries the key — it is required, not a scope.',
      type: '(key: string, fallback: string) => (params?: WrI18nParams) => string',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Translations',
      url: ['/guides', 'translations'],
      description: 'How to actually use this: loaders, scopes, interpolation, a locale switcher.',
    },
    {
      kind: 'Service',
      title: 'WrStorage',
      url: ['/reference/services', 'storage'],
      description: 'Used to persist the active locale across reloads. Swap the engine to change where.',
    },
  ];
}
