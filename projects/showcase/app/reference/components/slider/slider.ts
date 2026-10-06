import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

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
    RouterLink,
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
    single: `<wr-slider [(value)]="volume" min="0" max="100" />`,

    range: `<wr-slider [(value)]="priceRange" range min="0" max="1000" step="50" />`,

    stepped: `<wr-slider [(value)]="stepped" min="0" max="100" step="25" />`,

    disabled: `<wr-slider [(value)]="volume" disabled />`,
  };

  protected readonly api = API.WrSlider;
}
