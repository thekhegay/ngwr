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
  selector: 'ngwr-utl-wr-has-modifier-page',
  templateUrl: './wr-has-modifier.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent, DocSeeAlsoComponent],
})
export default class WrHasModifierPage {
  protected readonly snippet = `import { wrHasModifier } from 'ngwr/utils';

@HostListener('keydown', ['$event']) onKey(e: KeyboardEvent) {
  if (wrHasModifier(e)) return;   // let chords such as Cmd+K through
  if (e.key === 'k') focusSearch();
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrHasModifier(event)',
      description: 'True when Ctrl, Cmd, Alt, Shift or Meta is held. Return early on it in single-key shortcuts.',
      type: '(e: KeyboardEvent) => boolean',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Keyboard', url: ['/guides', 'keyboard'] },
    { kind: 'Util', title: 'wrIsPrintableKey', url: ['/reference/utils', 'wr-is-printable-key'] },
    { kind: 'Util', title: 'WR_KEYS', url: ['/reference/utils', 'wr-keys'] },
  ];
}
