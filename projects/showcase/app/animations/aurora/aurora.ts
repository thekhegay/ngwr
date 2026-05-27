import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrAurora } from 'ngwr/aurora';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-aurora-page',
  templateUrl: './aurora.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrAurora, DocPageComponent, DocSectionComponent, DocPlaygroundComponent, DocCodeComponent, DocApiComponent],
})
export default class AuroraPage {
  protected readonly snippet = `<wr-aurora />`;

  protected readonly snippets = {
    install: `import { WrAurora } from 'ngwr/aurora';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'colorA', description: 'First gradient layer.', type: 'string', default: 'primary blob' },
    { name: 'colorB', description: 'Second gradient layer.', type: 'string', default: 'secondary blob' },
    { name: 'colorC', description: 'Third gradient layer.', type: 'string', default: 'success blob' },
  ];
}
