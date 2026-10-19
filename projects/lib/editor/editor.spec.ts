import { Directionality, type Direction } from '@angular/cdk/bidi';
import { Component, ErrorHandler, PLATFORM_ID, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { Subject } from 'rxjs';

import { WrFormField } from 'ngwr/form';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrOverlay } from 'ngwr/overlay';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrEditor } from './editor';
import type { WrEditorJson, WrEditorMarkJson, WrEditorTool, WrEditorValue } from './types';

/**
 * jsdom lays nothing out, and ProseMirror measures: once the editor has focus,
 * every transaction that scrolls the selection into view calls
 * `Range.getClientRects()` — which jsdom does not implement — and throws AFTER
 * the document and the DOM have already changed. Keydown handlers then never
 * reach `preventDefault`, and a spec can pass for the wrong reason. The two
 * range measurements and `document.elementFromPoint` are installed before each
 * case and removed after it, never left on the prototype for the next file.
 *
 * With them in place nothing geometric is assertable — every rect is 0×0 — so
 * nothing here asserts a caret position, a scroll or a size. What is asserted is
 * the model (the value is the contract) and the rendered DOM.
 */
function installLayoutStubs(): () => void {
  const range = Range.prototype as Partial<Range>;
  range.getClientRects = (): DOMRectList => [] as unknown as DOMRectList;
  range.getBoundingClientRect = (): DOMRect => new DOMRect();
  document.elementFromPoint = (): Element | null => null;
  return () => {
    delete range.getClientRects;
    delete range.getBoundingClientRect;
    delete (document as Partial<Document>).elementFromPoint;
  };
}

// The value is the document as ProseMirror's `toJSON()` writes it: no `content`
// on an empty node, no `marks` on unmarked text, every declared attribute.
const doc = (...content: WrEditorJson[]): WrEditorJson => ({ type: 'doc', content });
const para = (...content: WrEditorJson[]): WrEditorJson =>
  content.length ? { type: 'paragraph', content } : { type: 'paragraph' };
const text = (value: string, ...marks: WrEditorMarkJson[]): WrEditorJson =>
  marks.length ? { type: 'text', text: value, marks } : { type: 'text', text: value };
const heading = (level: 1 | 2 | 3, ...content: WrEditorJson[]): WrEditorJson => ({
  type: 'heading',
  attrs: { level },
  content,
});
const strong: WrEditorMarkJson = { type: 'strong' };
const link = (href: string): WrEditorMarkJson => ({ type: 'link', attrs: { href, title: null } });

@Component({
  imports: [WrEditor],
  template: `
    <wr-editor
      [(value)]="value"
      [placeholder]="placeholder()"
      [ariaLabel]="ariaLabel()"
      [readonly]="readonly()"
      [disabled]="disabled()"
      [toolbar]="toolbar()"
      (touch)="touched = touched + 1"
    />
    <button type="button" class="outside">outside</button>
  `,
})
class Host {
  readonly value = signal<WrEditorValue>(doc(para(text('Hello'))));
  readonly placeholder = signal('');
  readonly ariaLabel = signal<string | null>(null);
  readonly readonly = signal(false);
  readonly disabled = signal(false);
  readonly toolbar = signal<readonly WrEditorTool[] | false>([
    'bold',
    'italic',
    'underline',
    '|',
    'heading1',
    'bulletList',
    '|',
    'link',
    'undo',
    'redo',
  ]);
  touched = 0;
}

