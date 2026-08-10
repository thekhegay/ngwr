import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrSlider } from 'ngwr/slider';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-slider-page',
  templateUrl: './slider.html',
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

    single: `<wr-slider [(value)]="volume" min="0" max="100" />`,

    range: `<wr-slider [(value)]="priceRange" range min="0" max="1000" step="50" />`,
  };

  protected readonly api = API.WrSlider;
}
