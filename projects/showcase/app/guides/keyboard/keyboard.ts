import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrHotkeyBinding } from 'ngwr/hotkey';
import { WrKbd } from 'ngwr/keyboard';
import { WrTypography } from 'ngwr/typography';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocRichPipe,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

/** One line of a component's keyboard contract. */
interface KeyRow {
  /** Interchangeable chords for this row — one keycap each, read as "or". */
  readonly keys: readonly string[];
  /** What the component does with it. Backticks render as code. */
  readonly does: string;
  /** When the row applies — blank when it always does. */
  readonly when?: string;
}

/** One component's (or one mode's) contract, rendered as a single table. */
interface KeyTable {
  readonly title: string;
  /** The table's own `<caption>`: which element has focus while these keys apply. */
  readonly caption: string;
  readonly rows: readonly KeyRow[];
}

@Component({
  selector: 'ngwr-gs-keyboard-page',
  templateUrl: './keyboard.html',
  imports: [
    RouterLink,
    WrKbd,
    WrHotkeyBinding,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocRichPipe,
    DocSeeAlsoComponent,
  ],
})
export default class KeyboardGuidePage {
  protected readonly hits = signal(0);

  /**
   * The keyboard contract of every component people write end-to-end tests
   * against, one table per focused element.
   *
   * Deliberately NOT `<ngwr-doc-api>`: that table is the library's public API
   * surface and `check:api-docs` holds every row in it to a real member, so a
   * row named `ArrowDown` would be reported as an input that does not exist.
   * These are plain tables and say so in their caption.
   *
   * Each row was read off the component's own `keydown` handler rather than
   * observed in a browser, which is the difference between "this is what it
   * did on my machine" and "this is what it is".
   */
  protected readonly contracts: readonly KeyTable[] = [
    {
      title: 'Dialog and drawer',
      caption: 'Focus is anywhere inside the open overlay.',
      rows: [
        {
          keys: ['Escape'],
          does: 'Closes, and focus returns to whatever was focused when it opened.',
          when: 'Unless `closeOnEscape: false`. Focus does not have to be inside the overlay — the CDK routes the key to the topmost one.',
        },
        {
          keys: ['Tab', 'Shift + Tab'],
          does: 'Cycles inside the overlay. Focus cannot leave it while it is open.',
        },
        {
          keys: ['Enter', 'Space'],
          does: 'Activates the focused control, including the built-in ✕ and anything carrying `[wrDialogClose]` / `[wrDrawerClose]`.',
        },
      ],
    },
    {
      title: 'Select — closed, button trigger',
      caption: 'Focus is on the `role="combobox"` trigger; the panel is closed.',
      rows: [
        { keys: ['Enter', 'Space'], does: 'Opens the panel and seeds the cursor on the selected option.' },
        { keys: ['ArrowDown', 'ArrowUp'], does: 'Opens the panel — same seeding, no step.' },
        {
          keys: ['Backspace'],
          does: 'Removes the last chip.',
          when: '`mode="multi"` with a selection. A single-mode button trigger has NO keyboard clear and renders no ✕ — see the searchable field below, and give an optional filter an explicit "Any" option.',
        },
        { keys: ['Tab'], does: 'Leaves the control. Nothing opens and nothing is committed.' },
      ],
    },
    {
      title: 'Select — open panel',
      caption: 'The panel is open; focus stays on the trigger and `aria-activedescendant` names the cursor.',
      rows: [
        { keys: ['ArrowDown', 'ArrowUp'], does: 'Moves the cursor by one enabled option, wrapping at the ends.' },
        { keys: ['Home', 'End'], does: 'First / last enabled option. **Both work**, in every mode.' },
        {
          keys: ['Enter'],
          does: 'Selects the option under the cursor. A disabled or filtered-out option is refused.',
        },
        {
          keys: ['Space'],
          does: 'Selects, exactly like Enter.',
          when: 'Button trigger only. In a searchable select Space belongs to the text field, or a two-word query could not be typed.',
        },
        { keys: ['Escape'], does: 'Closes the panel. Nothing is committed.' },
        {
          keys: ['Tab'],
          does: 'Closes the panel AND lets focus leave. The option under the cursor is **not** committed — the cursor is seeded on open, so tabbing through would otherwise select a row nobody looked at.',
        },
      ],
    },
    {
      title: 'Select — searchable field',
      caption: 'Focus is in the search `<input>` — `mode="search"`, `mode="tag"`, or a searchable multi.',
      rows: [
        { keys: ['Printable keys'], does: 'Filter the options. The match is a **substring**, not a prefix.' },
        {
          keys: ['Backspace'],
          does: 'On an EMPTY field, clears the selection.',
          when: 'Single mode with `clearable`. This is the keyboard twin of the ✕, which is `tabindex="-1"` and unreachable by key.',
        },
        {
          keys: ['Backspace'],
          does: 'On an EMPTY query, removes the last chip.',
          when: 'Any chip mode — a searchable `multi`, or `tag`.',
        },
        {
          keys: ['Enter'],
          does: 'Commits the typed string as the value when nothing is highlighted.',
          when: '`freeText`. With a highlighted option, Enter selects that option instead.',
        },
        {
          keys: ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape', 'Tab'],
          does: 'Exactly as in the open panel above.',
        },
      ],
    },
    {
      title: 'Dropdown and context menu',
      caption: 'Focus is on the trigger, then on a menu item — a menu moves REAL focus, not a cursor.',
      rows: [
        {
          keys: ['Enter', 'Space', 'ArrowDown', 'ArrowUp'],
          does: 'Opens the menu and focuses its first enabled item.',
        },
        { keys: ['ArrowDown', 'ArrowUp'], does: 'Next / previous enabled item, wrapping at both ends.' },
        { keys: ['Home', 'End'], does: 'First / last item.' },
        {
          keys: ['ArrowRight'],
          does: 'Opens the focused row’s submenu and focuses its first item. Under `dir="rtl"` this is ArrowLeft — the panes cascade the other way, so the key that opens has to follow them.',
          when: '`<wr-context-menu>` with a submenu.',
        },
        {
          keys: ['ArrowLeft'],
          does: 'Closes the current submenu and returns focus to the row that owns it (ArrowRight under `dir="rtl"`).',
          when: '`<wr-context-menu>`, inside a submenu.',
        },
        { keys: ['Escape'], does: 'Closes one level and returns focus to the trigger, or to the owning row.' },
        { keys: ['Tab'], does: 'Closes and lets focus leave naturally.' },
      ],
    },
    {
      title: 'Tabs',
      caption: 'Focus is on a tab header. The strip is ONE tab stop; the arrows rove within it.',
      rows: [
        {
          keys: ['ArrowRight', 'ArrowLeft'],
          does: 'Next / previous tab in VISUAL order, wrapping at both ends — so the pair swaps meaning under `dir="rtl"`.',
        },
        {
          keys: ['Home', 'End'],
          does: 'First / last tab. These name a position, so they read the same in both directions.',
        },
        {
          keys: ['Enter', 'Space'],
          does: 'Activates the focused tab.',
          when: 'Router mode (`wrTabsRouting`) only — there the arrows move focus alone, because the route selects the tab. Otherwise activation already follows focus.',
        },
      ],
    },
    {
      title: 'Tree',
      caption: 'Focus is on the tree; a roving cursor names the current row.',
      rows: [
        { keys: ['ArrowDown', 'ArrowUp'], does: 'Next / previous visible row. No wrap at the ends.' },
        {
          keys: ['ArrowRight'],
          does: 'Expands a collapsed parent; on an already-open parent, steps into its first child.',
        },
        {
          keys: ['ArrowLeft'],
          does: 'Collapses an open parent; on a leaf or a closed node, jumps to the parent row.',
        },
        { keys: ['Home', 'End'], does: 'First / last visible row.' },
        {
          keys: ['Enter', 'Space'],
          does: 'Selects the row. Holding `Ctrl` (or `Cmd`) adds to the selection instead of replacing it.',
        },
        { keys: ['Escape'], does: 'Closes the panel.', when: '`openOn="overlay"` only — the default is inline.' },
      ],
    },
    {
      title: 'Pagination',
      caption:
        'Focus is on one page cell. Every cell is its own tab stop — there is no roving cursor, and the arrows do nothing.',
      rows: [
        {
          keys: ['Tab', 'Shift + Tab'],
          does: 'Moves between the previous button, each page cell, the next button and the page-size select.',
        },
        {
          keys: ['Enter', 'Space'],
          does: 'Goes to that page. The cells are `<wr-btn role="button" tabindex="0">`, named `Go to page N`.',
        },
        {
          keys: ['ArrowLeft', 'ArrowRight'],
          does: 'Nothing. `<wr-pagination>` is a `role="navigation"` landmark of independent destinations, not a composite widget.',
        },
      ],
    },
    {
      title: 'Table',
      caption: 'Focus is inside `<wr-table>`. There is no grid cursor — the interactive parts are ordinary tab stops.',
      rows: [
        {
          keys: ['Tab', 'Shift + Tab'],
          does: 'Walks the sort buttons, the column filters, the selection checkboxes, the expand toggles and the footer pager, in DOM order.',
        },
        { keys: ['Enter', 'Space'], does: 'Activates whichever of those has focus.' },
        {
          keys: ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'],
          does: 'Scroll the body — the virtual viewport is itself a tab stop (`tabindex="0"`), so rows the window has not rendered yet stay reachable from the keyboard.',
          when: '`virtualScroll` only.',
        },
      ],
    },
  ];

