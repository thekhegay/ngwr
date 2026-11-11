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
  selector: 'ngwr-utl-wr-is-composing-page',
  templateUrl: './wr-is-composing.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent, DocSeeAlsoComponent],
})
export default class WrIsComposingPage {
  protected readonly snippet = `import { wrIsComposing } from 'ngwr/utils';

onKeydown(event: KeyboardEvent): void {
  if (wrIsComposing(event)) return;

  switch (event.key) {
    case 'Enter': this.commit(); break;
    case 'Escape': this.close(); break;
  }
}`;

  protected readonly stateSnippet = `@Component({
  host: {
    '(compositionstart)': 'composing = true',
    '(compositionend)': 'composing = false; onSettledInput()',
    '(input)': 'composing ? null : onSettledInput()',
  },
})`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrIsComposing(event)',
      description: 'True while an input method is composing.',
      type: '(e: KeyboardEvent) => boolean',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Keyboard', url: ['/guides', 'keyboard'] },
    { kind: 'Util', title: 'wrHasModifier', url: ['/reference/utils', 'wr-has-modifier'] },
    { kind: 'Util', title: 'wrIsPrintableKey', url: ['/reference/utils', 'wr-is-printable-key'] },
  ];
}
