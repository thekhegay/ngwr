import { Component } from '@angular/core';

import { WR_COLORS } from 'ngwr/theme';

import { DocApiComponent, DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';
import type { DocApiRow } from '#core/components';

interface Swatch {
  /** Token suffix appended to `--wr-color-{intent}`. */
  readonly suffix: string;
  /** Short caption under the chip. */
  readonly label: string;
}

@Component({
  selector: 'ngwr-tokens-colors',
  templateUrl: './colors.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class TokensColorsPage {
  /**
   * Every intent that gets a full generated shade set in `_colors.scss`.
   *
   * Taken from the tuple rather than retyped: this page's whole job is showing
   * what the palette contains, so a copy that can fall behind it is the one
   * thing it must not have. `scripts/check-color-parity.ts` keeps the tuple
   * itself honest against `$base-colors`.
   */
  protected readonly intents = WR_COLORS;

  /**
   * Intents that additionally get the soft set (light + dark are excluded).
   *
   * Still hand-written, because the lib does not export this subset — it is
   * the literal `@each $name in (…)` list at `_colors.scss:152`, so it cannot
   * be derived from anything importable. Adding a colour to the palette does
   * NOT add it here or there; both are manual.
   */
  protected readonly softIntents = ['primary', 'secondary', 'success', 'warning', 'danger', 'info', 'medium'] as const;

  /** Generated shade variants every intent exposes. */
  protected readonly shades: readonly Swatch[] = [
    { suffix: '', label: 'base' },
    { suffix: '-dark', label: 'dark −5%' },
    { suffix: '-darker', label: 'darker −10%' },
    { suffix: '-light', label: 'light +5%' },
    { suffix: '-lighter', label: 'lighter +10%' },
  ];

  /** The four soft-set tokens, with the alpha each is baked at. */
  protected readonly softTokens: readonly DocApiRow[] = [
    {
      name: '--wr-color-{intent}-soft',
      type: 'rgba(var(--wr-color-{intent}-rgb), 0.12)',
      description: 'Canonical low-alpha fill. The tinted surface behind soft badges, alerts, selected rows.',
    },
    {
      name: '--wr-color-{intent}-soft-border',
      type: 'rgba(var(--wr-color-{intent}-rgb), 0.3)',
      description: 'Matching hairline for a soft fill — the 1px border that pairs with `-soft`.',
    },
    {
      name: '--wr-color-{intent}-active',
      type: 'rgba(var(--wr-color-{intent}-rgb), 0.2)',
      description: 'Pressed / active tint — one notch stronger than `-soft` for the held state.',
    },
    {
      name: '--wr-color-{intent}-soft-contrast',
      type: 'color-mix(in srgb, var(--wr-color-{intent}) 62%, var(--wr-color-dark))',
      description:
        'Readable same-hue text on a soft fill. Deep in light mode, light in dark — it follows `--wr-color-dark`.',
    },
  ];

  /** Semantic neutral tokens — not per-intent, one place each. */
  protected readonly neutralTokens: readonly DocApiRow[] = [
    {
      name: '--wr-color-white',
      type: '#ffffff → #0b1120 (dark)',
      description: 'The page surface. Flips to a deep slate canvas in dark mode.',
    },
    {
      name: '--wr-color-black',
      type: '#000000',
      description: 'Pure black. Does not flip — true black regardless of theme.',
    },
    {
      name: '--wr-color-hover',
      type: 'rgba(var(--wr-color-light-rgb), 0.4)',
      description:
        'Generic subtle hover tint (icon buttons, list rows). Adapts in dark via the flipping `light` channel.',
    },
    {
      name: '--wr-color-border',
      type: 'rgba(var(--wr-color-light-rgb), 0.5)',
      description: 'Default divider / border. Translucent so it reads on any surface.',
    },
    {
      name: '--wr-color-border-subtle',
      type: 'rgba(var(--wr-color-light-rgb), 0.35)',
      description: 'Quieter hairline — for low-emphasis separators.',
    },
    {
      name: '--wr-color-border-strong',
      type: 'rgba(var(--wr-color-light-rgb), 0.6)',
      description: 'Heavier border — for focused or emphasized edges.',
    },
    {
      name: '--wr-color-overlay',
      type: 'rgba(var(--wr-color-backdrop-rgb), 0.45)',
      description: 'Modal / drawer scrim. Built on `-backdrop-rgb` so it stays a black dim in both themes.',
    },
    {
      name: '--wr-color-backdrop-rgb',
      type: '0, 0, 0',
      description:
        'Always-black channel for scrims. Not wired to `-dark-rgb`, which would flip to a white wash in dark.',
    },
    {
      name: '--wr-color-text-muted',
      type: 'rgba(var(--wr-color-medium-rgb), 0.85)',
      description: 'De-emphasized text — muted labels, captions.',
    },
    {
      name: '--wr-color-text-faint',
      type: 'rgba(var(--wr-color-medium-rgb), 0.6)',
      description: 'Faintest text — placeholders, disabled hints.',
    },
  ];

  /** Fixed slate gray ramp — a non-flipping primitive scale (50…950). */
  protected readonly grayRamp = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

  /** Semantic role aliases layered over the flipping neutrals. */
  protected readonly roleTokens: readonly DocApiRow[] = [
    {
      name: '--wr-color-surface',
      type: 'var(--wr-color-white)',
      description: 'Page / card background. Flips with the theme (white → slate canvas).',
    },
    {
      name: '--wr-color-on-surface',
      type: 'var(--wr-color-dark)',
      description: 'Primary text on a surface. Flips with the theme.',
    },
    {
      name: '--wr-color-on-surface-muted',
      type: 'var(--wr-color-medium)',
      description: 'Secondary / muted text on a surface.',
    },
  ];

  protected readonly snippets = {
    intent: `/* Solid surface: pair the base with its auto-computed contrast. */
.toast {
  background: var(--wr-color-primary);
  color: var(--wr-color-primary-contrast);
}

/* Hover / pressed shades come for free, no Sass needed at runtime. */
.toast:hover  { background: var(--wr-color-primary-dark); }
.toast:active { background: var(--wr-color-primary-darker); }`,

    soft: `/* Soft set — tinted surface + matching hairline + same-hue text. */
.alert--danger {
  background: var(--wr-color-danger-soft);          /* α 0.12 */
  border: 1px solid var(--wr-color-danger-soft-border); /* α 0.30 */
  color: var(--wr-color-danger-soft-contrast);      /* mixed 62% + dark */
}

.alert--danger:active {
  background: var(--wr-color-danger-active);         /* α 0.20 */
}`,

    rgb: `/* The -rgb channel composes any alpha you need at the call site. */
.ring {
  box-shadow: 0 0 0 4px rgba(var(--wr-color-primary-rgb), 0.2);
}`,

    gray: `/* Fixed slate primitive — does NOT flip; pick a step by job. */
.code-block {
  background: var(--wr-color-gray-50);   /* subtlest surface */
  border: 1px solid var(--wr-color-gray-200);
}
.ink-strong { color: var(--wr-color-gray-900); }`,

    roles: `/* Role aliases — intent-free, theme-aware surface / text. */
.panel {
  background: var(--wr-color-surface);
  color: var(--wr-color-on-surface);
}
.panel__caption { color: var(--wr-color-on-surface-muted); }`,

    neutral: `/* Semantic neutrals — theme-correct surfaces, borders, muted text. */
.card {
  background: var(--wr-color-white);              /* page surface */
  border: 1px solid var(--wr-color-border);
  color: var(--wr-color-dark);                    /* body text */
}
.card__meta  { color: var(--wr-color-text-muted); }
.card__row:hover { background: var(--wr-color-hover); }`,

    iterateScss: `/* Author an intent-aware component the way the lib itself does.
   \`$colors\` is \`map.keys($base-colors)\`, so it tracks the palette — rebrand
   with extra intents and your own component picks them up for free. */
@use 'ngwr/theme/styles' as theme;

.my-badge {
  @each $name in theme.$colors {
    &--#{$name} {
      background: var(--wr-color-#{$name});
      color: var(--wr-color-#{$name}-contrast);
    }
  }
}`,

    iterateTs: `import { WR_COLORS, type WrColor } from 'ngwr/theme';

@Component({...})
export class Palette {
  // The TS-side intent list — drives \`WrColor\`, the type every \`color\`
  // input accepts.
  readonly colors = WR_COLORS;
}`,

    dark: `/* Only semantic tokens flip; brand hues stay put.
   --wr-color-white  = page surface  → #0b1120 in dark
   --wr-color-dark   = body text     → #e6ebf3 in dark
   --wr-color-light  = borders/tints → #262f44 in dark
   --wr-color-medium = secondary txt → #9aa6b8 in dark */
[data-theme='dark'] {
  /* set automatically by provideWrTheme(); shown here for reference */
}

/* So this card needs NO dark-mode override — the tokens carry it: */
.card {
  background: var(--wr-color-white); /* light page / dark canvas */
  color: var(--wr-color-dark);       /* dark ink  / light ink   */
}`,
  };
}
