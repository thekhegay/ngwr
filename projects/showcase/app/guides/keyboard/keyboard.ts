import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrHotkeyBinding } from 'ngwr/hotkey';
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

@Component({
  selector: 'ngwr-gs-keyboard-page',
  templateUrl: './keyboard.html',
  imports: [
    RouterLink,
    WrKbd,
    WrHotkeyBinding,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class KeyboardGuidePage {
  protected readonly hits = signal(0);

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

    keys: `import { KEYS, hasModifier, isPrintableKey } from 'ngwr/utils';

protected onKeydown(event: KeyboardEvent): void {
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
      default: '— (required)',
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
      name: 'wrHotkeyMatch',
      description: 'Emits the original `KeyboardEvent` when the chord matches.',
      type: 'output<KeyboardEvent>',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Service',
      title: 'WrHotkey',
      url: ['/services', 'hotkey'],
      description: 'The registry itself — bind and unbind chords imperatively.',
    },
    {
      kind: 'Component',
      title: 'WrKbd',
      url: ['/components', 'keyboard'],
      description: 'The keycap chip used to render a chord next to its action.',
    },
    {
      kind: 'Util',
      title: 'KEYS',
      url: ['/utils', 'keys'],
      description: 'Canonical `KeyboardEvent.key` constants — searchable instead of magic strings.',
    },
    {
      kind: 'Util',
      title: 'hasModifier',
      url: ['/utils', 'has-modifier'],
      description: 'Is any modifier held? Use it to leave the browser’s own chords alone.',
    },
    {
      kind: 'Util',
      title: 'isPrintableKey',
      url: ['/utils', 'is-printable-key'],
      description: 'Did the key produce a character? The type-ahead predicate.',
    },
  ];
}
