import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrClickSpark } from 'ngwr/click-spark';

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
  selector: 'ngwr-click-spark-page',
  templateUrl: './click-spark.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrClickSpark,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class ClickSparkPage {
  protected readonly snippets = {
    install: `import { WrClickSpark } from 'ngwr/click-spark';`,
    basic: `<wr-click-spark>
  <button>Click me</button>
</wr-click-spark>`,
    custom: `<wr-click-spark
  sparkColor="#6366f1"
  [sparkCount]="12"
  [sparkRadius]="30"
  [sparkSize]="14"
  [duration]="600"
  easing="ease-in-out"
  [extraScale]="1.5"
>
  <div>Click for a bigger burst</div>
</wr-click-spark>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'sparkColor', description: 'Spark stroke colour.', type: 'string', default: "'#fff'" },
    { name: 'sparkSize', description: 'Length of each spark line in px at start; tapers to 0 over the duration.', type: 'number', default: '10' },
    { name: 'sparkRadius', description: 'Distance each spark travels from the origin in px.', type: 'number', default: '15' },
    { name: 'sparkCount', description: 'Number of sparks per click, evenly distributed around the circle.', type: 'number', default: '8' },
    { name: 'duration', description: 'Animation duration in ms.', type: 'number', default: '400' },
    { name: 'easing', description: 'Easing applied to travel distance.', type: "'linear' | 'ease-in' | 'ease-in-out' | 'ease-out'", default: "'ease-out'" },
    { name: 'extraScale', description: 'Multiplier on travel distance — bumps the radius without changing sparkRadius.', type: 'number', default: '1' },
  ];
}
