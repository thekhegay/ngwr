import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';
import { ROUTES, wrPath } from '#routes';

/** One `provideWr()` feature: where it lives and what it sets. */
interface FeatureRow {
  readonly feature: string;
  readonly entry: string;
  readonly sets: string;
}

@Component({
  selector: 'ngwr-gs-configuration-page',
  templateUrl: './configuration.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocSeeAlsoComponent, RouterLink],
})
export default class ConfigurationPage {
  protected readonly themePath = wrPath(ROUTES.reference, ROUTES.reference.services, ROUTES.reference.services.theme);
  protected readonly i18nPath = wrPath(ROUTES.guides, ROUTES.guides.translations, ROUTES.guides.translations.setup);

  protected readonly features: readonly FeatureRow[] = [
    { feature: 'withDensity()', entry: 'ngwr/density', sets: 'Default density: sm, md, lg or touch' },
    { feature: 'withToast()', entry: 'ngwr/toast', sets: 'Toast defaults: position, duration, maxStack, labels' },
    { feature: 'withTheme()', entry: 'ngwr/theme', sets: 'Default mode (light, dark or auto) and the storage key' },
    {
      feature: 'withDates()',
      entry: 'ngwr/date',
      sets: '{ locale } pins the date locale (default: LOCALE_ID); { adapter } is your own adapter',
    },
    { feature: 'withStorage()', entry: 'ngwr/storage', sets: 'Storage engine, key prefix and default TTL' },
    { feature: 'withMeta()', entry: 'ngwr/meta', sets: 'Title template and default Open Graph and Twitter tags' },
  ];

  protected readonly snippets = {
    provideWr: `import { provideWr } from 'ngwr';
import { withDensity } from 'ngwr/density';
import { withTheme } from 'ngwr/theme';
import { withToast } from 'ngwr/toast';

export const appConfig: ApplicationConfig = {
  providers: [
    provideWr(
      withDensity({ defaultDensity: 'sm' }),
      withToast({ position: 'bottom-end', duration: 6000 }),
      withTheme({ defaultMode: 'dark' }),
    ),
  ],
};`,

    other: `import { Check, Plus } from 'lucide';
import { lucideIcons, provideWrIcons } from 'ngwr/icon';
import {
  provideWrI18n,
  provideWrI18nBaseCatalogs,
  provideWrI18nStaticLoader,
} from 'ngwr/i18n';
import { wrEn } from 'ngwr/i18n/en';
import { provideWrLoadingBarRouter } from 'ngwr/loading-bar/router';

providers: [
  provideWrIcons(lucideIcons({ check: Check, plus: Plus })),
  provideWrI18n(),
  provideWrI18nBaseCatalogs({ en: wrEn }),
  provideWrI18nStaticLoader({ en: { app: { title: 'My app' } } }),
  provideRouter(routes),
  provideWrLoadingBarRouter(),
],`,

    dateAdapter: `import { Service } from '@angular/core';
import { provideWr } from 'ngwr';
import { WrDateAdapter, withDates, type WrDateFormat } from 'ngwr/date';

@Service()
export class AppDateAdapter extends WrDateAdapter<Date> {
  today(): Date { /* … */ }
  createDate(year: number, month: number, day: number): Date { /* month is 0-based */ }
  // Every WrDateFormat key, the 12h / 24h / Seconds variants of time and shortDateTime included.
  format(date: Date, format: WrDateFormat | (string & {})): string { /* … */ }
  // Must read back what format() printed. Return null to refuse the input.
  parse(value: string, format: WrDateFormat | (string & {})): Date | null { /* … */ }
  // …and the other abstract members of WrDateAdapter.
}

providers: [provideWr(withDates({ adapter: AppDateAdapter }))],`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Translations', url: ['/guides', 'translations'] },
    { kind: 'Guide', title: 'Theming', url: ['/guides', 'theming'] },
    { kind: 'Guide', title: 'Server-side rendering', url: ['/guides', 'ssr'] },
  ];
}
