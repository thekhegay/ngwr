import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrCircularText } from 'ngwr/circular-text';

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
  selector: 'ngwr-circular-text-page',
  templateUrl: './circular-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrCircularText,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class CircularTextPage {
  protected readonly snippets = {
    install: `import { WrCircularText } from 'ngwr/circular-text';`,
    basic: `<wr-circular-text text="HELLO * NGWR * " />`,
    pause: `<wr-circular-text text="PAUSE ON HOVER * " onHover="pause" />`,
    bonkers: `<wr-circular-text
  text="GO BONKERS * "
  onHover="goBonkers"
  [spinDuration]="14"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'text', description: 'Text to lay out around the circle.', type: 'string', default: '— (required)', required: true },
    { name: 'spinDuration', description: 'Seconds per full revolution at rest.', type: 'number', default: '20' },
    { name: 'onHover', description: 'Hover behaviour. `null` disables hover reactivity.', type: "'speedUp' | 'slowDown' | 'pause' | 'goBonkers' | null", default: "'speedUp'" },
  ];
}
