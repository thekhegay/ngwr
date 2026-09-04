import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrAlert } from 'ngwr/alert';
import { WrTable, WrTableCell } from 'ngwr/table';
import type { WrTableColumns } from 'ngwr/table';
import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSeeAlsoComponent } from '#core/components';
import type { DocSeeAlsoLink } from '#core/components';

/** One row of the per-component style-dependency table. */
interface StyleDepRow {
  readonly component: string;
  readonly needs: string;
  readonly why: string;
}

/**
 * What a component renders that lives in ANOTHER style entry point, minus
 * `ngwr/icon` — which twenty-eight of them need and the prose above the table
 * settles once, rather than repeating it down a column nobody reads twice.
 *
 * Derived by reading every template and host binding in `projects/lib` for a
 * `.wr-*` class whose base rule is declared in a different entry point's
 * `styles/`, unioned with every cross-entry symbol that reaches a component's
 * `imports: []`. Two edges a template scan alone misses are folded in by hand
 * and named in the `why` column: the responsive bottom sheet (`.wr-overlay-sheet`
 * lives in `ngwr/overlay`, and dialog / select / dropdown / popover all wear it)
 * and the pager's page-size changer, which is a `<wr-select>` even in a template
 * that never turns it on.
 *
 * DIRECT edges only — `table` lists `pagination`, and `pagination`'s own row
 * carries `select`. Spelling every closure out would put nine entries on the
 * table row and hide which one is the surprise.
 */
const STYLE_DEPS: readonly StyleDepRow[] = [
  { component: 'action-sheet', needs: 'ngwr/drawer', why: 'the sheet IS a drawer docked to the bottom edge' },
  { component: 'avatar', needs: 'ngwr/spinner', why: 'the loading state while an image resolves' },
  { component: 'badge', needs: 'ngwr/spinner', why: 'a tag in its processing state' },
  { component: 'button', needs: 'ngwr/spinner', why: 'the [loading] state' },
  { component: 'color-picker', needs: 'ngwr/segmented', why: 'the HEX / RGB / HSL strip' },
  { component: 'date-picker', needs: 'ngwr/calendar, ngwr/input', why: 'the popup panel and the field it opens from' },
  { component: 'dialog', needs: 'ngwr/overlay', why: 'the responsive bottom-sheet presentation' },
  { component: 'dropdown', needs: 'ngwr/overlay', why: 'the responsive bottom-sheet presentation' },
  { component: 'event-calendar', needs: 'ngwr/button', why: 'the view switcher and the month arrows' },
  { component: 'input-number', needs: 'ngwr/input', why: 'the field under the steppers' },
  { component: 'pagination', needs: 'ngwr/button, ngwr/select', why: 'the page cells, and the size changer' },
  { component: 'popconfirm', needs: 'ngwr/button', why: 'confirm and cancel' },
  { component: 'popover', needs: 'ngwr/overlay', why: 'the responsive bottom-sheet presentation' },
  { component: 'pull-to-refresh', needs: 'ngwr/spinner', why: 'the release indicator' },
  { component: 'select', needs: 'ngwr/overlay', why: 'the responsive bottom-sheet presentation' },
  { component: 'statistic', needs: 'ngwr/counter', why: 'the animated value' },
  {
    component: 'table',
    needs: 'ngwr/checkbox, ngwr/dropdown, ngwr/pagination, ngwr/spinner',
    why: 'selection column, filter menu, pager and loading state — all inputs on the one component',
  },
  { component: 'tour', needs: 'ngwr/button', why: 'back / next / done in the step popup' },
  {
    component: 'transfer',
    needs: 'ngwr/button, ngwr/checkbox, ngwr/input',
    why: 'the move buttons, the item rows and the search field',
  },
];

/**
 * The compiled size of a few style entry points, measured with the command the
 * page prints beside them — `sass --style=compressed`, then `gzip -9`.
 *
 * Written as strings, and rounded, on purpose. A figure typed into a page is a
 * figure that starts drifting the day it is typed; rounding says how much of it
 * to believe, and the command beside it is the part that stays true. Nothing
 * gates these, so treat a stale one as stale rather than as a regression.
 */
const STYLE_SIZES = {
  umbrella: '290 kB',
  umbrellaGzip: '42 kB',
  crud: '87 kB',
  crudGzip: '13 kB',
  theme: '22 kB',
  themeGzip: '4 kB',
} as const;

