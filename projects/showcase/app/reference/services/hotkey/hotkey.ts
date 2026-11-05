import { Component, DestroyRef, inject, signal } from '@angular/core';

import { WrHotkey, type WrHotkeySpec, wrFormatChord } from 'ngwr/hotkey';
import { WrKbd } from 'ngwr/keyboard';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-svc-hotkey-page',
  templateUrl: './hotkey.html',
  imports: [
    WrKbd,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class HotkeyServicePageComponent {
  protected readonly hotkeys = inject(WrHotkey);
  protected readonly lastHotkey = signal<string>('');

  constructor() {
    const handle = this.hotkeys.bind(
      'mod+/',
      () => this.lastHotkey.set(`mod+/ fired at ${new Date().toLocaleTimeString()}`),
      { label: 'Log the time' }
    );
    inject(DestroyRef).onDestroy(() => handle.unbind());
  }

  protected readonly chords: readonly WrHotkeySpec[] = [
    'mod+k',
    'mod+shift+k',
    'ctrl+alt+shift+cmd+k',
    'escape',
    'mod+enter',
    'alt+up',
    'mod+F5',
  ];
  protected readonly mac = (chord: WrHotkeySpec): string => wrFormatChord(chord, 'mac');
  protected readonly other = (chord: WrHotkeySpec): string => wrFormatChord(chord, 'other');

  protected readonly snippets = {
    usage: `private readonly hotkeys = inject(WrHotkey);

constructor() {
  const handle = this.hotkeys.bind('mod+k', () => this.openPalette());
  inject(DestroyRef).onDestroy(() => handle.unbind());
}`,
    directive: `<button [wrHotkey]="'mod+k'" hotkeyLabel="Search" (wrHotkeyMatch)="openPalette()">Search</button>`,
    cheatSheet: `@for (binding of hotkeys.bindings(); track $index) {
  <wr-kbd [chord]="binding.chord" /> {{ binding.label }}
}`,
    format: `import { wrFormatChord } from 'ngwr/hotkey';

wrFormatChord('mod+shift+k'); // ⇧⌘K on macOS, Ctrl+Shift+K elsewhere
wrFormatChord('mod+k', 'mac'); // ⌘K, whatever the platform`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'bind(spec, handler, options?)',
      description: 'Register a binding. Returns `{ unbind }`.',
      type: '(spec, handler, options?) => WrHotkeyHandle',
      default: '—',
    },
    {
      name: 'bindings()',
      description:
        'The active bindings in registration order, each `{ chord, label }`: the chord as registered and the `label` from the options, or `null`.',
      type: 'Signal<readonly WrHotkeyEntry[]>',
      default: '-',
    },
    {
      name: 'wrFormatChord(chord, platform?, labels?)',
      description:
        "A chord the way the platform writes it. `platform` defaults to `wrHotkeyPlatform()`, read from `navigator.userAgent`; `labels` replaces a word from `KEY_LABELS` by its `KEYS` value, which is how `<wr-kbd>` passes the catalog's.",
      type: "(chord: WrHotkeySpec, platform?: 'mac' | 'other', labels?: Partial<Record<WrKey, string>>) => string",
      default: '-',
    },
    {
      name: 'wrHotkeyPlatform(userAgent?)',
      description:
        "`'mac'` when the user agent names a Mac, `'other'` elsewhere and where there is no navigator, which is the server.",
      type: "(userAgent?: string | null) => 'mac' | 'other'",
      default: '-',
    },
    {
      name: '[wrHotkey]',
      description: 'Directive form: binds on init, re-binds on input change, unbinds on destroy.',
      type: 'WrHotkeySpec',
      default: '—',
    },
    {
      name: 'spec format',
      description: "`'+'`-separated tokens. `mod` = Cmd on macOS, Ctrl elsewhere.",
      type: 'string',
      default: '—',
    },
    {
      name: 'WrHotkeyOptions',
      description: 'The third argument of `bind()`.',
      type: 'interface',
      default: '—',
    },
    {
      name: 'element',
      description: 'Listen on this element instead of `document`. It must hold focus, so add `tabindex="0"`.',
      type: 'HTMLElement',
      default: 'document',
      sub: true,
    },
    {
      name: 'preventDefault',
      description: 'Call `event.preventDefault()` on a match.',
      type: 'boolean',
      default: 'true',
      sub: true,
    },
    {
      name: 'allowInInput',
      description: 'Fire while an input, a textarea or a contenteditable has focus.',
      type: 'boolean',
      default: 'false',
      sub: true,
    },
    {
      name: 'priority',
      description: 'Higher runs first; a handler calling `event.preventDefault()` stops the lower ones.',
      type: 'number',
      default: '0',
      sub: true,
    },
    {
      name: 'label',
      description: 'What the shortcut does, listed by `bindings`.',
      type: 'string',
      default: '-',
      sub: true,
    },
  ];

  protected readonly bindingApi = API.WrHotkeyBinding;

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Keyboard',
      url: ['/guides', 'keyboard'],
    },
    {
      kind: 'Component',
      title: 'WrKbd',
      url: ['/reference/components', 'keyboard'],
      description: 'Show the shortcut.',
    },
    {
      kind: 'Util',
      title: 'KEYS',
      url: ['/reference/utils', 'keys'],
      description: 'KeyboardEvent.key constants.',
    },
  ];
}
