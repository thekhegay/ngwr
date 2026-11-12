import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrSlider, type WrSliderMark } from 'ngwr/slider';

import { DocApiComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-slider-page',
  templateUrl: './slider.html',
  imports: [FormsModule, WrSlider, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocApiComponent],
})
export default class SliderPageComponent {
  protected volume = 35;
  protected priceRange: [number, number] = [200, 800];
  protected stepped = 50;
  protected hours: [number, number] = [9, 17];
  protected level = 50;
  protected readonly levels: readonly WrSliderMark[] = [
    { value: 0, label: 'Low' },
    { value: 50, label: 'Medium' },
    { value: 100, label: 'High' },
  ];
  protected loudness = 60;
  protected readonly loudnessMarks: readonly WrSliderMark[] = [
    { value: 0, label: 'Mute' },
    { value: 50 },
    { value: 100, label: 'Max' },
  ];
  protected readonly bands = [
    { name: 'Bass', gain: 4 },
    { name: 'Mid', gain: -2 },
    { name: 'Treble', gain: 6 },
  ];
  protected readonly decibels = (value: number): string => `${value} dB`;
  protected readonly hour = (value: number): string => `${String(value).padStart(2, '0')}:00`;

  protected readonly snippets = {
    single: `<wr-slider [(value)]="volume" min="0" max="100" />`,

    range: `<wr-slider [(value)]="priceRange" range min="0" max="1000" step="50" />`,

    stepped: `<wr-slider [(value)]="stepped" min="0" max="100" step="25" />`,

    marks: `<wr-slider [(value)]="level" [marks]="levels" snapToMarks />

// levels = [
//   { value: 0, label: 'Low' },
//   { value: 50, label: 'Medium' },
//   { value: 100, label: 'High' },
// ];`,

    vertical: `<wr-slider orientation="vertical" [(value)]="volume" [marks]="marks" ariaLabel="Volume" />

@for (band of bands; track band.name) {
  <wr-slider
    orientation="vertical"
    [(value)]="band.gain"
    min="-12"
    max="12"
    [marks]="[{ value: 0 }]"
    [showValue]="false"
    [labelWith]="decibels"
    [ariaLabel]="band.name"
  />
}`,

    disabled: `<wr-slider [(value)]="volume" disabled />`,

    labelWith: `<wr-slider [(value)]="hours" range min="0" max="24" [labelWith]="hour" />

// hour = (value: number) => \`\${String(value).padStart(2, '0')}:00\`;`,
  };

  protected readonly api = API.WrSlider;
}