@Component({
  selector: 'ngwr-installation-page',
  templateUrl: './installation.html',
  imports: [
    DocPageComponent,
    DocSectionComponent,
    DocCodeComponent,
    DocSeeAlsoComponent,
    RouterLink,
    WrAlert,
    WrTable,
    WrTableCell,
    WrTypography,
  ],
})
export default class InstallationPageComponent {
  protected readonly styleSizes = STYLE_SIZES;
  protected readonly styleDepRows = STYLE_DEPS;

  protected readonly styleDepColumns: WrTableColumns = {
    component: { title: 'Using', width: 148 },
    needs: { title: 'Also load', width: 232 },
    why: { title: 'Because it renders' },
  };

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
    rootEntry: `// ✗ There is no barrel. TS2305 — 'ngwr' has no exported member 'WrButton'.
import { WrButton } from 'ngwr';

// ✓ Always the entry point, which is the last segment of the docs URL.
import { WrButton } from 'ngwr/button';        // /reference/components/button
import { WrSelect, WrOption } from 'ngwr/select';
import { WrTag } from 'ngwr/badge';            // <wr-tag> lives in ngwr/badge

// Make a wrong auto-import a lint error instead of a build error.
// eslint.config.ts
export default [
  {
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [{ name: 'ngwr', message: 'Import from an entry point: ngwr/button, ngwr/select, …' }] },
      ],
    },
  },
];`,
    globalStyles: `// styles.scss — import once, gets the full library
@use 'ngwr';

// Opt-in utilities
@use 'ngwr/grid';   // .grid, .container, .col-*
@use 'ngwr/reset';  // see "What the opt-in utilities do" below`,
    measureCss: `# What any set of style entries actually compiles to, in your own checkout.
# Write the @use lines you are considering into a scratch file, then:
npx sass --load-path=node_modules --style=compressed check.scss check.css
wc -c < check.css          # minified
gzip -9 -c check.css | wc -c   # over the wire`,
    perComponent: `// Or import only the component styles you actually use.
// The theme layer comes with each entry (deduped) — you never @use it by hand.
@use 'ngwr/density';  // the --wr-density-* multipliers; nothing else declares them
@use 'ngwr/icon';     // .wr-icon__svg — sizes every inline chevron and caret
@use 'ngwr/overlay';  // .wr-overlay-sheet — the responsive bottom sheet

@use 'ngwr/button';
@use 'ngwr/select';   // its panel is a <wr-option> list, so this covers both
@use 'ngwr/dialog';   // needed by WrDialog.open(), which no template names`,
    reset: `// styles.scss — reset AFTER the tokens it reads.
@use 'ngwr';
@use 'ngwr/reset';

// What it changes outside ngwr's own components:
//   *, ::before, ::after   box-sizing: border-box
//   html                   line-height: 1.5, tab-size: 4, text-size-adjust
//   body                   margin: 0, min-height: 100vh, --wr-font-family-base
//   h1..h6                 margin: 0, --wr-text-* sizes, semibold, tight leading
//   p, figure, blockquote, dl, dd   margin: 0
//   a                      color: inherit; text-decoration: none   ← underlines go
//   button                 background: none; border: 0; padding: 0 ← chrome goes
//   button/input/select/textarea    font: inherit; color: inherit
//   img, picture, svg, video        display: block; max-width: 100%
//   ul[role='list'], ol[role='list']  list-style: none; margin/padding: 0
//   code, kbd, samp, pre   --wr-font-family-mono`,
    measureJs: `# What one entry point costs in YOUR app, rather than in a doc page.
ng build --configuration production --stats-json
npx source-map-explorer dist/<app>/browser/*.js

# Or diff the two builds directly: add the import, rebuild, compare main.js.
# Angular's own "estimated transfer size" runs 10-20% under gzip -9 —
# if you are checking against a budget, gzip the file yourself.`,
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
    usageSvgIcon: `// Same icon, no lucide barrel to walk: register the SVG as a string.
// svgIcon() takes the markup verbatim, so any icon set that ships plain
// .svg files works — and so does an in-house one.
import { Component } from '@angular/core';
import { WrButton } from 'ngwr/button';
import { provideWrIcons, svgIcon } from 'ngwr/icon';

const CHECK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>';

@Component({
  selector: 'app-root',
  imports: [WrButton],
  providers: [provideWrIcons([svgIcon('checkmark', CHECK)])],
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
