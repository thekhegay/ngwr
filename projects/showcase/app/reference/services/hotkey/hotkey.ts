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

ngOnInit() {
  const handle = this.hotkeys.bind('mod+k', () => this.openPalette(), {
    preventDefault: true,
    allowInInput: false,
  });
  this.destroyRef.onDestroy(() => handle.unbind());
}

// Or use the directive form:
// <button [wrHotkey]="'mod+k'" (wrHotkeyMatch)="openPalette()">…</button>`,
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
      description: "The third argument of `bind()`, and what the `[wrHotkey]` directive's own inputs mirror.",
      type: 'interface',
      default: '—',
    },
    {
      name: 'element',
      description:
        'Scope the listener to one element instead of `document`. It has to be focusable or hold the focus for the binding to fire at all, so this usually comes with `tabindex="0"` on the host.',
      type: 'HTMLElement',
      default: 'document',
      sub: true,
    },
    {
      name: 'preventDefault',
      description: 'Call `event.preventDefault()` on a match. Turn it off for a combo the browser should still handle.',
      type: 'boolean',
      default: 'true',
      sub: true,
    },
    {
      name: 'allowInInput',
      description:
        'Fire even while an `<input>`, a `<textarea>` or a contenteditable has focus. Off by default so a plain letter shortcut does not eat what someone is typing.',
      type: 'boolean',
      default: 'false',
      sub: true,
    },
    {
      name: 'priority',
      description:
        'Higher goes first. Bindings sharing a key dispatch in priority order, and a handler calling `event.preventDefault()` stops the lower ones — which is how a dialog takes Escape from the page behind it.',
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
      description: 'How chords, keycaps and key primitives fit together in one task.',
    },
    {
      kind: 'Component',
      title: 'WrKbd',
      url: ['/reference/components', 'keyboard'],
      description: 'Render the chord you just bound so users can discover it.',
    },
    {
      kind: 'Util',
      title: 'KEYS',
      url: ['/reference/utils', 'keys'],
      description: 'Canonical `KeyboardEvent.key` constants for your own handlers.',
    },
  ];
}
