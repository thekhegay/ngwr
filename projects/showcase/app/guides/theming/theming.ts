import { Component, inject } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrTheme, type WrThemeMode } from 'ngwr/theme';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-gs-theming-page',
  templateUrl: './theming.html',
  imports: [WrButton, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
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
@use 'ngwr/button/styles';
@use 'ngwr/input/styles';
@use 'ngwr/theme/styles';`,

    paletteScss: `// Rebrand at compile time — override the SCSS palette before the @use.
// NGWR re-derives -dark / -darker / -light / -lighter / -contrast variants.
// The whole palette is ONE map, so pass \`$base-colors\` — not a variable
// per intent. Keys you omit keep their defaults.
@use 'ngwr/theme/styles/colors' with (
  $base-colors: (
    primary: #6366f1,   // indigo-500
    secondary: #14b8a6, // teal-500
    danger: #f43f5e,
    warning: #f59e0b,
    success: #22c55e,
  )
);
@use 'ngwr' as *;`,

    paletteRoot: `/* Rebrand at runtime — override on \`:root\` or any subtree.
   Set both the rgb channel and the base color; \`-rgb\` powers rgba() rings. */
:root {
  --wr-color-primary: #6366f1;
  --wr-color-primary-rgb: 99, 102, 241;
  --wr-color-primary-contrast: #ffffff;
}

/* Scoped palette override on a section: */
.marketing {
  --wr-color-primary: #f43f5e;
  --wr-color-primary-rgb: 244, 63, 94;
}`,

    darkMode: `import { inject } from '@angular/core';
import { WrTheme } from 'ngwr/theme';

const theme = inject(WrTheme);
theme.set('dark');         // explicit
theme.set('auto');         // follow prefers-color-scheme
theme.toggle();            // flip light ↔ dark
theme.resolved();          // 'light' | 'dark' — what the DOM has

// Tune dark-mode tokens by overriding under [data-theme='dark']:
// (the default 'data-theme' attribute is configurable via provideWrTheme)
[data-theme='dark'] {
  --wr-color-bg: #0c0d10;
  --wr-color-dark: #f5f6f8;
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
}
