import { TestKey } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form, required } from '@angular/forms/signals';

import { WrEditor, type WrEditorJson, type WrEditorMarkJson, type WrEditorTool, type WrEditorValue } from 'ngwr/editor';
import { WrFormField } from 'ngwr/form';
import { WrInputHarness } from 'ngwr/input/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrEditorHarness } from './wr-editor-harness';

/**
 * The stub the harness's own docs tell a consumer to install: ProseMirror scrolls
 * the selection into view after an edit made with focus, which reads range
 * geometry jsdom does not have. Installed per case and removed after it, so no
 * other file inherits it.
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
// on an empty node, no `marks` on unmarked text.
const doc = (...content: WrEditorJson[]): WrEditorJson => ({ type: 'doc', content });
const para = (...content: WrEditorJson[]): WrEditorJson =>
  content.length ? { type: 'paragraph', content } : { type: 'paragraph' };
const text = (value: string, ...marks: WrEditorMarkJson[]): WrEditorJson =>
  marks.length ? { type: 'text', text: value, marks } : { type: 'text', text: value };
const link = (href: string): WrEditorMarkJson => ({ type: 'link', attrs: { href, title: null } });

@Component({
  imports: [WrEditor, WrFormField],
  template: `
    <wr-form-field label="Body">
      <wr-editor
        placeholder="Write the release notes"
        [(value)]="body"
        [readonly]="readonly()"
        [disabled]="disabled()"
        (touch)="touched = touched + 1"
      />
    </wr-form-field>
    <wr-editor ariaLabel="Summary" [(value)]="summary" [toolbar]="summaryTools" />
    <wr-editor ariaLabel="Notes" [toolbar]="false" [value]="notes" />
  `,
})
class Host {
  readonly body = signal<WrEditorValue>(doc(para(text('Hello'))));
  readonly summary = signal<WrEditorValue>(
    doc({
      type: 'bullet_list',
      attrs: { tight: true },
      content: [
        { type: 'list_item', attrs: { checked: true }, content: [para(text('shipped'))] },
        { type: 'list_item', attrs: { checked: false }, content: [para(text('announced'))] },
      ],
    })
  );
  readonly notes = doc(para(text('Plain')));
  readonly readonly = signal(false);
  readonly disabled = signal(false);
  // Bold twice: what is drawn is each tool once.
  readonly summaryTools: readonly WrEditorTool[] = ['bold', 'underline', 'italic', 'bold', '|', 'undo', 'redo'];
  touched = 0;
}

/** A Signal Forms field with a rule that fails while the editor is empty. */
@Component({
  imports: [FormField, WrEditor, WrFormField],
  template: `
    <wr-form-field label="Description">
      <wr-editor [formField]="f.description" />
    </wr-form-field>
  `,
})
class FormHost {
  readonly model = signal<{ description: WrEditorValue }>({ description: null });
  readonly f = form(this.model, path => required(path.description));
}

/**
 * Used exactly as a consumer would: through the loader, with the value read from
 * what the host bound. Every write goes through a harness method and every read
 * of the document goes through the model AND the drawn text — the two questions an
 * editor answers, asked separately.
 */
