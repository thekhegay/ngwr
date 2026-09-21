/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  ComponentHarness,
  HarnessPredicate,
  type ModifierKeys,
  type TestElement,
  type TestKey,
  parallel,
} from '@angular/cdk/testing';

import { WrButtonHarness } from 'ngwr/button/testing';
import { WrInputHarness } from 'ngwr/input/testing';
import { WrPopoverHarness } from 'ngwr/popover/testing';

import type { WrEditorHarnessFilters } from './interfaces';

/** The text surface ProseMirror mounts on. */
const SURFACE = '.wr-editor__surface';

/** One toolbar button. The separators are `<span>`s and never match. */
const TOOL = '.wr-editor__tool';

/**
 * The link tool — the one button that hosts a popover rather than a tooltip, and so
 * the one announcing `aria-haspopup="dialog"`.
 */
const LINK_TOOL = `${TOOL}[aria-haspopup="dialog"]`;

/**
 * Every textblock the schema can draw. A list item, a quote and a table cell all hold
 * paragraphs, so this reaches every run of text however deeply it is nested — and
 * nothing else: a task item's box and its screen-reader words sit OUTSIDE the
 * paragraph, beside it.
 */
const TEXTBLOCKS = `${SURFACE} :is(p, h1, h2, h3, pre)`;

/**
 * The modifier ProseMirror's keymap reads `Mod` as. It decides from
 * `navigator.platform` itself, once, when `prosemirror-keymap` loads — so this asks
 * the same question the same way rather than guessing from the tooltip, which the
 * component words from the user agent.
 */
function primaryModifier(): ModifierKeys {
  const apple = typeof navigator !== 'undefined' && /Mac|iP(hone|[oa]d)/.test(navigator.platform);
  return apple ? { meta: true } : { control: true };
}

