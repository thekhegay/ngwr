/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { DOCUMENT, NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  PLATFORM_ID,
  type Signal,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  model,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { WrButton } from 'ngwr/button';
import { useConfigValue } from 'ngwr/config';
import { WR_FORM_FIELD, useFormFieldAria } from 'ngwr/form';
import { readI18nText, useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { WrInput } from 'ngwr/input';
import { safeMarkdownUrl } from 'ngwr/markdown';
import { WrPlatform } from 'ngwr/platform';
import { WrPopover } from 'ngwr/popover';
import { isComposing } from 'ngwr/utils';
import type { Node } from 'prosemirror-model';
import { EditorState, type Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';

import type { WrEditorFormat, WrEditorJson, WrEditorMarkJson, WrEditorTool, WrEditorValue } from './interfaces';
import { readValue, writeValue } from './internal/codec';
import {
  SHORTCUTS,
  TOGGLES,
  type WrEditorCommandTool,
  editorPlugins,
  linkRange,
  removeLink,
  setLink,
  toolActive,
  toolCommand,
} from './internal/commands';
import { TOOL_ICONS } from './internal/icons';
import { WrEditorLinkField } from './internal/link-field';
import { listItemView } from './internal/list-item-view';
import { editorSchema, isEmptyDoc } from './internal/schema';
import { WR_EDITOR_TOOLBAR } from './toolbar';

let nextId = 0;

function warn(message: string): void {
  // eslint-disable-next-line no-console -- dev-mode validation
  console.warn(`[NGWR] <wr-editor>: ${message}`);
}

/** A document's JSON with every mark the target schema does not know dropped. */
function withoutMarks(node: WrEditorJson, known: Readonly<Record<string, unknown>>): WrEditorJson {
  return {
    ...node,
    ...(node.marks ? { marks: node.marks.filter(mark => mark.type in known) } : {}),
    ...(node.content ? { content: node.content.map(child => withoutMarks(child, known)) } : {}),
  };
}

/** One toolbar button's state at the current selection. */
interface WrToolState {
  readonly tool: WrEditorCommandTool;
  readonly active: boolean;
  readonly available: boolean;
}

/**
 * Rich-text editor on ProseMirror, with a toolbar, a link panel, keyboard
 * shortcuts and markdown-style block shortcuts (`# `, `> `, `- `, `1. `,
 * ` ``` `).
 *
 * A signal-forms native control: it implements `FormValueControl<WrEditorValue>`,
 * so `[formField]` binds straight to its `value` model — no
 * `ControlValueAccessor` in between. `[(value)]` works standalone.
 *
 * The value is an HTML string, a markdown string or the document as JSON, chosen
 * by `format`. Whatever arrives is treated as untrusted and rebuilt from the
 * editor's schema, so only what the schema allows survives, and links and images
 * go through `safeMarkdownUrl` in all three. A value the editor cannot read is
 * refused — the document it already shows is kept, a warning names the reason in
 * dev mode, and nothing is written back. Until a value it CAN read arrives the
 * editor is read-only and carries `wr-editor--refused`: the model still holds the
 * refused value, and an edit would write the document on screen over it.
 *
 * **`readonly` never mounts ProseMirror.** The document is drawn as ordinary
 * Angular markup instead — the same rendering the server prerenders — so a page
 * showing thirty saved comments boots no editor at all, and the headings, lists
 * and tables of what it shows stay in the accessibility tree rather than being
 * swallowed by a textbox, every descendant of which is presentational. It is
 * lazy, not permanent: the first time `readonly` is lifted the editor mounts,
 * and from there behaves exactly as one that never was read-only. Setting it
 * again keeps the mounted view — throwing a live session's undo history away to
 * save one view would cost more than the view.
 *
 * Headings stop at three levels: an h4–h6 read from HTML or markdown becomes an
 * h3 rather than a paragraph. Underline exists in `html` and `json` only —
 * markdown cannot spell it, so in that format the tool, the shortcut and the mark
 * itself are absent.
 *
 * ProseMirror is an OPTIONAL peer dependency: only an app that imports
 * `ngwr/editor` installs `prosemirror-model`, `-state`, `-view`, `-commands`,
 * `-keymap`, `-history`, `-schema-list` and `-inputrules`.
 *
 * @example
 * ```html
 * <!-- signal forms -->
 * <wr-editor format="markdown" placeholder="Describe the change" [formField]="form.body" />
 *
 * <!-- standalone two-way binding -->
 * <wr-editor [(value)]="html" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/editor
 */
@Component({
  selector: 'wr-editor',
  templateUrl: './editor.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '(focusout)': 'onFocusOut($event)',
  },
  // The editor is the control a `<wr-form-field>` wraps; the `[wrInput]` in its
  // link panel is a part. See `WrEditorLinkField` — the provider is both the
  // shield and that input's own field, which is why `fieldAria` below reads the
  // real field with `skipSelf`.
  providers: [
    { provide: WrEditorLinkField, useFactory: () => new WrEditorLinkField() },
    { provide: WR_FORM_FIELD, useExisting: WrEditorLinkField },
  ],
  imports: [NgTemplateOutlet, WrButton, WrInput, WrPopover],
})
export class WrEditor implements FormValueControl<WrEditorValue> {
  /**
   * The document. A string in `html` and `markdown` format, a
   * {@link WrEditorJson} tree in `json`; `''` / `null` when nothing is written.
   * Bound by `[formField]`, or two-way via `[(value)]`.
   */
  readonly value = model<WrEditorValue>(null);

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  /**
   * Disable the editor and its toolbar. Bound automatically from the field's
   * disabled state when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Refuse edits while the text stays reachable, selectable and announced.
   * Bound automatically from the field's readonly state when used with
   * `[formField]`.
   *
   * Set before the editor mounts, it means ProseMirror is never started: the
   * document is drawn as ordinary markup in a focusable `role="group"` that
   * keeps the tab stop and carries the editor's name, so a viewer costs no
   * editor and the structure of what it shows is still announced. `aria-readonly`
   * is deliberately absent there — ARIA does not allow it on `group`, and
   * `aria-disabled`, the only attribute that would apply, means something else —
   * so the cue is the `wr-editor--readonly` class. The toolbar goes inert, since
   * none of its tools can apply; a pure viewer binds `[toolbar]="false"`.
   *
   * A view that is already mounted stays mounted, refuses typing, paste, drop,
   * the shortcuts and every toolbar command, and reports `aria-readonly` on its
   * surface as before.
   *
   * @default false
   */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  /**
   * Hint shown while the document is empty, and exposed as `aria-placeholder`.
   *
   * @default ''
   */
  readonly placeholder = input<string>('');

  /**
   * Accessible name of the text — of the surface, or of the document a
   * read-only editor draws in its place. Falls back to the surrounding
   * `<wr-form-field>`'s label, then to `editor.label`.
   */
  readonly ariaLabel = input<string | null>(null);

  /**
   * What `value` holds — see {@link WrEditorFormat}. Unset, it falls back to
   * `provideWrConfig({ editor: { format } })`. Changing it re-reads `value` in
   * the new format.
   *
   * @default 'html'
   */
  readonly format = input<WrEditorFormat | null>(null);

  // `null` as the input's own default, not `'html'`, so "the template said
  // nothing" stays distinguishable from "the template said html" and an app-wide
  // default can apply.
  protected readonly resolvedFormat = useConfigValue(this.format, c => c.editor?.format, 'html');

  /**
   * The toolbar's tools, in order, with `'|'` between groups; `false` hides it.
   * `underline` is left out in `markdown` format, which cannot store it.
   *
   * @default WR_EDITOR_TOOLBAR
   */
  readonly toolbar = input<readonly WrEditorTool[] | false>(WR_EDITOR_TOOLBAR);

  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Ambient reading direction, read by the toolbar's arrow keys. Optional so a
   * bare `TestBed` needs no provider; `null` means LTR.
   */
  private readonly dir = inject(Directionality, { optional: true });

  /** @internal */
  protected readonly linkField = inject(WrEditorLinkField, { self: true });

  /** The surrounding `<wr-form-field>`'s error state, read past the editor's own shield. @internal */
  protected readonly fieldAria = useFormFieldAria({ skipSelf: true });

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'editor.label', 'Rich text');

  /**
   * The field's label names the surface, when there is one — a
   * `contenteditable` is not labelable, so the field's `<label for>` cannot
   * reach it. An explicit `ariaLabel` still wins over both.
   */
  protected readonly labelledBy = computed(() => (this.ariaLabel() ? null : this.fieldAria.labelledBy()));

  /** `null` while the field's label carries the name. */
  protected readonly accessibleName = computed(() => (this.labelledBy() ? null : this.resolvedAriaLabel()));

  protected readonly surfaceId = `wr-editor-${nextId++}`;

  /** ProseMirror owns the surface from here on; until then the preview stands in. */
  protected readonly mounted = signal(false);

  /**
   * Read-only and nothing mounted: the preview is not standing in for a surface,
   * it IS the editor, and the surface is not rendered at all. One id, one name
   * and one tab stop move onto it with the job. @internal
   */
  protected readonly staticMode = computed(() => !this.mounted() && this.readonly());

  protected readonly focused = signal(false);

  private readonly editorState = signal<EditorState | null>(null);

  /**
   * Whether `value` holds something the editor could not read, so the document
   * on screen is not the one the model holds — empty at mount, or the previous
   * record after a write. Edits are refused until a readable value arrives:
   * the first keystroke would otherwise replace the stored value with whatever
   * is on screen, and the only sign of it was a dev-mode warning.
   */
  private readonly refused = signal(false);

  /** Read-only by the input, or because the value was refused. @internal */
  protected readonly locked = computed(() => this.readonly() || this.refused());

  /** Apple keyboards name the modifier ⌘. Read in the browser only — see `mount()`. */
  private readonly apple = signal(false);

  // Optional, both of them: exactly one is in the DOM at a time, and which one
  // is the difference between a mounted editor and the static document.
  private readonly surface = viewChild<ElementRef<HTMLElement>>('surface');
  private readonly staticDoc = viewChild<ElementRef<HTMLElement>>('staticDoc');
  // `read`, because `#tool` sits on a `wr-btn` and would otherwise resolve to the component.
  private readonly toolButtons = viewChildren<unknown, ElementRef<HTMLButtonElement>>('tool', { read: ElementRef });
  private readonly linkPopover = viewChild<WrPopover>('linkPopover');

  private view: EditorView | null = null;
  /** The format the live document was read in, which is the format it is written in. */
  private viewFormat: WrEditorFormat = 'html';
  /**
   * The value the live document was last read from or written as. A write from
   * outside that equals it is the document already on screen — an echo of the
   * editor's own emit, or a consumer writing back what it was handed — and must
   * neither re-parse nor reset the selection.
   */
  private lastSerialized: WrEditorValue | undefined = undefined;
  private linkToSurface = false;
  /**
   * Whether the static path has already named the refusal the model is holding.
   * A read-only editor reports one itself, and a mount that follows would
   * otherwise warn a second time about the same value.
   */
  private refusalWarned = false;

  // Labels

  protected readonly toolbarLabel = readI18nText('editor.toolbar', 'Formatting');
  protected readonly linkUrlLabel = readI18nText('editor.linkUrl', 'Link address');
  protected readonly linkApplyLabel = readI18nText('editor.linkApply', 'Apply');
  protected readonly linkRemoveLabel = readI18nText('editor.linkRemove', 'Remove link');
  protected readonly linkInvalidLabel = readI18nText('editor.linkInvalid', 'This address cannot be used as a link.');
  protected readonly taskDoneLabel = readI18nText('editor.taskDone', 'Done:');
  protected readonly taskTodoLabel = readI18nText('editor.taskTodo', 'To do:');
  private readonly keyCtrl = readI18nText('editor.keyCtrl', 'Ctrl');
  private readonly keyShift = readI18nText('editor.keyShift', 'Shift');
  private readonly keyAlt = readI18nText('editor.keyAlt', 'Alt');
  private readonly headingLabel = useI18nFormatter('editor.heading', 'Heading {{level}}');
  private readonly shortcutLabel = useI18nFormatter('editor.shortcut', '{{label}} ({{keys}})');

  private readonly toolLabels: Readonly<Record<WrEditorCommandTool, Signal<string>>> = {
    bold: readI18nText('editor.bold', 'Bold'),
    italic: readI18nText('editor.italic', 'Italic'),
    underline: readI18nText('editor.underline', 'Underline'),
    strike: readI18nText('editor.strike', 'Strikethrough'),
    code: readI18nText('editor.code', 'Inline code'),
    paragraph: readI18nText('editor.paragraph', 'Paragraph'),
    heading1: computed(() => this.headingLabel({ level: 1 })),
    heading2: computed(() => this.headingLabel({ level: 2 })),
    heading3: computed(() => this.headingLabel({ level: 3 })),
    bulletList: readI18nText('editor.bulletList', 'Bulleted list'),
    orderedList: readI18nText('editor.orderedList', 'Numbered list'),
    blockquote: readI18nText('editor.blockquote', 'Quote'),
    codeBlock: readI18nText('editor.codeBlock', 'Code block'),
    link: readI18nText('editor.link', 'Insert link'),
    horizontalRule: readI18nText('editor.horizontalRule', 'Horizontal line'),
    undo: readI18nText('editor.undo', 'Undo'),
    redo: readI18nText('editor.redo', 'Redo'),
  };

  // Toolbar

  /**
   * The bound tools as drawn: underline dropped where the format cannot store
   * it, and separators only BETWEEN two groups — a leading, trailing or doubled
   * one would be left behind by that filter or by a hand-built list.
   */
  protected readonly tools = computed<readonly WrEditorTool[]>(() => {
    const bound = this.toolbar();
    if (!bound) return [];
    const markdown = this.resolvedFormat() === 'markdown';
    const out: WrEditorTool[] = [];
    for (const tool of bound) {
      if (markdown && tool === 'underline') continue;
      if (tool === '|' && (out.length === 0 || out[out.length - 1] === '|')) continue;
      if (tool !== '|' && out.includes(tool)) continue;
      out.push(tool);
    }
    if (out[out.length - 1] === '|') out.pop();
    return out;
  });

  /** The tools that are buttons, in order — what the roving tab stop moves over. */
  private readonly buttons = computed(() => this.tools().filter((tool): tool is WrEditorCommandTool => tool !== '|'));

  /** Each drawn entry's index among the buttons, `-1` for a separator. @internal */
  protected readonly buttonIndex = computed(() => {
    let index = 0;
    return this.tools().map(tool => (tool === '|' ? -1 : index++));
  });

  private readonly commands = computed(() => {
    const schema = editorSchema(this.resolvedFormat());
    return new Map(this.buttons().map(tool => [tool, toolCommand(tool, schema)]));
  });

  /** Every button's pressed and available state at the current selection. @internal */
  protected readonly toolStates = computed<ReadonlyMap<WrEditorCommandTool, WrToolState>>(() => {
    const state = this.editorState();
    const editable = this.canEdit();
    const commands = this.commands();
    return new Map(
      this.buttons().map(tool => {
        const command = commands.get(tool);
        return [
          tool,
          {
            tool,
            active: !!state && toolActive(tool, state),
            available: !!state && editable && !!command && command(state),
          },
        ];
      })
    );
  });

  private readonly rovingIndex = signal(0);

  /**
   * The one button in the tab order. It follows the user, and moves off a tool
   * that stopped applying so the toolbar never loses its tab stop — unless NO
   * tool applies (read-only, disabled), where it stays put, because there is
   * nothing to reach.
   */
  private readonly tabStop = computed(() => {
    const buttons = this.buttons();
    const states = this.toolStates();
    const current = Math.min(this.rovingIndex(), Math.max(buttons.length - 1, 0));
    if (states.get(buttons[current])?.available) return current;
    const first = buttons.findIndex(tool => states.get(tool)?.available);
    return first >= 0 ? first : current;
  });

  /** Whether the live document is empty — pre-mount, whether the value is. */
  private readonly empty = computed(() => {
    const state = this.editorState();
    if (state) return isEmptyDoc(state.doc);
    const value = this.value();
    return value === null || value === undefined || value === '';
  });

  /** The task-item words, handed to ProseMirror through its node views. */
  private readonly nodeViews = computed(() => ({
    list_item: listItemView({ done: this.taskDoneLabel(), todo: this.taskTodoLabel() }),
  }));

  /**
   * Nothing in the static mode: a hint for input, where no input is taken, and
   * `aria-placeholder` is not among the attributes `role="group"` allows — so
   * one drawn there would be text no screen reader ever reaches.
   */
  protected readonly ariaPlaceholder = computed(() =>
    this.placeholder() && this.empty() && !this.staticMode() ? this.placeholder() : null
  );

  // Link panel

  protected readonly linkDraft = signal('');

  /** Whether the selection is in a link — what the panel's remove button needs. */
  protected readonly linkActive = computed(() => this.toolStates().get('link')?.active ?? false);

  /**
   * The value rendered by Angular rather than by ProseMirror: on the server, for
   * the first browser frame, and — for as long as it lasts — in the static mode,
   * where no mount is coming. Read from the doc JSON, so it shows exactly what
   * the schema kept: the same sanitised document the editor would mount.
   */
  protected readonly preview = computed<WrEditorJson | null>(() => {
    if (this.mounted()) return null;
    const format = this.resolvedFormat();
    try {
      return readValue(this.value(), format, editorSchema(format), this.document).toJSON() as WrEditorJson;
    } catch (error) {
      // The browser warns from `sync()` — at the mount, or at the write itself
      // while read-only; the server has neither to wait for.
      if (!this.isBrowser && isDevMode()) this.warnRefused(format, error);
      return null;
    }
  });

  protected readonly classes = computed(() => {
    const parts = ['wr-editor'];
    if (this.focused()) parts.push('wr-editor--focused');
    if (this.disabled()) parts.push('wr-editor--disabled');
    else if (this.locked()) parts.push('wr-editor--readonly');
    if (this.refused()) parts.push('wr-editor--refused');
    return parts.join(' ');
  });

  constructor() {
    // Outside writes: a form reset, a server load, a patch. Skipped when the
    // value is the document already on screen — see `lastSerialized`.
    effect(() => {
      const value = this.value();
      const format = this.resolvedFormat();
      untracked(() => this.sync(value, format));
    });

    // `editable` and the placeholder are functions ProseMirror asks on every
    // update, so poking it is enough to make it ask again.
    effect(() => {
      this.readonly();
      this.disabled();
      this.refused();
      this.placeholder();
      untracked(() => this.view?.setProps({}));
    });

    // The task-item words live in node views, which ProseMirror only redraws
    // when the `nodeViews` prop itself changes.
    effect(() => {
      const nodeViews = this.nodeViews();
      untracked(() => this.view?.setProps({ nodeViews }));
    });

    // The roving tab stop is written to the DOM rather than bound: `wr-btn`
    // binds `[attr.tabindex]` on its host (`null` for a native button), and a
    // host binding runs after the template's and removes the attribute on the
    // first pass. Nothing rewrites it after that, so a write after render sticks.
    afterRenderEffect({
      write: () => {
        const stop = this.tabStop();
        this.toolButtons().forEach((ref, index) => (ref.nativeElement.tabIndex = index === stop ? 0 : -1));
      },
    });

    // `afterNextRender` alone is not the guard: it keys on the global server
    // flag, not on `PLATFORM_ID`, so a platform test would still run it.
    if (!this.isBrowser) return;

    // Mount on the first render that is not read-only — usually the very first
    // one, and otherwise the one that lifts `readonly`. A WRITE phase, so the
    // surface the template puts back is already in the DOM by the time
    // `mount()` looks for it; `mount()` itself happens once and never undoes.
    afterRenderEffect({
      write: () => {
        if (!this.readonly()) this.mount();
      },
    });
  }

  /**
   * Focus the editor — what Signal Forms calls to focus this control. Whatever
   * is on screen takes it: the mounted surface, or the static document, which
   * keeps a tab stop for exactly this reason.
   */
  focus(options?: FocusOptions): void {
    const view = this.view;
    // ProseMirror's own `focus()` is a no-op while the view is not editable,
    // and read-only has to stay focusable.
    if (view?.editable) view.focus();
    else (this.surface() ?? this.staticDoc())?.nativeElement.focus(options);
  }

  // Template handlers

  protected label(tool: WrEditorCommandTool): string {
    return this.toolLabels[tool]();
  }

  protected icon(tool: WrEditorCommandTool): readonly string[] {
    return TOOL_ICONS[tool];
  }

  protected isToggle(tool: WrEditorCommandTool): boolean {
    return TOGGLES.has(tool);
  }

  /** The tooltip: the label, with the shortcut when the tool has one. */
  protected tooltip(tool: WrEditorCommandTool): string {
    const shortcut = SHORTCUTS[tool];
    if (!shortcut) return this.label(tool);
    const keys = this.apple()
      ? `${shortcut.alt ? '⌥' : ''}${shortcut.shift ? '⇧' : ''}⌘${shortcut.key}`
      : [
          this.keyCtrl(),
          ...(shortcut.alt ? [this.keyAlt()] : []),
          ...(shortcut.shift ? [this.keyShift()] : []),
          shortcut.key,
        ].join('+');
    return this.shortcutLabel({ label: this.label(tool), keys });
  }

  /** `aria-keyshortcuts` — key names from the ARIA spec, never localised. */
  protected keyShortcuts(tool: WrEditorCommandTool): string | null {
    const shortcut = SHORTCUTS[tool];
    if (!shortcut) return null;
    const mod = this.apple() ? 'Meta' : 'Control';
    const combo = `${mod}+${shortcut.alt ? 'Alt+' : ''}${shortcut.shift ? 'Shift+' : ''}${shortcut.key}`;
    return tool === 'redo' && !this.apple() ? `${combo} Control+Y` : combo;
  }

  protected state(tool: WrEditorCommandTool): WrToolState | undefined {
    return this.toolStates().get(tool);
  }

  /**
   * A toolbar button was activated.
   *
   * By pointer, focus never left the text (`mousedown` is cancelled), so the
   * caret is put back where the command left it. By keyboard, focus stays on the
   * button, as the toolbar pattern asks — unless the tool no longer applies,
   * which disables it: a disabled button drops its focus on `<body>`, so the text
   * takes it first.
   */
  protected onToolClick(tool: WrEditorCommandTool, event: MouseEvent): void {
    const view = this.view;
    const command = this.commands().get(tool);
    if (!view || !command || !this.canEdit()) return;
    command(view.state, view.dispatch, view);
    if (event.detail !== 0 || !this.state(tool)?.available) view.focus();
  }

  protected onToolFocus(index: number): void {
    this.rovingIndex.set(index);
  }

  /** The APG toolbar keys: the arrows rove and wrap, Home and End jump. */
  protected onToolbarKeydown(event: KeyboardEvent): void {
    if (isComposing(event) || event.altKey || event.ctrlKey || event.metaKey) return;
    const buttons = this.toolButtons().map(ref => ref.nativeElement);
    const current = buttons.indexOf(event.target as HTMLButtonElement);
    if (current < 0) return;
    const reachable = buttons.map((button, index) => (button.disabled ? -1 : index)).filter(index => index >= 0);
    if (!reachable.length) return;

    const rtl = this.dir?.value === 'rtl';
    const at = reachable.indexOf(current);
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = reachable[(at + (rtl ? -1 : 1) + reachable.length) % reachable.length];
        break;
      case 'ArrowLeft':
        next = reachable[(at + (rtl ? 1 : -1) + reachable.length) % reachable.length];
        break;
      case 'Home':
        next = reachable[0];
        break;
      case 'End':
        next = reachable[reachable.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    this.rovingIndex.set(next);
    buttons[next].focus();
  }

  /** `touch` once focus leaves the whole control — not when it moves between its own parts. */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as globalThis.Node | null;
    if (next && this.withinControl(next)) return;
    const fromPanel = this.inLinkPanel(event.target as globalThis.Node);

    // Chromium fires a `focusout` with no `relatedTarget` when the focused
    // element is REMOVED — the link panel closing with focus inside it, or its
    // remove button leaving — and the popover hands focus back only after that.
    // It does the same when Tab runs off the end of the document, which is where
    // the overlay container sits. So where focus went is decided once it has
    // settled, or Escape on the panel marked the field touched with focus never
    // leaving the control.
    if (!next && fromPanel) {
      afterNextRender(
        () => {
          const active = this.document.activeElement;
          if (active && this.withinControl(active)) return;
          this.leaveLinkPanel();
          this.touch.emit();
        },
        { injector: this.injector }
      );
      return;
    }

    if (next && fromPanel) this.leaveLinkPanel();
    this.touch.emit();
  }

  protected onLinkOpened(): void {
    const state = this.view?.state;
    const range = state ? linkRange(state) : null;
    this.linkDraft.set(range ? String(range.mark.attrs['href'] ?? '') : '');
    this.linkField.invalid.set(false);
    afterNextRender(() => this.focusLinkInput(), { injector: this.injector });
  }

  protected onLinkClosed(): void {
    // Back to the text when the panel was opened from it (Mod-K) or when a link
    // was just applied; otherwise the popover has already handed focus back to
    // the toolbar button, which is where Escape should leave it.
    //
    // Only while focus is where the popover left it — on the link button — or
    // nowhere. A click elsewhere on the page closes the panel too, and by then
    // it has put focus where the user wanted it; taking it back sent their next
    // keystrokes into this editor.
    const toSurface = this.linkToSurface;
    this.linkToSurface = false;
    this.linkField.invalid.set(false);
    if (!toSurface) return;
    const active = this.document.activeElement;
    const linkButton = this.toolButtons()[this.buttons().indexOf('link')]?.nativeElement;
    if (!active || active === this.document.body || active === linkButton) this.view?.focus();
  }

  protected onLinkInput(event: Event): void {
    this.linkDraft.set((event.target as HTMLInputElement).value);
    this.linkField.invalid.set(false);
  }

  protected applyLink(event: Event): void {
    event.preventDefault();
    const view = this.view;
    if (!view || !this.canEdit()) return;
    const draft = this.linkDraft().trim();
    // An emptied field on an existing link means "no link".
    if (!draft && this.linkActive()) {
      this.removeLink();
      return;
    }
    const href = draft ? safeMarkdownUrl(draft, 'link') : null;
    if (!href) {
      this.linkField.invalid.set(true);
      this.focusLinkInput();
      return;
    }
    if (!setLink(href)(view.state, view.dispatch)) return;
    this.linkToSurface = true;
    this.linkPopover()?.close();
  }

  protected removeLink(): void {
    const view = this.view;
    if (!view || !this.canEdit()) return;
    removeLink(view.state, view.dispatch);
    this.linkToSurface = true;
    this.linkPopover()?.close();
  }

  // Preview helpers — the template's typed view of untyped JSON.

  protected nodesOf(raw: unknown): readonly WrEditorJson[] {
    return Array.isArray(raw) ? (raw as readonly WrEditorJson[]) : [];
  }

  protected nodeOf(raw: unknown): WrEditorJson {
    return raw as WrEditorJson;
  }

  protected markAt(node: WrEditorJson, depth: number): WrEditorMarkJson | null {
    return node.marks?.[depth] ?? null;
  }

  protected attr(node: WrEditorJson | WrEditorMarkJson, name: string): unknown {
    return node.attrs?.[name] ?? null;
  }

  protected text(node: WrEditorJson | WrEditorMarkJson, name: string): string | null {
    const value = node.attrs?.[name];
    return typeof value === 'string' ? value : null;
  }

  protected textOf(node: WrEditorJson): string {
    return (node.content ?? []).map(child => child.text ?? '').join('');
  }

  // Internals

  /** Whether an edit may happen at all — not while read-only, disabled or refused. */
  private canEdit(): boolean {
    return !this.readonly() && !this.disabled() && !this.refused();
  }

  private mount(): void {
    // Once and for all: a second call would drop a live document, and going
    // back to read-only is not a reason to throw a session's history away.
    if (this.view) return;
    // The template draws the surface in every state but the static one, which
    // this is never called out of — after the render that puts it back.
    const surface = this.surface();
    if (!surface) return;
    this.apple.set((this.platform.userAgent ?? '').toLowerCase().includes('mac'));
    const format = untracked(this.resolvedFormat);
    const value = untracked(this.value);
    const schema = editorSchema(format);
    let doc: Node;
    try {
      doc = readValue(value, format, schema, this.document);
    } catch (error) {
      // Never twice for a refusal the static path has already named.
      if (isDevMode() && !this.refusalWarned) this.warnRefused(format, error);
      doc = schema.topNodeType.createAndFill()!;
      // An empty document over a stored value: see `refused`.
      this.refused.set(true);
    }

    const state = this.createState(doc);
    this.view = new EditorView(
      { mount: surface.nativeElement },
      {
        state,
        editable: () => untracked(() => this.canEdit()),
        dispatchTransaction: tr => this.dispatch(tr),
        decorations: current => this.placeholderDecorations(current),
        nodeViews: untracked(this.nodeViews),
        handleKeyDown: (_view, event) => this.onSurfaceKeydown(event),
      }
    );
    this.viewFormat = format;
    this.lastSerialized = value;
    this.editorState.set(state);
    this.mounted.set(true);
    this.destroyRef.onDestroy(() => {
      this.view?.destroy();
      this.view = null;
    });
  }

  private createState(doc: Node): EditorState {
    const current = this.view?.state;
    const plugins =
      current?.schema === doc.type.schema
        ? current.plugins
        : editorPlugins(doc.type.schema, {
            apple: untracked(this.apple),
            canEdit: () => untracked(() => this.canEdit()),
          });
    return EditorState.create({ doc, plugins });
  }

  private dispatch(tr: Transaction): void {
    const view = this.view;
    if (!view) return;
    const previous = view.state;
    const next = previous.apply(tr);
    view.updateState(next);
    this.editorState.set(next);
    // A refused transaction leaves the document as it was even though it asked
    // to change it; that is not an edit, and must not reach the model.
    if (next.doc !== previous.doc) this.emit(next.doc);
  }

  private emit(doc: Node): void {
    const out = writeValue(doc, this.viewFormat, this.document);
    if (out === this.lastSerialized) return;
    this.lastSerialized = out;
    this.value.set(out);
  }

  /**
   * Bring an outside write into the view.
   *
   * Compared as DOCUMENTS, never as strings: `<b>` comes back as `<strong>`, so a
   * normalised string differs from what the consumer wrote while the documents
   * are equal — and an equal document is left alone, selection and history
   * included. A different one replaces the state wholesale, history with it,
   * which is right for a form reset or a server load: undo back into content the
   * app replaced would be wrong. The normalised form is never written back —
   * that would mark the field dirty on load. A write that arrives mid-composition
   * (IME) replaces the composition too: the model is the source of truth.
   */
  private sync(value: WrEditorValue, format: WrEditorFormat): void {
    const view = this.view;
    if (!view) {
      // Nothing to bring it into. `preview()` redraws it either way; what it
      // cannot do is REPORT a value it could not read, and in the static mode
      // no mount is coming to do that — so the check happens here instead.
      // Before a mount that IS coming it is `mount()` that reports, and on the
      // server `preview()` does, each exactly once.
      if (this.isBrowser && untracked(this.readonly)) this.readStatically(value, format);
      return;
    }
    if (format === this.viewFormat && value === this.lastSerialized) return;

    const schema = editorSchema(format);
    let doc: Node;
    try {
      doc = readValue(value, format, schema, this.document);
    } catch (error) {
      if (isDevMode()) this.warnRefused(format, error);
      // Only the format moved, and the screen still shows this very value read
      // in the old one: carried across, an edit converts it and loses nothing.
      // Any other refusal leaves the model holding what the screen does not show.
      const carried = format !== this.viewFormat && value === this.lastSerialized && !this.refused();
      if (format !== this.viewFormat) this.switchFormat(format, schema);
      this.refused.set(!carried);
      return;
    }

    this.refused.set(false);
    this.lastSerialized = value;
    if (format === this.viewFormat && doc.eq(view.state.doc)) return;
    this.viewFormat = format;
    this.replaceState(doc);
  }

  /**
   * The check `mount()` makes, made without a mount: the same warning and the
   * same `refused` flag, so an unreadable value is refused whether or not
   * ProseMirror ever starts. Without it a read-only editor met one with silence
   * — `preview()` renders nothing for a document it cannot read, and the model
   * goes on holding a value nothing has said a word about.
   *
   * The parsed document is dropped; `preview()` reads its own. The cost is one
   * extra parse per write, and only while read-only, where a write is rare.
   */
  private readStatically(value: WrEditorValue, format: WrEditorFormat): void {
    try {
      readValue(value, format, editorSchema(format), this.document);
      this.refused.set(false);
      this.refusalWarned = false;
    } catch (error) {
      if (isDevMode()) {
        this.warnRefused(format, error);
        this.refusalWarned = true;
      }
      this.refused.set(true);
    }
  }

  /**
   * A new format whose value could not be read: keep the document, moved into
   * the new format's schema — markdown's lacks underline, so that mark is
   * dropped on the way. What is written from here on is in the new format.
   */
  private switchFormat(format: WrEditorFormat, schema: EditorState['schema']): void {
    const view = this.view!;
    this.viewFormat = format;
    if (view.state.schema === schema) return;
    let doc: Node;
    try {
      doc = schema.nodeFromJSON(withoutMarks(view.state.doc.toJSON() as WrEditorJson, schema.marks));
      doc.check();
    } catch {
      doc = schema.topNodeType.createAndFill()!;
    }
    this.replaceState(doc);
  }

  private replaceState(doc: Node): void {
    const state = this.createState(doc);
    this.view!.updateState(state);
    this.editorState.set(state);
  }

  private placeholderDecorations(state: EditorState): DecorationSet | null {
    const text = untracked(this.placeholder);
    if (!text || !isEmptyDoc(state.doc)) return null;
    const first = state.doc.firstChild!;
    return DecorationSet.create(state.doc, [
      Decoration.node(0, first.nodeSize, { class: 'wr-editor__placeholder', 'data-placeholder': text }),
    ]);
  }

  /**
   * Mod-K opens the link panel. Its propagation stops here: `<wr-command-palette>`
   * binds the same chord on the document, and `WrHotkey` deliberately does not
   * skip an event another listener already handled.
   */
  private onSurfaceKeydown(event: KeyboardEvent): boolean {
    if (isComposing(event) || event.altKey || event.shiftKey) return false;
    const mod = untracked(this.apple) ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
    if (!mod || (event.key.toLowerCase() !== 'k' && event.code !== 'KeyK')) return false;
    const popover = this.linkPopover();
    if (!popover || !untracked(this.toolStates).get('link')?.available) return false;
    event.stopPropagation();
    this.linkToSurface = true;
    popover.open();
    return true;
  }

  private focusLinkInput(): void {
    const input = this.document.getElementById(this.linkField.controlId()) as HTMLInputElement | null;
    input?.focus();
    input?.select();
  }

  /**
   * Focus left the link panel for somewhere outside the control — Tab, Shift+Tab,
   * a click elsewhere. The panel is not a focus trap, and left open it stays
   * anchored to a control the user has left, whose next close would then pull
   * focus back into the text. Closed with focus left where it went.
   */
  private leaveLinkPanel(): void {
    this.linkToSurface = false;
    this.linkPopover()?.close();
  }

  /** Whether a node is part of this control: the host, or its link panel. */
  private withinControl(node: globalThis.Node): boolean {
    return this.host.nativeElement.contains(node) || this.inLinkPanel(node);
  }

  private inLinkPanel(node: globalThis.Node): boolean {
    const panel = this.document.getElementById(this.linkField.panelId);
    if (!panel) return false;
    // The popover focuses its own pane before the input takes over.
    return panel.contains(node) || node === panel.closest('.cdk-overlay-pane');
  }

  private warnRefused(format: WrEditorFormat, error: unknown): void {
    const reason = error instanceof Error ? error.message : String(error);
    warn(
      `the bound value could not be read as ${format} and was ignored — the editor keeps the document it had and ` +
        `refuses edits until it is given a value it can read, so the stored one is not overwritten. ${reason}`
    );
  }
}
