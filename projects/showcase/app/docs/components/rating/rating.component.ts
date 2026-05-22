import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrRatingComponent } from 'ngwr/rating';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-rating-page',
  templateUrl: './rating.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrRatingComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class RatingPageComponent {
  protected readonly basic = signal<number | null>(3);
  protected readonly halves = signal<number | null>(3.5);
  protected readonly tenStar = signal<number | null>(7);
  protected readonly readonlyValue = signal<number | null>(4.5);

  protected readonly snippets = {
    install: `import { WrRatingComponent } from 'ngwr/rating';

@Component({ imports: [WrRatingComponent, FormsModule] })
export class MyComponent {
  protected readonly score = signal<number | null>(0);
}`,

    basic: `<wr-rating [(ngModel)]="score" />`,

    halves: `<wr-rating [(ngModel)]="score" step="0.5" />`,

    tenStar: `<wr-rating [(ngModel)]="score" [count]="10" />`,

    readonlyDemo: `<wr-rating [ngModel]="4.5" step="0.5" [readonly]="true" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'count', description: 'Total number of slots.', type: 'number', default: '5' },
    { name: 'step', description: 'Step granularity — whole or half stars.', type: '0.5 | 1', default: '1' },
    { name: 'readonly', description: 'Value is displayed but not interactive.', type: 'boolean', default: 'false' },
    { name: 'disabled', description: 'Block interaction.', type: 'boolean', default: 'false' },
    { name: 'ariaLabel', description: 'Accessible label for the slider.', type: 'string', default: "'Rating'" },
  ];
}
