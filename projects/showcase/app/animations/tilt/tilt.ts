import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrTilt } from 'ngwr/directives';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-tilt-page',
  templateUrl: './tilt.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrTilt, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class TiltPage {
  protected readonly snippets = {
    install: `import { WrTilt } from 'ngwr/directives';`,
    usage: `<!-- Cursor-tracked 3D tilt. Adjusts perspective on hover. -->
<div wrTilt [maxTilt]="10" [scale]="1.02">
  <img src="…" />
</div>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrTilt]',
      description: '3D tilt that follows the cursor. `[maxTilt]` degrees and `[scale]` factor inputs.',
      type: 'directive',
      default: '—',
    },
  ];
}
