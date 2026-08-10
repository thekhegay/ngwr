import { Component, signal } from '@angular/core';

import { WrProgress } from 'ngwr/progress';
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
  protected readonly demoValue = signal(35);

  protected readonly snippets = {
    install: `import { WrProgress } from 'ngwr/progress';

@Component({ imports: [WrProgress] })
export class MyComponent {}`,
    basic: `<wr-progress [value]="42" />`,
    colors: `<wr-progress color="success" [value]="80" />`,
    interactive: `<wr-progress [value]="value()" />
<wr-slider [(value)]="value" />`,
  };

  protected readonly api = API.WrProgress;
}
