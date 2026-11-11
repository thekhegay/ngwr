import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-keys-page',
  templateUrl: './wr-keys.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent, DocSeeAlsoComponent],
})
export default class WrKeysPage {
  protected readonly snippet = `import { WR_KEYS, type WrKey } from 'ngwr/utils';

if (event.key === WR_KEYS.ESCAPE) {
  close();
}

function onArrow(key: WrKey) { /* … */ }`;

  protected readonly labelsSnippet = `import { WR_KEYS, WR_KEY_LABELS } from 'ngwr/utils';

WR_KEY_LABELS[WR_KEYS.ESCAPE]; // 'Esc'
WR_KEY_LABELS[WR_KEYS.ARROW_UP]; // '↑'
WR_KEY_LABELS[event.key as WrKey] ?? event.key;`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'WR_KEYS',
      description:
        '`KeyboardEvent.key` values: `ENTER`, `ESCAPE`, `ARROW_UP`, `ARROW_DOWN`, `TAB`, `SPACE`, … and the modifiers `CONTROL`, `SHIFT`, `ALT`, `META`.',
      type: 'const record',
      default: '—',
    },
    {
      name: 'WrKey',
      description: 'Union of every value in `WR_KEYS`, for typed key parameters.',
      type: 'type alias',
      default: '—',
    },
    {
      name: 'WR_KEY_LABELS',
      description: 'What each key is called on a PC keycap, keyed by `WR_KEYS`: `Esc`, `Ctrl`, `Page Up`, `↑`.',
      type: 'Readonly<Record<WrKey, string>>',
      default: '-',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Keyboard', url: ['/guides', 'keyboard'] },
    {
      kind: 'Service',
      title: 'WrHotkey',
      url: ['/reference/services', 'hotkey'],
      description: 'For whole chords, and `wrFormatChord`.',
    },
    { kind: 'Util', title: 'wrHasModifier', url: ['/reference/utils', 'wr-has-modifier'] },
    { kind: 'Util', title: 'wrIsPrintableKey', url: ['/reference/utils', 'wr-is-printable-key'] },
  ];
}
