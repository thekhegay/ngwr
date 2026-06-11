import { Component, computed, signal } from '@angular/core';

import { WrClickSpark } from 'ngwr/click-spark';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  ReactbitsCredit,
} from '#core/components';

@Component({
  selector: 'ngwr-click-spark-page',
  templateUrl: './click-spark.html',
  imports: [
    WrClickSpark,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class ClickSparkPage {
  // Live demo state
  protected readonly sparkColor = signal('#ffffff');
  protected readonly sparkCount = signal(8);
  protected readonly sparkRadius = signal(15);
  protected readonly sparkSize = signal(10);
  protected readonly duration = signal(400);
  protected readonly easing = signal<'linear' | 'ease-in' | 'ease-in-out' | 'ease-out'>('ease-out');

  protected readonly snippet = computed(
    () =>
      `<wr-click-spark
  sparkColor="${this.sparkColor()}"
  [sparkCount]="${this.sparkCount()}"
  [sparkRadius]="${this.sparkRadius()}"
  [sparkSize]="${this.sparkSize()}"
  [duration]="${this.duration()}"
  easing="${this.easing()}"
>
  <div>Click me</div>
</wr-click-spark>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Spark Count', signal: this.sparkCount, min: 2, max: 24, step: 1 },
    { kind: 'slider', label: 'Spark Radius (px)', signal: this.sparkRadius, min: 5, max: 60, step: 1, unit: 'px' },
    { kind: 'slider', label: 'Spark Size (px)', signal: this.sparkSize, min: 2, max: 30, step: 1, unit: 'px' },
    { kind: 'slider', label: 'Duration (ms)', signal: this.duration, min: 100, max: 1500, step: 50, unit: 'ms' },
    {
      kind: 'select',
      label: 'Easing',
      signal: this.easing,
      options: ['linear', 'ease-in', 'ease-out', 'ease-in-out'] as const,
    },
    { kind: 'color', label: 'Color', signal: this.sparkColor },
  ];

  protected readonly snippets = {
    install: `import { WrClickSpark } from 'ngwr/click-spark';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'sparkColor', description: 'Spark stroke colour.', type: 'string', default: "'#fff'" },
    {
      name: 'sparkSize',
      description: 'Length of each spark line in px at start; tapers to 0 over the duration.',
      type: 'number',
      default: '10',
    },
    {
      name: 'sparkRadius',
      description: 'Distance each spark travels from the origin in px.',
      type: 'number',
      default: '15',
    },
    {
      name: 'sparkCount',
      description: 'Number of sparks per click, evenly distributed around the circle.',
      type: 'number',
      default: '8',
    },
    { name: 'duration', description: 'Animation duration in ms.', type: 'number', default: '400' },
    {
      name: 'easing',
      description: 'Easing applied to travel distance.',
      type: "'linear' | 'ease-in' | 'ease-in-out' | 'ease-out'",
      default: "'ease-out'",
    },
    {
      name: 'extraScale',
      description: 'Multiplier on travel distance — bumps the radius without changing sparkRadius.',
      type: 'number',
      default: '1',
    },
  ];
}
