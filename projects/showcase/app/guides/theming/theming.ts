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
    classHooks: `<!-- One select's panel, without touching the other forty. -->
<wr-select panelClass="w-[28rem] shadow-2xl" [(value)]="size">…</wr-select>

<!-- A menu box and, separately, its submenu. -->
<wr-context-menu #menu panelClass="w-64">…</wr-context-menu>

<!-- Header and body cells of one column; and a row, from its own data. -->
<wr-table [columns]="columns" [items]="rows" [rowClass]="rowClass" />`,

    classHooksTs: `readonly columns: WrTableColumns = {
  name: { title: 'Name' },
  amount: { title: 'Amount', class: 'text-right tabular-nums' },
};

// Inline, so the parameter is inferred - a named function wants its own cast.
readonly rowClass: WrTableRowClass = row => (row['overdue'] ? 'bg-danger-soft' : null);

// Service calls take theirs in the options object.
this.dialog.open(EditCard, { panelClass: 'max-w-3xl' });
this.toast.show({ message: 'Saved', class: 'w-96' });`,

    provider: `import { bootstrapApplication } from '@angular/platform-browser';
import { provideWrDensity } from 'ngwr/density';

bootstrapApplication(AppComponent, {
  providers: [
    // Nothing for the theme: the stylesheet follows the OS through
    // color-scheme, and WrTheme is root-provided — inject it for a toggle.
    provideWrDensity({ defaultDensity: 'md' }),  // 'sm' | 'md' | 'lg' | 'touch'
  ],
});`,

    styles: `// styles.scss — the token layer FIRST: design tokens for both schemes.
// It has to be first, because only a module's first load can take \`with (...)\`.
//
// \`as *\` drops the \`theme.\` prefix from what this entry declares, so
// \`@include focus-ring\` and \`@include smooth-br(...)\` work unqualified.
@use 'ngwr/theme' as *;

// Density is its OWN entry point — the theme layer emits no \`--wr-density-*\`
// at all, so without this line \`provideWrDensity()\` and \`[wrDensity]\` have
// no multipliers to set.
@use 'ngwr/density';

// Breakpoint mixins are their own entry too: \`media-up\` / \`media-down\` are
// NOT in the theme layer.
@use 'ngwr/breakpoints' as *;

// Then one line per component you render.
@use 'ngwr/button';
@use 'ngwr/input';`,

    paletteScss: `// Rebrand at compile time — configure the palette on the theme entry point.
// NGWR re-derives -dark / -darker / -light / -lighter / -contrast variants.
//
// THIS IS THE LIGHT SIDE. It does not reach dark mode: the dark intents are
// hand-tuned for the dark canvas, not lightened from these, so seeding indigo
// here gives indigo in light and the shipped blue in dark. Carry it across
// yourself with \`rebrand()\` — the second block below — and pick the dark seed
// for a dark ground rather than reusing the light one.
//
// The palette is ONE Sass map, and configuring a map REPLACES it — it is not
// merged with the defaults. List every intent you want to exist: an omitted
// key leaves \`--wr-color-<intent>\` undefined in both schemes, which also breaks
// everything derived from it (-soft, -contrast, -ink).
@use 'ngwr/theme' with (
  $base-colors: (
    primary: #6366f1, // indigo-500
    success: #22c55e,
    warning: #f59e0b,
    danger: #f43f5e,
    info: #3472d9,
  )
);

// Carry the rebrand into dark mode. \`rebrand()\` is the same arithmetic the
// light palette runs, and its SECOND map is the dark side: every intent it
// names becomes light-dark(<seed>, <dark seed>) across the whole family.
//
// It comes off the \`@use\` above: the URL's last component already binds the
// namespace \`theme\`, so do NOT add a second \`@use 'ngwr/theme' as theme\` —
// it fails with "There's already a module with namespace".
:root {
  // Seeded FOR the dark canvas, and measured: \`-contrast\` PICKS black or
  // white, so the fill decides its own label. #5b5bd6 takes white at 5.37:1
  // (the shipped dark intents all do); indigo-400 #818cf8 would take black,
  // which is a different design, not a lighter one.
  @include theme.rebrand((primary: #6366f1), (primary: #5b5bd6));
}`,

    paletteScoped: `/* Recolour a SUBTREE — use \`rebrand()\`, not a hand-written pair.
   It emits the whole family for each intent you name: the base and
   \`-contrast\`, the four shades \`-dark\` / \`-darker\` / \`-light\` / \`-lighter\`,
   and a re-resolved \`-soft\` / \`-soft-border\` / \`-soft-contrast\` / \`-active\` /
   \`-ink\`. */
@use 'ngwr/theme' as theme;

.marketing {
  @include theme.rebrand((primary: #be123c));                       // both schemes
}

.campaign {
  @include theme.rebrand((primary: #be123c), (primary: #fb7185));  // light, dark
}

/* Why not two properties by hand. Setting only the base and \`-contrast\`
   leaves the rest of the family on the page's own hue, and it fails in two
   different ways at once:

   - \`-dark\` / \`-darker\` / \`-light\` / \`-lighter\` are Sass arithmetic, resolved
     when the stylesheet is COMPILED. No runtime value feeds them, so a pink
     button turned blue on :hover, which paints \`-dark\`.
   - \`-soft\`, \`-soft-border\`, \`-soft-contrast\`, \`-active\` and \`-ink\` are written
     in terms of var(), which is what lets them re-derive — but a custom
     property's references are substituted on the element that DECLARES it, and
     these are declared on :root. What inherits into the subtree is the
     substituted literal, so an outlined button inside \`.marketing\` drew a pink
     border around blue text.

   Both are why the mixin exists. It is compile-time, so every seed has to be
   known when your stylesheet is built. */`,

    darkMode: `import { inject } from '@angular/core';
import { WrTheme } from 'ngwr/theme';

const theme = inject(WrTheme);
theme.set('dark');         // explicit — writes color-scheme: dark on <html>
theme.set('auto');         // clears it — :root's \`light dark\` follows the OS
theme.toggle();            // flip between light and dark
theme.resolved();          // 'light' | 'dark' — the scheme in effect

// Without the service it is one CSS property:
//   html { color-scheme: dark; }`,

    subtree: `<!-- Everything inside paints its dark side, whatever the page is doing. -->
<section style="color-scheme: dark">
  <wr-btn color="primary">Primary</wr-btn>
</section>

<!-- An overlay renders outside the subtree, so it takes the scheme through its
     own hook. A global rule: the pane is not in your component's view. -->
<wr-select panelClass="scheme-dark" [(value)]="size">…</wr-select>

/* styles.scss */
.scheme-dark { color-scheme: dark; }`,

    componentDark: `// login.scss — a component stylesheet works exactly like the global one.
.login {
  background: light-dark(var(--wr-color-gray-100), var(--wr-color-gray-800));
  border: 1px solid light-dark(#c7d2fe, #3730a3);
}

// Through a token of your own, so one declaration carries both sides:
:host {
  --mp-login-accent: light-dark(#4f46e5, #818cf8);
}

// An alpha is a mix toward transparent — it follows the scheme because the
// token it mixes does. There is no -rgb channel to compose with rgba().
.login__halo {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--wr-color-primary) 20%, transparent);
}

// Retune a theme token the same way, after the token layer. There is no
// --wr-color-bg: --wr-color-white IS the canvas and --wr-color-gray-6 the ink,
// and in dark the two swap jobs.
:root {
  --wr-color-white: light-dark(#ffffff, #0c0d10);
  --wr-color-gray-6: light-dark(var(--wr-color-gray-900), #f5f6f8);
}`,

    importantList: `// Every !important outside the reduced-motion blocks — 8 declarations on
// five selectors, and CDK's inline styles are what three of them fight.

.wr-context-menu-overlay { position: fixed }  // 1 — undoes inline position: static
.wr-dialog-panel        { position: relative }// 1 — same, so the × can be parked
.wr-drawer__panel       { position: relative }// 1 — same, service-opened drawers
.wr-window--no-anim, .wr-window--no-anim *    // 2 — the component's own opt-out
.wr-editor__surface img.ProseMirror-separator // 3 — ProseMirror's own rule

// And inside @media (prefers-reduced-motion: reduce), 17 more: the theme
// layer's shared block plus marquee, star-border, glitch-text, shiny-text,
// gradient-text and the ngwr/animations utilities.
//
// Re-count them against the version you installed:
//   grep -rn '!important;' node_modules/ngwr --include='*.scss'`,

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
      description:
        'Registering icon sets with `svgIcon()` and `lucideIcons()`, and the `ng g ngwr:icon-set` schematic.',
    },
  ];
}
