import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { WrNumberPipe } from 'ngwr/pipes';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-pipe-wr-number-page',
  templateUrl: './wr-number.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrNumberPipe,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class WrNumberPipePageComponent {
  protected readonly amount = signal(1234567.89);

  protected readonly snippets = {
    install: `import { WrNumberPipe } from 'ngwr/pipes';

@Component({ imports: [WrNumberPipe] })
export class MyComponent { /* ... */ }`,

    usage: `{{ 1234.5 | wrNumber }}                       <!-- "1,234.5"   -->
{{ 0.875  | wrNumber: 'percent' }}            <!-- "88%"       -->
{{ 19.99  | wrNumber: 'currency': 'USD' }}    <!-- "$19.99"    -->
{{ 19.99  | wrNumber: { minimumFractionDigits: 2 } }}`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrNumber',
      description: "Intl.NumberFormat via Angular's LOCALE_ID. Accepts a style shortcut or full options object.",
      type: "(value, 'decimal' | 'percent' | 'currency' | options, currency?) => string",
      default: '—',
    },
  ];
}
