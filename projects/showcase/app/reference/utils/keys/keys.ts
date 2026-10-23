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
  selector: 'ngwr-utl-keys-page',
  templateUrl: './keys.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent, DocSeeAlsoComponent],
})
export default class KeysPage {
  protected readonly snippet = `import { KEYS, type WrKey } from 'ngwr/utils';

if (event.key === KEYS.ESCAPE) {
  close();
}

function onArrow(key: WrKey) { /* … */ }`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'KEYS',
      description: '`KeyboardEvent.key` values: `ENTER`, `ESCAPE`, `ARROW_UP`, `ARROW_DOWN`, `TAB`, `SPACE`, …',
      type: 'const record',
      default: '—',
    },
    {
      name: 'WrKey',
      description: 'Union of every value in `KEYS`, for typed key parameters.',
      type: 'type alias',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Keyboard', url: ['/guides', 'keyboard'] },
    { kind: 'Service', title: 'WrHotkey', url: ['/reference/services', 'hotkey'], description: 'For whole chords.' },
    { kind: 'Util', title: 'hasModifier', url: ['/reference/utils', 'has-modifier'] },
    { kind: 'Util', title: 'isPrintableKey', url: ['/reference/utils', 'is-printable-key'] },
  ];
}
