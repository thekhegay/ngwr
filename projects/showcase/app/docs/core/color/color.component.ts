import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WR_COLORS, type WrColor } from 'ngwr/theme';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

type Variant = { readonly suffix: string; readonly label: string };

@Component({
  selector: 'ngwr-color-page',
  templateUrl: './color.component.html',
  styleUrl: './color.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent],
})
export default class ColorPageComponent {
  protected readonly colors = WR_COLORS;

  protected readonly variants: readonly Variant[] = [
    { suffix: '', label: 'base' },
    { suffix: '-dark', label: 'dark −5%' },
    { suffix: '-darker', label: 'darker −10%' },
    { suffix: '-light', label: 'light +5%' },
    { suffix: '-lighter', label: 'lighter +10%' },
  ];

  protected readonly snippets = {
    cssVars: `:root {
  /* Per color: base, contrast, dark, darker, light, lighter, plus rgb. */
  --wr-color-primary;
  --wr-color-primary-rgb;        /* "57, 105, 226" — usable with rgba() */
  --wr-color-primary-contrast;   /* auto: dark text on light bg, light on dark */
  --wr-color-primary-dark;       /* -5% lightness */
  --wr-color-primary-darker;     /* -10% lightness */
  --wr-color-primary-light;      /* +5% lightness */
  --wr-color-primary-lighter;    /* +10% lightness */
}`,
    consume: `.my-toast {
  background: var(--wr-color-success);
  color: var(--wr-color-success-contrast);
  /* alpha overlays via the -rgb channel: */
  box-shadow: 0 0 0 4px rgba(var(--wr-color-success-rgb), 0.2);
}`,
    overrideRoot: `:root {
  --wr-color-primary: #6366f1;
  /* contrast + variants auto-update only at SCSS compile time, not at runtime —
     for a runtime override, set the variants too:                            */
  --wr-color-primary-rgb: 99, 102, 241;
  --wr-color-primary-contrast: #ffffff;
}`,
    overrideScss: `@use 'ngwr/theme/colors' with (
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
    iterateScss: `// In your own component styles you can iterate the same way the lib does:
@use 'ngwr/theme' as theme;

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
  readonly colors = WR_COLORS; // readonly tuple of 8
}`,
  };

  protected cssVarFor(color: WrColor, suffix: string): string {
    return `--wr-color-${color}${suffix}`;
  }

  protected styleFor(color: WrColor, suffix: string): string {
    return `var(${this.cssVarFor(color, suffix)})`;
  }
}
