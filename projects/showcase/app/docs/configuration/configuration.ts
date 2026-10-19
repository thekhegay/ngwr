import { Component } from '@angular/core';

import {
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

@Component({
  selector: 'ngwr-gs-configuration-page',
  templateUrl: './configuration.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocSeeAlsoComponent],
})
export default class ConfigurationPage {
  protected readonly snippets = {
    bootstrap: `import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';

import { Plus, Trash2 } from 'lucide';

import { lucideIcons, provideWrIcons } from 'ngwr/icon';
import { provideWrToastConfig } from 'ngwr/toast';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { provideWrDensity } from 'ngwr/density';

import { AppComponent } from './app/app';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),

    // ngwr ---------------------------------------------------------------
    provideWrIcons(lucideIcons({ plus: Plus, trash: Trash2 })),
    provideWrToastConfig({ position: 'top-end', duration: 4000 }),
    provideWrDensity({ defaultDensity: 'lg' }),
    provideWrI18n(),
    provideWrI18nStaticLoader({ en: { /* … */ } }),
  ],
});`,

    overlay: `// styles.scss — nothing to provide. ngwr's overlays render into a container of
// their own, tagged .wr-overlay-container beside CDK's .cdk-overlay-container,
// so a rule scoped to it reaches ngwr's panels and none of Material's,
// NG-ZORRO's or your own CDK overlays'. Not a z-index, though: CDK 22 promotes
// overlays into the browser's top layer, which no z-index reaches.
.wr-overlay-container .cdk-overlay-pane {
  font-size: var(--wr-text-sm);
}`,

    icons: `import { Check, Plus, Trash2 } from 'lucide';
import { lucideIcons, provideWrIcons } from 'ngwr/icon';

// Register a tree-shaken icon set. Only the icons you list are bundled —
// lucideIcons() takes the imported icon data and wraps it as
// \`WrIconDef\` at runtime, so unused Lucide icons get dropped by the bundler.
providers: [provideWrIcons(lucideIcons({ plus: Plus, trash: Trash2, check: Check }))],`,

    toast: `import { provideWrToastConfig } from 'ngwr/toast';

// Defaults for the global toast service. Call \`inject(WrToast).show(...)\`
// anywhere — the service itself needs no provider.
// position: 'top-start' | 'top' | 'top-end' | 'bottom-start' | 'bottom' | 'bottom-end'
providers: [provideWrToastConfig({ position: 'bottom-end', maxStack: 5 })],`,

    i18n: `import { provideWrI18n, provideWrI18nBaseCatalogs, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrEn } from 'ngwr/i18n/en';
import { wrRu } from 'ngwr/i18n/ru';

providers: [
  provideWrI18n({ defaultLocale: 'en', availableLocales: ['en', 'ru'] }),
  // ngwr's strings, looked up key by key underneath yours. Not a
  // \`{ ...wrEn, ...yours }\` spread: it is shallow, so any namespace you share
  // with ngwr, e.g. \`common\`, \`form\`, \`table\`, keeps only one side's keys.
  provideWrI18nBaseCatalogs({ en: wrEn, ru: wrRu }),
  provideWrI18nStaticLoader({
    en: { app: { title: 'My app' } },
    ru: { app: { title: 'Мое приложение' } },
  }),
],`,

    dateAdapter: `import { provideWrDateAdapter } from 'ngwr/date';

// Nothing to provide for the native adapter: it formats in LOCALE_ID's locale.
// Pin the dates to another one:
providers: [provideWrDateAdapter({ locale: 'ru-RU' })],

// Or bring your own, over the date library the app already uses. Extend
// WrDateAdapter<Date> and do the math, formatting and parsing through that
// library: the components hold and compare native Date values. Implement what
// it declares abstract; isNamedFormat() tells a named key from a token string.
import { Service } from '@angular/core';
import { WrDateAdapter, type WrDateFormat } from 'ngwr/date';

@Service()
export class AppDateAdapter extends WrDateAdapter<Date> {
  today(): Date { /* … */ }
  createDate(year: number, month: number, day: number): Date { /* month is 0-based */ }
  // …clone, isValid, the getters from getYear to getSeconds, addYears /
  // addMonths / addDays / setTime, isSameDay / isSameMonth / compareDate,
  // getFirstDayOfWeek, getDayOfWeekNames, getMonthNames, and:
  format(date: Date, format: WrDateFormat | (string & {})): string { /* … */ }
  // Must read back whatever format() printed; null refuses the input.
  parse(value: string, format: WrDateFormat | (string & {})): Date | null { /* … */ }
}

providers: [provideWrDateAdapter({ adapter: AppDateAdapter })],`,

    density: `import { provideWrDensity } from 'ngwr/density';

// App-wide default density: 'sm' | 'md' (default) | 'lg' | 'touch'.
// The other two fields are storageKey and attribute — a preset is the only
// knob the provider takes.
providers: [provideWrDensity({ defaultDensity: 'sm' })],

// Fine-grained is CSS, not config: a preset is only a set of multipliers, so
// a value between two presets is a stylesheet override, on :root or a subtree.
//   :root {
//     --wr-density-y: 0.7;   /* vertical padding — the lever on height */
//     --wr-density-x: 0.9;   /* horizontal padding */
//   }`,

    theme: `import { inject, provideEnvironmentInitializer } from '@angular/core';

import { DEFAULT_WR_THEME_CONFIG, WR_THEME_CONFIG, WrTheme } from 'ngwr/theme';

// Nothing to provide for the defaults: the page follows the OS through
// color-scheme, and WrTheme is root-provided. Override the token only to
// change them — 'light' | 'dark' | 'auto', and the localStorage key the
// choice persists under (null turns persistence off).
providers: [
  {
    provide: WR_THEME_CONFIG,
    useValue: { ...DEFAULT_WR_THEME_CONFIG, defaultMode: 'dark', storageKey: 'app-theme' },
  },
  // A default other than 'auto' — and a stored choice — applies when WrTheme
  // is first injected, and nothing injects it for you: with the toggle behind
  // a lazy route, the page follows the OS until someone opens that route.
  // Inject it once at boot, or ship the pre-paint script with the same
  // options, which also lands before the first paint of a prerendered page:
  //   wrThemePrePaintScript({ defaultMode: 'dark', storageKey: 'app-theme' })
  provideEnvironmentInitializer(() => inject(WrTheme)),
],`,

    loadingBar: `import { WrLoadingBar, WrLoadingBarComponent } from 'ngwr/loading-bar';
import { provideWrLoadingBarRouter } from 'ngwr/loading-bar/router';

// Only if navigations should drive the bar. Manual start() / complete() work
// without it, and a bar with no router adapter simply never moves on its own.
providers: [provideRouter(routes), provideWrLoadingBarRouter()],

// Render the component once in your root template, and drive it through the
// injectable \`WrLoadingBar\` service for anything that is not a navigation.
@Component({
  selector: 'app-root',
  imports: [WrLoadingBarComponent],
  template: \`<wr-loading-bar color="var(--wr-color-primary)" height="2px" />\`,
})
export class AppComponent {
  private readonly loading = inject(WrLoadingBar);
}`,

    cookie: `import { WrCookie } from 'ngwr/cookie';

// No provider to register — inject the service anywhere for typed
// has / get / set / remove / keys / clear on document.cookie, with SSR-safe
// fallbacks.
private readonly cookie = inject(WrCookie);`,

    storage: `import { provideWrStorage } from 'ngwr/storage';

// Swappable engine + TTL + watch signal. Defaults to localStorage in the
// browser and an in-memory store on the server (and in private mode, where
// setItem throws). Inject \`WrStorage\` to use it.
// \`engine\` takes a Storage INSTANCE, or a factory called lazily.
providers: [provideWrStorage({ engine: sessionStorage, prefix: 'app:' })],`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Server-side rendering',
      url: ['/guides', 'ssr'],
      description:
        'What these providers do during a server render — including the two overlay calls that are not no-ops there, and the pre-paint script that applies an explicit theme choice before first paint.',
    },
    {
      kind: 'Guide',
      title: 'Mobile & responsive',
      url: ['/guides', 'mobile'],
      description:
        'The touch story beside these providers: touch targets, the `touch` density preset and container-query reflow.',
    },
    {
      kind: 'Guide',
      title: 'Reactive forms',
      url: ['/guides', 'forms'],
      description:
        "What Angular 22's bridge carries and what it drops, once these providers are in place and you bind a control.",
    },
  ];
}
