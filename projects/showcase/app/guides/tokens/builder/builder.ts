import { DOCUMENT, Component, computed, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrColorPickerTrigger } from 'ngwr/color-picker';
import { WrSegmented } from 'ngwr/segmented';
import { WR_COLORS, WrTheme, wrThemeTokens, type WrColor } from 'ngwr/theme';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSeeAlsoComponent } from '#core/components';
import type { DocSeeAlsoLink } from '#core/components';

/** The intents the builder offers — the five the theme has. */
const SEEDABLE = WR_COLORS;

/**
 * Where each picker starts — the shipped light palette.
 *
 * Typed `Record<WrColor, string>` rather than `Record<string, string>`, which
 * is what let two removed intents sit here unreachable after v15: `secondary`
 * and `medium` kept their old hexes in a map nobody could reach, because
 * `SEEDABLE` is `WR_COLORS` and they are not in it. The narrow type makes the
 * next one a compile error, and it matters more than tidiness — `changed()`
 * keys the exported CSS on "differs from DEFAULTS", so this map agreeing with
 * `$base-colors` is load-bearing.
 */
const DEFAULTS: Readonly<Record<WrColor, string>> = {
  primary: '#3969e2',
  success: '#008800',
  warning: '#ffba00',
  danger: '#dc3137',
  info: '#3472d9',
};

/**
 * A live theme builder.
 *
 * Everything here runs through `wrThemeTokens()` from `ngwr/theme` — the same
 * function the shipped presets are generated with, and the one `check:theme`
 * proves against the compiled stylesheet. The page therefore cannot show a
 * palette the library would not produce, which is the property a builder needs
 * and the reason none of this arithmetic lives in the showcase.
 *
 * The preview is the WHOLE PAGE, not a swatch grid: the tokens are written onto
 * `<html>`, so every component on screen — including the site's own chrome —
 * repaints. A builder that previews into an isolated box is a builder that can
 * be wrong about the thing you are actually buying.
 */
@Component({
  selector: 'ngwr-tokens-builder-page',
  templateUrl: './builder.html',
  styleUrl: './builder.scss',
  imports: [
    WrButton,
    WrColorPickerTrigger,
    WrSegmented,
    DocPageComponent,
    DocSectionComponent,
    DocCodeComponent,
    DocSeeAlsoComponent,
  ],
})
export default class ThemeBuilderPageComponent {
  private readonly doc = inject(DOCUMENT);
  private readonly theme = inject(WrTheme);

  protected readonly intents = SEEDABLE;

  /** The seed per intent. Only what differs from the default is exported. */
  protected readonly seeds = signal<Record<string, string>>({ ...DEFAULTS });

  /** Which side the seeds are being edited for — the export carries both. */
  protected readonly editing = signal<'light' | 'dark'>('light');
  protected readonly sides = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  /** Seeds the user actually moved. A preset should not restate the defaults. */
  protected readonly changed = computed<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [name, hex] of Object.entries(this.seeds())) {
      // `Object.entries` widens the key to `string`, and `DEFAULTS` is now
      // keyed by `WrColor` — the narrowing that stopped two removed intents
      // living here. A seed that is not an intent cannot differ from a default
      // it has no row in, so it is skipped rather than cast.
      if (!SEEDABLE.includes(name as WrColor)) continue;
      if (hex.toLowerCase() !== DEFAULTS[name as WrColor].toLowerCase()) out[name] = hex;
    }
    return out;
  });

  protected readonly tokens = computed(() => wrThemeTokens(this.changed() as Partial<Record<WrColor, string>>));

  protected readonly css = computed(() => {
    const entries = Object.entries(this.tokens());
    if (entries.length === 0) return '/* Move a colour to see its tokens. */';
    const selector = this.editing() === 'dark' ? ":root[data-theme='dark']" : ':root';
    return `${selector} {\n${entries.map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}`;
  });

  /** Paint the tokens onto `<html>` so the whole page previews them. */
  protected apply(): void {
    const root = this.doc.documentElement;
    for (const [name, value] of Object.entries(this.tokens())) root.style.setProperty(name, value);
    // Editing the dark seeds is only visible in the dark theme.
    this.theme.set(this.editing());
  }

  protected reset(): void {
    const root = this.doc.documentElement;
    for (const name of Object.keys(this.tokens())) root.style.removeProperty(name);
    this.seeds.set({ ...DEFAULTS });
  }

  protected setSeed(intent: string, hex: string): void {
    this.seeds.update(current => ({ ...current, [intent]: hex }));
  }

  protected onSide(value: string | null): void {
    if (value === 'light' || value === 'dark') this.editing.set(value);
  }

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Colour tokens',
      url: ['/guides/tokens', 'colors'],
      description: 'Every `--wr-color-*` the layer defines, and which role each one plays.',
    },
    {
      kind: 'Guide',
      title: 'Theming',
      url: ['/guides', 'theming'],
      description: '`provideWrTheme()`, the `data-theme` attribute, and how the two token sets swap.',
    },
  ];
}
