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
  selector: 'ngwr-utl-wr-is-printable-key-page',
  templateUrl: './wr-is-printable-key.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent, DocSeeAlsoComponent],
})
export default class WrIsPrintableKeyPage {
  protected readonly snippet = `import { wrIsPrintableKey } from 'ngwr/utils';

// Type-to-search: ignore arrows, Enter and chords.
@HostListener('keydown', ['$event']) onKey(e: KeyboardEvent) {
  if (wrIsPrintableKey(e)) buffer.push(e.key);
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrIsPrintableKey(event)',
      description:
        'True for a single printable character with no Ctrl, Cmd or Alt held. Shift is accepted, so capitals arrive.',
      type: '(e: KeyboardEvent) => boolean',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Keyboard', url: ['/guides', 'keyboard'] },
    { kind: 'Util', title: 'wrHasModifier', url: ['/reference/utils', 'wr-has-modifier'] },
    { kind: 'Util', title: 'WR_KEYS', url: ['/reference/utils', 'wr-keys'] },
  ];
}
