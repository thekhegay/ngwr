import { DOCUMENT, Service, computed, effect, inject, signal } from '@angular/core';

/** A selectable primary-color preset shown as a swatch in the settings panel. */
interface PrimaryPreset {
  readonly id: string;
  readonly label: string;
  readonly hex: string;
}

/**
 * Primary-color presets. `blue` is the real ngwr default
 * (`$base-colors.primary` in `theme/styles/_colors.scss`); the rest are
 * alternates. The hex values are the feature's data, so they're literal.
 */
const PRIMARY_PRESETS: readonly PrimaryPreset[] = [
  { id: 'blue', label: 'Blue', hex: '#3969e2' },
  { id: 'violet', label: 'Violet', hex: '#7c5cfc' },
  { id: 'emerald', label: 'Emerald', hex: '#10b981' },
  { id: 'rose', label: 'Rose', hex: '#f43f5e' },
  { id: 'amber', label: 'Amber', hex: '#f59e0b' },
];

/** The default preset — matches the lib's compiled `--wr-color-primary`. */
const DEFAULT_PRIMARY_ID = 'blue';

const STORAGE_KEY = 'ngwr-primary';

/** SSR-safe `localStorage` read; returns `null` when unavailable. */
function readStored(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** SSR-safe `localStorage` write; silently ignored when unavailable. */
function writeStored(id: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore (private mode / disabled storage)
  }
}

/** Parse `#rrggbb` (or `#rgb`) into 0–255 channels. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const n = Number.parseInt(h, 16);
  return {
    r: Math.floor(n / 65536) % 256,
    g: Math.floor(n / 256) % 256,
    b: n % 256,
  };
}

/** Format 0–255 channels as a `"r, g, b"` CSS string. */
function rgbString(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

/** RGB (0–255) → HSL (h 0–360, s/l 0–1). */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s, l };
}

/** HSL (h 0–360, s/l 0–1) → `#rrggbb`. */
function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [rp, gp, bp] = hueSegment(hp, c, x);
  const m = l - c / 2;
  const to = (v: number): string =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(rp)}${to(gp)}${to(bp)}`;
}

/** Pick the RGB primaries for a 0–6 hue sector. */
function hueSegment(hp: number, c: number, x: number): readonly [number, number, number] {
  if (hp < 1) return [c, x, 0];
  if (hp < 2) return [x, c, 0];
  if (hp < 3) return [0, c, x];
  if (hp < 4) return [0, x, c];
  if (hp < 5) return [x, 0, c];
  return [c, 0, x];
}

/**
 * Shift a hex's lightness by `deltaPct` percentage points (clamped 0–100),
 * mirroring the SCSS `color.adjust($base, $lightness: ±N%)` the lib uses to
 * derive `--wr-color-primary-{dark,darker,light,lighter}` in `_colors.scss`.
 */
function adjustLightness(hex: string, deltaPct: number): string {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const nl = Math.min(1, Math.max(0, l + deltaPct / 100));
  return hslToHex(h, s, nl);
}

/**
 * Applies a chosen primary-color preset live by writing the
 * `--wr-color-primary*` custom properties on `<html>`, and persists the
 * choice. Mirrors how `theme/styles/_colors.scss` derives the four shades
 * (`color.adjust` ±5/10% lightness) so hover/active states track the hue.
 *
 * Default = the real default primary, so nothing is overridden until the
 * user picks a non-default preset.
 */
@Service()
class PrimaryColor {
  private readonly doc = inject(DOCUMENT);

  /** Selected preset id (e.g. `'blue'`). */
  readonly current = signal<string>(this.readInitial());

  /** Resolved preset object for the current id. */
  readonly preset = computed<PrimaryPreset>(
    () => PRIMARY_PRESETS.find(p => p.id === this.current()) ?? PRIMARY_PRESETS[0]
  );

  readonly presets = PRIMARY_PRESETS;

  constructor() {
    effect(() => {
      const { id, hex } = this.preset();
      this.apply(hex);
      writeStored(id);
    });
  }

  /** Switch to a preset by id. Unknown ids are ignored. */
  set(id: string): void {
    if (!PRIMARY_PRESETS.some(p => p.id === id)) return;
    this.current.set(id);
  }

  private readInitial(): string {
    const stored = readStored();
    return stored && PRIMARY_PRESETS.some(p => p.id === stored) ? stored : DEFAULT_PRIMARY_ID;
  }

  /**
   * Write `--wr-color-primary`, its `-rgb` channels, and the four derived
   * shades onto `document.documentElement`. The default preset clears any
   * inline overrides so the compiled stylesheet value shows through.
   */
  private apply(hex: string): void {
    const root = this.doc.documentElement;
    if (!root) return;

    const props: Record<string, string> = {
      '--wr-color-primary': hex,
      '--wr-color-primary-rgb': rgbString(hex),
      '--wr-color-primary-dark': adjustLightness(hex, -5),
      '--wr-color-primary-darker': adjustLightness(hex, -10),
      '--wr-color-primary-light': adjustLightness(hex, 5),
      '--wr-color-primary-lighter': adjustLightness(hex, 10),
    };

    if (this.current() === DEFAULT_PRIMARY_ID) {
      // Default: drop overrides so the lib's compiled tokens win.
      for (const name of Object.keys(props)) root.style.removeProperty(name);
      return;
    }

    for (const [name, value] of Object.entries(props)) root.style.setProperty(name, value);
  }
}

export { PrimaryColor, PRIMARY_PRESETS, DEFAULT_PRIMARY_ID, type PrimaryPreset };
