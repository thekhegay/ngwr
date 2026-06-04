import { Component, DestroyRef, inject, signal } from '@angular/core';

import { WrHotkey } from 'ngwr/hotkey';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-svc-hotkey-page',
  templateUrl: './hotkey.html',
  imports: [DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
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
  ];
}
