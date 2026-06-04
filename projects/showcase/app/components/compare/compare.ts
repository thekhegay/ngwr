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

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[(position)]',
      description: 'Divider position as a percentage (0–100). Two-way.',
      type: 'number',
      default: '50',
    },
    {
      name: 'orientation',
      description:
        'Divider direction. `horizontal` = vertical line moving L/R; `vertical` = horizontal line moving U/D.',
      type: "'horizontal' | 'vertical'",
      default: "'horizontal'",
    },
    { name: 'showHandle', description: 'Show round drag handle on the divider.', type: 'boolean', default: 'true' },
    { name: 'disabled', description: 'Disable interaction (divider stays put).', type: 'boolean', default: 'false' },
    {
      name: 'minPosition / maxPosition',
      description: 'Clamp range for the divider.',
      type: 'number',
      default: '0 / 100',
    },
    {
      name: '[wrCompareBefore] / [wrCompareAfter]',
      description: 'Attributes marking the two pieces of projected content.',
      type: 'attr',
      default: '—',
    },
  ];
}