  protected readonly snippets = {
    declarative: `<!-- Global by default: fires wherever focus is. -->
<div [wrHotkey]="'mod+k'" (wrHotkeyMatch)="palette.open()">…</div>

<!-- Scoped: only while focus is inside the host. -->
<div [wrHotkey]="'escape'" [scoped]="true" (wrHotkeyMatch)="close()">…</div>`,

    imperative: `import { WrHotkey } from 'ngwr/hotkey';

private readonly hotkey = inject(WrHotkey);

constructor() {
  const handle = this.hotkey.bind('mod+k', () => this.palette.open());
  inject(DestroyRef).onDestroy(() => handle.unbind());
}`,

    hint: `<!-- Render the chord next to the action it triggers. -->
<button wr-btn>
  Search
  <wr-kbd>⌘</wr-kbd>
  <wr-kbd>K</wr-kbd>
</button>`,

    keys: `import { KEYS, hasModifier, isComposing, isPrintableKey } from 'ngwr/utils';

protected onKeydown(event: KeyboardEvent): void {
  // First, always: while an IME is converting, Enter, Escape and the arrows
  // belong to its candidate window, not to you.
  if (isComposing(event)) return;

  // Compare against the constant, not the magic string — it is searchable.
  if (event.key === KEYS.ESCAPE) return this.close();

  // Let the browser keep its own chords (copy, reload, devtools…).
  if (hasModifier(event)) return;

  // Type-to-search: react only to characters, not to Tab / arrows / F-keys.
  if (isPrintableKey(event)) this.query.update(q => q + event.key);
}`,
  };

