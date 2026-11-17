/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Injector, PLATFORM_ID } from '@angular/core';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { wrFocusFirstInvalid, wrGetFocusableElements, wrTrapFocus } from './focus';

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

describe('wrGetFocusableElements', () => {
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

    expect(ids(wrGetFocusableElements(root))).toEqual(['a', 'b', 'i', 'ce', 't']);
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

    expect(ids(wrGetFocusableElements(root))).toEqual(['ok']);
  });

  it('drops an element with no box — `display: none`, its own or an ancestor’s', () => {
    const root = render(`<button id="shown">a</button><button id="gone">b</button>`);
    boxless(root.querySelector<HTMLElement>('#gone')!);

    expect(ids(wrGetFocusableElements(root))).toEqual(['shown']);
  });

  it('drops `visibility: hidden`, which keeps its box and cannot be focused', () => {
    // The filter used to be `offsetParent !== null`, which a hidden element
    // passes: it has a box, it is just not painted. Tab skips it, so a trap
    // that counted it sent focus somewhere the user could not see.
    const root = render(`<button id="shown">a</button><button id="invisible">b</button>`);
    root.querySelector<HTMLElement>('#invisible')!.style.visibility = 'hidden';

    expect(ids(wrGetFocusableElements(root))).toEqual(['shown']);
  });

  it('keeps the element that currently holds focus even with no box', () => {
    // One interaction can focus an element and then hide it. A trap has to be
    // able to find where it is standing, or Tab jumps to the start.
    const root = render(`<button id="first">a</button><button id="active">b</button>`);
    const active = root.querySelector<HTMLButtonElement>('#active')!;
    active.focus();
    boxless(active);

    expect(ids(wrGetFocusableElements(root))).toEqual(['first', 'active']);
  });
});

