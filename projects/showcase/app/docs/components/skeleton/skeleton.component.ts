import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrSkeletonComponent } from 'ngwr/skeleton';
import { WR_COLORS } from 'ngwr/theme';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-skeleton-page',
  templateUrl: './skeleton.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrSkeletonComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class SkeletonComponent {
  protected readonly colors = WR_COLORS;

  protected readonly snippets = {
    install: `import { WrSkeletonComponent } from 'ngwr/skeleton';

@Component({ imports: [WrSkeletonComponent] })
export class MyComponent {}`,
    basic: `<wr-skeleton />`,
    colors: `<wr-skeleton color="primary" />
<wr-skeleton color="success" />`,
    custom: `<wr-skeleton style="--wr-skeleton-height: 4rem; --wr-skeleton-radius: 1rem" />`,
    static: `<wr-skeleton [animated]="false" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'color', description: 'Tint color.', type: 'WrColor', default: "'dark'" },
    { name: 'animated', description: 'Run the shimmer animation.', type: 'boolean', default: 'true' },
  ];
}
