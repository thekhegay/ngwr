import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrButton } from 'ngwr/button';
import { WrDensity, type WrDensityValue } from 'ngwr/density';
import { WrTheme, type WrThemeMode } from 'ngwr/theme';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-gs-theming-page',
  templateUrl: './theming.html',
  imports: [RouterLink, WrButton, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class ThemingPage {
  private readonly theme = inject(WrTheme);
  private readonly density = inject(WrDensity);

  protected readonly mode = this.theme.mode;
  protected readonly resolved = this.theme.resolved;
  protected readonly densityCurrent = this.density.current;

  protected readonly modes: readonly WrThemeMode[] = ['light', 'dark', 'auto'];
  protected readonly densities: readonly WrDensityValue[] = ['compact', 'default', 'comfortable'];

  protected setMode(mode: WrThemeMode): void {
    this.theme.set(mode);
  }

  protected setDensity(d: WrDensityValue): void {
    this.density.set(d);
  }

  protected readonly snippets = {
    provider: `import { bootstrapApplication } from '@angular/platform-browser';
import { provideWrTheme } from 'ngwr/theme';
import { provideWrDensity } from 'ngwr/density';

bootstrapApplication(AppComponent, {
  providers: [
    provideWrTheme({ defaultMode: 'auto' }),  // 'light' | 'dark' | 'auto'
    provideWrDensity({ defaultDensity: 'default' }),
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
@use 'ngwr/theme/styles/colors' with (
  $primary: #6366f1,    // indigo-500
  $secondary: #14b8a6,  // teal-500
  $danger:    #f43f5e,
  $warning:   #f59e0b,
  $success:   #22c55e,
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

    tokens: `/* Every component reads from a small set of design tokens.
   Override on :root to retune across the app. */
:root {
  /* Radius */
  --wr-border-radius-sm:   0.25rem;
  --wr-border-radius-base: 0.625rem;
  --wr-border-radius-lg:   1rem;
  --wr-border-radius-pill: 50rem;

  /* Typography */
  --wr-font-family-base: 'Inter', system-ui, sans-serif;
  --wr-font-family-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Motion */
  --wr-duration-base:  0.15s;
  --wr-ease-out:       cubic-bezier(0.16, 1, 0.3, 1);

  /* Density multipliers — see Density section below. */
  --wr-density-y: 1;
  --wr-density-x: 1;
}`,

    component: `/* Components also expose per-instance vars — override on the element.
   No need to ship a full theme just to nudge one widget. */
.wr-btn {
  --wr-btn-radius: 999px;
  --wr-btn-padding-x: 1.5rem;
}

/* Or inline on the host: */
<wr-tag style="--wr-tag-bg: #fef3c7; --wr-tag-color: #92400e">soon</wr-tag>`,

    iconRegister: `import { Component } from '@angular/core';
import { WrIcon, provideWrIcons, check, close, info } from 'ngwr/icon';

@Component({
  selector: 'app-toolbar',
  template: \`
    <wr-icon name="check" />
    <wr-icon name="close" />
  \`,
  imports: [WrIcon],
  providers: [provideWrIcons([check, close, info])],
})
export class Toolbar {}`,

    iconCustom: `// Define your own (SVG string-based — tree-shakeable, no HTTP).
import { type WrIconDef } from 'ngwr/icon';

export const dragon: WrIconDef = {
  name: 'dragon',
  data: '<path d="M12 2 L22 22 L2 22 Z" />',
  viewBox: '0 0 24 24',
};

// Register it like a built-in:
providers: [provideWrIcons([dragon])],

// Then in any template:
<wr-icon name="dragon" />`,

    iconStyle: `/* Icons are plain inline SVGs — colour with \`currentColor\`, size via the
   \`--wr-icon-size\` var or the \`size\` input. */
<wr-icon name="info" size="24" style="color: var(--wr-color-primary)" />

/* App-wide default: */
:root {
  --wr-icon-size: 1rem;
}`,

    densityScope: `<!-- Compact toolbar inside a default-density page. -->
<aside wrDensity="compact">
  <button wr-btn>Action</button>
  <input wrInput placeholder="…" />
</aside>

<!-- Cycle the global density: -->
<button wr-btn (click)="density.cycle()">Toggle density</button>`,
  };
}
