import {
  type ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { provideWrDateAdapter } from 'ngwr/date';
import { provideWrDensity } from 'ngwr/density';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrEn } from 'ngwr/i18n/en';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrIcons } from 'ngwr/icon';
import { provideWrLoadingBarRouter } from 'ngwr/loading-bar/router';
import { provideWrMarkdownHighlighter } from 'ngwr/markdown';
import { provideWrOverlay } from 'ngwr/overlay';
import { provideWrTheme } from 'ngwr/theme';
import { provideEnvironmentNgxMask } from 'ngx-mask';

import { COMMON_ICONS } from '#core/icons';
import { shikiMarkdownHighlighter } from '#core/shiki';
import { routing } from '#routing';

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
    provideClientHydration(),
    // Reset to top on every forward navigation; back / forward restores
    // the previous position. `anchorScrolling` makes `#fragment` links work.
    provideRouter(routing, withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })),
    // ngwr
    provideWrOverlay(),
    provideWrLoadingBarRouter(),
    // Default icon registry — names every showcase page can reference
    // without re-registering. Page-level `provideWrIcons(...)` adds on
    // top (the lib merges root + element-level multi-providers).
    provideWrIcons([...COMMON_ICONS]),
    provideWrDateAdapter(),
    // Colour for every fenced code block `<wr-markdown>` renders. Returns
    // coloured SPANS rather than HTML — see the adapter — and answers `null`
    // during prerender, so the static HTML ships plain code and gains colour on
    // hydration.
    provideWrMarkdownHighlighter(shikiMarkdownHighlighter),
    provideWrTheme(),
    provideWrDensity(),
    provideWrI18n({ availableLocales: ['en', 'ru'], defaultLocale: 'en' }),
    provideWrI18nStaticLoader({
      en: { ...wrEn, app: { title: 'ngwr i18n demo', hello: 'Hello, {{name}}!' } },
      ru: { ...wrRu, app: { title: 'Демо ngwr i18n', hello: 'Привет, {{name}}!' } },
    }),
    // third-party — for the integration guide
    provideEnvironmentNgxMask(),
  ],
};
