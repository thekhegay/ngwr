import { Component } from '@angular/core';

import { WrTag } from 'ngwr/badge';
import { WrFitText } from 'ngwr/directives';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-fit-text-page',
  templateUrl: './fit-text.html',
  styleUrl: './fit-text.scss',
  imports: [
    WrFitText,
    WrTag,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class FitTextPage {
  protected readonly label = 'Charging finished, waiting for the next shift to collect';

  protected readonly snippets = {
    usage: `<wr-tag class="wrap" wrFitText transparent color="success">
  Charging finished, waiting for the next shift to collect
</wr-tag>

<p [wrFitText]="fit()">…</p>`,
    scss: `.wrap {
  display: inline-block;
  max-inline-size: 100%;
  text-align: start;
  white-space: normal;
}`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrFitText]',
      description: 'Sets the inline `width` to the widest line. `false` switches it off.',
      type: 'boolean',
      default: 'true',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'Badge',
      url: ['/reference/components', 'badge'],
      description: '`wr-tag`, the pill in the demo.',
    },
  ];
}
