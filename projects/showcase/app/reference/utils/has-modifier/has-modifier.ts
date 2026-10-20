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
  selector: 'ngwr-utl-has-modifier-page',
  templateUrl: './has-modifier.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent, DocSeeAlsoComponent],
})
export default class HasModifierPage {
  protected readonly snippet = `import { hasModifier } from 'ngwr/utils';

@HostListener('keydown', ['$event']) onKey(e: KeyboardEvent) {
  if (hasModifier(e)) return;   // let chords such as Cmd+K through
  if (e.key === 'k') focusSearch();
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'hasModifier(event)',
      description: 'True when Ctrl, Cmd, Alt, Shift or Meta is held. Return early on it in single-key shortcuts.',
      type: '(e: KeyboardEvent) => boolean',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Keyboard', url: ['/guides', 'keyboard'] },
    { kind: 'Util', title: 'isPrintableKey', url: ['/reference/utils', 'is-printable-key'] },
    { kind: 'Util', title: 'KEYS', url: ['/reference/utils', 'keys'] },
  ];
}
