import { Component } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-gs-configuration-page',
  templateUrl: './configuration.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent],
})
export default class ConfigurationPage {
  protected readonly snippets = {
    bootstrap: `import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';

import { Plus, Trash2 } from 'lucide';

import { provideWrOverlay } from 'ngwr/overlay';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { provideWrToastConfig } from 'ngwr/toast';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { provideWrDateAdapter } from 'ngwr/date-adapter';
import { provideWrDensity } from 'ngwr/density';
import { provideWrTheme } from 'ngwr/theme';

import { AppComponent } from './app/app';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),

    // ngwr ---------------------------------------------------------------
    provideWrOverlay(),
    provideWrIcons(lucideIcons({ plus: Plus, trash: Trash2 })),
    provideWrToastConfig({ position: 'top-end', duration: 4000 }),
    provideWrTheme({ defaultMode: 'auto' }),
    provideWrDensity({ defaultDensity: 'lg' }),
    provideWrDateAdapter(),
    provideWrI18n(),
    provideWrI18nStaticLoader({ en: { /* … */ } }),
  ],
});`,

    overlay: `import { provideWrOverlay } from 'ngwr/overlay';

// Required for every overlay-backed component — dialog, drawer, popover,
// tooltip, dropdown, select, mention, command-palette, context-menu, and
// every picker. Creates an isolated overlay container so portal overlays
// don't leak into the app root.
providers: [provideWrOverlay()],`,

    icons: `import { Check, Plus, Trash2 } from 'lucide';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

// Register a tree-shaken icon set. Only the icons you list are bundled —
// the Lucide adapter takes the imported icon data and wraps it as
// \`WrIconDef\` at runtime, so unused Lucide icons get dropped by the bundler.
providers: [provideWrIcons(lucideIcons({ plus: Plus, trash: Trash2, check: Check }))],`,

    toast: `import { provideWrToast } from 'ngwr/toast';

// Global toast service. Call \`inject(WrToast).open(...)\` anywhere.
providers: [provideWrToast({ position: 'bottom-right', max: 5 })],`,

    i18n: `import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrEn } from 'ngwr/i18n/en';
import { wrRu } from 'ngwr/i18n/ru';

providers: [
  provideWrI18n({ defaultLocale: 'en', available: ['en', 'ru'] }),
  provideWrI18nStaticLoader({
    en: { ...wrEn, app: { title: 'My app' } },
    ru: { ...wrRu, app: { title: 'Мое приложение' } },
  }),
],`,

    dateAdapter: `import { provideWrDateAdapter } from 'ngwr/date-adapter';

// Native Date adapter — zero extra deps.
providers: [provideWrDateAdapter()],

// Or date-fns:
import { WrDateFnsAdapter } from 'ngwr/date-adapter-fns';
providers: [provideWrDateAdapter({ adapter: WrDateFnsAdapter })],

// Or Luxon:
import { WrLuxonAdapter } from 'ngwr/date-adapter-luxon';
providers: [provideWrDateAdapter({ adapter: WrLuxonAdapter })],`,

    density: `import { provideWrDensity } from 'ngwr/density';

// App-wide default density: 'sm' | 'md' (default) | 'lg' | 'touch'.
providers: [provideWrDensity({ defaultDensity: 'sm' })],

// Fine-grained:
providers: [provideWrDensity({ height: 0.875, padding: 0.75 })],`,

    theme: `import { provideWrTheme } from 'ngwr/theme';

// 'light' | 'dark' | 'auto' — auto follows prefers-color-scheme.
// Resolved theme is mirrored to <html data-theme="..."> and persisted in
// localStorage under \`storageKey\`. Inject WrTheme to read or change it
// at runtime.
providers: [
  provideWrTheme({
    defaultMode: 'auto',
    storageKey: 'wr-theme',
    attribute: 'data-theme',
  }),
],`,

    loadingBar: `import { WrLoadingBarComponent } from 'ngwr/loading-bar';

// No provider to register — render the component once in your root template
// and drive it through the injectable \`WrLoadingBar\` service.
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
// get / set / delete on document.cookie, with SSR-safe fallbacks.
private readonly cookie = inject(WrCookie);`,

    storage: `import { provideWrStorage } from 'ngwr/storage';

// Swappable engine + TTL + watch signal. Defaults to localStorage in the
// browser, no-op on the server. Inject \`WrStorage\` to use it.
providers: [provideWrStorage({ engine: 'local', prefix: 'app:' })],`,
  };
}