describe('WrEditor', () => {
  let fixture: ComponentFixture<Host>;
  let removeStubs: () => void;
  let thrown: unknown[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const surface = (): HTMLElement => root().querySelector<HTMLElement>('.wr-editor__surface')!;
  const buttons = (): HTMLButtonElement[] => [...root().querySelectorAll<HTMLButtonElement>('.wr-editor__tool')];
  const tool = (label: string): HTMLButtonElement => buttons().find(b => b.getAttribute('aria-label') === label)!;
  const host = (): Host => fixture.componentInstance;

  const key = (target: Element, init: KeyboardEventInit): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  };

  /** Typing, the way the browser reports it to ProseMirror: a DOM mutation plus a caret. */
  const type = async (text: string, paragraph: Element = surface().querySelector('p')!): Promise<void> => {
    let node = paragraph.firstChild;
    // An empty paragraph holds ProseMirror's trailing `<br>`, not a text node.
    if (node?.nodeType !== Node.TEXT_NODE) node = paragraph.insertBefore(document.createTextNode(''), node);
    node.nodeValue = text;
    document.getSelection()!.collapse(node, text.length);
    await fixture.whenStable();
  };

  /**
   * The caret at `offset` into the first text node reading `text`, the way the
   * browser reports it: a DOM selection and a `selectionchange`, which
   * ProseMirror reads into its state while the surface has focus.
   */
  const caretIn = async (text: string, offset: number): Promise<void> => {
    surface().focus();
    const walker = document.createTreeWalker(surface(), NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node && node.nodeValue !== text) node = walker.nextNode();
    document.getSelection()!.collapse(node, offset);
    document.dispatchEvent(new Event('selectionchange'));
    await fixture.whenStable();
  };

  async function mount(setup?: (host: Host) => void, providers: unknown[] = []): Promise<void> {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrOverlay(),
        { provide: ErrorHandler, useValue: { handleError: (error: unknown) => thrown.push(error) } },
        ...(providers as never[]),
      ],
    });
    fixture = TestBed.createComponent(Host);
    setup?.(fixture.componentInstance);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    thrown = [];
    removeStubs = installLayoutStubs();
  });

  afterEach(() => {
    fixture?.destroy();
    removeStubs();
    // Anything ProseMirror or `afterNextRender` threw lands here and nowhere else.
    expect(thrown).toEqual([]);
  });

  describe('mounting', () => {
    it('hands the surface to ProseMirror and drops the preview', async () => {
      await mount();

      expect(surface().getAttribute('contenteditable')).toBe('true');
      expect(surface().hidden).toBe(false);
      expect(surface().innerHTML).toContain('<p>Hello</p>');
      expect(root().querySelector('.wr-editor__preview')).toBeNull();
    });

    it('carries the textbox role and its name from the first render', async () => {
      await mount();

      expect(surface().getAttribute('role')).toBe('textbox');
      expect(surface().getAttribute('aria-multiline')).toBe('true');
      expect(surface().getAttribute('aria-label')).toBe('Rich text');
    });

    it('lets an explicit ariaLabel win', async () => {
      await mount(h => h.ariaLabel.set('Body'));

      expect(surface().getAttribute('aria-label')).toBe('Body');
    });
  });

  describe('on the server', () => {
    /**
     * `afterNextRender` never runs there, so ProseMirror never mounts and the
     * preview is the page. It is rendered by Angular from the document as the
     * schema reads it, and it is what a prerendered route and a first paint show.
     */
    it('renders the static preview and keeps the surface hidden', async () => {
      await mount(
        h => h.value.set(doc(heading(2, text('T')), para(text('b', strong), text(' '), text('ok', link('/ok'))))),
        [{ provide: PLATFORM_ID, useValue: 'server' }]
      );

      const preview = root().querySelector('.wr-editor__preview')!;
      expect(preview.querySelector('h2')?.textContent).toBe('T');
      expect(preview.querySelector('strong')?.textContent).toBe('b');
      expect([...preview.querySelectorAll('a')].map(a => a.getAttribute('href'))).toEqual(['/ok']);
      expect(surface().hidden).toBe(true);
      expect(surface().hasAttribute('contenteditable')).toBe(false);
    });

    it('renders nothing for a value it refuses, and says why once', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      await mount(
        h => h.value.set(doc(para(text('js', link('javascript:alert(1)'))))),
        [{ provide: PLATFORM_ID, useValue: 'server' }]
      );

      expect(root().querySelector('.wr-editor__preview')).toBeNull();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('refused link URL');
      warn.mockRestore();
    });
  });

  describe('the value', () => {
    it('writes an edit back to the model as a fresh tree, leaving the bound one alone', async () => {
      const value = doc(para(text('Hello')));
      await mount(h => h.value.set(value));
      await type('Hello!');

      expect(host().value()).toEqual(doc(para(text('Hello!'))));
      expect(value).toEqual(doc(para(text('Hello'))));
    });

    it('drives the keymap: select all, then bold', async () => {
      await mount();
      key(surface(), { key: 'a', ctrlKey: true });
      const bold = key(surface(), { key: 'b', ctrlKey: true });
      fixture.detectChanges();

      expect(bold.defaultPrevented).toBe(true);
      expect(host().value()).toEqual(doc(para(text('Hello', strong))));
      expect(tool('Bold').getAttribute('aria-pressed')).toBe('true');
    });

    it('underlines with the tool and with Mod-U alike', async () => {
      await mount();
      key(surface(), { key: 'a', ctrlKey: true });
      const underline = key(surface(), { key: 'u', ctrlKey: true });
      fixture.detectChanges();

      expect(underline.defaultPrevented).toBe(true);
      expect(host().value()).toEqual(doc(para(text('Hello', { type: 'underline' }))));
      expect(tool('Underline').getAttribute('aria-pressed')).toBe('true');
      expect(tool('Underline').getAttribute('aria-keyshortcuts')).toBe('Control+U');

      tool('Underline').click();
      fixture.detectChanges();
      expect(host().value()).toEqual(doc(para(text('Hello'))));
    });

    it('applies a toolbar command', async () => {
      await mount();
      key(surface(), { key: 'a', ctrlKey: true });
      tool('Heading 1').click();
      fixture.detectChanges();

      expect(host().value()).toEqual(doc(heading(1, text('Hello'))));
      expect(tool('Heading 1').getAttribute('aria-pressed')).toBe('true');
    });

    it('writes an emptied document as null, so `required` sees it as empty', async () => {
      await mount();
      key(surface(), { key: 'a', ctrlKey: true });
      key(surface(), { key: 'Backspace' });

      expect(host().value()).toBeNull();
    });

    it('sanitises a paste through the schema, keeping the text of a refused link', async () => {
      await mount();
      const paste = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(paste, 'clipboardData', {
        value: {
          types: ['text/html', 'text/plain'],
          getData: (type: string) =>
            type === 'text/html'
              ? '<p onclick="alert(1)"><a href="javascript:alert(1)">bad</a> <img src="x" onerror="alert(1)"></p>'
              : 'bad',
        },
      });
      key(surface(), { key: 'a', ctrlKey: true });
      surface().dispatchEvent(paste);

      expect(surface().querySelector('[onclick], [onerror], a')).toBeNull();
      expect(host().value()).toEqual(
        doc(para(text('bad '), { type: 'image', attrs: { src: 'x', alt: '', title: null } }))
      );
    });
  });

  describe('outside writes', () => {
    it('replace the document', async () => {
      await mount();
      host().value.set(doc(para(text('Replaced'))));
      fixture.detectChanges();

      expect(surface().textContent).toBe('Replaced');
    });

    it('leave an EQUAL document alone, and never write the normalised form back', async () => {
      await mount(h => h.value.set(doc(para(text('Hi', strong)))));
      key(surface(), { key: 'a', ctrlKey: true });
      // An attribute the schema does not declare is dropped on the way in, so
      // this reads as the document already on screen.
      const written = doc({ type: 'paragraph', attrs: { align: 'center' }, content: [text('Hi', strong)] });
      host().value.set(written);
      fixture.detectChanges();

      // Same document: nothing re-parsed into the view, so the selection (all
      // of it) survives and Bold still reads pressed.
      expect(host().value()).toBe(written);
      expect(tool('Bold').getAttribute('aria-pressed')).toBe('true');
    });

    it('refuse what cannot be read, keep the committed document and warn', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      await mount(h => h.value.set(doc(para(text('Kept')))));
      const garbage = { type: 'doc', content: [{ type: 'iframe' }] } as WrEditorJson;
      host().value.set(garbage);
      fixture.detectChanges();

      expect(surface().textContent).toBe('Kept');
      expect(host().value()).toBe(garbage);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('could not be read and was ignored');
      warn.mockRestore();
    });
  });

  /**
   * A refused value is still what the model HOLDS, and the screen shows
   * something else — nothing at mount, the previous record after a write. The
   * first keystroke used to write the screen's document over the stored one,
   * with a dev-mode warning as the only sign.
   */
  describe('a refused value', () => {
    // Written by another ProseMirror schema: h4 is outside this one's three.
    const foreign: WrEditorJson = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'Stored title' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Long stored body' }] },
      ],
    };
    let warn: MockInstance<typeof console.warn>;
    beforeEach(() => (warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)));
    afterEach(() => warn.mockRestore());

    it('at mount leaves the editor read-only, so an edit cannot overwrite the stored value', async () => {
      await mount(h => h.value.set(foreign));

      expect(surface().getAttribute('contenteditable')).toBe('false');
      expect(surface().getAttribute('aria-readonly')).toBe('true');
      expect(surface().getAttribute('tabindex')).toBe('0');
      expect(root().querySelector('wr-editor')!.classList).toContain('wr-editor--refused');
      expect(buttons().every(b => b.disabled)).toBe(true);

      await type('x');
      key(surface(), { key: 'b', ctrlKey: true });
      expect(host().value()).toBe(foreign);
    });

    it('after a write keeps the previous record on screen and refuses edits over the new one', async () => {
      await mount(h => h.value.set(doc(para(text('Record A body')))));
      host().value.set(foreign);
      fixture.detectChanges();

      expect(surface().textContent).toBe('Record A body');
      await type('Record A body!');
      expect(host().value()).toBe(foreign);
    });

    it('lifts once a value the editor can read arrives', async () => {
      await mount(h => h.value.set(foreign));
      host().value.set(doc(para(text('Readable'))));
      fixture.detectChanges();

      expect(surface().getAttribute('contenteditable')).toBe('true');
      expect(root().querySelector('wr-editor')!.classList).not.toContain('wr-editor--refused');
      await type('Readable!');
      expect(host().value()).toEqual(doc(para(text('Readable!'))));
    });

    it('refuses a whole document over one javascript: link, rather than dropping the link', async () => {
      await mount(h => h.value.set(doc(para(text('x', link('javascript:alert(1)'))))));

      expect(surface().querySelector('a')).toBeNull();
      expect(root().querySelector('wr-editor')!.classList).toContain('wr-editor--refused');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('refused link URL');
    });

    // A tree stored as JSON text and bound unparsed, or an HTML or markdown
    // string kept from before: the one mistake the warning names outright.
    it('refuses a string, and says that is what it is', async () => {
      const stored = '<p>Stored</p>' as unknown as WrEditorValue;
      await mount(h => h.value.set(stored));

      expect(surface().getAttribute('contenteditable')).toBe('false');
      expect(root().querySelector('wr-editor')!.classList).toContain('wr-editor--refused');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('not a string');
      expect(host().value()).toBe(stored);
    });
  });

  /**
   * Read-only is not a mode the editor runs in, it is the editor not running:
   * ProseMirror is never created, and the document on screen is the same
   * Angular markup the server prerenders. A page showing thirty saved comments
   * used to boot thirty views of something nobody could type into.
   */
  describe('read-only', () => {
    const statik = (): HTMLElement => root().querySelector<HTMLElement>('.wr-editor__preview--static')!;

    it('draws the document — structure and all — and creates no view', async () => {
      await mount(h => {
        h.readonly.set(true);
        h.value.set(
          doc(heading(2, text('Shipped')), {
            type: 'bullet_list',
            content: [
              { type: 'list_item', content: [para(text('One'))] },
              { type: 'list_item', content: [para(text('Two'))] },
            ],
          })
        );
      });

      expect(statik().querySelector('h2')?.textContent).toBe('Shipped');
      expect([...statik().querySelectorAll('li')].map(li => li.textContent)).toEqual(['One', 'Two']);
      // Nothing of ProseMirror's: no surface to mount on, no `contenteditable`
      // it writes there, and none of the classes it puts on a live view.
      expect(root().querySelector('.wr-editor__surface')).toBeNull();
      expect(root().querySelector('[contenteditable]')).toBeNull();
      expect(root().querySelector('.ProseMirror')).toBeNull();
    });

    it('carries the name, the id and the tab stop, as a group and not as a textbox', async () => {
      await mount(h => h.readonly.set(true));

      expect(statik().getAttribute('role')).toBe('group');
      expect(statik().getAttribute('aria-label')).toBe('Rich text');
      expect(statik().getAttribute('tabindex')).toBe('0');
      expect(statik().id).toBe(root().querySelector('[role="toolbar"]')!.getAttribute('aria-controls'));
      // A textbox would make every heading and list item inside it
      // presentational; `aria-readonly` is not allowed on a group, so the host
      // class is what says the editor refuses edits.
      expect(statik().getAttribute('role')).not.toBe('textbox');
      expect(statik().hasAttribute('aria-readonly')).toBe(false);
      expect(root().querySelector('wr-editor')!.classList).toContain('wr-editor--readonly');
      expect(buttons().every(b => b.disabled)).toBe(true);
    });

    it('re-renders a value written while it is read-only', async () => {
      await mount(h => h.readonly.set(true));
      host().value.set(doc(para(text('Written from elsewhere'))));
      fixture.detectChanges();

      expect(statik().textContent).toContain('Written from elsewhere');
      expect(root().querySelector('.wr-editor__surface')).toBeNull();
    });

    it('mounts when the rule is lifted, and keeps that view — history and all — when it comes back', async () => {
      await mount(h => h.readonly.set(true));
      expect(root().querySelector('.wr-editor__surface')).toBeNull();

      host().readonly.set(false);
      fixture.detectChanges();
      await fixture.whenStable();

      // Editable for real from here on, which is also the guard against a
      // vacuous suite: the same keys that do nothing above do the edit here.
      expect(surface().getAttribute('contenteditable')).toBe('true');
      expect(root().querySelector('.wr-editor__preview')).toBeNull();
      key(surface(), { key: 'a', ctrlKey: true });
      key(surface(), { key: 'b', ctrlKey: true });
      expect(host().value()).toEqual(doc(para(text('Hello', strong))));

      const mounted = surface();
      host().readonly.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(surface()).toBe(mounted);
      expect(surface().getAttribute('contenteditable')).toBe('false');
      expect(surface().getAttribute('aria-readonly')).toBe('true');
      expect(surface().getAttribute('tabindex')).toBe('0');
      expect(root().querySelector('.wr-editor__preview--static')).toBeNull();

      host().readonly.set(false);
      fixture.detectChanges();
      await fixture.whenStable();
      key(surface(), { key: 'z', ctrlKey: true });

      // The round trip kept the view, so it kept the history in it.
      expect(host().value()).toEqual(doc(para(text('Hello'))));
    });

    it('refuses a value it cannot read, and says so once even if it mounts later', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      await mount(h => {
        h.readonly.set(true);
        // Written by another schema: h4 is outside this one's three levels.
        h.value.set({
          type: 'doc',
          content: [{ type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'Stored' }] }],
        });
      });

      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('could not be read and was ignored');
      expect(root().querySelector('wr-editor')!.classList).toContain('wr-editor--refused');
      expect(statik().textContent?.trim()).toBe('');

      host().readonly.set(false);
      fixture.detectChanges();
      await fixture.whenStable();

      // The mount meets the same refusal the static path already named.
      expect(warn).toHaveBeenCalledTimes(1);
      expect(surface().getAttribute('contenteditable')).toBe('false');
      expect(root().querySelector('wr-editor')!.classList).toContain('wr-editor--refused');
      warn.mockRestore();
    });
  });

  describe('disabled', () => {
    it('leaves the tab order, says so, and disables the toolbar', async () => {
      await mount(h => h.disabled.set(true));

      expect(surface().getAttribute('contenteditable')).toBe('false');
      expect(surface().hasAttribute('tabindex')).toBe(false);
      expect(surface().getAttribute('aria-disabled')).toBe('true');
      expect(buttons().every(b => b.disabled)).toBe(true);
    });
  });

  describe('touch', () => {
    it('fires when focus leaves the control, not when it moves to its own toolbar', async () => {
      await mount();
      surface().focus();
      tool('Bold').focus();
      expect(host().touched).toBe(0);

      root().querySelector<HTMLButtonElement>('.outside')!.focus();
      expect(host().touched).toBe(1);
    });
  });

  describe('keyboard', () => {
    const cell = (type: 'table_header' | 'table_cell', value: string): WrEditorJson => ({
      type,
      attrs: { align: null },
      content: [para(text(value))],
    });
    const row = (...cells: WrEditorJson[]): WrEditorJson => ({ type: 'table_row', content: cells });
    const table: WrEditorJson = {
      type: 'table',
      content: [row(cell('table_header', 'H')), row(cell('table_cell', 'cell'))],
    };
    const intro = para(text('intro'));
    const outro = para(text('outro'));

    it('leaves a table that ends the document with ArrowDown on its last line', async () => {
      await mount(h => h.value.set(doc(intro, table)));
      await caretIn('cell', 4);
      const down = key(surface(), { key: 'ArrowDown' });
      await type('after', surface().querySelector(':scope > p:last-child')!);

      expect(down.defaultPrevented).toBe(true);
      expect(host().value()).toEqual(doc(intro, table, para(text('after'))));
    });

    it('leaves a table that opens the document with ArrowUp on its first line', async () => {
      const single: WrEditorJson = { type: 'table', content: [row(cell('table_cell', 'cell'))] };
      await mount(h => h.value.set(doc(single, outro)));
      await caretIn('cell', 0);
      const up = key(surface(), { key: 'ArrowUp' });
      fixture.detectChanges();

      expect(up.defaultPrevented).toBe(true);
      expect(host().value()).toEqual(doc(para(), single, outro));
    });

    it('lets ArrowDown move as usual when there is text after the table', async () => {
      await mount(h => h.value.set(doc(intro, table, outro)));
      await caretIn('cell', 4);
      const down = key(surface(), { key: 'ArrowDown' });

      expect(down.defaultPrevented).toBe(false);
    });

    it('leaves a table from anywhere in it with Mod-Enter', async () => {
      await mount(h => h.value.set(doc(intro, table, outro)));
      await caretIn('H', 0);
      key(surface(), { key: 'Enter', ctrlKey: true });
      fixture.detectChanges();

      expect(host().value()).toEqual(doc(intro, table, para(), outro));
    });

    // Windows German types `[` and `]` as AltGr+8 / AltGr+9, which the browser
    // reports as Ctrl+Alt; macOS German as Option+5 / Option+6 under ⌘.
    it('indents and outdents a list item with a bracket typed through AltGr', async () => {
      const list = (...items: WrEditorJson[]): WrEditorJson => ({
        type: 'bullet_list',
        attrs: { tight: true },
        content: items,
      });
      const item = (value: string, ...rest: WrEditorJson[]): WrEditorJson => ({
        type: 'list_item',
        attrs: { checked: null },
        content: [para(text(value)), ...rest],
      });
      await mount(h => h.value.set(doc(list(item('a'), item('b')))));
      await caretIn('b', 1);
      key(surface(), { key: ']', ctrlKey: true, altKey: true });
      fixture.detectChanges();
      expect(host().value()).toEqual(doc(list(item('a', list(item('b'))))));

      key(surface(), { key: '[', ctrlKey: true, altKey: true });
      fixture.detectChanges();
      expect(host().value()).toEqual(doc(list(item('a'), item('b'))));
    });
  });

  describe('the toolbar', () => {
    const stops = (): string[] =>
      buttons()
        .filter(b => b.tabIndex === 0)
        .map(b => b.getAttribute('aria-label')!);

    it('is one tab stop that the arrows rove, wrapping at the ends', async () => {
      await mount();
      expect(root().querySelector('[role="toolbar"]')?.getAttribute('aria-label')).toBe('Formatting');
      expect(stops()).toEqual(['Bold']);

      tool('Bold').focus();
      key(tool('Bold'), { key: 'ArrowRight' });
      fixture.detectChanges();
      expect(document.activeElement).toBe(tool('Italic'));
      expect(stops()).toEqual(['Italic']);

      // Undo and redo are disabled — nothing to undo yet — so End skips them.
      key(tool('Italic'), { key: 'End' });
      expect(document.activeElement).toBe(tool('Insert link'));
      key(tool('Insert link'), { key: 'ArrowRight' });
      expect(document.activeElement).toBe(tool('Bold'));
      key(tool('Bold'), { key: 'ArrowLeft' });
      expect(document.activeElement).toBe(tool('Insert link'));
      key(tool('Insert link'), { key: 'Home' });
      expect(document.activeElement).toBe(tool('Bold'));
    });

    it('mirrors the arrows under a right-to-left direction', async () => {
      await mount(undefined, [
        { provide: Directionality, useValue: { value: 'rtl' as Direction, change: new Subject<Direction>() } },
      ]);
      tool('Bold').focus();
      key(tool('Bold'), { key: 'ArrowLeft' });

      expect(document.activeElement).toBe(tool('Italic'));
    });

    it('marks toggles with aria-pressed and names every shortcut', async () => {
      await mount();

      expect(tool('Bold').getAttribute('aria-pressed')).toBe('false');
      expect(tool('Bold').getAttribute('aria-keyshortcuts')).toBe('Control+B');
      expect(tool('Heading 1').getAttribute('aria-keyshortcuts')).toBe('Control+Alt+1');
      expect(tool('Redo').getAttribute('aria-keyshortcuts')).toBe('Control+Shift+Z Control+Y');
      expect(tool('Undo').hasAttribute('aria-pressed')).toBe(false);
    });

    it('enables undo once there is something to undo', async () => {
      await mount();
      expect(tool('Undo').disabled).toBe(true);
      key(surface(), { key: 'a', ctrlKey: true });
      key(surface(), { key: 'b', ctrlKey: true });
      fixture.detectChanges();

      expect(tool('Undo').disabled).toBe(false);
      tool('Undo').click();
      expect(host().value()).toEqual(doc(para(text('Hello'))));
    });

    it('keeps keyboard focus on a tool, and hands it to the text once the tool stops applying', async () => {
      await mount();
      key(surface(), { key: 'a', ctrlKey: true });
      tool('Bold').focus();
      tool('Bold').click();
      fixture.detectChanges();
      expect(document.activeElement).toBe(tool('Bold'));

      // One undo empties the history, which disables Undo — and a disabled button
      // would drop its focus on <body>.
      tool('Undo').focus();
      tool('Undo').click();
      fixture.detectChanges();
      expect(host().value()).toEqual(doc(para(text('Hello'))));
      expect(tool('Undo').disabled).toBe(true);
      expect(document.activeElement).toBe(surface());
    });

    it('draws only the separators between two groups', async () => {
      await mount(h => h.toolbar.set(['|', 'bold', '|', '|', 'italic', '|']));

      expect(root().querySelectorAll('.wr-editor__separator')).toHaveLength(1);
      expect(buttons()).toHaveLength(2);
    });

    it('is gone with toolbar=false', async () => {
      await mount(h => h.toolbar.set(false));

      expect(root().querySelector('[role="toolbar"]')).toBeNull();
    });
  });

  describe('the link panel', () => {
    const panel = (): HTMLFormElement | null => document.querySelector<HTMLFormElement>('.wr-editor-link');
    const input = (): HTMLInputElement => panel()!.querySelector('input')!;
    const submit = async (url: string): Promise<void> => {
      input().value = url;
      input().dispatchEvent(new Event('input', { bubbles: true }));
      panel()!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await fixture.whenStable();
    };

    it('opens on Mod-K and stops the chord there, so a command palette does not open too', async () => {
      await mount();
      const outer = vi.fn();
      document.addEventListener('keydown', outer);
      key(surface(), { key: 'k', ctrlKey: true });
      await fixture.whenStable();
      document.removeEventListener('keydown', outer);

      expect(outer).not.toHaveBeenCalled();
      expect(panel()).not.toBeNull();
      expect(tool('Insert link').getAttribute('aria-expanded')).toBe('true');
    });

    it('leaves Mod-K alone when there is no link tool to open', async () => {
      await mount(h => h.toolbar.set(['bold']));
      const outer = vi.fn();
      document.addEventListener('keydown', outer);
      const event = key(surface(), { key: 'k', ctrlKey: true });
      document.removeEventListener('keydown', outer);

      expect(outer).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(false);
    });

    it('links the selection with an address the policy allows', async () => {
      await mount();
      key(surface(), { key: 'a', ctrlKey: true });
      key(surface(), { key: 'k', ctrlKey: true });
      await fixture.whenStable();
      await submit('https://example.com');

      expect(host().value()).toEqual(doc(para(text('Hello', link('https://example.com')))));
      expect(panel()).toBeNull();
    });

    it('refuses a javascript: address, says why, and changes nothing', async () => {
      await mount();
      key(surface(), { key: 'a', ctrlKey: true });
      key(surface(), { key: 'k', ctrlKey: true });
      await fixture.whenStable();
      await submit('javascript:alert(1)');

      const error = panel()!.querySelector('.wr-editor-link__error')!;
      expect(error.getAttribute('role')).toBe('alert');
      expect(input().getAttribute('aria-invalid')).toBe('true');
      expect(input().getAttribute('aria-describedby')).toBe(error.id);
      expect(host().value()).toEqual(doc(para(text('Hello'))));
    });

    /**
     * Chromium fires `focusout` with no `relatedTarget` when the focused
     * element is removed, and the popover removes the panel before it hands
     * focus back. jsdom fires nothing on removal, so the event is dispatched
     * the way Chromium sends it.
     */
    it('does not mark the field touched when Escape closes the panel and focus comes back', async () => {
      await mount();
      key(surface(), { key: 'k', ctrlKey: true });
      await fixture.whenStable();
      expect(document.activeElement).toBe(input());

      input().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      key(input(), { key: 'Escape' });
      await fixture.whenStable();

      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(surface());
      expect(host().touched).toBe(0);
    });

    // Tab past the last control on the page — the overlay container is the end
    // of `<body>` — reports no `relatedTarget` either, and focus leaves the
    // document. The panel must not be left open behind it, and a panel opened
    // with Mod-K must not pull focus back into the text as it closes.
    it('closes and marks the field touched when focus falls out of the panel onto nothing', async () => {
      await mount();
      key(surface(), { key: 'k', ctrlKey: true });
      await fixture.whenStable();

      input().blur();
      await fixture.whenStable();

      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(document.body);
      expect(host().touched).toBe(1);
    });

    it('does not take focus back from a control the user moved to', async () => {
      await mount();
      key(surface(), { key: 'k', ctrlKey: true });
      await fixture.whenStable();
      // A press on the panel's padding focuses its pane, not the form, and the
      // next click lands somewhere else on the page.
      document.getElementById(tool('Insert link').getAttribute('aria-controls')!)!.focus();
      const outside = root().querySelector<HTMLButtonElement>('.outside')!;
      outside.focus();
      outside.click();
      await fixture.whenStable();

      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(outside);
    });

    it('closes when Tab leaves it, and leaves focus where Tab put it', async () => {
      await mount();
      key(surface(), { key: 'k', ctrlKey: true });
      await fixture.whenStable();
      const outside = root().querySelector<HTMLButtonElement>('.outside')!;
      outside.focus();
      await fixture.whenStable();

      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(outside);
      expect(host().touched).toBe(1);
    });

    it('labels its input with its own label, not the surrounding field', async () => {
      await mount();
      key(surface(), { key: 'k', ctrlKey: true });
      await fixture.whenStable();

      const label = panel()!.querySelector('label')!;
      expect(label.getAttribute('for')).toBe(input().id);
      expect(label.textContent).toBe('Link address');
    });
  });

  describe('the placeholder', () => {
    it('decorates the empty paragraph and is exposed as aria-placeholder', async () => {
      await mount(h => {
        h.value.set(null);
        h.placeholder.set('Write something');
      });

      const paragraph = surface().querySelector('p')!;
      expect(paragraph.classList).toContain('wr-editor__placeholder');
      expect(paragraph.getAttribute('data-placeholder')).toBe('Write something');
      expect(surface().getAttribute('aria-placeholder')).toBe('Write something');

      await type('x');
      expect(surface().querySelector('.wr-editor__placeholder')).toBeNull();
      expect(surface().hasAttribute('aria-placeholder')).toBe(false);
    });
  });

  describe('focus()', () => {
    const editor = (): WrEditor => fixture.debugElement.query(By.directive(WrEditor)).injector.get(WrEditor);

    it('focuses the surface', async () => {
      await mount();
      editor().focus();

      expect(document.activeElement).toBe(surface());
    });

    it('focuses the static document while read-only, where there is no surface to focus', async () => {
      await mount(h => h.readonly.set(true));
      editor().focus();

      expect(document.activeElement).toBe(root().querySelector('.wr-editor__preview--static'));
    });
  });
});

