import { afterEach, describe, expect, it } from 'vitest';

import { wrPresentAsSheet } from './wr-responsive-overlays.token';

/**
 * One three-line function, and every overlay in the library routes its mobile
 * presentation through it — select, dropdown, popover, drawer. It decides two
 * separate things in one expression, and both are easy to get backwards.
 *
 * The first is precedence, and it is the library's config rule in miniature: a bound
 * `responsive` WINS over the provider, in both directions. A component told
 * `[responsive]="false"` must keep floating in an app that turned sheets on globally,
 * and one told `[responsive]="true"` must present as a sheet in an app that never
 * configured them. That is what `responsive ?? config !== null` buys, and why it is
 * not `responsive || config !== null` — which would make a bound `false` unreachable.
 *
 * The second is the viewport test, which is the half a unit test can only reach by
 * moving `window.innerWidth` — so it is moved here, and put back afterwards, because
 * jsdom shares one window across the file.
 */
describe('wrPresentAsSheet', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'innerWidth');

  const atWidth = (width: number): void => {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  };

  afterEach(() => {
    if (original) Object.defineProperty(window, 'innerWidth', original);
  });

  describe('with nothing configured', () => {
    it('floats, whatever the viewport', () => {
      atWidth(320);
      expect(wrPresentAsSheet(undefined, null)).toBe(false);
    });

    it('still becomes a sheet when a component asks for one', () => {
      // The opt-in path: one `[responsive]` on one component, no provider anywhere.
      atWidth(320);
      expect(wrPresentAsSheet(true, null)).toBe(true);
    });
  });

  describe('with the provider configured', () => {
    const config = { breakpoint: 640 };

    it('becomes a sheet on a narrow viewport without being asked', () => {
      atWidth(390);
      expect(wrPresentAsSheet(undefined, config)).toBe(true);
    });

    it('floats on a wide one', () => {
      atWidth(1280);
      expect(wrPresentAsSheet(undefined, config)).toBe(false);
    });

    it('lets a component opt OUT, which an `||` would have made impossible', () => {
      atWidth(390);
      expect(wrPresentAsSheet(false, config)).toBe(false);
    });
  });

  describe('the breakpoint itself', () => {
    it('is inclusive — 640 is a sheet, 641 is not', () => {
      atWidth(640);
      expect(wrPresentAsSheet(true, null)).toBe(true);

      atWidth(641);
      expect(wrPresentAsSheet(true, null)).toBe(false);
    });

    it('takes the configured width over the 640 default', () => {
      atWidth(800);
      expect(wrPresentAsSheet(undefined, { breakpoint: 900 })).toBe(true);
      expect(wrPresentAsSheet(undefined, { breakpoint: 640 })).toBe(false);
    });

    it('reads the width at call time, not at provider time', () => {
      // Overlays ask on every open, which is what makes a rotation or a resize
      // between two opens present differently — and why nothing here is cached.
      atWidth(1280);
      expect(wrPresentAsSheet(true, null)).toBe(false);

      atWidth(390);
      expect(wrPresentAsSheet(true, null)).toBe(true);
    });
  });
});
