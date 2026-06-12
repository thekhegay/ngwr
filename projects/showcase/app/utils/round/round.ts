import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-round-page',
  templateUrl: './round.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class RoundPage {
  protected readonly snippet = `import { round } from 'ngwr/utils';

round(0.1 + 0.2, 2); // 0.3
round(1.005, 2);     // 1.01
round(7.4);          // 7`;

  protected readonly whySnippet = `// Native:
Math.round(1.005 * 100) / 100; // 1     ← wrong
// ngwr:
round(1.005, 2);               // 1.01`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'round',
      description: 'Rounds value to decimals fraction digits.',
      type: '(value: number, decimals = 0) => number',
      default: '—',
    },
  ];
}
