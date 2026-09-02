import { Component, inject } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrTheme, type WrThemeMode } from 'ngwr/theme';

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
@use 'ngwr' as *;`,

    paletteRoot: `/* Rebrand at runtime — override on \`:root\` or any subtree.
   Set the base color, the rgb channel (\`-rgb\` powers rgba() rings) AND the
   contrast: \`-contrast\` was picked at SCSS compile time from the OLD fill, so
   it does not follow a value you set here. #4f46e5 takes white at 6.3:1. */
:root {
  --wr-color-primary: #4f46e5;
  --wr-color-primary-rgb: 79, 70, 229;
  --wr-color-primary-contrast: #ffffff;
}

/* Scoped palette override on a section. This one inherits the white label
   above, so the fill has to be deep enough to carry it — #be123c is 6.3:1;
   a lighter rose like #f43f5e would leave it at 3.7:1, under AA. */
.marketing {
  --wr-color-primary: #be123c;
  --wr-color-primary-rgb: 190, 18, 60;
}`,

    darkMode: `import { inject } from '@angular/core';
import { WrTheme } from 'ngwr/theme';

const theme = inject(WrTheme);
theme.set('dark');         // explicit
theme.set('auto');         // follow prefers-color-scheme
theme.toggle();            // flip light ↔ dark
theme.resolved();          // 'light' | 'dark' — what the DOM has

// Tune dark-mode tokens by overriding under [data-theme='dark']:
// There is no --wr-color-bg: in dark, --wr-color-white IS the canvas and
// --wr-color-dark IS the ink — the two neutrals swap jobs.
[data-theme='dark'] {
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
