import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrI18n, WrTDirective, WrTPipe } from 'ngwr/i18n';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';

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
    RouterLink,
    WrTPipe,
    WrTDirective,
    WrSegmented,
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
  protected readonly localeOptions: readonly WrSegmentedOption<string>[] = this.i18n
    .available()
    .map(locale => ({ value: locale, label: locale }));
  protected readonly name = signal('Ada');

  protected use(locale: string | null): void {
    if (locale) this.i18n.use(locale);
  }

  protected readonly snippets = {
    injectionContext: `import { WrI18n, wrReadI18nText } from 'ngwr/i18n';

@Component({ /* … */ })
export class InvoiceCard {
  private readonly i18n = inject(WrI18n);

  // A field initializer is an injection context.
  protected readonly heading = wrReadI18nText('invoice.heading', 'Invoice');

  protected onCopy(): void {
    // A click handler is not: wrReadI18nText() would throw NG0203 here.
    this.toast.show(this.i18n.t('invoice.copied'));
  }
}

// Anywhere else:
const label = runInInjectionContext(injector, () => wrReadI18nText('x', 'X'));`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'WrI18n', description: 'Injectable service.', type: 'service', default: '—' },
    {
      name: 'locale',
      description: 'Active locale. Write it with `use()`.',
      type: 'Signal<string>',
      default: 'defaultLocale',
      sub: true,
    },
    {
      name: 'use(locale)',
      description:
        'Switch the locale. Ignored outside `availableLocales`; stored under `storageKey` for the next visit.',
      type: '(locale: string) => void',
      default: '—',
    },
    {
      name: 't(key, params?, scopeOrOptions?)',
      description:
        'Translate once. The third argument is a scope or `{ scope, fallback }`. A missing key returns `fallback` as is, or the `missingHandler` result when there is none.',
      type: '(key: string, params?: WrI18nParams, scopeOrOptions?: string | WrI18nTranslateOptions) => string',
      default: '—',
    },
    {
      name: 'translate(key, params?, scopeOrOptions?)',
      description: 'Translate as a signal that follows the locale and the catalogs. Same arguments as `t()`.',
      type: '(key: string, params?: WrI18nParams, scopeOrOptions?: string | WrI18nTranslateOptions) => Signal<string>',
      default: '—',
    },
    {
      name: 'registerScope(scope)',
      description: 'Register a feature scope; its catalogs load on every locale change.',
      type: '(scope: string) => Promise<WrI18nCatalog>',
      default: '—',
    },
    {
      name: 'available()',
      description: 'The configured locales.',
      type: '() => readonly string[]',
      default: '—',
    },
  ];

  protected readonly directiveApi = API.WrTDirective;

  /** Providers that wire the service up. */
  protected readonly providerApi: readonly DocApiRow[] = [
    {
      name: 'provideWrI18n(options?)',
      description:
        'Root provider: `defaultLocale` (from `LOCALE_ID`), `availableLocales`, `storageKey`, `missingHandler`, `loader`, all optional. A stored locale wins on boot; pass `storageKey: null` when the URL or the server decides.',
      type: '(options: ProvideWrI18nOptions = {}) => EnvironmentProviders',
      default: '—',
    },
    {
      name: 'provideWrI18nStaticLoader(catalogs, scopes?)',
      description:
        'Inline catalogs keyed by locale; `scopes` keyed by scope, then locale. Pass only your own keys here.',
      type: '(catalogs: WrI18nStaticCatalogs, scopes?: WrI18nStaticScopedCatalogs) => Provider',
      default: '—',
    },
    {
      name: 'provideWrI18nBaseCatalogs(catalogs)',
      description: "Register ngwr's catalogs (`wrEn`, `wrRu`, …) under yours, keyed by locale. Your keys win.",
      type: '(catalogs: WrI18nBaseCatalogs) => Provider',
      default: '—',
    },
    {
      name: 'provideWrI18nHttpLoader({ path, rootPath? })',
      description: 'Fetch JSON catalogs at runtime. `{locale}` and `{scope}` in the path are filled in.',
      type: '({ path, rootPath? }) => Provider',
      default: '—',
    },
  ];

  /** The third argument of `t()`, `translate()` and the pipe. */
  protected readonly optionsApi: readonly DocApiRow[] = [
    { name: 'scope', description: 'Scoped lookup first, then the root catalog.', type: 'string', default: '—' },
    {
      name: 'fallback',
      description:
        'Returned as is when the key is missing: not interpolated, and `missingHandler` is not called. `null` means none.',
      type: 'string | null',
      default: '—',
    },
  ];

  /** The template-side surface of the same service. */
  protected readonly templateApi: readonly DocApiRow[] = [
    {
      name: 'WrTPipe — `| wrT[: params][: scope | { scope, fallback }]`',
      description:
        'Impure pipe; re-evaluates on every change detection. `fallback` is the text for a missing key, shown as is.',
      type: 'pipe',
      default: '—',
    },
    {
      name: 'WrTDirective — `[wrT]="key" [wrTParams] [wrTScope] [wrTFallback]`',
      description: "Writes the host element's text on every locale change.",
      type: 'directive',
      default: '—',
    },
    {
      name: 'useI18nFormatter(key, fallback)',
      description: 'Returns a `(params) => string` for the key. `fallback` is required English text, not a scope.',
      type: '(key: string, fallback: string) => (params?: WrI18nParams) => string',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Translations',
      url: ['/guides', 'translations'],
    },
    {
      kind: 'Service',
      title: 'WrStorage',
      url: ['/reference/services', 'storage'],
    },
  ];
}
