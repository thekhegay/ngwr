import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrSlider } from 'ngwr/slider';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-slider-page',
  templateUrl: './slider.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrSlider,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class SliderPageComponent {
  protected volume = 35;
  protected priceRange: [number, number] = [200, 800];
  protected stepped = 50;

  protected readonly snippets = {
    install: `import { WrSlider } from 'ngwr/slider';

@Component({ imports: [WrSlider, FormsModule] })
export class MyComponent {
  protected volume = 35;
}`,

    single: `<wr-slider [(ngModel)]="volume" min="0" max="100" />`,

    range: `<wr-slider [(ngModel)]="priceRange" range min="0" max="1000" step="50" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'min', description: 'Lower bound.', type: 'number', default: '0' },
    { name: 'max', description: 'Upper bound.', type: 'number', default: '100' },
    { name: 'step', description: 'Step size used by drag and keyboard.', type: 'number', default: '1' },
    {
      name: 'range',
      description: 'Render two thumbs. Value shape becomes `[low, high]`.',
      type: 'boolean',
      default: 'false',
    },
    { name: 'disabled', description: 'Block interaction.', type: 'boolean', default: 'false' },
    {
      name: 'showLabel',
      description: 'Render the current value below the track.',
      type: 'boolean',
      default: 'true',
    },
  ];
}