  /**
   * `[wrHotkey]` has no page of its own — the service page documents the
   * registry, and the directive is only mentioned there. Document it here.
   */
  protected readonly bindingApi: readonly DocApiRow[] = [
    {
      name: 'wrHotkey',
      description: 'The chord to listen for. `mod` resolves to Cmd on macOS and Ctrl elsewhere.',
      type: 'WrHotkeySpec',
    },
    {
      name: 'scoped',
      description:
        'Listen only while focus is inside the host element. Off by default — the binding is global, the same as `WrHotkey.bind()`.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'allowInInput',
      description:
        'Keep firing while an `<input>` / `<textarea>` / contenteditable has focus. Off by default so typing never triggers shortcuts.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'preventDefault',
      description: 'Call `preventDefault()` on a match, so the browser does not also act on the chord.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: '(wrHotkeyMatch)',
      description: 'Emits the original `KeyboardEvent` when the chord matches.',
      type: 'KeyboardEvent',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Service',
      title: 'WrHotkey',
      url: ['/reference/services', 'hotkey'],
      description: 'The registry itself — bind and unbind chords imperatively.',
    },
    {
      kind: 'Component',
      title: 'WrKbd',
      url: ['/reference/components', 'keyboard'],
      description: 'The keycap chip used to render a chord next to its action.',
    },
    {
      kind: 'Util',
      title: 'KEYS',
      url: ['/reference/utils', 'keys'],
      description: 'Canonical `KeyboardEvent.key` constants — searchable instead of magic strings.',
    },
    {
      kind: 'Util',
      title: 'hasModifier',
      url: ['/reference/utils', 'has-modifier'],
      description: 'Is any modifier held? Use it to leave the browser’s own chords alone.',
    },
    {
      kind: 'Util',
      title: 'isPrintableKey',
      url: ['/reference/utils', 'is-printable-key'],
      description: 'Did the key produce a character? The type-ahead predicate.',
    },
    {
      kind: 'Util',
      title: 'isComposing',
      url: ['/reference/utils', 'is-composing'],
      description: 'Is an input method still converting? Return early before you read a key.',
    },
  ];
}
