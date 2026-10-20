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
    injectionContext: `import { WrI18n, readI18nText } from 'ngwr/i18n';

@Component({ /* … */ })
export class InvoiceCard {
  private readonly i18n = inject(WrI18n);

  // A field initializer is an injection context.
  protected readonly heading = readI18nText('invoice.heading', 'Invoice');

  protected onCopy(): void {
    // A click handler is not: readI18nText() would throw NG0203 here.
    this.toast.show(this.i18n.t('invoice.copied'));
  }
}

// Anywhere else:
const label = runInInjectionContext(injector, () => readI18nText('x', 'X'));`,
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
      name: 't(key, params?, scope?)',
      description: 'Translate once. Returns the value or the missing-handler fallback.',
      type: '(key, params?, scope?) => string',
      default: '—',
    },
    {
      name: 'translate(key, params?, scope?)',
      description: 'Translate as a signal that follows the locale and the catalogs.',
      type: '(key, params?, scope?) => Signal<string>',
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

  /** The template-side surface of the same service. */
  protected readonly templateApi: readonly DocApiRow[] = [
    {
      name: 'WrTPipe — `| wrT[: params][: scope]`',
      description: 'Impure pipe; re-evaluates on every change detection.',
      type: 'pipe',
      default: '—',
    },
    {
      name: 'WrTDirective — `[wrT]="key" [wrTParams] [wrTScope]`',
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
