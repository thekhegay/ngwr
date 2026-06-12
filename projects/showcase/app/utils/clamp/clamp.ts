import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-clamp-page',
  templateUrl: './clamp.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class ClampPage {
  protected readonly snippet = `import { clamp } from 'ngwr/utils';

clamp(140, 0, 100); // 100
clamp(-3, 0, 100);  // 0
clamp(42, 0, 100);  // 42`;

  protected readonly whySnippet = `// Typical: keep a drag position inside its track.
const x = clamp(pointerX - trackLeft, 0, trackWidth);`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'clamp',
      description: 'Clamps value into the inclusive [min, max] range.',
      type: '(value: number, min: number, max: number) => number',
      default: '—',
    },
  ];
}
