import { Component, DestroyRef, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import {
  WrHotkey,
  type WrHotkeySpec,
  wrFormatChord,
  wrHotkeyPlatform,
  wrMatchesHotkey,
  wrParseHotkeySpec,
} from 'ngwr/hotkey';
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
    WrButton,
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

  /** The last chord pressed in the matching demo, and whether it is `mod+shift+k`. */
  protected readonly pressed = signal<{ readonly keys: string; readonly matches: boolean } | null>(null);

  protected onChord(event: KeyboardEvent): void {
    // A modifier on its own is not a chord yet, and Tab has to keep leaving the field.
    if (['Control', 'Alt', 'Shift', 'Meta', 'Tab'].includes(event.key)) return;
    const matches = wrMatchesHotkey(event, wrParseHotkeySpec('mod+shift+k', wrHotkeyPlatform() === 'mac'));
    if (matches) event.preventDefault();
    const keys = [
      event.ctrlKey && 'Ctrl',
      event.altKey && 'Alt',
      event.shiftKey && 'Shift',
      event.metaKey && 'Meta',
      event.key === ' ' ? 'Space' : event.key,
    ];
    this.pressed.set({ keys: keys.filter(Boolean).join(' + '), matches });
  }

  protected readonly parsedRows = (
    [
      ['mod+shift+k', false],
      ['mod+shift+k', true],
      ['alt+up', false],
      ['esc', false],
    ] as const
  ).map(([spec, isMac]) => ({ spec, isMac, parsed: JSON.stringify(wrParseHotkeySpec(spec, isMac)) }));

  protected readonly snippets = {
    match: `import { wrHotkeyPlatform, wrMatchesHotkey, wrParseHotkeySpec } from 'ngwr/hotkey';

// In the browser: on the server the platform reads 'other'.
private readonly save = wrParseHotkeySpec('mod+s', wrHotkeyPlatform() === 'mac');

protected onKeydown(event: KeyboardEvent): void {
  if (!wrMatchesHotkey(event, this.save)) return;
  event.preventDefault();
  this.saveCell();
}`,
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
        "A chord the way the platform writes it. `platform` defaults to `wrHotkeyPlatform()`, read from `navigator.userAgent`; `labels` replaces a word from `WR_KEY_LABELS` by its `WR_KEYS` value, which is how `<wr-kbd>` passes the catalog's.",
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
      name: 'wrParseHotkeySpec(spec, isMac?)',
      description: 'A spec as a `WrParsedHotkey`. `isMac` decides `mod`: `meta` when `true`, `ctrl` otherwise.',
      type: '(spec: WrHotkeySpec, isMac?: boolean) => WrParsedHotkey',
      default: 'isMac: false',
    },
    {
      name: 'wrMatchesHotkey(event, parsed)',
      description: 'Whether the event is the parsed chord: the four modifiers exactly, then the key.',
      type: '(event: KeyboardEvent, parsed: WrParsedHotkey) => boolean',
      default: '-',
    },
    {
      name: 'WrParsedHotkey',
      description: 'A parsed spec: the four modifier flags and the lowercased `KeyboardEvent.key`.',
      type: '{ ctrl: boolean; alt: boolean; shift: boolean; meta: boolean; key: string }',
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
      title: 'WR_KEYS',
      url: ['/reference/utils', 'wr-keys'],
      description: 'KeyboardEvent.key constants.',
    },
  ];
}
