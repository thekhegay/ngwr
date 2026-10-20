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
  selector: 'ngwr-utl-is-composing-page',
  templateUrl: './is-composing.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent, DocSeeAlsoComponent],
})
export default class IsComposingPage {
  protected readonly snippet = `import { isComposing } from 'ngwr/utils';

onKeydown(event: KeyboardEvent): void {
  if (isComposing(event)) return;

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
      name: 'isComposing(event)',
      description: 'True while an input method is composing.',
      type: '(e: KeyboardEvent) => boolean',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Keyboard', url: ['/guides', 'keyboard'] },
    { kind: 'Util', title: 'hasModifier', url: ['/reference/utils', 'has-modifier'] },
    { kind: 'Util', title: 'isPrintableKey', url: ['/reference/utils', 'is-printable-key'] },
  ];
}