describe('wrTrapFocus', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const tab = (shiftKey = false): KeyboardEvent =>
    new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true });

  it('ignores every key but Tab', () => {
    const root = render(`<button id="a">a</button><button id="b">b</button>`);
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });

    expect(wrTrapFocus(root, event)).toBe(false);
  });

  it('wraps from the last element to the first', () => {
    const root = render(`<button id="a">a</button><button id="b">b</button>`);
    root.querySelector<HTMLButtonElement>('#b')!.focus();
    const event = tab();

    expect(wrTrapFocus(root, event)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('a');
  });

  it('wraps backwards from the first element to the last', () => {
    const root = render(`<button id="a">a</button><button id="b">b</button>`);
    root.querySelector<HTMLButtonElement>('#a')!.focus();
    const event = tab(true);

    expect(wrTrapFocus(root, event)).toBe(true);
    expect(document.activeElement?.id).toBe('b');
  });

  it('leaves a Tab in the middle of the list to the browser', () => {
    const root = render(`<button id="a">a</button><button id="b">b</button><button id="c">c</button>`);
    root.querySelector<HTMLButtonElement>('#b')!.focus();
    const event = tab();

    expect(wrTrapFocus(root, event)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it('reports not-handled when nothing inside can take focus', () => {
    const root = render(`<p id="p">text</p>`);

    expect(wrTrapFocus(root, tab())).toBe(false);
  });
});

/**
 * The marks are written by hand here: what is under test is which element is
 * picked and how it is scrolled. `form/focus-first-invalid.spec.ts` runs it
 * against the marks a real Signal Forms `form()` draws.
 */
describe('wrFocusFirstInvalid', () => {
  const scrolled: { el: Element; options: ScrollIntoViewOptions }[] = [];
  const reduceMotion = (reduce: boolean): void => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce') }));
  };
  const field = (root: HTMLElement, id: string): HTMLElement => {
    const el = root.querySelector<HTMLElement>(`#${id}`)!;
    // jsdom has no `scrollIntoView` at all.
    for (const node of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
      node.scrollIntoView = (options?: boolean | ScrollIntoViewOptions): void => {
        scrolled.push({ el: node, options: options as ScrollIntoViewOptions });
      };
    }
    return el;
  };

  afterEach(() => {
    document.body.innerHTML = '';
    scrolled.length = 0;
    vi.unstubAllGlobals();
  });

  it('focuses the first control marked invalid and resolves to true', async () => {
    const root = render(`
      <input id="fine" />
      <input id="bad" aria-invalid="true" />
      <input id="worse" aria-invalid="true" />
    `);
    const bad = field(root, 'bad');

    expect(await wrFocusFirstInvalid(root)).toBe(true);
    expect(document.activeElement).toBe(bad);
  });

  it('resolves to false and moves nothing when no control is invalid', async () => {
    const root = render(`<input id="fine" /><input id="also" aria-invalid="false" />`);
    field(root, 'fine').focus();

    expect(await wrFocusFirstInvalid(root)).toBe(false);
    expect(document.activeElement?.id).toBe('fine');
    expect(scrolled).toEqual([]);
  });

  it('goes into a group that carries the mark on its host', async () => {
    const root = render(`
      <div id="group" role="radiogroup" aria-invalid="true">
        <input id="one" type="radio" name="g" />
        <input id="two" type="radio" name="g" />
      </div>
    `);
    field(root, 'one');

    await wrFocusFirstInvalid(root);

    expect(document.activeElement?.id).toBe('one');
  });

  it('reads an invalid wr-form-field whose control carries no mark', async () => {
    const root = render(`
      <div id="ok" class="wr-form-field"><input id="fine" /></div>
      <div id="field" class="wr-form-field wr-form-field--invalid"><input id="bare" /></div>
    `);
    field(root, 'bare');

    expect(await wrFocusFirstInvalid(root)).toBe(true);
    expect(document.activeElement?.id).toBe('bare');
  });

  it('prefers the marked control to whatever comes first in its field', async () => {
    const root = render(`
      <div class="wr-form-field wr-form-field--invalid">
        <button id="help" type="button">?</button>
        <input id="control" aria-invalid="true" />
      </div>
    `);
    field(root, 'control');

    await wrFocusFirstInvalid(root);

    expect(document.activeElement?.id).toBe('control');
  });

  it('skips an invalid control that is disabled or not rendered', async () => {
    const root = render(`
      <input id="off" aria-invalid="true" disabled />
      <input id="gone" aria-invalid="true" />
      <input id="bad" aria-invalid="true" />
    `);
    boxless(field(root, 'gone'));

    await wrFocusFirstInvalid(root);

    expect(document.activeElement?.id).toBe('bad');
  });

  it('scrolls the field to the centre, smoothly', async () => {
    reduceMotion(false);
    const root = render(`
      <div id="field" class="wr-form-field wr-form-field--invalid">
        <input id="bad" aria-invalid="true" />
      </div>
    `);
    const bad = field(root, 'bad');
    const focus = vi.spyOn(bad, 'focus');

    await wrFocusFirstInvalid(root);

    expect(scrolled.map(({ el, options }) => [el.id, options])).toEqual([
      ['field', { block: 'center', behavior: 'smooth' }],
    ]);
    // One scroll, not the browser's jump followed by ours.
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('scrolls at once under reduced motion, whatever the options ask', async () => {
    reduceMotion(true);
    const root = render(`<input id="bad" aria-invalid="true" />`);
    field(root, 'bad');

    await wrFocusFirstInvalid(root, { scroll: { block: 'start', behavior: 'smooth' } });

    expect(scrolled.map(({ el, options }) => [el.id, options])).toEqual([
      ['bad', { block: 'start', behavior: 'instant' }],
    ]);
  });

  it('leaves the scroll to the browser with `scroll: false`', async () => {
    const root = render(`<input id="bad" aria-invalid="true" />`);
    const focus = vi.spyOn(field(root, 'bad'), 'focus');

    await wrFocusFirstInvalid(root, { scroll: false });

    expect(scrolled).toEqual([]);
    expect(focus).toHaveBeenCalledWith({ preventScroll: false });
  });

  it('does nothing on the server', async () => {
    const root = render(`<input id="bad" aria-invalid="true" />`);
    field(root, 'bad');
    const injector = Injector.create({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });

    expect(await wrFocusFirstInvalid(root, { injector })).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });
});
