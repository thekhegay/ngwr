import { Component } from '@angular/core';

import { WR_COLORS } from 'ngwr/theme';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSeeAlsoComponent } from '#core/components';
import type { DocSeeAlsoLink } from '#core/components';

interface Swatch {
  /** Token suffix appended to `--wr-color-{intent}`. */
  readonly suffix: string;
  /** Short caption under the chip. */
  readonly label: string;
}

interface Token {
  readonly name: string;
  readonly use?: string;
  readonly value?: string;
}

@Component({
  selector: 'ngwr-tokens-colors',
  templateUrl: './colors.html',
  styleUrl: './colors.scss',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocSeeAlsoComponent],
})
export default class TokensColorsPage {
  /** Taken from the tuple, so the page cannot fall behind the palette. */
  protected readonly intents = WR_COLORS;

  protected readonly shades: readonly Swatch[] = [
    { suffix: '', label: 'base' },
    { suffix: '-dark', label: 'dark' },
    { suffix: '-darker', label: 'darker' },
    { suffix: '-light', label: 'light' },
    { suffix: '-lighter', label: 'lighter' },
  ];

  protected readonly intentTokens: readonly Token[] = [
    { name: '--wr-color-{intent}', use: 'Solid fill' },
    { name: '--wr-color-{intent}-contrast', use: 'Text on the solid fill' },
    { name: '--wr-color-{intent}-dark, -darker', use: 'Hover and pressed fill' },
    { name: '--wr-color-{intent}-light, -lighter', use: 'Lighter shades' },
    { name: '--wr-color-{intent}-soft', use: 'Tinted fill' },
    { name: '--wr-color-{intent}-soft-border', use: 'Border on a tinted fill' },
    { name: '--wr-color-{intent}-active', use: 'Pressed tinted fill' },
    { name: '--wr-color-{intent}-ink', use: 'The intent as text, on a surface or a tinted fill' },
    { name: '--wr-color-{intent}-soft-contrast', use: 'Older text-on-tint token. Use -ink instead' },
  ];

  protected readonly neutralTokens: readonly Token[] = [
    { name: '--wr-color-surface', use: 'Page and card background' },
    { name: '--wr-color-on-surface', use: 'Body text' },
    { name: '--wr-color-on-surface-muted', use: 'Secondary text' },
    { name: '--wr-color-placeholder', use: 'Placeholder text' },
    { name: '--wr-color-hover', use: 'Hover tint on rows and icon buttons' },
    { name: '--wr-color-fill-subtle, -fill, -fill-strong', use: 'Neutral washes: a band, a header, a track' },
    { name: '--wr-border-subtle, -base, -strong', use: 'Borders and dividers' },
    { name: '--wr-color-overlay', use: 'Modal and drawer scrim' },
  ];

  /** The fixed ramp. It does not follow dark mode. */
  protected readonly grayRamp = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

  protected readonly focusTokens: readonly Token[] = [
    { name: '--wr-focus-ring-color', value: 'var(--wr-color-primary)' },
    { name: '--wr-focus-ring-width', value: '2px' },
    { name: '--wr-focus-ring-offset', value: '2px' },
    { name: '--wr-focus-ring-halo', value: 'color-mix(in srgb, var(--wr-color-primary) 25%, transparent)' },
  ];

  protected readonly snippets = {
    usage: `.toast {
  background: var(--wr-color-primary);
  color: var(--wr-color-primary-contrast);
}
.toast:hover { background: var(--wr-color-primary-dark); }

.alert {
  background: var(--wr-color-danger-soft);
  border: 1px solid var(--wr-color-danger-soft-border);
  color: var(--wr-color-danger-ink);
}

.card {
  background: var(--wr-color-surface);
  border: 1px solid var(--wr-border-base);
  color: var(--wr-color-on-surface);
}
.card__meta { color: var(--wr-color-on-surface-muted); }

// Any token at any alpha
.ring {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--wr-color-primary) 20%, transparent);
}`,

    focus: `:root {
  --wr-focus-ring-color: var(--wr-color-success);
  --wr-focus-ring-width: 3px;
}

// Text fields: recolour their focused border too.
.wr-input:focus,
.wr-input-group:focus-within,
.wr-textarea--focused {
  --wr-input-border: var(--wr-focus-ring-color);
  --wr-input-group-border: var(--wr-focus-ring-color);
  --wr-textarea-border: var(--wr-focus-ring-color);
}`,

    iterateScss: `@use 'ngwr/theme';

.my-badge {
  @each $name in theme.$colors {
    &--#{$name} {
      background: var(--wr-color-#{$name});
      color: var(--wr-color-#{$name}-contrast);
    }
  }
}`,

    iterateTs: `import { WR_COLORS } from 'ngwr/theme';

WR_COLORS; // ['primary', 'success', 'warning', 'danger', 'info']`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Theming', url: ['/guides', 'theming'] },
    { kind: 'Guide', title: 'Sizing', url: ['/guides/tokens', 'sizing'] },
  ];
}
