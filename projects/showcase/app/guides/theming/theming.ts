import { Component, inject } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrTheme, type WrThemeMode } from 'ngwr/theme';
import { WrTypography } from 'ngwr/typography';

import {
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-gs-theming-page',
  templateUrl: './theming.html',
  imports: [
    WrButton,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocSeeAlsoComponent,
  ],
})
export default class ThemingPage {
  private readonly theme = inject(WrTheme);

  protected readonly mode = this.theme.mode;
  protected readonly resolved = this.theme.resolved;

  protected readonly modes: readonly WrThemeMode[] = ['light', 'dark', 'auto'];

  protected setMode(mode: WrThemeMode): void {
    this.theme.set(mode);
  }

  protected readonly snippets = {
    provider: `import { bootstrapApplication } from '@angular/platform-browser';
import { provideWrTheme } from 'ngwr/theme';
import { provideWrDensity } from 'ngwr/density';

bootstrapApplication(AppComponent, {
  providers: [
    provideWrTheme({ defaultMode: 'auto' }),  // 'light' | 'dark' | 'auto'
    provideWrDensity({ defaultDensity: 'md' }),  // 'sm' | 'md' | 'lg' | 'touch'
  ],
});`,

    styles: `// styles.scss — load the umbrella stylesheet.
// Pulls in every component's CSS, design tokens, dark mode, density vars.
@use 'ngwr' as *;

// Or per-entry-point if you bundle by component:
@use 'ngwr/button';
@use 'ngwr/input';
@use 'ngwr/theme';`,

    paletteScss: `// Rebrand at compile time — configure the palette on the theme entry point.
// NGWR re-derives -dark / -darker / -light / -lighter / -contrast variants.
//
// THIS IS THE LIGHT PALETTE. It does not reach dark mode: the dark intents are
// hand-tuned for the dark canvas, not lightened from these, so seeding indigo
// here gives indigo in light and the shipped blue in dark. Carry it across
// yourself with \`rebrand()\` — the second block below — and pick the dark seed
// for a dark ground rather than reusing the light one.
//
// The palette is ONE Sass map, and configuring a map REPLACES it — it is not
// merged with the defaults. List every intent you want to exist: an omitted
// key leaves \`--wr-color-<intent>\` undefined in light mode, which also breaks
// everything derived from it (-soft, -contrast, -rgb).
@use 'ngwr/theme' with (
  $base-colors: (
    primary: #6366f1,   // indigo-500
    secondary: #14b8a6, // teal-500
    success: #22c55e,
    warning: #f59e0b,
    danger: #f43f5e,
    info: #3472d9,
    light: #cbd5e1,
    medium: #6a7683,
    dark: #0f172a,
  )
);
@use 'ngwr' as *;

// Carry the rebrand into dark mode. \`rebrand()\` is the same arithmetic the
// light palette runs, on whatever element you include it on — and \`theme.dark\`
// builds the selector from \`$theme-attribute\`, so it survives a renamed
// attribute where a hand-written [data-theme='dark'] would not.
@use 'ngwr/theme' as theme;

@include theme.dark {
  // Seeded FOR the dark canvas, and measured: \`-contrast\` PICKS black or
  // white, so the fill decides its own label. #5b5bd6 takes white at 5.37:1
  // (the shipped dark intents all do); indigo-400 #818cf8 would take black,
  // which is a different design, not a lighter one.
  @include theme.rebrand((primary: #5b5bd6));
}`,

    paletteScoped: `/* Recolour a SUBTREE — use \`rebrand()\`, not a hand-written triple.
   It emits the whole family for each intent you name: the base, \`-rgb\` and
   \`-contrast\`, the four shades \`-dark\` / \`-darker\` / \`-light\` / \`-lighter\`,
   and a re-resolved \`-soft\` / \`-soft-border\` / \`-soft-contrast\` / \`-active\` /
   \`-ink\`. */
@use 'ngwr/theme' as theme;

.marketing {
  @include theme.rebrand((primary: #be123c));
}

/* Why not three properties by hand. Setting only the base, \`-rgb\` and
   \`-contrast\` leaves the rest of the family on the page's own hue, and it fails
   in two different ways at once:

   - \`-dark\` / \`-darker\` / \`-light\` / \`-lighter\` are Sass arithmetic, resolved
     when the stylesheet is COMPILED. No runtime value feeds them, so a pink
     button turned blue on :hover, which paints \`-dark\`.
   - \`-soft\`, \`-soft-border\`, \`-soft-contrast\`, \`-active\` and \`-ink\` are written
     in terms of var(), which is what lets them re-derive — but a custom
     property's references are substituted on the element that DECLARES it, and
     these are declared on :root. What inherits into the subtree is the
     substituted literal, so an outlined button inside \`.marketing\` drew a pink
     border around blue text.

   Both are why the mixin exists. It is compile-time, so the seed has to be known
   when your stylesheet is built; for a colour chosen at runtime reach for
   \`wrThemeTokens()\` from 'ngwr/theme' instead. */`,

    paletteRoot: `/* Rebrand at runtime — override on \`:root\`.
   Set the base color, the rgb channel (\`-rgb\` powers rgba() rings) AND the
   contrast: \`-contrast\` was picked at SCSS compile time from the OLD fill, so
   it does not follow a value you set here. #4f46e5 takes white at 6.3:1. */
:root {
  --wr-color-primary: #4f46e5;
  --wr-color-primary-rgb: 79, 70, 229;
  --wr-color-primary-contrast: #ffffff;
}

/* Two families do NOT follow, and this is the ceiling of the runtime path.
   \`-soft\` / \`-soft-border\` / \`-soft-contrast\` / \`-active\` / \`-ink\` re-resolve
   on their own, because they are declared on :root in terms of var() and this
   override lands on the same element. The four SHADES are Sass arithmetic and
   cannot: set them yourself, or use \`wrThemeTokens()\`, which computes all seven
   from one hex. */
:root {
  --wr-color-primary-dark: #4338ca;
  --wr-color-primary-darker: #3730a3;
  --wr-color-primary-light: #6366f1;
  --wr-color-primary-lighter: #818cf8;
}`,

    darkMode: `import { inject } from '@angular/core';
import { WrTheme } from 'ngwr/theme';

const theme = inject(WrTheme);
theme.set('dark');         // explicit
theme.set('auto');         // follow prefers-color-scheme
theme.toggle();            // flip light ↔ dark
theme.resolved();          // 'light' | 'dark' — what the DOM has

// Tune dark-mode tokens with the theme.dark mixin, which builds the selector
// from $theme-attribute — a hand-written [data-theme='dark'] stops matching the
// moment anyone renames the attribute, silently.
// There is no --wr-color-bg: in dark, --wr-color-white IS the canvas and
// --wr-color-dark IS the ink — the two neutrals swap jobs.
@include theme.dark {
  --wr-color-white: #0c0d10;
  --wr-color-dark: #f5f6f8;
}`,

    attribute: `// The attribute is configurable, and it has TWO halves that must agree.
// A CSS selector cannot read a provider value, so the stylesheet takes the
// same name as a Sass variable. Set one without the other and dark mode
// silently never applies.

// 1. styles.scss — configure the stylesheet FIRST, before anything that
//    pulls the theme in. Sass refuses to configure a module that is already
//    loaded, so a component entry point above this line is a build error.
@use 'ngwr' with ($theme-attribute: 'data-color-mode');

// 2. app.config.ts — the same string.
provideWrTheme({ attribute: 'data-color-mode' })

// Only the configured attribute is emitted; 'data-theme' is NOT kept as a
// second selector. Renaming is how you decouple ngwr from another design
// system that already owns data-theme, and emitting both would hand that
// system control of your tokens again.

// Your own dark overrides follow the same name. Reach for the mixin instead
// of writing the literal, and they move with it:
@use 'ngwr/theme' as theme;

.my-hero {
  background: #fff;

  @include theme.dark {
    background: #0b1120;
  }
}`,

    importantList: `// Every !important outside the reduced-motion blocks — 17 declarations on
// six selectors, and CDK's inline styles are what fifteen of them fight.

.wr-overlay-sheet                             // 8 — the mobile bottom sheet
.wr-overlay-sheet > *:not(.wr-dialog__close)  // 4 — its direct children
.wr-context-menu-overlay { position: fixed }  // 1 — undoes inline position: static
.wr-dialog-panel        { position: relative }// 1 — same, so the × can be parked
.wr-drawer__panel       { position: relative }// 1 — same, service-opened drawers
.wr-window--no-anim, .wr-window--no-anim *    // 2 — the component's own opt-out

// And inside @media (prefers-reduced-motion: reduce), 18 more: the theme
// layer's shared block plus marquee, star-border, glitch-text, shiny-text,
// gradient-text, window and the ngwr/animations utilities.`,

    importantOverride: `// styles.scss — after @use 'ngwr', so source order is already on your side.
@use 'ngwr';

// A plain rule loses. This is not a specificity problem; it is the !important.
.wr-overlay-sheet {
  max-height: 70dvh;              // ✗ never applies
}

// Match it. Equal specificity + !important + later in the cascade wins.
.wr-overlay-sheet {
  max-height: 70dvh !important;   // ✓
  border-radius: 1.5rem 1.5rem 0 0 !important;
}

// Better where a token exists: var() resolves before the cascade cares.
.wr-overlay-sheet {
  --wr-overlay-duration: 0.32s;
  --wr-overlay-ease: cubic-bezier(0.32, 0.72, 0, 1);
}`,

    component: `/* Components also expose per-instance vars — override on the element.
   No need to ship a full theme just to nudge one widget. */
.wr-btn {
  --wr-btn-radius: 999px;
  --wr-btn-padding-x: 1.5rem;
}

/* Or inline on the host: */
<wr-tag style="--wr-tag-bg: #fef3c7; --wr-tag-color: #92400e">soon</wr-tag>`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Service',
      title: 'WrTheme',
      url: ['/reference/services', 'theme'],
      description: 'The full API behind the toggle above — every input, method and signal it exposes.',
    },
    {
      kind: 'Service',
      title: 'WrDensity',
      url: ['/reference/services', 'density'],
      description: 'The density counterpart — the other half of the appearance API.',
    },
    {
      kind: 'Guide',
      title: 'Icons',
      url: ['/icons'],
      description: 'Registering icon sets, the adapters, and the `ng g ngwr:icon-set` schematic.',
    },
  ];
}
