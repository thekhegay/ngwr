import { Component, DestroyRef, inject, signal } from '@angular/core';

import { WrHotkey } from 'ngwr/hotkey';
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
  private readonly hotkeys = inject(WrHotkey);
  protected readonly lastHotkey = signal<string>('');

  constructor() {
    const handle = this.hotkeys.bind('mod+/', () => {
      this.lastHotkey.set(`mod+/ fired at ${new Date().toLocaleTimeString()}`);
    });
    inject(DestroyRef).onDestroy(() => handle.unbind());
  }

  protected readonly snippets = {
    usage: `private readonly hotkeys = inject(WrHotkey);

constructor() {
  const handle = this.hotkeys.bind('mod+k', () => this.openPalette());
  inject(DestroyRef).onDestroy(() => handle.unbind());
}`,
    directive: `<button [wrHotkey]="'mod+k'" (wrHotkeyMatch)="openPalette()">Search</button>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'bind(spec, handler, options?)',
      description: 'Register a binding. Returns `{ unbind }`.',
      type: '(spec, handler, options?) => WrHotkeyHandle',
      default: '—',
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
