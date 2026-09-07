/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { getRootFontSize } from './get-root-font-size';

/**
 * The rem half of `resolveCssSize` rests on this, and so does every component
 * that converts a rem input into a number — which is why the fallbacks matter
 * more than the happy path. Each of the three below is a real runtime: a
 * browser, an SSR render with no `window`, and a DOM that has one but answers
 * something unusable.
 *
 * The failure they prevent is quiet in all three cases. `Number.parseFloat` of
 * an empty string is `NaN`, and a `NaN` root font size multiplies out to a
 * `NaNpx` in a style attribute — a size the browser drops, on an element that
 * then renders at its intrinsic size with nothing in the console.
 */
describe('getRootFontSize', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reads the computed root font size in a real DOM', () => {
    document.documentElement.style.fontSize = '20px';
    expect(getRootFontSize()).toBe(20);
    document.documentElement.style.fontSize = '';
  });

  it('falls back to 16 by default, and to whatever the caller passed', () => {
    // jsdom reports px, so this pins the DEFAULT rather than the read: the
    // fallback is only reachable through the stubs below.
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ fontSize: '' } as CSSStyleDeclaration);

    expect(getRootFontSize()).toBe(16);
    expect(getRootFontSize(14)).toBe(14);
  });

  it('falls back when the computed value cannot be parsed as a number', () => {
    // A value with no leading digits — what a browser can return before layout,
    // and what domino returns under SSR for an unstyled element.
    for (const fontSize of ['', 'medium', 'inherit', 'NaN']) {
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({ fontSize } as CSSStyleDeclaration);
      expect(getRootFontSize(15), fontSize).toBe(15);
    }
  });

  it('falls back rather than throwing when getComputedStyle itself fails', () => {
    // The documented catch. A component reading a rem input during an
    // `afterNextRender` on a detached tree is the shape that hits it, and a
    // throw there takes the whole render down.
    vi.spyOn(window, 'getComputedStyle').mockImplementation(() => {
      throw new Error('no view');
    });

    expect(getRootFontSize()).toBe(16);
    expect(getRootFontSize(12)).toBe(12);
  });

  it('falls back with no DOM at all, which is every SSR render', () => {
    // The documented SSR branch, and the reason `resolveCssSize` can be called
    // from a component's field initialiser: the server has no `window`, and a
    // throw there fails the prerender rather than the component.
    vi.stubGlobal('window', undefined);
    expect(getRootFontSize()).toBe(16);
    expect(getRootFontSize(18)).toBe(18);
    vi.unstubAllGlobals();
  });

  it('never returns NaN, whatever the DOM says', () => {
    // The property that actually matters downstream: `resolveCssSize('3rem')`
    // multiplies by this, and a NaN there reaches a style attribute as `NaNpx`.
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ fontSize: 'nonsense' } as CSSStyleDeclaration);
    expect(Number.isFinite(getRootFontSize())).toBe(true);
  });
});
