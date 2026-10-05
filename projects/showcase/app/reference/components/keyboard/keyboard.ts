import { Component } from '@angular/core';

import { WrKbd } from 'ngwr/keyboard';
import { WrTypography } from 'ngwr/typography';

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
    WrTypography,
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
    basic: `<wr-kbd>⌘</wr-kbd> + <wr-kbd>K</wr-kbd>`,
    prose: `<!-- wrTypography is a separate entry point: import { WrTypography } from
     'ngwr/typography'. An unknown attribute on a native <p> is not a template
     error, so without it the prose simply keeps the page's own styling. -->
<p wrTypography>
  Press <wr-kbd>⌘</wr-kbd> + <wr-kbd>P</wr-kbd> to open the command palette.
</p>`,
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
