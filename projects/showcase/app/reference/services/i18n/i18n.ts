import { Component, inject, signal } from '@angular/core';

import { WrI18n, WrTDirective, WrTPipe } from 'ngwr/i18n';

import {
  DocApiComponent,
  type DocApiRow,
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

  /** Providers that wire the service up. Previously only documented in the guide. */
  protected readonly providerApi: readonly DocApiRow[] = [
    {
      name: 'provideWrI18n(config)',
      description: 'Root provider. Pass `defaultLocale`, `availableLocales`, and optional `missingHandler`.',
      type: '(config: WrI18nConfig) => Provider',
      default: '—',
    },
    {
      name: 'provideWrI18nStaticLoader(catalogs)',
      description: 'Inline catalogs at bootstrap. Best for small apps and SSR.',
      type: '(catalogs: Record<string, WrI18nCatalog>) => Provider',
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
      name: 'useI18nFormatter(key, scope?)',
      description: 'Returns a `(params) => string` helper for the given key.',
      type: '(key, scope?) => (params) => string',
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
