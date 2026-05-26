import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrGradientText } from 'ngwr/gradient-text';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  ReactbitsCredit,
} from '#core/components';

@Component({
  selector: 'ngwr-gradient-text-page',
  templateUrl: './gradient-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrGradientText,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class GradientTextPage {
  protected readonly snippets = {
    install: `import { WrGradientText } from 'ngwr/gradient-text';`,
    basic: `<wr-gradient-text>Hello, ngwr!</wr-gradient-text>`,
    custom: `<wr-gradient-text
  [colors]="['#ff6b6b', '#feca57', '#48dbfb', '#ff6b6b']"
  [animationSpeed]="5"
  direction="diagonal"
>
  Custom palette
</wr-gradient-text>`,
    border: `<wr-gradient-text
  [showBorder]="true"
  [pauseOnHover]="true"
>
  Premium feature
</wr-gradient-text>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'colors', description: 'Gradient stops (any CSS colours).', type: 'readonly string[]', default: "['#5227FF', '#FF9FFC', '#B497CF']" },
    { name: 'animationSpeed', description: 'Seconds per full sweep (or per half if `yoyo` is on).', type: 'number', default: '8' },
    { name: 'showBorder', description: 'Wrap the text in a dark pill with the gradient as a border.', type: 'boolean', default: 'false' },
    { name: 'direction', description: 'Gradient slide direction.', type: "'horizontal' | 'vertical' | 'diagonal'", default: "'horizontal'" },
    { name: 'pauseOnHover', description: 'Pause the animation while hovered.', type: 'boolean', default: 'false' },
    { name: 'yoyo', description: 'Bounce back-and-forth instead of restarting.', type: 'boolean', default: 'true' },
  ];
}
