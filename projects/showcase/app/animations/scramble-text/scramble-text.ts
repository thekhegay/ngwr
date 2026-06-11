import { Component, computed, signal } from '@angular/core';

import { WrScrambleText } from 'ngwr/scramble-text';

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
  selector: 'ngwr-scramble-text-page',
  templateUrl: './scramble-text.html',
  imports: [
    WrScrambleText,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class ScrambleTextPage {
  // Live demo state
  protected readonly radius = signal(100);
  protected readonly duration = signal(1.2);
  protected readonly speed = signal(0.05);
  protected readonly scrambleChars = signal('.:');

  protected readonly snippet = computed(
    () =>
      `<wr-scramble-text
  [radius]="${this.radius()}"
  [duration]="${this.duration()}"
  [speed]="${this.speed()}"
  scrambleChars="${this.scrambleChars()}"
>
  Hover this paragraph to scramble characters near the cursor.
</wr-scramble-text>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Radius (px)', signal: this.radius, min: 20, max: 240, step: 5, unit: 'px' },
    {
      kind: 'slider',
      label: 'Duration (s)',
      signal: this.duration,
      min: 0.2,
      max: 3,
      step: 0.1,
      precision: 1,
      unit: 's',
    },
    {
      kind: 'slider',
      label: 'Speed (s)',
      signal: this.speed,
      min: 0.01,
      max: 0.2,
      step: 0.01,
      precision: 2,
      unit: 's',
    },
    { kind: 'text', label: 'Glyph Pool', signal: this.scrambleChars, placeholder: '.:' },
  ];

  protected readonly snippets = {
    install: `import { WrScrambleText } from 'ngwr/scramble-text';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'radius',
      description: 'Proximity radius in pixels — chars within this distance of the cursor will scramble.',
      type: 'number',
      default: '100',
    },
    {
      name: 'duration',
      description: 'Max scramble duration in seconds (scaled by proximity — closer = longer).',
      type: 'number',
      default: '1.2',
    },
    {
      name: 'speed',
      description: 'Approximate seconds between random-char swaps. Lower = faster scramble.',
      type: 'number',
      default: '0.05',
    },
    { name: 'scrambleChars', description: 'Pool of glyphs to scramble through.', type: 'string', default: "'.:'" },
  ];
}
