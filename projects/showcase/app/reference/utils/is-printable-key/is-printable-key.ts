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
  selector: 'ngwr-utl-is-printable-key-page',
  templateUrl: './is-printable-key.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent, DocSeeAlsoComponent],
})
export default class IsPrintableKeyPage {
  protected readonly snippet = `import { isPrintableKey } from 'ngwr/utils';

// Type-to-search: ignore arrows, Enter and chords.
@HostListener('keydown', ['$event']) onKey(e: KeyboardEvent) {
  if (isPrintableKey(e)) buffer.push(e.key);
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'isPrintableKey(event)',
      description:
        'True for a single printable character with no Ctrl, Cmd or Alt held. Shift is accepted, so capitals arrive.',
      type: '(e: KeyboardEvent) => boolean',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Keyboard', url: ['/guides', 'keyboard'] },
    { kind: 'Util', title: 'hasModifier', url: ['/reference/utils', 'has-modifier'] },
    { kind: 'Util', title: 'KEYS', url: ['/reference/utils', 'keys'] },
  ];
}