describe('WrEditor inside a form field', () => {
  @Component({
    imports: [WrEditor, WrFormField],
    template: `
      <wr-form-field label="Body" hint="Keep it short">
        <wr-editor [value]="value" />
      </wr-form-field>
    `,
  })
  class FieldHost {
    readonly value = doc(para(text('x')));
  }

  let removeStubs: () => void;
  beforeEach(() => (removeStubs = installLayoutStubs()));
  afterEach(() => removeStubs());

  it('is named by the field label and described by its hint', async () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(FieldHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const surface = root.querySelector('.wr-editor__surface')!;

    const label = document.getElementById(surface.getAttribute('aria-labelledby')!);
    expect(label?.textContent?.trim()).toContain('Body');
    expect(surface.hasAttribute('aria-label')).toBe(false);
    expect(document.getElementById(surface.getAttribute('aria-describedby')!)?.textContent).toContain('Keep it short');
    expect(surface.hasAttribute('aria-invalid')).toBe(false);
    fixture.destroy();
  });
});

describe('WrEditor labels are localizable', () => {
  let removeStubs: () => void;
  beforeEach(() => (removeStubs = installLayoutStubs()));
  afterEach(() => removeStubs());

  it('reads its toolbar and surface names from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(WrEditor);
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.wr-editor__surface')?.getAttribute('aria-label')).toBe('Форматированный текст');
    expect(root.querySelector('[role="toolbar"]')?.getAttribute('aria-label')).toBe('Форматирование');
    expect(root.querySelector('[aria-label="Полужирный"]')).not.toBeNull();
    expect(root.querySelector('[aria-label="Заголовок 2"]')).not.toBeNull();
    fixture.destroy();
  });
});