/**
 * Test harness for `<wr-editor>` — a ProseMirror text surface, the formatting
 * toolbar above it, and the link panel one of its buttons opens.
 *
 * **The value is not read here, and that is the first thing to know.** The model
 * holds an HTML string, a markdown string or a JSON tree depending on `format`, and
 * all three are written by the editor's codec, never by the DOM. What the surface
 * draws is ProseMirror's rendering of the document — a trailing `<br>` in an empty
 * paragraph, a presentational box beside a task item — so a string derived from it
 * would be a fourth format agreeing with none of the three. A spec reads the value
 * from what it bound (`form.body().value()`, the `[(value)]` signal); this harness
 * answers the other question, what is DRAWN ({@link getText}), and a spec on an
 * editor should usually ask both.
 *
 * Four more things are refused, each because jsdom cannot answer it and a method
 * would answer it anyway:
 *
 * - **Typing, character by character.** `sendKeys` dispatches key events and nothing
 *   else. In a browser the BROWSER inserts the character into the contenteditable and
 *   ProseMirror reads the mutation; jsdom inserts nothing, so a typed string would
 *   vanish while the call resolved. {@link setText} writes the surface the way the
 *   CDK defines writing a contenteditable, which ProseMirror reads as a real DOM
 *   change; {@link paste} inserts at the selection; {@link pressKey} refuses a
 *   printable character without a modifier rather than dropping it.
 * - **A caret or a selected range.** Placing either needs a DOM selection inside a
 *   text node, which no `TestElement` call can create. {@link selectAll} is the one
 *   selection a keyboard makes without a coordinate, and it is the one offered.
 * - **Anything measured** — the height between `--wr-editor-min-height` and
 *   `-max-height`, a scroll, how the toolbar wraps, where a tooltip lands. Every box
 *   is 0×0 without layout.
 * - **Whether the placeholder is visible.** It is CSS `content` drawn from a data
 *   attribute, which no DOM query sees; {@link getPlaceholder} reads what is
 *   ANNOUNCED, and that is only there while the document is empty.
 *
 * Toolbar buttons are addressed by the name a screen reader reads — `Bold`,
 * `Heading 2`, `Insert link` in English, the catalog's words otherwise — because the
 * DOM carries nothing else to tell them apart, and that name is the contract anyway.
 * {@link getTool} hands back a `WrButtonHarness`; what that harness does not read
 * (`aria-pressed`, `aria-keyshortcuts`, the roving tab stop) is answered here.
 *
 * Every method reads the MOUNTED surface. ProseMirror takes it over in
 * `afterNextRender`, which the harness's own stabilising lets run; under a server
 * `PLATFORM_ID` it never does, and the static preview the server renders is not
 * something this harness pretends to be the editor.
 *
 * **A spec under jsdom installs one stub first.** After an edit made while the
 * surface has focus, ProseMirror scrolls the selection into view, which measures a
 * `Range` — and jsdom's `Range` has no `getClientRects()`. The throw comes AFTER the
 * document changed but before the model hears of it, from inside a DOM listener, so
 * the model keeps the old value and the error surfaces only as an unhandled one. Empty
 * boxes are the whole stub; nothing here measures anything, so nothing is lost:
 *
 * ```ts
 * beforeEach(() => {
 *   Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
 *   Range.prototype.getBoundingClientRect = () => new DOMRect();
 *   document.elementFromPoint = () => null;
 * });
 * // …and delete all three again in afterEach, so no other file inherits them.
 * ```
 *
 * @example
 * ```ts
 * const loader = TestbedHarnessEnvironment.loader(fixture);
 * const body = await loader.getHarness(WrEditorHarness.with({ label: 'Body' }));
 *
 * await body.setText('Release notes');
 * await body.selectAll();
 * await (await body.getTool('Bold')).click();
 *
 * expect(await body.isToolPressed('Bold')).toBe(true);
 * expect(host.value()).toBe('<p><strong>Release notes</strong></p>');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrEditorHarness extends ComponentHarness {
  static hostSelector = 'wr-editor';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrEditorHarnessFilters = {}): HarnessPredicate<WrEditorHarness> {
    return new HarnessPredicate(WrEditorHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled)
      .addOption('readonly', options.readonly, async (harness, readonly) => (await harness.isReadonly()) === readonly);
  }

  private readonly surface = this.locatorFor(SURFACE);

  // ---------------------------------------------------------------------------
  // The surface
  // ---------------------------------------------------------------------------

  /**
   * Whether ProseMirror owns the surface yet — read from the `contenteditable` it
   * writes there, which nothing else does.
   *
   * `true` in any browser-platform spec by the time a harness method runs. `false`
   * under a server `PLATFORM_ID`, where the editor is the static preview for good —
   * and every other method here throws, rather than answer about a preview as if it
   * were the editor.
   */
  async isMounted(): Promise<boolean> {
    return (await (await this.surface()).getAttribute('contenteditable')) !== null;
  }

  /**
   * The text the surface DRAWS: every textblock (paragraph, heading, code block) in
   * document order, each trimmed, joined with a newline.
   *
   * Joined per textblock rather than read in one go, because a single text read of the
   * surface glues two paragraphs into one word — `Hello` and `world` would come back
   * as `Helloworld`. A list item, a quote and a table cell draw their text in
   * paragraphs too, so a two-item list reads `One\nTwo`. Left out, deliberately: a task
   * item's `Done:` / `To do:` — screen-reader text beside the paragraph, not in it —
   * and a hard break, which is a `<br>` and has no text. An empty document is `''`.
   *
   * This is the drawn half of the two questions an editor answers; the class docs say
   * why the other half, the value, is read from the model instead.
   */
  async getText(): Promise<string> {
    await this.mountedSurface('getText');
    const blocks = await this.locatorForAll(TEXTBLOCKS)();
    return (await parallel(() => blocks.map(block => block.text()))).join('\n');
  }

  /**
   * The surface's accessible name — `ariaLabel` when one is bound, else the
   * surrounding `<wr-form-field>`'s label, else the catalog's `editor.label`.
   *
   * A field's label reaches the surface through `aria-labelledby`, never `<label for>`:
   * a contenteditable is not labelable. So the reference is resolved the way assistive
   * technology resolves it — each id's element, its text — and a reference to an
   * element that is not on the page contributes nothing, which is the failure worth
   * catching.
   */
  async getLabel(): Promise<string | null> {
    const surface = await this.surface();
    const labelledBy = await surface.getAttribute('aria-labelledby');
    if (labelledBy) {
      const root = this.documentRootLocatorFactory();
      const labels = await parallel(() =>
        labelledBy
          .split(/\s+/)
          .filter(Boolean)
          .map(async id => {
            const element = await root.locatorForOptional(`[id="${id}"]`)();
            return element ? element.text() : '';
          })
      );
      return labels.filter(Boolean).join(' ') || null;
    }
    return surface.getAttribute('aria-label');
  }

  /**
   * The placeholder as announced — `aria-placeholder` — or `null` when there is none
   * to announce.
   *
   * That is `null` whenever the document holds anything, not only when no
   * `placeholder` is bound: the component publishes it only while the document is
   * empty, the moment it is also drawn. A document holding an empty heading still
   * counts as empty.
   */
  async getPlaceholder(): Promise<string | null> {
    return (await this.surface()).getAttribute('aria-placeholder');
  }

  /**
   * Whether the editor is disabled — the surface's `aria-disabled`.
   *
   * Read from the surface rather than the `wr-editor--disabled` host class, because a
   * contenteditable has no `disabled` property: the attribute is what a screen reader
   * is told, and ProseMirror's own `contenteditable="false"` is what turns the
   * keyboard away. The component sets both.
   */
  async isDisabled(): Promise<boolean> {
    return (await (await this.surface()).getAttribute('aria-disabled')) === 'true';
  }

  /**
   * Whether the editor shows its document and refuses edits — the surface's
   * `aria-readonly`, which `role="textbox"` allows. Read-only keeps the tab stop, so
   * {@link focus} still lands; disabled does not.
   */
  async isReadonly(): Promise<boolean> {
    return (await (await this.surface()).getAttribute('aria-readonly')) === 'true';
  }

  /**
   * Whether the surface is announced invalid — the `aria-invalid` the surrounding
   * `<wr-form-field>` hands it when a bound field fails validation and has been
   * touched. An editor outside a field is never invalid.
   */
  async isInvalid(): Promise<boolean> {
    return (await (await this.surface()).getAttribute('aria-invalid')) === 'true';
  }

  /**
   * Replace the whole document with `text`, as one paragraph of plain text.
   *
   * Written through `TestElement.setContenteditableValue` — the CDK's own definition of
   * writing a contenteditable — which ProseMirror observes as a DOM change and parses
   * back through the schema, exactly as it does the mutation a browser makes for a
   * keystroke. So the write reaches the model through the editor's own path, filters
   * and all. A line break in `text` becomes a hard break inside that one paragraph,
   * the way Shift+Enter makes one; more paragraphs, lists and headings come from the
   * toolbar, {@link pressKey} or {@link pasteHtml}.
   *
   * An empty `text` empties the document, which writes `''` (`null` in `json` format).
   *
   * Throws on a disabled or read-only editor, where no user could change a word — the
   * surface is not contenteditable then, and a write the DOM accepted anyway would be
   * a green spec for something that cannot happen.
   */
  async setText(text: string): Promise<void> {
    const surface = await this.writableSurface('setText');
    await surface.focus();
    await surface.setContenteditableValue(text);
    await this.forceStabilize();
  }

  /**
   * Paste `text` as plain text at the selection, replacing whatever is selected — a
   * `paste` event carrying `text/plain`, handled by ProseMirror's own paste path.
   *
   * On a READ-ONLY editor the event is still delivered, because a browser delivers it:
   * the refusal is the editor's to make, and asserting the value did not change is how
   * a spec proves it did. Throws on a disabled one, whose surface cannot hold focus for
   * a paste to arrive at.
   */
  async paste(text: string): Promise<void> {
    await this.dispatchPaste('paste', { 'text/plain': text });
  }

  /**
   * Paste `html` at the selection, the way content copied from a web page arrives —
   * `text/html` with `text` as its `text/plain` twin.
   *
   * This is the path to exercise what the editor strips from untrusted markup: the
   * pasted HTML is parsed without executing anything and rebuilt from the schema,
   * exactly as a bound HTML value is, so `onclick`, a `javascript:` link or an
   * `<iframe>` never reaches the document. Read-only and disabled behave as in
   * {@link paste}.
   */
  async pasteHtml(html: string, text = ''): Promise<void> {
    await this.dispatchPaste('pasteHtml', { 'text/html': html, 'text/plain': text });
  }

  /**
   * Select the whole document with the platform's select-all chord, as ProseMirror's
   * keymap reads it.
   *
   * Throws on a read-only or disabled editor: ProseMirror hands the keyboard back to
   * the browser once the surface is not editable, and the browser's native select-all
   * is exactly what jsdom does not have, so the chord would select nothing and say so
   * to no one.
   */
  async selectAll(): Promise<void> {
    if (await this.isReadonly()) {
      throw new Error(
        'WrEditorHarness.selectAll(): the editor is read-only. ProseMirror does not handle the keyboard on a ' +
          'surface that is not editable — the browser selects natively — and a DOM without layout has no native ' +
          'selection to make. Assert isReadonly() instead.'
      );
    }
    const surface = await this.writableSurface('selectAll');
    await surface.focus();
    await surface.sendKeys(primaryModifier(), 'a');
  }

  /**
   * Press one key on the surface, with modifiers — Enter, Backspace, an arrow, or a
   * shortcut such as `pressKey('b', { control: true })`.
   *
   * The keys reach ProseMirror's keymap, which is where the shortcuts, the list
   * behaviour of Enter and history live. Under jsdom, ProseMirror reads `Mod` as
   * Control; {@link getToolShortcuts} names the chord each tool answers to.
   *
   * A printable character WITHOUT a Control, Meta or Alt modifier throws: inserting it
   * is the browser's job, not the key event's (see the class docs), so it would be
   * dropped while the call resolved — use {@link setText} or {@link paste}. Throws on a
   * disabled editor, whose surface is out of the tab order. A read-only one takes the
   * key and refuses whatever it would have changed, as it does in a browser.
   */
  async pressKey(key: TestKey | string, modifiers: ModifierKeys = {}): Promise<void> {
    if (typeof key === 'string' && !modifiers.control && !modifiers.meta && !modifiers.alt) {
      throw new Error(
        `WrEditorHarness.pressKey(): "${key}" would be typed, not pressed. A key event inserts nothing into a ` +
          'contenteditable — the browser does, and jsdom does not — so the character would be dropped silently. ' +
          'Use setText() or paste() for text, or pass a modifier for a shortcut.'
      );
    }
    const surface = await this.focusableSurface('pressKey');
    await surface.focus();
    await surface.sendKeys(modifiers, key);
  }

  /**
   * Move focus to the text surface. A read-only editor keeps its tab stop and takes
   * it.
   *
   * Throws on a disabled one rather than focusing it. In a browser its surface cannot
   * take focus — no `tabindex`, and `contenteditable="false"` — but jsdom counts ANY
   * `contenteditable` attribute as focusable, `false` included, so the focus would
   * land in the spec and never in the app.
   */
  async focus(): Promise<void> {
    return (await this.focusableSurface('focus')).focus();
  }

  /**
   * Take focus away from the surface — the whole control losing focus, which is what
   * emits `touch` and lets a bound field show its error. Focus moving to the editor's
   * own toolbar or link panel is not a blur of the control, and does not emit it.
   */
  async blur(): Promise<void> {
    return (await this.surface()).blur();
  }

  /** Whether the text surface holds focus. A toolbar button holding it is not the surface. */
  async isFocused(): Promise<boolean> {
    return (await this.surface()).isFocused();
  }

  // ---------------------------------------------------------------------------
  // The toolbar
  // ---------------------------------------------------------------------------

  /** Whether a toolbar is drawn — gone with `toolbar="false"`, and with a list holding no tool. */
  async hasToolbar(): Promise<boolean> {
    return (await this.locatorForOptional('[role="toolbar"]')()) !== null;
  }

  /** The toolbar's accessible name — the catalog's `editor.toolbar`. Throws when there is no toolbar. */
  async getToolbarLabel(): Promise<string | null> {
    return (await this.toolbar('getToolbarLabel')).getAttribute('aria-label');
  }

  /**
   * The names of the drawn tools, in order, separators left out.
   *
   * What is DRAWN, which is not always what was bound: `underline` is dropped in
   * `markdown` format, which cannot store it, and a duplicate or a stray separator is
   * dropped too.
   */
  async getToolLabels(): Promise<string[]> {
    const tools = await this.locatorForAll(TOOL)();
    return (await parallel(() => tools.map(tool => tool.getAttribute('aria-label')))).map(label => label ?? '');
  }

  /**
   * The toolbar button named `label`, as a `WrButtonHarness` — click it, focus it, ask
   * whether it is disabled.
   *
   * A tool the current selection cannot use is NATIVELY disabled, so its click never
   * fires; that is the answer to "can bold apply here", read with `isDisabled()`. Its
   * tooltip — the name plus the shortcut — is a `[wrPopover]` in tooltip mode, which
   * `WrPopoverHarness` reads when a spec cares about the wording.
   */
  async getTool(label: string | RegExp): Promise<WrButtonHarness> {
    const tool = await this.locatorForOptional(
      WrButtonHarness.with({ selector: TOOL }).add(`label matches ${label}`, async harness =>
        HarnessPredicate.stringMatches((await harness.host()).getAttribute('aria-label'), label)
      )
    )();
    if (tool) return tool;

    throw new Error(
      `WrEditorHarness.getTool(): no tool is named ${label}. The toolbar draws ` +
        `${JSON.stringify(await this.getToolLabels())} — note that underline is not drawn in markdown format.`
    );
  }

  /**
   * Whether a toggle tool is pressed — its `aria-pressed` — at the current selection.
   *
   * The marks answer for the selection (or, at a caret, for what typing would carry);
   * the block types answer for every textblock the selection touches, so a select-all
   * over a heading and a paragraph presses neither.
   *
   * Throws for a tool that is not a toggle: the link button opens a panel, and undo,
   * redo and the horizontal rule are actions, so none carries `aria-pressed` and a
   * `false` would claim a state they do not have. Whether the selection sits in a link
   * is what the link panel's remove button answers — see {@link removeLink}.
   */
  async isToolPressed(label: string | RegExp): Promise<boolean> {
    const host = await (await this.getTool(label)).host();
    const pressed = await host.getAttribute('aria-pressed');
    if (pressed === null) {
      throw new Error(
        `WrEditorHarness.isToolPressed(): "${await host.getAttribute('aria-label')}" is not a toggle, so it carries ` +
          'no aria-pressed. Link opens a panel; undo, redo and the horizontal rule are actions.'
      );
    }
    return pressed === 'true';
  }

  /**
   * The chords a tool answers to, as its `aria-keyshortcuts` states them
   * (`Control+B`, `Control+Shift+Z Control+Y`), or `null` for a tool with none — the
   * horizontal rule.
   *
   * ARIA key names, never localised; `Meta` replaces `Control` where the user agent is
   * Apple's.
   */
  async getToolShortcuts(label: string | RegExp): Promise<string | null> {
    return (await (await this.getTool(label)).host()).getAttribute('aria-keyshortcuts');
  }

  /**
   * The name of the one tool in the tab order, or `null` when there is none.
   *
   * The toolbar is a single tab stop that the arrow keys rove. The stop follows the
   * user, and moves off a tool that stopped applying — so after a click that disables
   * undo, it lands on the first tool that still applies. `null` only when nothing does
   * (read-only, disabled), where there is nothing for the keyboard to reach.
   */
  async getToolbarTabStop(): Promise<string | null> {
    const tools = await this.locatorForAll(TOOL)();
    for (const tool of tools) {
      if ((await tool.getAttribute('tabindex')) === '0' && !(await tool.getProperty<boolean>('disabled'))) {
        return tool.getAttribute('aria-label');
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // The link panel
  // ---------------------------------------------------------------------------

  /** Whether the link panel is open, from the link tool's `aria-expanded`. `false` when there is no link tool. */
  async isLinkPanelOpen(): Promise<boolean> {
    const tool = await this.locatorForOptional(LINK_TOOL)();
    return !!tool && (await tool.getAttribute('aria-expanded')) === 'true';
  }

  /**
   * Open the link panel from its toolbar button and hand back the popover — a
   * content container, so `panel.getHarness(WrInputHarness)` reaches the address
   * field without the spec touching the overlay. An open panel is returned as it is.
   *
   * The panel is a portal in the overlay container, reached through the id the
   * button publishes as `aria-controls`, never by its class: two editors can each have
   * one. Mod-K on the surface opens the same panel — `pressKey('k', { control: true })`.
   *
   * Throws when the toolbar draws no link tool, or when the tool is unavailable (a
   * read-only or disabled editor).
   */
  async openLinkPanel(): Promise<WrPopoverHarness> {
    const panel = await this.linkPopover('openLinkPanel');
    if (await panel.isOpen()) return panel;

    if (await (await panel.host()).getProperty<boolean>('disabled')) {
      throw new Error(
        'WrEditorHarness.openLinkPanel(): the link tool is disabled — nothing can be linked while the editor ' +
          'is read-only or disabled.'
      );
    }
    await panel.open();
    return panel;
  }

  /**
   * Link the selection to `url` through the panel: open it, write the address, apply.
   *
   * With text selected, the selection becomes the link; with the caret inside a link,
   * that link's address changes; with nothing selected at all, the address is inserted
   * as its own linked text. An emptied address on an existing link removes it.
   *
   * Resolves whether or not the address was accepted. One the URL policy refuses — a
   * `javascript:` or `data:` scheme — leaves the panel OPEN with its error showing and
   * the document untouched, which is the behaviour a spec most wants to pin; read it
   * with {@link getLinkError} and {@link isLinkPanelOpen}.
   */
  async setLink(url: string): Promise<void> {
    const panel = await this.openLinkPanel();
    const input = await panel.getHarness(WrInputHarness);
    await input.setValue(url);
    await (await panel.getHarness(WrButtonHarness.with({ selector: '.wr-editor-link__apply' }))).click();
  }

  /**
   * Remove the link the selection sits in or covers, through the panel's remove button.
   *
   * Throws when the selection is in no link: the panel draws the button only then, so
   * its absence IS the answer to "is there a link here".
   */
  async removeLink(): Promise<void> {
    const panel = await this.openLinkPanel();
    const remove = await panel.getHarnessOrNull(WrButtonHarness.with({ selector: '.wr-editor-link__remove' }));
    if (!remove) {
      throw new Error(
        'WrEditorHarness.removeLink(): the selection is not in a link, so the panel offers nothing to remove. ' +
          'Select the linked text first — selectAll() covers a document holding one link.'
      );
    }
    await remove.click();
  }

  /**
   * The message the open panel shows for a refused address, or `null` when it shows
   * none. It is a `role="alert"`, and the address field names it with
   * `aria-describedby` — so the text a screen reader hears is the text read here.
   *
   * Throws while the panel is closed: the message only exists inside it, and a `null`
   * would read as "the address was accepted".
   */
  async getLinkError(): Promise<string | null> {
    if (!(await this.isLinkPanelOpen())) {
      throw new Error(
        'WrEditorHarness.getLinkError(): the link panel is closed, so there is no message to read. An accepted ' +
          'address closes it — isLinkPanelOpen() tells the two outcomes apart.'
      );
    }
    const id = await (await this.locatorFor(LINK_TOOL)()).getAttribute('aria-controls');
    const error = await this.documentRootLocatorFactory().locatorForOptional(`[id="${id}"] .wr-editor-link__error`)();
    return error ? error.text() : null;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /** The surface, or a sentence saying the editor is still the server's static preview. */
  private async mountedSurface(method: string): Promise<TestElement> {
    const surface = await this.surface();
    if ((await surface.getAttribute('contenteditable')) === null) {
      throw new Error(
        `WrEditorHarness.${method}(): the editor is not mounted. ProseMirror takes the surface over in ` +
          'afterNextRender, which never runs under a server PLATFORM_ID — what shows there is the static ' +
          'preview, and this harness does not answer for it as if it were the editor.'
      );
    }
    return surface;
  }

  /** The surface, when a user could still reach it with the keyboard. */
  private async focusableSurface(method: string): Promise<TestElement> {
    const surface = await this.mountedSurface(method);
    if (await this.isDisabled()) {
      throw new Error(
        `WrEditorHarness.${method}(): the editor is disabled — its surface is out of the tab order, so no key or ` +
          'paste could arrive there. Assert isDisabled() instead.'
      );
    }
    return surface;
  }

  /** The surface, when a user could change its text. */
  private async writableSurface(method: string): Promise<TestElement> {
    const surface = await this.focusableSurface(method);
    if (await this.isReadonly()) {
      throw new Error(
        `WrEditorHarness.${method}(): the editor is read-only, so no user could change its text — the surface is ` +
          'not contenteditable. Write through the bound model instead, or assert isReadonly().'
      );
    }
    return surface;
  }

  private async dispatchPaste(method: string, data: Readonly<Record<string, string>>): Promise<void> {
    const surface = await this.focusableSurface(method);
    await surface.focus();
    await surface.dispatchEvent('paste', {
      clipboardData: {
        types: Object.keys(data),
        getData: (type: string) => data[type] ?? '',
      },
    });
  }

  private async toolbar(method: string): Promise<TestElement> {
    const toolbar = await this.locatorForOptional('[role="toolbar"]')();
    if (toolbar) return toolbar;
    throw new Error(`WrEditorHarness.${method}(): the editor draws no toolbar — toolbar is false, or lists no tool.`);
  }

  private async linkPopover(method: string): Promise<WrPopoverHarness> {
    const panel = await this.locatorForOptional(WrPopoverHarness.with({ selector: LINK_TOOL }))();
    if (panel) return panel;
    throw new Error(
      `WrEditorHarness.${method}(): the toolbar draws no link tool. Bind a toolbar that lists 'link' — Mod-K ` +
        'opens the panel only when the tool is there to host it.'
    );
  }
}
