import { describe, expect, it } from 'vitest';

import { wrContrastFor, wrIntentTokens, wrThemeTokens } from './palette';

/**
 * The recipe's agreement with `_colors.scss` is proved by `pnpm check:theme`,
 * which reads the BUILT stylesheet and compares all 63 shipped tokens — a unit
 * test cannot see Sass, so it must not pretend to.
 *
 * What belongs here is everything that check cannot ask: the shape of the
 * output, the rules that hold for seeds the library does not ship, and the
 * behaviour on input a builder will hand it the moment someone types into a
 * text field.
 */
describe('wrIntentTokens', () => {
  it('emits the seven tokens a preset overrides, and no more', () => {
    // The tint and ink layer is written in terms of `var()`, so it re-resolves
    // from these on its own. Emitting `-soft` or `-ink` here would freeze
    // values the stylesheet is meant to keep deriving.
    expect(Object.keys(wrIntentTokens('primary', '#3969e2')).sort()).toEqual([
      '--wr-color-primary',
      '--wr-color-primary-contrast',
      '--wr-color-primary-dark',
      '--wr-color-primary-darker',
      '--wr-color-primary-light',
      '--wr-color-primary-lighter',
      '--wr-color-primary-rgb',
    ]);
  });

  it('keeps the hue and moves only the lightness', () => {
    const tokens = wrIntentTokens('primary', '#3969e2');
    // A missing modulo once sent every hue into the wrong sextant and turned
    // this navy red, so the assertion is on the CHANNEL ORDER, not on a value:
    // blue dominant, red least, at every step.
    for (const key of ['--wr-color-primary-darker', '--wr-color-primary', '--wr-color-primary-lighter'] as const) {
      const [r, g, b] = channels(tokens[key]);
      expect(b, `${key} lost its hue`).toBeGreaterThan(g);
      expect(g).toBeGreaterThan(r);
    }
  });

  it('orders the four shades from darker to lighter', () => {
    const t = wrIntentTokens('primary', '#3969e2');
    const lum = (hex: string): number => channels(hex).reduce((a, c) => a + c, 0);

    expect(lum(t['--wr-color-primary-darker'])).toBeLessThan(lum(t['--wr-color-primary-dark']));
    expect(lum(t['--wr-color-primary-dark'])).toBeLessThan(lum(t['--wr-color-primary']));
    expect(lum(t['--wr-color-primary'])).toBeLessThan(lum(t['--wr-color-primary-light']));
    expect(lum(t['--wr-color-primary-light'])).toBeLessThan(lum(t['--wr-color-primary-lighter']));
  });

  it('clamps rather than wrapping at the ends of the lightness range', () => {
    // `+10%` on white and `-10%` on black have nowhere to go; wrapping would
    // hand back the opposite end of the scale.
    expect(wrIntentTokens('light', '#ffffff')['--wr-color-light-lighter']).toBe('#ffffff');
    expect(wrIntentTokens('dark', '#000000')['--wr-color-dark-darker']).toBe('#000000');
  });

  it('accepts the short hex a person types', () => {
    expect(wrIntentTokens('primary', '#08f')['--wr-color-primary']).toBe('#0088ff');
    expect(wrIntentTokens('primary', '0088ff')['--wr-color-primary-rgb']).toBe('0, 136, 255');
  });

  it('returns nothing for a seed it cannot parse', () => {
    // Not a palette built on black: a theme that silently went monochrome is
    // harder to notice than one that did not apply.
    for (const bad of ['', 'rebeccapurple', '#12', '#1234567', 'rgb(1,2,3)']) {
      expect(wrIntentTokens('primary', bad), bad).toEqual({});
    }
  });
});

describe('wrContrastFor', () => {
  it('picks the candidate that scores higher, not the one that looks right', () => {
    expect(wrContrastFor('#ffba00')).toBe('#000000');
    expect(wrContrastFor('#0f172a')).toBe('#ffffff');
  });

  /**
   * The two candidates are equal at √21 ≈ 4.58, and five intents were deepened
   * in v11 precisely to cross that line. A colour just either side of it must
   * flip, or a re-tuned intent keeps the label of the colour it replaced.
   */
  it('flips across the black/white break point', () => {
    // Measured, not assumed — the first draft of this test put the boundary a
    // shade too light and failed against correct code. For greys it sits at
    // #767676: 4.623 on black against 4.542 on white, so black takes it, while
    // one step lighter (4.558 / 4.608) still goes to white.
    expect(wrContrastFor('#757575')).toBe('#ffffff');
    expect(wrContrastFor('#767676')).toBe('#000000');
  });

  it('answers black for an unparseable colour rather than throwing', () => {
    expect(wrContrastFor('nope')).toBe('#000000');
  });
});

describe('wrThemeTokens', () => {
  it('writes only the intents it was given', () => {
    const tokens = wrThemeTokens({ primary: '#41598f' });

    expect(Object.keys(tokens)).toHaveLength(7);
    expect(Object.keys(tokens).every(k => k.startsWith('--wr-color-primary'))).toBe(true);
  });

  it('skips an intent whose seed is unusable instead of dropping the rest', () => {
    const tokens = wrThemeTokens({ primary: '#41598f', danger: 'not-a-colour' });

    expect(tokens['--wr-color-primary']).toBe('#41598f');
    expect(tokens['--wr-color-danger']).toBeUndefined();
  });

  it('ignores a key that is not an intent', () => {
    const tokens = wrThemeTokens({ nonsense: '#ffffff' } as never);

    expect(tokens).toEqual({});
  });
});

/** `#rrggbb` → channels, for assertions that care about relationships. */
function channels(hex: string): readonly [number, number, number] {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  /* eslint-disable no-bitwise -- unpacking a packed 24-bit colour */
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  /* eslint-enable no-bitwise */
}
