import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrAnimatedText } from 'ngwr/animated-text';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-animated-text-page',
  templateUrl: './animated-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrAnimatedText,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class AnimatedTextPage {
  protected readonly snippets = {
    install: `import { WrAnimatedText } from 'ngwr/animated-text';`,
    basic: `<wr-animated-text text="Hello, ngwr!" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '<wr-animated-text>',
      description: 'Animates each character into view.',
      type: 'component',
      default: '—',
    },
  ];
}
