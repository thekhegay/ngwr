import { DOCUMENT, Service, computed, effect, inject, signal } from '@angular/core';

import { wrIntentTokens } from 'ngwr/theme';

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

/**
 * Applies a chosen primary-color preset live by writing the
 * `--wr-color-primary*` custom properties on `<html>`, and persists the
 * choice. The token set comes from `wrIntentTokens()` in `ngwr/theme`, which is
 * the same recipe `theme/styles/_colors.scss` compiles — the showcase used to
 * keep its own copy of the arithmetic, and the copy is what drifted.
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
   * Write the seed's `--wr-color-primary*` tokens onto `document.documentElement`.
   * The default preset clears any inline overrides so the compiled stylesheet
   * value shows through.
   *
   * `-contrast` rides along with the rest, and that is the point of delegating:
   * it is a Sass-time PICK of black or white baked into the stylesheet, so a
   * hand-rolled shade set that omitted it left every filled primary control
   * wearing the shipped blue's white label — 2.15:1 on amber. `-soft` and `-ink`
   * are deliberately absent: they are written in terms of `var()`, so moving the
   * base and its channels re-resolves them on its own.
   */
  private apply(hex: string): void {
    const root = this.doc.documentElement;
    if (!root) return;

    const props = wrIntentTokens('primary', hex);

    if (this.current() === DEFAULT_PRIMARY_ID) {
      // Default: drop overrides so the lib's compiled tokens win.
      for (const name of Object.keys(props)) root.style.removeProperty(name);
      return;
    }

    for (const [name, value] of Object.entries(props)) root.style.setProperty(name, value);
  }
}

export { PrimaryColor, PRIMARY_PRESETS, DEFAULT_PRIMARY_ID, type PrimaryPreset };
