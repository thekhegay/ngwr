import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrMarquee } from 'ngwr/marquee';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-marquee-page',
  templateUrl: './marquee.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrMarquee, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class MarqueePage {
  protected readonly snippets = {
    install: `import { WrMarquee } from 'ngwr/marquee';`,
    basic: `<wr-marquee>
  <span>One · </span><span>Two · </span><span>Three · </span><span>Four · </span>
</wr-marquee>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '<wr-marquee>',
      description: 'Endlessly scrolling content track. Project anything as children.',
      type: 'component',
      default: '—',
    },
  ];
}
