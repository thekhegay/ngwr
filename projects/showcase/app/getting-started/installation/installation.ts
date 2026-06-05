import { Component } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-installation-page',
  templateUrl: './installation.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent],
})
export default class InstallationPageComponent {
  protected readonly snippets = {
    ngAdd: `# Recommended — runs the schematic that wires everything up for you.
ng add ngwr

# The prompts cover: styles mode, date adapter, density preset, theme.
# See the Schematics page for the full list of flags.`,
    install: `pnpm add ngwr @angular/cdk
# or
npm install ngwr @angular/cdk
# or
yarn add ngwr @angular/cdk`,
    appConfig: `import { provideZonelessChangeDetection, provideBrowserGlobalErrorListeners } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app/app';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
  ],
});`,
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
    usage: `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Check } from 'lucide';
import { WrButton } from 'ngwr/button';
import { provideWrIcons, WrIcon } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrButton, WrIcon],
  providers: [provideWrIcons(lucideIcons({ checkmark: Check }))],
  template: \`
    <wr-btn color="primary" icon="checkmark">Save</wr-btn>
  \`,
})
export class AppComponent {}`,
    overrideTokens: `// Override theme tokens by redeclaring CSS variables after the lib styles.
@use 'ngwr';

:root {
  --wr-color-primary: #6366f1;       // your brand
  --wr-border-radius-base: 0.5rem;   // tighter or rounder
  --wr-font-family-base: 'Inter', sans-serif;
}`,
    overridePalette: `// Or override the whole palette at SCSS compile time.
@use 'ngwr/theme/colors' with (
  $base-colors: (
    primary: #6366f1,
    secondary: #ec4899,
    success: #10b981,
    warning: #f59e0b,
    danger: #ef4444,
    light: #e5e7eb,
    medium: #6b7280,
    dark: #111827,
  ),
);`,
  };
}
