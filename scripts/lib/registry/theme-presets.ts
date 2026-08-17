/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The shipped theme presets, as SEEDS rather than as token dumps.
 *
 * A preset is a `registry:theme` item under `registry/items/`, and its `cssVars`
 * are derived by `wrThemeTokens()` — the same function `ngwr/theme` exports and
 * `check:theme` proves against the compiled stylesheet. Writing the tokens by
 * hand is how the first draft of `theme-slate` was made, and it shipped a
 * `-rgb` line computed in someone's head and no shades at all.
 *
 * Only the LIGHT half is derived. `_dark.scss` is hand-tuned rather than
 * generated, so a preset that claimed a matching dark palette would be
 * inventing one; each preset instead names a dark seed for the intents it
 * moves, and the same recipe derives that side too — consistent, not identical
 * to the shipped dark theme.
 */

import { wrThemeTokens } from '../../../projects/lib/theme/palette';

interface ThemePreset {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  /** Seeds per theme. Intents left out keep the compiled values. */
  readonly light: Record<string, string>;
  readonly dark: Record<string, string>;
}

const PRESETS: readonly ThemePreset[] = [
  {
    name: 'theme-slate',
    title: 'Slate',
    description: 'A cooler, lower-saturation take on the default palette — the blue steps back toward grey.',
    light: { primary: '#41598f', info: '#3f6ea8' },
    dark: { primary: '#7d9ad6', info: '#79a6cf' },
  },
  {
    name: 'theme-ember',
    title: 'Ember',
    description: 'Warm and high-contrast: a burnt-orange primary with a red-leaning secondary.',
    light: { primary: '#b4441a', secondary: '#c02a4a' },
    dark: { primary: '#ef8a5c', secondary: '#e2607e' },
  },
  {
    name: 'theme-forest',
    title: 'Forest',
    description: 'A deep green primary with a muted teal info, for dashboards that read as calm rather than alert.',
    light: { primary: '#1f6b45', info: '#2b6b74' },
    dark: { primary: '#5fb98a', info: '#6cb3bc' },
  },
];

/** One preset as the registry item it ships as. */
function buildThemePreset(preset: ThemePreset): Record<string, unknown> {
  return {
    $schema: 'https://ngwr.dev/registry/schema.json',
    name: preset.name,
    type: 'registry:theme',
    title: preset.title,
    description: preset.description,
    author: 'ngwr',
    ngwr: '>=11',
    cssVars: {
      light: wrThemeTokens(preset.light),
      dark: wrThemeTokens(preset.dark),
    },
  };
}

export { PRESETS, buildThemePreset };
export type { ThemePreset };
