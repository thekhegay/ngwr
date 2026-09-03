/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { getCaretCoordinates } from './caret';

/**
 * ⚠️ This file guards the MIRROR, not the coordinate.
 *
 * jsdom lays nothing out: every rect is 0×0 and `Range.getClientRects()` is
 * empty, so a spec here cannot say where a caret is — it would answer the same
 * number for a working measurement and a broken one, which is the one thing a
 * test must never do. What it CAN inspect is the hidden element the measurement
 * is taken against, and every RTL failure this function had was a property of
 * that element rather than of the arithmetic.
 *
 * The coordinates themselves were measured in Chromium against a
 * `contenteditable` twin of the field — same box, same font, same direction, so
 * its own collapsed range is ground truth. Nine cases, `<input>` and
 * `<textarea>` each, at 320px:
 *
 * ```
 *                              truth     before      after
 *   ltr latin, caret at end    127.9     127.0       126.9
 *   rtl latin, caret at end   1047.0     752.0       1048.0
 *   rtl arabic, caret at end   982.3     752.0 / 978.8   983.3
 *   rtl arabic, mid-string     978.3     752.0 / 949.3   979.3
 *   ltr page, rtl field        282.3     116.7       283.3
 *   rtl page, ltr field        827.9     752.0 / 968.6  826.9
 * ```
 *
 * LTR is unchanged to the pixel. RTL was out by as much as 295px — about the
 * width of the field — which is what put `wrMention`'s panel outside the field
 * it belongs to and on top of the component beside it.
 */
describe('getCaretCoordinates', () => {
  /** The hidden element the measurement is taken against, captured on its way into `<body>`. */
  let mirror: HTMLElement | null = null;

  const spyOnMirror = (): void => {
    const append = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation(<T extends Node>(node: T): T => {
      mirror = node as unknown as HTMLElement;
      return append(node);
    });
  };

  const field = <T extends HTMLInputElement | HTMLTextAreaElement>(el: T, value: string, dir?: string): T => {
    el.value = value;
    if (dir) el.setAttribute('dir', dir);
    document.body.appendChild(el);
    return el;
  };

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    mirror = null;
  });

  it('copies the field’s own direction onto the mirror', () => {
    // Not the document's. A field carrying its own `dir` inside a page of the
    // other one was the worst measured case (116.7 against a true 282.3): the
    // mirror inherited `<body>` and laid the text out from the wrong edge.
    const input = field(document.createElement('input'), 'hello @wo', 'rtl');
    spyOnMirror();
    getCaretCoordinates(input, 9);

    expect(mirror!.style.direction).toBe('rtl');
  });

  it('keeps an input’s width, which is what right-aligns its text', () => {
    // The `<input>` branch used to force `width: auto` so a long single line
    // could not wrap. An RTL field right-aligns inside its own box, so a
    // shrink-to-fit mirror throws away the measurement that decides where the
    // text starts — and every RTL `<input>` answered the same 752, the field's
    // left padding edge, whatever was typed. `overflow: hidden` is what keeps the
    // overflow from painting.
    //
    // The width has to be STUBBED to see this: jsdom resolves every computed
    // width to `auto`, so a mirror that copies and a mirror that forces produce
    // the same string and the assertion would pass on the bug.
    const input = field(document.createElement('input'), 'hello @wo');
    const real = window.getComputedStyle.bind(window);
    const widen = (style: CSSStyleDeclaration): CSSStyleDeclaration =>
      new Proxy(style, {
        get: (target, key): unknown => (key === 'width' ? '320px' : Reflect.get(target, key)),
      });
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
      const style = real(el, pseudo ?? undefined);
      return el === input ? widen(style) : style;
    });
    spyOnMirror();
    getCaretCoordinates(input, 9);

    expect(mirror!.style.width).toBe('320px');
    expect(mirror!.style.whiteSpace).toBe('pre');
    expect(mirror!.style.overflow).toBe('hidden');
  });

  it('measures against the whole text in one node, not a probe span', () => {
    // The classic form of this technique splits the value in two and reads the
    // second half's LEFT edge. Which edge faces the caret depends on the bidi
    // level of the text at that offset, not on the field's direction, so there is
    // no side to pick — a collapsed range asks the browser instead and gets the
    // reordering for free.
    const area = field(document.createElement('textarea'), 'hello @wo');
    spyOnMirror();
    getCaretCoordinates(area, 6);

    expect(mirror!.querySelector('span')).toBeNull();
    expect(mirror!.childNodes).toHaveLength(1);
    expect(mirror!.textContent).toBe('hello @wo');
  });

  it('survives an empty field and a caret past the end of the text', () => {
    // An empty field still has to produce a line box to measure, and `position`
    // arrives from `selectionStart`, which a consumer can set anywhere.
    const input = field(document.createElement('input'), '');

    expect(() => getCaretCoordinates(input, 0)).not.toThrow();
    expect(() => getCaretCoordinates(input, 99)).not.toThrow();
  });

  it('leaves nothing behind in the document', () => {
    const area = field(document.createElement('textarea'), 'hello');
    getCaretCoordinates(area, 5);

    expect(document.body.querySelectorAll('div')).toHaveLength(0);
  });
});
