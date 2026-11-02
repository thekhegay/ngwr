/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveCssColor, resolveCssColorChannels } from './resolve-css-color';

/**
 * The canvas and WebGL bits draw with whatever this returns, and a canvas fails
 * quietly in both directions: a colour it cannot parse is IGNORED, so a stroke
 * keeps the previous style (black, on a dark page), and Firefox accepts a
 * `light-dark()` and paints its light half whatever the scheme. So the cases
 * that matter are the ones where something has to give way — a token nobody
 * set, a string that is not a colour, a DOM with no style engine — and each has
 * to land on the caller's fallback rather than on a plausible wrong colour.
 *
 * jsdom resolves a literal, a `light-dark()` (to its light half, as a browser
 * does with no dark scheme in effect) and a `color-mix()` through the probe,
 * and hands a `var()` back verbatim. The `var()` cases therefore exercise the
 * lookup chain a browser never needs, which is the point: it is how a component
 * spec sees the colour a token holds at all.
 */
describe('resolveCssColor', () => {
  let host: HTMLElement;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    host = document.createElement('div');
    canvas = document.createElement('canvas');
    host.appendChild(canvas);
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
    vi.restoreAllMocks();
  });

  it('resolves a literal to the computed form a canvas accepts', () => {
    expect(resolveCssColor(canvas, '#ff0000', 'fallback')).toBe('rgb(255, 0, 0)');
    expect(resolveCssColor(canvas, 'color-mix(in srgb, red 50%, transparent)', 'fallback')).toBe(
      'color(srgb 1 0 0 / 0.5)'
    );
  });

  it('resolves a `light-dark()`, which no canvas reads correctly on its own', () => {
    expect(resolveCssColor(canvas, 'light-dark(#ffffff, #000000)', 'fallback')).toBe('rgb(255, 255, 255)');
  });

  it('resolves a token set on an ancestor, through every hop of a chain', () => {
    host.style.setProperty('--direct', 'rgb(1, 2, 3)');
    host.style.setProperty('--outer', 'var(--inner)');
    host.style.setProperty('--inner', 'light-dark(rgb(4, 5, 6), rgb(7, 8, 9))');

    expect(resolveCssColor(canvas, 'var(--direct)', 'fallback')).toBe('rgb(1, 2, 3)');
    expect(resolveCssColor(canvas, 'var(--outer)', 'fallback')).toBe('rgb(4, 5, 6)');
  });

  it("takes a `var()`'s own fallback when the property is not set", () => {
    expect(resolveCssColor(canvas, 'var(--wr-nothing-here, red)', 'fallback')).toBe('rgb(255, 0, 0)');
  });

  it('returns the fallback for a token set nowhere, rather than the inherited colour', () => {
    // CSS would resolve `color: var(--missing)` to the colour the probe inherits,
    // which reads as a decision nobody made. The caller named a fallback for
    // exactly this.
    host.style.color = 'rgb(9, 9, 9)';
    expect(resolveCssColor(canvas, 'var(--wr-nothing-here)', 'fallback')).toBe('fallback');
  });

  it('returns the fallback for a token that holds something other than a colour', () => {
    // A browser substitutes it, finds the result invalid and hands the probe its
    // inherited colour. jsdom hands the `var()` back instead, so the read is a browser's.
    host.style.setProperty('--channels', '57 105 226');
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) =>
      element === canvas ? real(element, pseudo) : ({ color: 'rgb(9, 9, 9)' } as CSSStyleDeclaration)
    );

    expect(resolveCssColor(canvas, 'var(--channels)', 'fallback')).toBe('fallback');
  });

  it('needs no `CSS` global, which no jsdom before 30 has', () => {
    host.style.setProperty('--direct', 'rgb(1, 2, 3)');
    vi.stubGlobal('CSS', undefined);

    try {
      expect(resolveCssColor(canvas, 'var(--direct)', 'fallback')).toBe('rgb(1, 2, 3)');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('returns the fallback for a string that is not a colour', () => {
    // The parser refuses it, so the probe would report its inherited colour.
    host.style.color = 'rgb(9, 9, 9)';
    expect(resolveCssColor(canvas, 'not-a-colour', 'fallback')).toBe('fallback');
    expect(resolveCssColor(canvas, '   ', 'fallback')).toBe('fallback');
  });

  it('gives up on a reference cycle instead of looping', () => {
    host.style.setProperty('--ping', 'var(--pong)');
    host.style.setProperty('--pong', 'var(--ping)');
    expect(resolveCssColor(canvas, 'var(--ping)', 'fallback')).toBe('fallback');
  });

  it('keeps one hidden probe per expression and reuses it', () => {
    resolveCssColor(canvas, '#ff0000', 'fallback');
    resolveCssColor(canvas, '#ff0000', 'fallback');

    // A per-frame caller must not grow the DOM, and the probe must never paint.
    expect(canvas.children.length).toBe(1);
    expect((canvas.firstElementChild as HTMLElement).style.display).toBe('none');
  });

  it('retires the oldest probe rather than keeping one for every string it was ever given', () => {
    for (let i = 0; i < 20; i++) resolveCssColor(canvas, `rgb(${i}, 0, 0)`, 'fallback');

    expect(canvas.children.length).toBe(8);
    expect(resolveCssColor(canvas, 'rgb(19, 0, 0)', 'fallback')).toBe('rgb(19, 0, 0)');
  });

  it('puts a probe back when something cleared the element', () => {
    resolveCssColor(canvas, '#ff0000', 'fallback');
    canvas.replaceChildren();

    expect(resolveCssColor(canvas, '#ff0000', 'fallback')).toBe('rgb(255, 0, 0)');
    expect(canvas.children.length).toBe(1);
  });

  it('returns the fallback rather than throwing when the style engine fails', () => {
    host.style.setProperty('--direct', 'rgb(1, 2, 3)');
    vi.spyOn(window, 'getComputedStyle').mockImplementation(() => {
      throw new Error('no view');
    });

    expect(resolveCssColor(canvas, 'var(--direct)', 'fallback')).toBe('fallback');
  });

  it('returns the fallback for an element with no window behind it', () => {
    // A document made by `createHTMLDocument` has no view, the same shape as a
    // DOM shim with no style engine.
    const orphan = document.implementation.createHTMLDocument('').createElement('div');
    expect(resolveCssColor(orphan, '#ff0000', 'fallback')).toBe('fallback');
  });
});

/**
 * What a WebGL uniform takes, and a uniform fails worse than a canvas does: a
 * `NaN` channel is not ignored, it is drawn. So the first half is every shape a
 * browser hands back and the second half is everything that has to give way,
 * ending on the case the function exists to make impossible: three finite
 * numbers, whatever it was given.
 *
 * The shapes jsdom's computed read does not produce on its own (`none`, a channel
 * out of range, a percentage, each hex length) go through `parsed()`, the fallback of
 * an element with no window behind it: nothing there can resolve anything, so the
 * parser reads the string as written, and the `color-mix()` route cannot rescue a form
 * the parser got wrong.
 */
describe('resolveCssColorChannels', () => {
  let host: HTMLElement;
  let canvas: HTMLCanvasElement;

  /** Read `color` through the parser alone, as the fallback of an element with no style engine. */
  const parsed = (color: string): [number, number, number] =>
    resolveCssColorChannels(document.implementation.createHTMLDocument('').createElement('div'), 'red', color);

  beforeEach(() => {
    host = document.createElement('div');
    canvas = document.createElement('canvas');
    host.appendChild(canvas);
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
    vi.restoreAllMocks();
  });

  it('reads a legacy colour on the 0–255 scale, and drops its alpha', () => {
    expect(resolveCssColorChannels(canvas, 'rgb(255, 0, 51)', '#000')).toEqual([1, 0, 0.2]);
    expect(resolveCssColorChannels(canvas, 'rgba(255, 0, 51, 0.25)', '#000')).toEqual([1, 0, 0.2]);
  });

  it('reads `color(srgb …)` on the 0–1 scale, and drops its alpha', () => {
    // What a `color-mix()` computes to. Read as 0–255 these would all be near zero.
    expect(resolveCssColorChannels(canvas, 'color-mix(in srgb, red 50%, transparent)', '#000')).toEqual([1, 0, 0]);
    expect(parsed('color(srgb 0.25 0.5 0.75 / 0.5)')).toEqual([0.25, 0.5, 0.75]);
  });

  it('resolves a token and a `light-dark()` through the cascade first', () => {
    host.style.setProperty('--tint', 'light-dark(rgb(255, 0, 0), rgb(0, 0, 255))');

    expect(resolveCssColorChannels(canvas, 'var(--tint)', '#000')).toEqual([1, 0, 0]);
  });

  it('reads `none` as 0', () => {
    expect(parsed('color(srgb none 0.5 1)')).toEqual([0, 0.5, 1]);
    expect(parsed('rgb(none 255 none)')).toEqual([0, 1, 0]);
  });

  it('clamps a channel from a wider gamut into range', () => {
    expect(parsed('color(srgb 1.25 -0.5 0.5)')).toEqual([1, 0, 0.5]);
    expect(parsed('rgb(300 -20 51)')).toEqual([1, 0, 0.2]);
  });

  it('reads a percentage as a share, not on the channel scale', () => {
    expect(parsed('rgb(100% 0% 50%)')).toEqual([1, 0, 0.5]);
  });

  it('reads every hex length, and drops a hex alpha', () => {
    expect(parsed('#f05')).toEqual([1, 0, 1 / 3]);
    expect(parsed('#f058')).toEqual([1, 0, 1 / 3]);
    expect(parsed('#ff0055')).toEqual([1, 0, 1 / 3]);
    expect(parsed('#ff005580')).toEqual([1, 0, 1 / 3]);
    expect(parsed('#FF0055')).toEqual([1, 0, 1 / 3]);
  });

  it('mixes a colour from another space into sRGB, which is the only way to read it', () => {
    // A browser hands `oklch()` back as written, so its answer is staged rather than
    // left to whatever jsdom does: the expression computes to itself, and only the
    // `color-mix()` around it comes back in a form with channels.
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element) => {
      const written = (element as HTMLElement).style.color;
      if (written.startsWith('oklch(')) return { color: written, getPropertyValue: () => '' } as never;
      if (written.startsWith('color-mix('))
        return { color: 'color(srgb 0.25 0.5 0.75)', getPropertyValue: () => '' } as never;
      return real(element);
    });

    expect(resolveCssColorChannels(canvas, 'oklch(0.5 0.1 200)', '#000')).toEqual([0.25, 0.5, 0.75]);
  });

  it('does not read the numbers of another colour space as sRGB', () => {
    expect(parsed('color(display-p3 1 0 0)')).toEqual([0, 0, 0]);
    expect(parsed('color(srgb-linear 1 0 0)')).toEqual([0, 0, 0]);
  });

  it('reads the fallback when a resolved colour stays unreadable even mixed into sRGB', () => {
    vi.spyOn(window, 'getComputedStyle').mockImplementation(((element: HTMLElement) => ({
      color: element.style.color.startsWith('color-mix(') ? 'lab(50 20 30)' : 'oklch(0.5 0.1 200)',
      getPropertyValue: () => '',
    })) as never);

    expect(resolveCssColorChannels(canvas, 'oklch(0.5 0.1 200)', '#ff0000')).toEqual([1, 0, 0]);
  });

  it('falls back when the expression cannot be resolved, in any form CSS parses', () => {
    expect(resolveCssColorChannels(canvas, 'var(--wr-nothing-here)', '#ff0000')).toEqual([1, 0, 0]);
    expect(resolveCssColorChannels(canvas, 'not-a-colour', 'blue')).toEqual([0, 0, 1]);
    expect(resolveCssColorChannels(canvas, '   ', 'rgb(0, 255, 0)')).toEqual([0, 1, 0]);
  });

  it('is total: black rather than a `NaN` when even the fallback cannot be read', () => {
    expect(resolveCssColorChannels(canvas, 'not-a-colour', 'neither-is-this')).toEqual([0, 0, 0]);
    expect(resolveCssColorChannels(canvas, 'var(--wr-nothing-here)', '')).toEqual([0, 0, 0]);
    // A shape that looks like a colour and has no numbers in it is what produced
    // `NaN` uniforms in the first place.
    expect(parsed('rgb(a b c)')).toEqual([0, 0, 0]);
    expect(parsed('rgb(1, 2)')).toEqual([0, 0, 0]);
  });

  it('reads the fallback for an element with no window behind it, and is total there too', () => {
    const orphan = document.implementation.createHTMLDocument('').createElement('div');

    expect(resolveCssColorChannels(orphan, '#00ff00', '#ff0000')).toEqual([1, 0, 0]);
    expect(resolveCssColorChannels(orphan, '#00ff00', 'red')).toEqual([0, 0, 0]);
  });

  it('survives a style engine that throws', () => {
    vi.spyOn(window, 'getComputedStyle').mockImplementation(() => {
      throw new Error('no view');
    });

    expect(resolveCssColorChannels(canvas, '#00ff00', '#ff0000')).toEqual([1, 0, 0]);
  });
});
