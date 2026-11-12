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
  /** A reference page for the feature, linked from the row. */
  readonly page?: string;
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
      sets: '{ locale } pins the date locale (default: the interface language); { timeZone } is the zone dates are shown in; { epochUnit, zonelessIn } say how backend values are read; { stamp } sets the wr-date-stamp defaults; { adapter } is your own adapter',
    },
    { feature: 'withStorage()', entry: 'ngwr/storage', sets: 'Storage engine, key prefix and default TTL' },
    { feature: 'withMeta()', entry: 'ngwr/meta', sets: 'Title template and default Open Graph and Twitter tags' },
    { feature: 'withWindows()', entry: 'ngwr/window', sets: 'The work area windows keep inside: insets or an element' },
    {
      feature: 'withDialog()',
      entry: 'ngwr/dialog',
      sets: 'Dialog defaults: tabTitle names the browser tab after the open dialog',
    },
    {
      feature: 'withRenderOnNavigation()',
      entry: 'ngwr/utils/router',
      page: wrPath(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.withRenderOnNavigation),
      sets: 'Zoneless: a routed page is bound before the browser paints it, so no transition runs from browser defaults',
    },
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
import { wrLucideIcons, provideWrIcons } from 'ngwr/icon';
import {
  provideWrI18n,
  provideWrI18nBaseCatalogs,
  provideWrI18nStaticLoader,
} from 'ngwr/i18n';
import { wrEn } from 'ngwr/i18n/en';
import { provideWrLoadingBarRouter } from 'ngwr/loading-bar/router';

providers: [
  provideWrIcons(wrLucideIcons({ check: Check, plus: Plus })),
  provideWrI18n(),
  provideWrI18nBaseCatalogs({ en: wrEn }),
  provideWrI18nStaticLoader({ en: { app: { title: 'My app' } } }),
  provideRouter(routes),
  provideWrLoadingBarRouter(),
],`,

    timeZone: `import { inject } from '@angular/core';
import { provideWr } from 'ngwr';
import { withDates } from 'ngwr/date';

// A fixed zone, or an offset: '+05:00', '+05:30'.
providers: [provideWr(withDates({ timeZone: 'Asia/Almaty' }))],

// From a config that loads after bootstrap. AppConfig.timeZone is a signal,
// null until the config arrives: the browser's zone until then.
providers: [provideWr(withDates({ timeZone: () => inject(AppConfig).timeZone() }))],`,
    backend: `import { provideWr } from 'ngwr';
import { withDates } from 'ngwr/date';

providers: [
  provideWr(
    withDates({
      timeZone: '+0500',
      epochUnit: 'auto',       // 1794473100000 and 1794473100000123 are the same moment
      zonelessIn: 'display',   // '2026-11-12 13:45:00' is 13:45 on the site, and prints as 13:45
      stamp: { dateFormat: 'd MMM y', timeFormat: 'HH:mm' },
    })
  ),
],`,

    language: `import { provideWr } from 'ngwr';
import { withDates } from 'ngwr/date';
import { WrI18n, provideWrI18n } from 'ngwr/i18n';

// Dates are written in the interface language.
providers: [provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru', 'kk', 'en'] })],

// A switch at runtime rewrites every date on screen: wrDate, the calendar, the pickers.
inject(WrI18n).use('kk');

// A pin. The language switch no longer moves dates.
providers: [provideWr(withDates({ locale: 'ru-RU' }))],`,

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