describe('WrEditorHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let removeStubs: () => void;

  const body = (): Promise<WrEditorHarness> => loader.getHarness(WrEditorHarness.with({ label: 'Body' }));
  const summary = (): Promise<WrEditorHarness> => loader.getHarness(WrEditorHarness.with({ label: 'Summary' }));

  beforeEach(async () => {
    removeStubs = installLayoutStubs();
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    removeStubs();
  });

  describe('finding and reading', () => {
    it('finds every editor, by the name each one answers to', async () => {
      const all = await loader.getAllHarnesses(WrEditorHarness);
      expect(await Promise.all(all.map(editor => editor.getLabel()))).toEqual(['Body', 'Summary', 'Notes']);
    });

    it('resolves a form field label through aria-labelledby, not aria-label', async () => {
      const editor = await body();
      const surface = (fixture.nativeElement as HTMLElement).querySelector('.wr-editor__surface')!;

      expect(surface.hasAttribute('aria-label')).toBe(false);
      expect(await editor.getLabel()).toBe('Body');
    });

    it('filters by drawn text, disabled and read-only', async () => {
      expect(await loader.getAllHarnesses(WrEditorHarness.with({ text: 'Plain' }))).toHaveLength(1);
      expect(await loader.getAllHarnesses(WrEditorHarness.with({ text: /^shipped/ }))).toHaveLength(1);

      fixture.componentInstance.readonly.set(true);
      expect(await loader.getAllHarnesses(WrEditorHarness.with({ readonly: true }))).toHaveLength(1);
      expect(await loader.getAllHarnesses(WrEditorHarness.with({ disabled: true }))).toHaveLength(0);
    });

    it('reads each textblock on its own line and leaves the task words out', async () => {
      const editor = await summary();

      // Drawn: the two items' text. Announced besides, and deliberately not here:
      // the "Done:" / "To do:" words beside each paragraph.
      expect(await editor.getText()).toBe('shipped\nannounced');
      const drawn = (fixture.nativeElement as HTMLElement).querySelectorAll('wr-editor')[1].textContent;
      expect(drawn).toContain('Done:');
    });

    it('announces the placeholder only while the document is empty', async () => {
      const editor = await body();
      expect(await editor.getPlaceholder()).toBeNull();

      await editor.setText('');
      expect(await editor.getPlaceholder()).toBe('Write the release notes');
      expect(await editor.getText()).toBe('');
    });
  });

  describe('writing', () => {
    it('replaces the document with setText, and the model hears it', async () => {
      const editor = await body();
      await editor.setText('Release notes');

      expect(fixture.componentInstance.body()).toEqual(doc(para(text('Release notes'))));
      expect(await editor.getText()).toBe('Release notes');
    });

    it('writes an emptied document as null, so `required` sees it as empty', async () => {
      await (await body()).setText('');

      expect(fixture.componentInstance.body()).toBeNull();
    });

    it('writes one paragraph, a line break in the text becoming a hard break', async () => {
      await (await body()).setText('one\ntwo');

      expect(fixture.componentInstance.body()).toEqual(doc(para(text('one'), { type: 'hard_break' }, text('two'))));
    });

    it('pastes plain text over the selection', async () => {
      const editor = await body();
      await editor.selectAll();
      await editor.paste('Pasted');

      expect(fixture.componentInstance.body()).toEqual(doc(para(text('Pasted'))));
    });

    it('pastes html through the schema, so nothing executable survives', async () => {
      const editor = await body();
      await editor.selectAll();
      await editor.pasteHtml(
        '<p onclick="alert(1)"><a href="javascript:alert(1)">bad</a> <b>kept</b></p><iframe></iframe>'
      );

      expect(fixture.componentInstance.body()).toEqual(doc(para(text('bad '), text('kept', { type: 'strong' }))));
    });

    it('drives the keymap with a modifier', async () => {
      const editor = await body();
      await editor.selectAll();
      await editor.pressKey('b', { control: true });

      expect(fixture.componentInstance.body()).toEqual(doc(para(text('Hello', { type: 'strong' }))));
      expect(await editor.isToolPressed('Bold')).toBe(true);
    });

    it('drives a structural key', async () => {
      const editor = await body();
      await editor.selectAll();
      await editor.pressKey(TestKey.BACKSPACE);

      expect(fixture.componentInstance.body()).toBeNull();
    });

    it('refuses a printable key with no modifier rather than dropping it', async () => {
      const editor = await body();

      await expect(editor.pressKey('x')).rejects.toThrow(/would be typed, not pressed/);
      expect(fixture.componentInstance.body()).toEqual(doc(para(text('Hello'))));
    });
  });

  describe('read-only and disabled', () => {
    it('refuses to write text nobody could write, and says why', async () => {
      fixture.componentInstance.readonly.set(true);
      const editor = await body();

      expect(await editor.isReadonly()).toBe(true);
      await expect(editor.setText('x')).rejects.toThrow(/read-only/);
      await expect(editor.selectAll()).rejects.toThrow(/read-only/);
    });

    it('delivers a paste to a read-only editor, which refuses it — and the same paste lands once it is writable', async () => {
      fixture.componentInstance.readonly.set(true);
      const editor = await body();
      await editor.paste('Pasted');
      expect(fixture.componentInstance.body()).toEqual(doc(para(text('Hello'))));

      fixture.componentInstance.readonly.set(false);
      await editor.paste('Pasted ');
      expect(fixture.componentInstance.body()).toEqual(doc(para(text('Pasted Hello'))));
    });

    it('treats a disabled editor as out of reach', async () => {
      fixture.componentInstance.disabled.set(true);
      const editor = await body();

      expect(await editor.isDisabled()).toBe(true);
      expect(await editor.isReadonly()).toBe(false);
      await expect(editor.pressKey('b', { control: true })).rejects.toThrow(/disabled/);
      await expect(editor.paste('x')).rejects.toThrow(/disabled/);
      await expect(editor.focus()).rejects.toThrow(/disabled/);
    });
  });

  describe('focus and touch', () => {
    it('focuses the surface, and emits touch once focus leaves the control', async () => {
      const editor = await body();
      await editor.focus();
      expect(await editor.isFocused()).toBe(true);
      expect(fixture.componentInstance.touched).toBe(0);

      await editor.blur();
      expect(await editor.isFocused()).toBe(false);
      expect(fixture.componentInstance.touched).toBe(1);
    });
  });

  describe('the toolbar', () => {
    it('lists the drawn tools — a duplicate drawn once — and its own name', async () => {
      const editor = await summary();

      expect(await editor.hasToolbar()).toBe(true);
      expect(await editor.getToolbarLabel()).toBe('Formatting');
      expect(await editor.getToolLabels()).toEqual(['Bold', 'Underline', 'Italic', 'Undo', 'Redo']);
    });

    it('says so when there is no toolbar at all', async () => {
      const notes = await loader.getHarness(WrEditorHarness.with({ label: 'Notes' }));

      expect(await notes.hasToolbar()).toBe(false);
      await expect(notes.getToolbarLabel()).rejects.toThrow(/no toolbar/);
      expect(await notes.getToolLabels()).toEqual([]);
    });

    it('hands back a tool as a button, and answers what the button harness does not', async () => {
      const editor = await body();
      await editor.selectAll();
      await (await editor.getTool('Heading 2')).click();

      expect(fixture.componentInstance.body()).toEqual(
        doc({ type: 'heading', attrs: { level: 2 }, content: [text('Hello')] })
      );
      expect(await editor.isToolPressed('Heading 2')).toBe(true);
      expect(await editor.isToolPressed(/^Paragraph$/)).toBe(false);
      expect(await editor.getToolShortcuts('Heading 2')).toBe('Control+Alt+2');
      expect(await editor.getToolShortcuts('Horizontal line')).toBeNull();
    });

    it('reports an unavailable tool as disabled', async () => {
      const editor = await body();
      expect(await (await editor.getTool('Undo')).isDisabled()).toBe(true);

      await editor.setText('Changed');
      expect(await (await editor.getTool('Undo')).isDisabled()).toBe(false);
    });

    it('refuses a pressed state for a tool that is not a toggle', async () => {
      const editor = await body();

      await expect(editor.isToolPressed('Undo')).rejects.toThrow(/not a toggle/);
      await expect(editor.isToolPressed('Insert link')).rejects.toThrow(/not a toggle/);
    });

    it('names what is drawn when a tool is not', async () => {
      const editor = await summary();

      await expect(editor.getTool('Heading 2')).rejects.toThrow(/no tool is named Heading 2.*"Bold"/);
    });

    it('reads the roving tab stop, and loses it when nothing applies', async () => {
      const editor = await body();
      expect(await editor.getToolbarTabStop()).toBe('Bold');

      fixture.componentInstance.readonly.set(true);
      expect(await editor.getToolbarTabStop()).toBeNull();
    });
  });

  describe('the link panel', () => {
    it('links the selection with an address the policy allows, and closes', async () => {
      const editor = await body();
      await editor.selectAll();
      await editor.setLink('https://example.com');

      expect(fixture.componentInstance.body()).toEqual(doc(para(text('Hello', link('https://example.com')))));
      expect(await editor.isLinkPanelOpen()).toBe(false);
    });

    it('refuses a javascript: address, keeps the panel open and reads its message', async () => {
      const editor = await body();
      await editor.selectAll();
      await editor.setLink('javascript:alert(1)');

      expect(await editor.isLinkPanelOpen()).toBe(true);
      expect(await editor.getLinkError()).toBe('This address cannot be used as a link.');
      expect(fixture.componentInstance.body()).toEqual(doc(para(text('Hello'))));
    });

    it('hands back the panel as a content container', async () => {
      const editor = await body();
      const panel = await editor.openLinkPanel();

      expect(await panel.getRole()).toBe('dialog');
      expect(await (await panel.getHarness(WrInputHarness)).getValue()).toBe('');
      expect(await editor.getLinkError()).toBeNull();
    });

    it('removes a link, and refuses when there is none to remove', async () => {
      fixture.componentInstance.body.set(doc(para(text('Hello', link('https://example.com')))));
      const editor = await body();
      await editor.selectAll();
      await editor.removeLink();
      expect(fixture.componentInstance.body()).toEqual(doc(para(text('Hello'))));

      await editor.selectAll();
      await expect(editor.removeLink()).rejects.toThrow(/not in a link/);
    });

    it('refuses a message read while the panel is closed', async () => {
      await expect((await body()).getLinkError()).rejects.toThrow(/closed/);
    });

    it('refuses to open a panel the toolbar does not draw', async () => {
      await expect((await summary()).openLinkPanel()).rejects.toThrow(/no link tool/);
      expect(await (await summary()).isLinkPanelOpen()).toBe(false);
    });

    it('refuses to open the panel of an editor that cannot be edited', async () => {
      fixture.componentInstance.readonly.set(true);

      await expect((await body()).openLinkPanel()).rejects.toThrow(/disabled/);
    });
  });
});

