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
import { provideWrDateAdapter } from 'ngwr/date';
import { provideWrDensity } from 'ngwr/density';
import { provideWrConfig } from 'ngwr/config';
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
    provideWrConfig({ button: { size: 'sm' }, input: { size: 'sm' } }),
    provideWrDateAdapter(),
    provideWrI18n(),
    provideWrI18nStaticLoader({ en: { /* … */ } }),
  ],
});`,

    overlay: `import { provideWrOverlay } from 'ngwr/overlay';

// Backs every overlay component — dialog, drawer, popover, tooltip,
// dropdown, select, mention, command-palette, context-menu, and every
// picker. Gives them their own overlay container + Overlay instance, so
// they never share a DOM root with Material / NG-ZORRO. Without it they
// fall back to CDK's shared root container.
providers: [provideWrOverlay()],`,

    responsiveOverlays: `// Same entry point as provideWrOverlay() — NOT ngwr/dialog, and not the
// subpath of whichever component you were reading about when you met it.
import { provideWrOverlay, provideWrResponsiveOverlays } from 'ngwr/overlay';

providers: [
  provideWrOverlay(),
  provideWrResponsiveOverlays(),                // breakpoint defaults to 640
  // provideWrResponsiveOverlays({ breakpoint: 768 }),
],

// Per instance, either direction — the input wins over the provider:
//   <wr-select [responsive]="false">    stays an anchored dropdown on a phone
//   <wr-dropdown-menu responsive>       becomes a sheet with no provider at all
//
// If you load styles per component, the sheet's presentation is in this entry
// point too:  @use 'ngwr/overlay';`,

    icons: `import { Check, Plus, Trash2 } from 'lucide';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

// Register a tree-shaken icon set. Only the icons you list are bundled —
// the Lucide adapter takes the imported icon data and wraps it as
// \`WrIconDef\` at runtime, so unused Lucide icons get dropped by the bundler.
providers: [provideWrIcons(lucideIcons({ plus: Plus, trash: Trash2, check: Check }))],`,

    toast: `import { provideWrToastConfig } from 'ngwr/toast';

// Defaults for the global toast service. Call \`inject(WrToast).show(...)\`
// anywhere — the service itself needs no provider.
// position: 'top-start' | 'top' | 'top-end' | 'bottom-start' | 'bottom' | 'bottom-end'
providers: [provideWrToastConfig({ position: 'bottom-end', maxStack: 5 })],`,

    i18n: `import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrEn } from 'ngwr/i18n/en';
import { wrRu } from 'ngwr/i18n/ru';

providers: [
  provideWrI18n({ defaultLocale: 'en', availableLocales: ['en', 'ru'] }),
  provideWrI18nStaticLoader({
    en: { ...wrEn, app: { title: 'My app' } },
    ru: { ...wrRu, app: { title: 'Мое приложение' } },
  }),
],`,

    dateAdapter: `import { provideWrDateAdapter } from 'ngwr/date';

// Native Date adapter — zero extra deps.
providers: [provideWrDateAdapter()],

// Or date-fns:
import { WrDateFnsAdapter } from 'ngwr/date/adapters/fns';
providers: [provideWrDateAdapter({ adapter: WrDateFnsAdapter })],

// Or Luxon:
import { WrLuxonAdapter } from 'ngwr/date/adapters/luxon';
providers: [provideWrDateAdapter({ adapter: WrLuxonAdapter })],`,

    config: `import { provideWrConfig } from 'ngwr/config';

// App-wide component defaults. Every field is a DEFAULT, not an override: a value
// bound on the element always wins, so a config is never something a template has
// to fight its way out of.
provideWrConfig({
  button: { size: 'sm' },
  input: { size: 'sm' },
  select: { size: 'sm', rounded: true },
  checkbox: { size: 'sm' },
});

// <wr-btn>Save</wr-btn>              -> small
// <wr-btn size="lg">Save</wr-btn>    -> large; the binding wins
// <wr-select [rounded]="false" />    -> square again; \`false\` is a value, not an absence

// There is deliberately no \`color\` key. The lib's own chrome binds
// [color]="isCurrent ? 'primary' : null", and \`null\` means "the template said
// nothing" — a configured intent would repaint every one of those buttons.`,

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
}
