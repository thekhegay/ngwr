import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrAurora } from 'ngwr/aurora';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-aurora-page',
  templateUrl: './aurora.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrAurora, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class AuroraPage {
  protected readonly snippets = {
    install: `import { WrAurora } from 'ngwr/aurora';`,
    basic: `<wr-aurora />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: '<wr-aurora>', description: 'Drop-in animated aurora gradient backdrop.', type: 'component', default: '—' },
  ];
}
