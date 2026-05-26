import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrSpotlight } from 'ngwr/directives';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-spotlight-page',
  templateUrl: './spotlight.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrSpotlight, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class SpotlightPage {
  protected readonly snippets = {
    install: `import { WrSpotlight } from 'ngwr/directives';`,
    usage: `<!-- Cursor-following radial highlight. -->
<div wrSpotlight class="hero-card">…</div>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrSpotlight]',
      description: 'Cursor-following radial highlight on hover — gives flat cards interactive depth.',
      type: 'directive',
      default: '—',
    },
  ];
}
