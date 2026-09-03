import { describe, expect, it } from 'vitest';

import { isSafeCssValue } from './is-safe-css-value';

/**
 * The rejected strings below are the audit's own corpus, verbatim from
 * `css-url-injection.json` — each one was confirmed to make a browser issue a
 * `GET` to a collector on first paint, with `Sec-Fetch-Dest: image`. A spec that
 * asserted "the value is validated" without feeding it something that used to
 * fetch would prove nothing, so they are spelled out rather than paraphrased.
 */
const BEACON = 'http://localhost:8235';

describe('isSafeCssValue', () => {
  describe('the payloads that escaped the slot', () => {
    it('refuses the shiny-text shineColor breakout', () => {
      expect(isSafeCssValue(`red), url("${BEACON}/shiny-shineColor"), linear-gradient(red`)).toBe(false);
    });

    it('refuses the gradient-text stop breakout', () => {
      expect(isSafeCssValue(`red), url("${BEACON}/gradient-colors"), linear-gradient(red, red`)).toBe(false);
    });

    it('refuses the border-glow palette breakout', () => {
      expect(isSafeCssValue(`red), url("${BEACON}/borderglow-colors"), radial-gradient(circle at 0% 0%, red`)).toBe(
        false
      );
    });

    it('refuses a bare url() even with nothing to break out of', () => {
      expect(isSafeCssValue(`url("${BEACON}/borderglow-bg")`)).toBe(false);
      expect(isSafeCssValue(`url(${BEACON}/borderglow-bg)`)).toBe(false);
    });

    it('refuses the same payloads unquoted — the quotes are not what makes them work', () => {
      expect(isSafeCssValue(`red), url(${BEACON}), linear-gradient(red`)).toBe(false);
    });

    it('refuses every other image-producing function', () => {
      for (const fn of ['image-set', 'cross-fade', 'element', 'paint', '-webkit-image-set']) {
        expect(isSafeCssValue(`${fn}(${BEACON}/x.png)`), fn).toBe(false);
      }
    });
  });

  describe('the ways out of a slot, one at a time', () => {
    it('refuses a close paren the value never opened', () => {
      expect(isSafeCssValue('red)')).toBe(false);
      expect(isSafeCssValue('var(--x))')).toBe(false);
    });

    it('refuses an open paren the value never closes', () => {
      expect(isSafeCssValue('var(--x')).toBe(false);
    });

    it('refuses a top-level comma — a colour is one value, not a list', () => {
      expect(isSafeCssValue('red, blue')).toBe(false);
    });

    it('refuses a declaration terminator, a quote, a backslash and a comment', () => {
      expect(isSafeCssValue('red; background: red')).toBe(false);
      expect(isSafeCssValue('"red"')).toBe(false);
      expect(isSafeCssValue("'red'")).toBe(false);
      expect(isSafeCssValue('red\\')).toBe(false);
      expect(isSafeCssValue('red /* c */')).toBe(false);
      expect(isSafeCssValue('red !important')).toBe(false);
      expect(isSafeCssValue('red } .x {')).toBe(false);
    });

    it('refuses an empty value and one longer than any real colour', () => {
      expect(isSafeCssValue('')).toBe(false);
      expect(isSafeCssValue('   ')).toBe(false);
      expect(isSafeCssValue(`#${'a'.repeat(300)}`)).toBe(false);
    });

    it('refuses a paren with no function name in front of it', () => {
      expect(isSafeCssValue('(red)')).toBe(false);
    });
  });

  describe('what a component still has to render', () => {
    it('accepts the colour shapes the library and its demos actually pass', () => {
      for (const value of [
        'red',
        'currentColor',
        'transparent',
        '#fff',
        '#5227FF',
        '#5227FFAA',
        'rgb(0, 0, 0)',
        'rgba(0,0,0,0.5)',
        'hsl(210 40% 50%)',
        'oklch(0.7 0.1 200)',
        'var(--wr-color-primary)',
        'var(--wr-shiny-text-shine)',
        'var(--wr-color-primary, #5227FF)',
        'color-mix(in srgb, var(--wr-color-primary) 50%, white)',
        'light-dark(#111, #eee)',
      ]) {
        expect(isSafeCssValue(value), value).toBe(true);
      }
    });

    it('accepts a stop that carries its own position — top-level whitespace is legal', () => {
      // Rejecting this would have been a real regression: `['red 20%', 'blue']`
      // is an ordinary gradient palette.
      expect(isSafeCssValue('red 20%')).toBe(true);
      expect(isSafeCssValue('var(--wr-color-primary) 50%')).toBe(true);
    });

    it('trims before judging', () => {
      expect(isSafeCssValue('  #fff  ')).toBe(true);
    });

    it('is case-insensitive about function names but not fooled by them', () => {
      expect(isSafeCssValue('VAR(--x)')).toBe(true);
      expect(isSafeCssValue('URL(x)')).toBe(false);
    });

    it('answers false rather than throwing for a non-string', () => {
      expect(isSafeCssValue(null as unknown as string)).toBe(false);
      expect(isSafeCssValue(undefined as unknown as string)).toBe(false);
    });
  });
});
