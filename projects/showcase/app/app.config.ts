import {
  type ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { provideWr } from 'ngwr';
import { withDensity } from 'ngwr/density';
import { provideWrI18n, provideWrI18nBaseCatalogs, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrEn } from 'ngwr/i18n/en';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrIcons } from 'ngwr/icon';
import { provideWrLoadingBarRouter } from 'ngwr/loading-bar/router';
import { provideEnvironmentNgxMask } from 'ngx-mask';

import { VALIDATION_EN, VALIDATION_RU } from './app.validation';
import { routing } from './routing';

import { COMMON_ICONS } from '#core/icons';

/**
 * Providers shared by the browser entry (`main.ts`) and the prerender entry
 * (`main.server.ts`, which merges these with the server-rendering providers).
 * Keep everything platform-agnostic here — anything browser-only belongs in
 * `app.config.ts`'s consumer, not in this shared config.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // angular
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    // Reuse the prerendered DOM instead of throwing it away and re-rendering
    // on boot. Requires server and client to agree on structure — see the
    // CSS-driven nav split in `layout.scss` and the platform-resolved date
    // locale in `WR_DATE_LOCALE`. `wr-window` needs neither, and not because it
    // opts out: `WrWindowManager` portals it into an overlay at runtime, so the
    // module-load `DETECTED_OS` in `window.ts` — 'windows' on the server, the
    // real OS in the browser — is never in prerendered DOM to disagree with.
    // `withEventReplay()` is the half that is still opt-in — incremental
    // hydration became the default in Angular 22, so `withIncrementalHydration()`
    // is deprecated and this call already has it. Replay matters most on a
    // prerendered docs site: the HTML paints long before the bundle boots, so a
    // click on a demo button in that window would otherwise be swallowed.
    provideClientHydration(withEventReplay()),
    // Reset to top on every forward navigation; back / forward restores
    // the previous position. `anchorScrolling` makes `#fragment` links work.
    provideRouter(routing, withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })),
    // ngwr
    provideWrLoadingBarRouter(),
    // Default icon registry — names every showcase page can reference
    // without re-registering. Page-level `provideWrIcons(...)` adds on
    // top (the lib merges root + element-level multi-providers).
    provideWrIcons([...COMMON_ICONS]),
    provideWr(withDensity()),
    provideWrI18n({ availableLocales: ['en', 'ru'], defaultLocale: 'en' }),
    // ngwr's own strings as a base, so the loader carries only the site's keys —
    // the form every docs page recommends, rather than a shallow spread. The
    // validation copy is ours: ngwr ships none.
    provideWrI18nBaseCatalogs({ en: wrEn, ru: wrRu }),
    provideWrI18nStaticLoader({
      en: { app: { title: 'ngwr i18n demo', hello: 'Hello, {{name}}!' }, validation: VALIDATION_EN },
      ru: { app: { title: 'Демо ngwr i18n', hello: 'Привет, {{name}}!' }, validation: VALIDATION_RU },
    }),
    // third-party — for the integration guide
    provideEnvironmentNgxMask(),
  ],
};
