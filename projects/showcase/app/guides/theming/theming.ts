import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

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
    RouterLink,
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
    styles: `@use 'ngwr/theme';   // first: only the first load can take \`with (...)\`
@use 'ngwr/density'; // only if you use withDensity() or [wrDensity]

@use 'ngwr/button';
@use 'ngwr/input';`,

    darkMode: `// app.config.ts: optional, for another default mode
provideWr(withTheme({ defaultMode: 'dark' }));

// any component
const theme = inject(WrTheme);
theme.set('dark');  // 'light' | 'dark' | 'auto'
theme.toggle();
theme.resolved();   // 'light' | 'dark', the scheme on screen`,

    subtree: `<section style="color-scheme: dark">
  <button wr-btn color="primary">Primary</button>
</section>

<!-- An overlay renders outside the subtree: pass the scheme to its panel. -->
<wr-select panelClass="scheme-dark" [(value)]="size">…</wr-select>

/* global styles.scss */
.scheme-dark { color-scheme: dark; }`,

    componentDark: `.login {
  background: light-dark(var(--wr-color-gray-100), var(--wr-color-gray-800));
  border: 1px solid light-dark(#c7d2fe, #3730a3);
}

// An alpha: mix the token toward transparent.
.login__halo {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--wr-color-primary) 20%, transparent);
}`,

    rebrand: `// The first ngwr line. List all five intents: this map replaces the default.
@use 'ngwr/theme' with (
  $base-colors: (
    primary: #6366f1,
    success: #22c55e,
    warning: #f59e0b,
    danger: #f43f5e,
    info: #3472d9,
  )
);

// Dark: the second map.
:root {
  @include theme.rebrand((primary: #6366f1), (primary: #5b5bd6));
}

// One subtree. With one map, the seed applies to both schemes.
.marketing {
  @include theme.rebrand((primary: #be123c));
}`,

    component: `.wr-btn {
  --wr-btn-radius: 999px;
  --wr-btn-padding-x: 1.5rem;
}

.wr-tag.release {
  --wr-tag-bg: #fef3c7;
  --wr-tag-color: #92400e;
}`,

    classHooks: `<wr-select panelClass="w-[28rem] shadow-2xl" [(value)]="size">…</wr-select>

<wr-table [columns]="columns" [items]="rows" [rowClass]="rowClass" />`,

    classHooksTs: `readonly columns: WrTableColumns = {
  name: { title: 'Name' },
  amount: { title: 'Amount', class: 'text-right tabular-nums' },
};

readonly rowClass: WrTableRowClass = row => (row['overdue'] ? 'bg-danger-soft' : null);

this.dialog.open(EditCard, { panelClass: 'max-w-3xl' });
this.toast.show({ message: 'Saved', class: 'w-96' });`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Service', title: 'WrTheme', url: ['/reference/services', 'theme'] },
    { kind: 'Guide', title: 'Colors', url: ['/guides/tokens', 'colors'] },
    { kind: 'Guide', title: 'Density', url: ['/guides/tokens', 'density'] },
    { kind: 'Guide', title: 'Motion', url: ['/guides/tokens', 'motion'] },
  ];
}
