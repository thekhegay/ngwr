import { Component } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSeeAlsoComponent } from '#core/components';
import type { DocSeeAlsoLink } from '#core/components';

@Component({
  selector: 'ngwr-installation-page',
  templateUrl: './installation.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocSeeAlsoComponent],
})
export default class InstallationPageComponent {
  protected readonly snippets = {
    ngAdd: `# Recommended — runs the schematic that wires everything up for you.
ng add ngwr

# The prompts cover: styles mode, date adapter, density preset, theme.
# Answer "System" to the theme prompt (or pass --theme=system) — that is the
# answer that wires provideWrTheme(), and the default, "None", does not.
# See the Schematics page for the full list of flags.`,
    install: `pnpm add ngwr @angular/cdk
# or
npm install ngwr @angular/cdk
# or
yarn add ngwr @angular/cdk

# Only if you plan to use the lucide icon adapter (\`ng add\` installs it for you):
npm install lucide`,
    appConfig: `// src/app/app.config.ts — the file \`ng new\` generates. Add the ngwr providers
// to the array that is already there.
//
// Angular 22 scaffolds a zoneless app, so there is no
// provideZonelessChangeDetection() in this file and none is needed.
import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideWrOverlay } from 'ngwr/overlay';
import { provideWrTheme } from 'ngwr/theme';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),

    // ngwr ---------------------------------------------------------------
    // Isolates ngwr's overlays in their own container, and installs the
    // visual-viewport watcher mobile sheets need. Panels open without it —
    // they just share a DOM root with every other CDK consumer.
    provideWrOverlay(),
    // Writes [data-theme] on <html>. Without it the attribute is never set,
    // the light tokens stay, and a visitor whose OS is in dark mode gets
    // near-black text on the browser's dark canvas.
    provideWrTheme(),           // defaults to { defaultMode: 'auto' }
  ],
};`,
    globalStyles: `// styles.scss — import once, gets the full library
@use 'ngwr';

// Opt-in utilities
@use 'ngwr/grid';   // .grid, .container, .col-*
@use 'ngwr/reset';  // box-sizing, body margin, etc.`,
    perComponent: `// Or import only the component styles you actually use.
// Each entry pulls the theme tokens automatically (deduped).
@use 'ngwr/button';
@use 'ngwr/dialog';
@use 'ngwr/icon';`,
    usage: `import { Component } from '@angular/core';
import { WrButton } from 'ngwr/button';

@Component({
  selector: 'app-root',
  imports: [WrButton],
  template: \`
    <wr-btn color="primary">Save</wr-btn>
  \`,
})
export class App {}`,
    usageIcon: `// Same button with an icon. Needs the \`lucide\` peer installed
// (\`ng add\` does it; \`npm install ngwr @angular/cdk\` does not).
import { Component } from '@angular/core';
import { Check } from 'lucide';
import { WrButton } from 'ngwr/button';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

@Component({
  selector: 'app-root',
  imports: [WrButton],
  providers: [provideWrIcons(lucideIcons({ checkmark: Check }))],
  template: \`
    <wr-btn color="primary" icon="checkmark">Save</wr-btn>
  \`,
})
export class App {}`,
    overrideTokens: `// Override theme tokens by redeclaring CSS variables after the lib styles.
@use 'ngwr';

:root {
  --wr-color-primary: #6366f1;       // your brand
  --wr-border-radius-base: 0.5rem;   // tighter or rounder
  --wr-font-family-base: 'Inter', sans-serif;
}`,
    overridePalette: `// Or override the whole palette at SCSS compile time.
// Configuring a Sass map REPLACES it, so list every intent you want to exist —
// an omitted key leaves \`--wr-color-<intent>\` undefined in light mode.
@use 'ngwr/theme' with (
  $base-colors: (
    primary: #6366f1,
    secondary: #ec4899,
    success: #10b981,
    warning: #f59e0b,
    danger: #ef4444,
    info: #3b82f6,
    light: #e5e7eb,
    medium: #6b7280,
    dark: #111827,
  ),
);`,
  };

  protected readonly seeAlso: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Theming',
      url: ['/guides', 'theming'],
      description: 'Light / dark, the token layer, and rebranding at compile time or at runtime.',
    },
    {
      kind: 'Guide',
      title: 'Configuration',
      url: ['/start', 'configuration'],
      description: 'Every provideWr*() in one place — what each one buys and what it costs to skip.',
    },
    {
      kind: 'Guide',
      title: 'Schematics',
      url: ['/start', 'schematics'],
      description: 'The full ng add / ng generate collection, including the non-interactive flags.',
    },
  ];
}
