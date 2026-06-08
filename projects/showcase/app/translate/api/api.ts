import { Component } from '@angular/core';

import { DocApiComponent, type DocApiRow, DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-translate-api-page',
  templateUrl: './api.html',
  imports: [DocPageComponent, DocSectionComponent, DocApiComponent],
})
export default class TranslateApiPage {
  protected readonly serviceApi: readonly DocApiRow[] = [
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
}
