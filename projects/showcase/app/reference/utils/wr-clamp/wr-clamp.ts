import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-clamp-page',
  templateUrl: './wr-clamp.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrClampPage {
  protected readonly snippet = `import { wrClamp } from 'ngwr/utils';

wrClamp(140, 0, 100); // 100
wrClamp(-3, 0, 100);  // 0
wrClamp(42, 0, 100);  // 42`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrClamp',
      description: 'Clamps value into the inclusive [min, max] range.',
      type: '(value: number, min: number, max: number) => number',
      default: '—',
    },
  ];
}
