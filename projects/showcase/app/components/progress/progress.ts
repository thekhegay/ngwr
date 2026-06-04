import { Component, signal } from '@angular/core';

import { WrProgress } from 'ngwr/progress';
import { WR_COLORS } from 'ngwr/theme';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-progress-page',
  templateUrl: './progress.html',
  imports: [WrProgress, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
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
<input type="range" min="0" max="100" [value]="value()" (input)="value.set(+$event.target.value)" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'color', description: 'Bar color.', type: 'WrColor', default: "'primary'" },
    { name: 'value', description: 'Progress value, clamped to [0, 100].', type: 'number', default: '0' },
  ];

  protected onInput(event: Event): void {
    const v = Number((event.target as HTMLInputElement).value);
    this.demoValue.set(v);
  }
}