describe('WrEditorHarness inside a Signal Forms field', () => {
  let removeStubs: () => void;

  beforeEach(() => (removeStubs = installLayoutStubs()));
  afterEach(() => removeStubs());

  it('reads the field invalid once the editor has been touched', async () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(FormHost);
    fixture.detectChanges();
    const editor = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrEditorHarness);

    expect(await editor.isInvalid()).toBe(false);
    await editor.focus();
    await editor.blur();
    expect(await editor.isInvalid()).toBe(true);

    await editor.setText('Filled');
    expect(fixture.componentInstance.model().description).toEqual(doc(para(text('Filled'))));
    expect(await editor.isInvalid()).toBe(false);
    fixture.destroy();
  });
});

/**
 * The Host's editors all mount in the suite above, where `readonly` starts off.
 * Bound from the FIRST render it is a different component: ProseMirror is never
 * created, and what the harness reads is the document drawn in its place.
 */
describe('WrEditorHarness on an editor that was read-only before it could mount', () => {
  let removeStubs: () => void;

  beforeEach(() => (removeStubs = installLayoutStubs()));
  afterEach(() => removeStubs());

  const readOnly = async (value: WrEditorValue): Promise<[Host, WrEditorHarness, () => void]> => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.readonly.set(true);
    fixture.componentInstance.body.set(value);
    fixture.detectChanges();
    await fixture.whenStable();
    const editor = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrEditorHarness.with({ label: 'Body' }));
    return [fixture.componentInstance, editor, () => fixture.destroy()];
  };

  it('reads the document, refuses everything that needs a view, and mounts once the rule is lifted', async () => {
    const [host, editor, destroy] = await readOnly(
      doc({ type: 'heading', attrs: { level: 2 }, content: [text('Shipped')] }, para(text('Hello')))
    );

    expect(await editor.isMounted()).toBe(false);
    expect(await editor.isReadonly()).toBe(true);
    expect(await editor.isDisabled()).toBe(false);
    expect(await editor.getLabel()).toBe('Body');
    expect(await editor.getText()).toBe('Shipped\nHello');

    await editor.focus();
    expect(await editor.isFocused()).toBe(true);

    await expect(editor.setText('x')).rejects.toThrow(/never mounted/);
    await expect(editor.paste('x')).rejects.toThrow(/never mounted/);
    await expect(editor.pressKey('b', { control: true })).rejects.toThrow(/never mounted/);
    await expect(editor.selectAll()).rejects.toThrow(/read-only/);

    host.readonly.set(false);
    expect(await editor.isMounted()).toBe(true);
    await editor.setText('Written');
    expect(host.body()).toEqual(doc(para(text('Written'))));
    destroy();
  });

  it('announces no placeholder, since a read-only editor draws none to announce', async () => {
    const [, editor, destroy] = await readOnly(null);

    expect(await editor.getText()).toBe('');
    expect(await editor.getPlaceholder()).toBeNull();
    destroy();
  });
});

describe('WrEditorHarness on the server', () => {
  it('reports the editor unmounted and refuses to read the preview as if it were the editor', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const editor = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      WrEditorHarness.with({ label: 'Summary' })
    );

    expect(await editor.isMounted()).toBe(false);
    await expect(editor.getText()).rejects.toThrow(/not mounted/);
    fixture.destroy();
  });
});
