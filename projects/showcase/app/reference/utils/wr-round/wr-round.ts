import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-round-page',
  templateUrl: './wr-round.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrRoundPage {
  protected readonly snippet = `import { wrRound } from 'ngwr/utils';

wrRound(0.1 + 0.2, 2); // 0.3
wrRound(1.005, 2);     // 1.01
wrRound(7.4);          // 7`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrRound',
      description: 'Rounds `value` to `decimals` fraction digits.',
      type: '(value: number, decimals = 0) => number',
      default: '—',
    },
  ];
}
