import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrShimmer, WrShinyText } from 'ngwr/shiny-text';

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
  selector: 'ngwr-shiny-text-page',
  templateUrl: './shiny-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrShinyText,
    WrShimmer,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class ShinyTextPage {
  protected readonly snippets = {
    install: `import { WrShinyText } from 'ngwr/shiny-text';`,
    basic: `<wr-shiny-text text="Premium" />`,
    custom: `<wr-shiny-text
  text="Custom shimmer"
  color="#1f2937"
  shineColor="#60a5fa"
  [speed]="3"
  [delay]="0.5"
  [spread]="100"
/>`,
    yoyo: `<wr-shiny-text
  text="Yoyo back and forth"
  [yoyo]="true"
  [pauseOnHover]="true"
/>`,
    shimmer: `import { WrShimmer } from 'ngwr/shiny-text';

<h1 wrShimmer>Premium</h1>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'text', description: 'Text to render.', type: 'string', default: '— (required)', required: true },
    { name: 'disabled', description: 'Pause the animation.', type: 'boolean', default: 'false' },
    { name: 'speed', description: 'Time for the bright stripe to traverse the text, in seconds.', type: 'number', default: '2' },
    { name: 'color', description: 'Base text colour (outside the bright stripe).', type: 'string', default: "'#b5b5b5'" },
    { name: 'shineColor', description: 'Bright stripe colour.', type: 'string', default: "'#ffffff'" },
    { name: 'spread', description: 'Gradient angle in degrees.', type: 'number', default: '120' },
    { name: 'yoyo', description: 'Bounce back-and-forth instead of restarting.', type: 'boolean', default: 'false' },
    { name: 'pauseOnHover', description: 'Pause the animation while hovered.', type: 'boolean', default: 'false' },
    { name: 'direction', description: 'Sweep direction.', type: "'left' | 'right'", default: "'left'" },
    { name: 'delay', description: 'Pause between sweeps in seconds.', type: 'number', default: '0' },
    {
      name: '[wrShimmer]',
      description: 'Lightweight directive variant — adds the `.wr-shimmer` host class for a continuous sweep over any element. Same package.',
      type: 'directive',
      default: '—',
    },
  ];
}
