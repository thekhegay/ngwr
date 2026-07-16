import { Component } from '@angular/core';

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
  selector: 'ngwr-keyboard-page',
  templateUrl: './keyboard.html',
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
export default class KeyboardPageComponent {
  protected readonly snippets = {
    install: `import { WrKbd } from 'ngwr/keyboard';

@Component({ imports: [WrKbd] })
export class MyComponent {}`,
    basic: `<wr-kbd>⌘</wr-kbd> + <wr-kbd>K</wr-kbd>`,
    sizes: `<wr-kbd size="sm">Esc</wr-kbd>
<wr-kbd size="md">Enter</wr-kbd>
<wr-kbd size="lg">⌫</wr-kbd>`,
    layout: `<!-- arrange caps in a grid via flex / grid -->
<wr-kbd>Esc</wr-kbd>
<wr-kbd>1</wr-kbd> <wr-kbd>2</wr-kbd> …
<wr-kbd>⌃</wr-kbd> <wr-kbd>⌥</wr-kbd> <wr-kbd>⌘</wr-kbd> <wr-kbd>Space</wr-kbd>`,
  };

  // A full 60% keyboard layout, row by row. Wide caps get a custom
  //    width via the `w` field so Tab / Backspace / Enter / Shift /
  //    Space all read at native proportions.
  protected readonly rows: readonly (readonly { readonly cap: string; readonly w?: number }[])[] = [
    [
      { cap: 'Esc' },
      { cap: '1' },
      { cap: '2' },
      { cap: '3' },
      { cap: '4' },
      { cap: '5' },
      { cap: '6' },
      { cap: '7' },
      { cap: '8' },
      { cap: '9' },
      { cap: '0' },
      { cap: '-' },
      { cap: '=' },
      { cap: 'Delete', w: 3.4 },
    ],
    [
      { cap: 'Tab', w: 2.4 },
      { cap: 'Q' },
      { cap: 'W' },
      { cap: 'E' },
      { cap: 'R' },
      { cap: 'T' },
      { cap: 'Y' },
      { cap: 'U' },
      { cap: 'I' },
      { cap: 'O' },
      { cap: 'P' },
      { cap: '[' },
      { cap: ']' },
      { cap: '\\' },
    ],
    [
      { cap: 'Caps', w: 2.8 },
      { cap: 'A' },
      { cap: 'S' },
      { cap: 'D' },
      { cap: 'F' },
      { cap: 'G' },
      { cap: 'H' },
      { cap: 'J' },
      { cap: 'K' },
      { cap: 'L' },
      { cap: ';' },
      { cap: "'" },
      { cap: 'Return', w: 3.4 },
    ],
    [
      { cap: '⇧', w: 3.4 },
      { cap: 'Z' },
      { cap: 'X' },
      { cap: 'C' },
      { cap: 'V' },
      { cap: 'B' },
      { cap: 'N' },
      { cap: 'M' },
      { cap: ',' },
      { cap: '.' },
      { cap: '/' },
      { cap: '⇧', w: 4 },
    ],
    [
      { cap: '⌃', w: 1.6 },
      { cap: '⌥', w: 1.6 },
      { cap: '⌘', w: 1.8 },
      { cap: 'Space', w: 8.4 },
      { cap: '⌘', w: 1.8 },
      { cap: '⌥', w: 1.6 },
      { cap: '←' },
      { cap: '↓' },
      { cap: '↑' },
      { cap: '→' },
    ],
  ];

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'size',
      type: `'sm' | 'md' | 'lg'`,
      default: `'md'`,
      description: 'Visual size variant.',
    },
    {
      name: 'CSS — --wr-kbd-bg',
      type: 'color',
      default: 'var(--wr-color-white)',
      description: 'Cap background.',
    },
    {
      name: 'CSS — --wr-kbd-border / --wr-kbd-border-bottom',
      type: 'color',
      default: '— dark @ 18% / 32%',
      description: 'Side border / chunkier bottom border (the depth illusion).',
    },
    {
      name: 'CSS — --wr-kbd-color',
      type: 'color',
      default: 'var(--wr-color-dark)',
      description: 'Glyph color.',
    },
    {
      name: 'CSS — --wr-kbd-radius',
      type: 'length',
      default: '4px',
      description: 'Corner radius.',
    },
    {
      name: 'CSS — --wr-kbd-shadow',
      type: 'shadow',
      default: '0 1px 0 rgba(dark, 0.12)',
      description: 'Drop shadow under the cap.',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Keyboard',
      url: ['/guides', 'keyboard'],
      description: 'How chords, keycaps and key primitives fit together in one task.',
    },
    {
      kind: 'Service',
      title: 'WrHotkey',
      url: ['/reference/services', 'hotkey'],
      description: 'Bind the chord this keycap advertises.',
    },
  ];
}
