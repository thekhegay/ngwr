import { provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { provideWrDateAdapter } from 'ngwr/date-adapter';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrEn } from 'ngwr/i18n/en';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrOverlay } from 'ngwr/overlay';
import { provideWrTheme } from 'ngwr/theme';

import { RootComponent } from '#root';
import { routing } from '#routing';

void bootstrapApplication(RootComponent, {
  providers: [
    // angular
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routing),
    // ngwr
    provideWrOverlay(),
    provideWrDateAdapter(),
    provideWrTheme(),
    provideWrI18n({ availableLocales: ['en', 'ru'], defaultLocale: 'en' }),
    provideWrI18nStaticLoader({
      en: { ...wrEn, app: { title: 'ngwr i18n demo', hello: 'Hello, {{name}}!' } },
      ru: { ...wrRu, app: { title: 'Демо ngwr i18n', hello: 'Привет, {{name}}!' } },
    }),
  ],
});
