import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrShimmer } from 'ngwr/directives';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-shimmer-page',
  templateUrl: './shimmer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrShimmer, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class ShimmerPage {
  protected readonly snippets = {
    install: `import { WrShimmer } from 'ngwr/directives';`,
    usage: `<!-- Add 'ngwr/animations' for the .wr-shimmer keyframes. -->
<h1 wrShimmer>Premium</h1>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrShimmer]',
      description: 'Applies a moving highlight sweep to text. Pair with `ngwr/animations` for keyframes.',
      type: 'directive',
      default: '—',
    },
  ];
}
