import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrRating } from 'ngwr/rating';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-rating-page',
  templateUrl: './rating.html',
  imports: [
    RouterLink,
    WrRating,
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
    install: `import { WrRating } from 'ngwr/rating';

@Component({ imports: [WrRating] })
export class MyComponent {
  protected readonly score = signal<number | null>(0);
}`,

    basic: `<wr-rating [(value)]="score" />`,

    halves: `<wr-rating [(value)]="score" step="0.5" />`,

    tenStar: `<wr-rating [(value)]="score" [count]="10" />`,

    readonlyDemo: `<wr-rating [value]="4.5" step="0.5" [readonly]="true" />`,
  };

  protected readonly api = API.WrRating;
}
