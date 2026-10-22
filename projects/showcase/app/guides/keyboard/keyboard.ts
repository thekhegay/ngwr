import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrHotkeyBinding } from 'ngwr/hotkey';
import { WrKbd } from 'ngwr/keyboard';

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
  /** Keys that do the same thing, one keycap each. */
  readonly keys: readonly string[];
  /** What they do. Backticks render as code. */
  readonly does: string;
}

/** One component's keyboard contract, rendered as one table row. */
interface KeyContract {
  readonly component: string;
  readonly url: string;
  readonly rows: readonly KeyRow[];
}

/** One `ngwr/utils` keyboard helper. */
interface KeyHelper {
  readonly name: string;
  readonly url: string;
  readonly use: string;
}

@Component({
  selector: 'ngwr-gs-keyboard-page',
  templateUrl: './keyboard.html',
  styleUrl: './keyboard.scss',
  imports: [
    RouterLink,
    WrKbd,
    WrHotkeyBinding,
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

  /** Read off each component's own `keydown` handler. */
  protected readonly contracts: readonly KeyContract[] = [
    {
      component: 'Dialog, drawer',
      url: '/reference/components/dialog',
      rows: [
        { keys: ['Esc'], does: 'closes and returns focus, unless `closeOnEscape: false`' },
        { keys: ['Tab'], does: 'cycles inside; focus cannot leave' },
      ],
    },
    {
      component: 'Select',
      url: '/reference/components/select',
      rows: [
        { keys: ['Enter', 'Space', '↓', '↑'], does: 'open the panel' },
        { keys: ['↑', '↓', 'Home', 'End'], does: 'move through the options' },
        { keys: ['Enter'], does: 'selects (`Space` too, when there is no search field)' },
        { keys: ['Esc', 'Tab'], does: 'close without selecting' },
        { keys: ['Backspace'], does: 'removes the last chip, or clears an empty `clearable` search' },
      ],
    },
    {
      component: 'Dropdown, context menu',
      url: '/reference/components/dropdown',
      rows: [
        { keys: ['Enter', 'Space', '↓', '↑'], does: 'open and focus the first item' },
        { keys: ['↑', '↓', 'Home', 'End'], does: 'move focus' },
        { keys: ['→', '←'], does: 'open / close a context-menu submenu' },
        { keys: ['Esc'], does: 'closes one level and returns focus' },
      ],
    },
    {
      component: 'Tabs',
      url: '/reference/components/tabs',
      rows: [
        { keys: ['←', '→'], does: 'previous / next tab, wrapping' },
        { keys: ['Home', 'End'], does: 'first / last tab' },
        { keys: ['Enter', 'Space'], does: 'activate, in router mode (`wrTabsRouting`)' },
      ],
    },
    {
      component: 'Tree',
      url: '/reference/components/tree',
      rows: [
        { keys: ['↑', '↓'], does: 'previous / next visible row' },
        { keys: ['→'], does: 'expands, or steps into the first child' },
        { keys: ['←'], does: 'collapses, or jumps to the parent' },
        { keys: ['Home', 'End'], does: 'first / last visible row' },
        { keys: ['Enter', 'Space'], does: 'select; hold `Ctrl` / `⌘` to add' },
      ],
    },
    {
      component: 'Pagination',
      url: '/reference/components/pagination',
      rows: [
        { keys: ['Tab'], does: 'moves between cells; the arrows do nothing' },
        { keys: ['Enter', 'Space'], does: 'go to that page' },
      ],
    },
    {
      component: 'Table',
      url: '/reference/components/table',
      rows: [
        { keys: ['Tab'], does: 'walks the sort, filter, selection and expand controls' },
        { keys: ['↑', '↓', 'PgUp', 'PgDn'], does: 'scroll a `virtualScroll` body' },
      ],
    },
  ];

  protected readonly helpers: readonly KeyHelper[] = [
    { name: 'KEYS', url: '/reference/utils/keys', use: 'Typed KeyboardEvent.key values.' },
    { name: 'isComposing', url: '/reference/utils/is-composing', use: 'An input method is still converting.' },
    { name: 'isPrintableKey', url: '/reference/utils/is-printable-key', use: 'The key types a character.' },
    { name: 'hasModifier', url: '/reference/utils/has-modifier', use: 'Ctrl, Cmd, Alt or Shift is held.' },
  ];

  protected readonly snippets = {
    declarative: `<!-- Global: fires wherever focus is. -->
<div [wrHotkey]="'mod+k'" (wrHotkeyMatch)="palette.open()">…</div>

<!-- Scoped: only while focus is inside the host. -->
<div [wrHotkey]="'escape'" [scoped]="true" (wrHotkeyMatch)="close()">…</div>`,

    imperative: `import { WrHotkey } from 'ngwr/hotkey';

private readonly hotkey = inject(WrHotkey);

constructor() {
  const handle = this.hotkey.bind('mod+k', () => this.palette.open());
  inject(DestroyRef).onDestroy(() => handle.unbind());
}`,

    hint: `<wr-kbd>⌘</wr-kbd>
<wr-kbd>K</wr-kbd>
<wr-kbd size="sm">Ctrl</wr-kbd>
<wr-kbd size="sm">K</wr-kbd>`,

    keys: `import { KEYS, hasModifier, isComposing, isPrintableKey } from 'ngwr/utils';

protected onKeydown(event: KeyboardEvent): void {
  if (isComposing(event)) return;
  if (event.key === KEYS.ESCAPE) return this.close();

  // Before hasModifier, which counts Shift and would drop capitals.
  if (isPrintableKey(event)) {
    this.query.update(q => q + event.key);
    return;
  }

  if (hasModifier(event)) return; // leave the browser's own shortcuts alone
}`,
  };

  /** `[wrHotkey]` has no page of its own, so its API is documented here. */
  protected readonly bindingApi: readonly DocApiRow[] = [
    {
      name: 'wrHotkey',
      description: 'The chord, such as `mod+k`.',
      type: 'WrHotkeySpec',
    },
    {
      name: 'scoped',
      description: 'Listen only while focus is inside the host.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'allowInInput',
      description: 'Also fire while an input, textarea or contenteditable has focus.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'preventDefault',
      description: 'Stop the browser acting on the chord too.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: '(wrHotkeyMatch)',
      description: 'Emits the `KeyboardEvent` on a match.',
      type: 'KeyboardEvent',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Service', title: 'WrHotkey', url: ['/reference/services', 'hotkey'] },
    { kind: 'Component', title: 'WrKbd', url: ['/reference/components', 'keyboard'] },
    { kind: 'Guide', title: 'Overlay', url: ['/guides', 'overlay'] },
  ];
}
