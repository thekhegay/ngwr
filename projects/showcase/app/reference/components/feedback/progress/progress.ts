import { Component, signal } from '@angular/core';

import { WrProgress, type WrProgressMark, type WrProgressSize } from 'ngwr/progress';
import { WrSlider } from 'ngwr/slider';
import { WR_COLORS } from 'ngwr/theme';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-progress-page',
  templateUrl: './progress.html',
  imports: [
    WrProgress,
    WrSlider,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class ProgressComponent {
  protected readonly colors = WR_COLORS;
  protected readonly sizes: readonly WrProgressSize[] = ['sm', 'md', 'lg'];
  protected readonly demoValue = signal(35);
  protected readonly marks: readonly WrProgressMark[] = [
    { value: 0, label: '1 Jan' },
    { value: 25, label: 'Rent review' },
    { value: 50 },
    { value: 75, label: 'Rent review' },
    { value: 100, label: '31 Dec' },
  ];

  protected readonly snippets = {
    basic: `<wr-progress [value]="42" />`,
    colors: `<wr-progress color="success" [value]="80" />`,
    sizes: `<wr-progress size="sm" [value]="65" />
<wr-progress size="md" [value]="65" />
<wr-progress size="lg" [value]="65" />`,
    indeterminate: `<wr-progress indeterminate />`,
    interactive: `<wr-progress [value]="value()" />
<wr-slider [(value)]="value" />`,
    marks: `<wr-progress size="sm" ariaLabel="Lease term" [value]="62" [marks]="marks" />

marks: readonly WrProgressMark[] = [
  { value: 0, label: '1 Jan' },
  { value: 25, label: 'Rent review' },
  { value: 50 },
  { value: 75, label: 'Rent review' },
  { value: 100, label: '31 Dec' },
];`,
  };

  protected readonly api = API.WrProgress;
}
