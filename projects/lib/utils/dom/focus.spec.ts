/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { afterEach, describe, expect, it } from 'vitest';

import { getFocusableElements, trapFocus } from './focus';

/**
 * jsdom lays nothing out: every `getClientRects()` is empty and every
 * `offsetParent` is `null`, so the rendered-ness filter can only be exercised
 * by stubbing the one call it makes. That is honest about what is under test —
 * the selector and the two filters, not the browser's measuring.
 */
const render = (html: string): HTMLElement => {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  // Everything has a box unless a test says otherwise.
  for (const el of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
    el.getClientRects = (): DOMRectList => [{}] as unknown as DOMRectList;
  }
  return root;
};

const boxless = (el: HTMLElement): void => {
  el.getClientRects = (): DOMRectList => [] as unknown as DOMRectList;
};

const ids = (els: readonly HTMLElement[]): string[] => els.map(el => el.id);

describe('getFocusableElements', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns the focusable descendants in DOM order', () => {
    const root = render(`
      <a id="a" href="#x">link</a>
      <p id="p">not focusable</p>
      <button id="b">b</button>
      <input id="i" />
      <div id="ce" contenteditable="true"></div>
      <div id="t" tabindex="0"></div>
    `);

    expect(ids(getFocusableElements(root))).toEqual(['a', 'b', 'i', 'ce', 't']);
  });

  it('drops disabled controls, hidden inputs and tabindex="-1"', () => {
    const root = render(`
      <button id="ok">ok</button>
      <button id="no" disabled>no</button>
      <input id="hidden-type" type="hidden" />
      <input id="off" disabled />
      <div id="programmatic" tabindex="-1"></div>
      <div id="ce-off" contenteditable="false"></div>
    `);

    expect(ids(getFocusableElements(root))).toEqual(['ok']);
  });

  it('drops an element with no box — `display: none`, its own or an ancestor’s', () => {
    const root = render(`<button id="shown">a</button><button id="gone">b</button>`);
    boxless(root.querySelector<HTMLElement>('#gone')!);

    expect(ids(getFocusableElements(root))).toEqual(['shown']);
  });

  it('drops `visibility: hidden`, which keeps its box and cannot be focused', () => {
    // The filter used to be `offsetParent !== null`, which a hidden element
    // passes: it has a box, it is just not painted. Tab skips it, so a trap
    // that counted it sent focus somewhere the user could not see.
    const root = render(`<button id="shown">a</button><button id="invisible">b</button>`);
    root.querySelector<HTMLElement>('#invisible')!.style.visibility = 'hidden';

    expect(ids(getFocusableElements(root))).toEqual(['shown']);
  });

  it('keeps the element that currently holds focus even with no box', () => {
    // One interaction can focus an element and then hide it. A trap has to be
    // able to find where it is standing, or Tab jumps to the start.
    const root = render(`<button id="first">a</button><button id="active">b</button>`);
    const active = root.querySelector<HTMLButtonElement>('#active')!;
    active.focus();
    boxless(active);

    expect(ids(getFocusableElements(root))).toEqual(['first', 'active']);
  });
});

describe('trapFocus', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const tab = (shiftKey = false): KeyboardEvent =>
    new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true });

  it('ignores every key but Tab', () => {
    const root = render(`<button id="a">a</button><button id="b">b</button>`);
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });

    expect(trapFocus(root, event)).toBe(false);
  });

  it('wraps from the last element to the first', () => {
    const root = render(`<button id="a">a</button><button id="b">b</button>`);
    root.querySelector<HTMLButtonElement>('#b')!.focus();
    const event = tab();

    expect(trapFocus(root, event)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('a');
  });

  it('wraps backwards from the first element to the last', () => {
    const root = render(`<button id="a">a</button><button id="b">b</button>`);
    root.querySelector<HTMLButtonElement>('#a')!.focus();
    const event = tab(true);

    expect(trapFocus(root, event)).toBe(true);
    expect(document.activeElement?.id).toBe('b');
  });

  it('leaves a Tab in the middle of the list to the browser', () => {
    const root = render(`<button id="a">a</button><button id="b">b</button><button id="c">c</button>`);
    root.querySelector<HTMLButtonElement>('#b')!.focus();
    const event = tab();

    expect(trapFocus(root, event)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it('reports not-handled when nothing inside can take focus', () => {
    const root = render(`<p id="p">text</p>`);

    expect(trapFocus(root, tab())).toBe(false);
  });
});
