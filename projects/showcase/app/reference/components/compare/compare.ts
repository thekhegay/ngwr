import { Component, signal } from '@angular/core';

import { WrCompare } from 'ngwr/compare';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-compare-page',
  templateUrl: './compare.html',
  imports: [WrCompare, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class ComparePageComponent {
  protected readonly imagePos = signal(50);
  protected readonly verticalPos = signal(50);
  protected readonly textPos = signal(50);

  protected readonly snippets = {
    install: `import { WrCompare } from 'ngwr/compare';

@Component({ imports: [WrCompare] })
export class MyComponent {}`,

    images: `<wr-compare [(position)]="pos">
  <img wrCompareBefore src="before.jpg" alt="" />
  <img wrCompareAfter src="after.jpg" alt="" />
</wr-compare>`,

    vertical: `<wr-compare orientation="vertical">
  <img wrCompareBefore src="before.jpg" alt="" />
  <img wrCompareAfter src="after.jpg" alt="" />
</wr-compare>`,

    text: `<wr-compare>
  <div wrCompareBefore>…before content…</div>
  <div wrCompareAfter>…after content…</div>
</wr-compare>`,
  };

  protected readonly api = API.WrCompare;

  protected readonly slotsApi: readonly DocApiRow[] = [
    {
      name: '[wrCompareBefore] / [wrCompareAfter]',
      description: 'Attributes marking the two pieces of projected content.',
      type: 'attr',
      default: '—',
    },
  ];
}
