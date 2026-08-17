/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The palette recipe, in TypeScript.
 *
 * `theme/styles/_colors.scss` derives seven tokens per intent from one hex, and
 * until now that arithmetic existed only in Sass — so a theme picked at RUNTIME
 * (a builder, a tenant colour from an API, a preset fetched from a registry)
 * could not reproduce it. The showcase had half of it copied by hand for its
 * own primary-colour switcher, which is the copy that drifts.
 *
 * **Seven tokens, not twelve, and that is not an omission.** The tint and ink
 * layer is written in terms of `var()`:
 *
 * ```css
 * --wr-color-primary-soft: rgba(var(--wr-color-primary-rgb), 0.12);
 * --wr-color-primary-ink: color-mix(in srgb, var(--wr-color-primary) 78%, var(--wr-color-dark));
 * ```
 *
 * so redefining the base and its channels re-resolves `-soft`, `-soft-border`,
 * `-soft-contrast`, `-active` and `-ink` for free. A preset that also emitted
 * those would be freezing values the stylesheet is meant to keep deriving.
 *
 * **`-contrast` IS re-derived, and must be.** It picks whichever of black and
 * white scores higher against the fill, so a re-tuned intent keeps the label of
 * the colour it replaced unless something recomputes it — that is how the dark
 * theme once put white text on its lightened primary at 3.36:1.
 *
 * The LIGHT recipe only. `_dark.scss` is hand-tuned rather than derived — its
 * `dark-light` uses `color.scale(…, 70%)` where the light block uses
 * `color.adjust(…, 5%)`, and `light-light` goes -2.5% — so a generator claiming
 * to reproduce it would be lying. Feed dark seeds through the same recipe if you
 * want a derived dark theme; you will get a consistent one, not the shipped one.
 *
 * `pnpm check:theme` compiles nothing and trusts nothing: it reads the BUILT
 * stylesheet and asserts this module reproduces every one of those tokens for
 * the nine shipped intents.
 *
 * @example
 * ```ts
 * import { wrThemeTokens } from 'ngwr/theme';
 *
 * const tokens = wrThemeTokens({ primary: '#41598f' });
 * for (const [name, value] of Object.entries(tokens)) {
 *   document.documentElement.style.setProperty(name, value);
 * }
 * ```
 */

import { WR_COLORS, type WrColor } from './colors';

/** Lightness deltas, in PERCENTAGE POINTS, matching `color.adjust` in the SCSS. */
const SHADES = [
  ['dark', -5],
  ['darker', -10],
  ['light', 5],
  ['lighter', 10],
] as const;

interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** `#rgb` / `#rrggbb` → channels. Returns `null` for anything else. */
function parseHex(hex: string): Rgb | null {
  const raw = hex.trim().replace(/^#/, '');
  const full = raw.length === 3 ? [...raw].map(c => c + c).join('') : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const n = Number.parseInt(full, 16);
  /* eslint-disable no-bitwise -- unpacking a packed 24-bit colour */
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  /* eslint-enable no-bitwise */
}

const toHex = ({ r, g, b }: Rgb): string =>
  `#${[r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  // Two modulos, not one. `((h % 360) + 360) / 60` reads as normalisation and
  // is not: it maps 222° to sector 9.7 instead of 3.7, so every hue landed in
  // the wrong arm of the sextant table and only greys (c = x = 0) survived.
  // The parity gate caught it on the first run — `dark`'s navy came back red.
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [rp, gp, bp] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return { r: (rp + m) * 255, g: (gp + m) * 255, b: (bp + m) * 255 };
}

/** One channel, linearised per WCAG 2.x — the SCSS `_linear`. */
function linear(channel: number): number {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance. */
const luminance = ({ r, g, b }: Rgb): number => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

/** WCAG contrast ratio between two colours. */
function ratio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };

/**
 * The readable label ON a filled intent — whichever of black and white scores
 * higher, the SCSS `_contrast()`.
 *
 * It PICKS, it does not blend, so those two values are the ceiling for every
 * intent. The comparison is `>=`, so a colour exactly at the flip point
 * (√21 ≈ 4.58 against both) takes the dark label, matching the SCSS.
 */
function wrContrastFor(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return '#000000';
  return ratio(rgb, BLACK) >= ratio(rgb, WHITE) ? '#000000' : '#ffffff';
}

/** Shift HSL lightness by `deltaPct` PERCENTAGE POINTS, clamped — `color.adjust`. */
function adjustLightness(rgb: Rgb, deltaPct: number): Rgb {
  const { h, s, l } = rgbToHsl(rgb);
  return hslToRgb(h, s, Math.min(1, Math.max(0, l + deltaPct / 100)));
}

/**
 * The seven `--wr-color-<name>*` tokens one seed produces.
 *
 * Returns an empty record for a hex it cannot parse rather than a palette built
 * on black — a silently black theme is harder to notice than a missing one.
 *
 * `name` is a shipped intent rather than any string: a token layer the
 * stylesheet never declares has nothing reading it, and a typo would otherwise
 * emit `--wr-color-primry-*` and paint nothing.
 */
function wrIntentTokens(name: WrColor, seed: string): Record<string, string> {
  const rgb = parseHex(seed);
  if (!rgb) return {};

  const out: Record<string, string> = {
    [`--wr-color-${name}`]: toHex(rgb),
    [`--wr-color-${name}-rgb`]: `${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}`,
    [`--wr-color-${name}-contrast`]: wrContrastFor(toHex(rgb)),
  };
  for (const [suffix, delta] of SHADES) {
    out[`--wr-color-${name}-${suffix}`] = toHex(adjustLightness(rgb, delta));
  }
  return out;
}

/**
 * Every token a theme preset needs, for as many intents as it re-tunes.
 *
 * Intents left out keep the values the stylesheet compiled, so a preset that
 * only moves `primary` writes seven declarations and nothing else.
 */
function wrThemeTokens(seeds: Partial<Record<WrColor, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of WR_COLORS) {
    const seed = seeds[name];
    if (seed) Object.assign(out, wrIntentTokens(name, seed));
  }
  return out;
}

export { wrContrastFor, wrIntentTokens, wrThemeTokens };
