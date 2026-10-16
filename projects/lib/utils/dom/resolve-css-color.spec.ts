/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveCssColor } from './resolve-css-color';

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
