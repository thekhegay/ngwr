import { provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { provideWrDateAdapter } from 'ngwr/date-adapter';
import { provideWrDensity } from 'ngwr/density';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrEn } from 'ngwr/i18n/en';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrOverlay } from 'ngwr/overlay';
import { provideWrTheme } from 'ngwr/theme';
import { provideEnvironmentNgxMask } from 'ngx-mask';

import { RootComponent } from '#root';
import { routing } from '#routing';

void bootstrapApplication(RootComponent, {
  providers: [
    // angular
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    // Reset to top on every forward navigation; back / forward restores
    // the previous position. `anchorScrolling` makes `#fragment` links work.
    provideRouter(routing, withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })),
    // ngwr
    provideWrOverlay(),
    provideWrDateAdapter(),
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
});
