import { Component, signal } from '@angular/core';

import { WrInputNumber } from 'ngwr/input-number';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-input-number-page',
  templateUrl: './input-number.html',
  imports: [
    WrInputNumber,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class InputNumberPageComponent {
  protected readonly basic = signal<number | null>(1);
  protected readonly bounded = signal<number | null>(50);
  protected readonly price = signal<number | null>(199.99);
  protected readonly weight = signal<number | null>(2.5);
  protected readonly noSteppers = signal<number | null>(42);

  protected readonly snippets = {
    install: `import { WrInputNumber } from 'ngwr/input-number';

@Component({ imports: [WrInputNumber] })
export class MyComponent {
  protected readonly value = signal<number | null>(0);
}`,

    basic: `<wr-input-number [(value)]="value" />`,

    bounded: `<wr-input-number [(value)]="value" [min]="0" [max]="100" [step]="5" />`,

    price: `<wr-input-number [(value)]="price" prefix="$" [decimals]="2" />`,

    weight: `<wr-input-number [(value)]="weight" suffix="kg" [decimals]="1" [step]="0.1" />`,

    noSteppers: `<wr-input-number [(value)]="value" [showSteppers]="false" />`,
  };

  protected readonly api = API.WrInputNumber;
}
