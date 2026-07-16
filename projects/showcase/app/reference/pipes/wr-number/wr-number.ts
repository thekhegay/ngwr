import { Component, computed, signal } from '@angular/core';

import { WrNumber } from 'ngwr/pipes';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-pipe-wr-number-page',
  templateUrl: './wr-number.html',
  imports: [
    WrNumber,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocPlaygroundComponent,
  ],
})
export default class WrNumberPipePage {
  protected readonly amount = signal(19.99);
  protected readonly style = signal<'decimal' | 'percent' | 'currency'>('currency');
  protected readonly currency = signal<'USD' | 'EUR' | 'GBP' | 'UZS'>('USD');

  protected readonly playgroundSnippet = computed(() => {
    const style = this.style();
    if (style === 'currency') return `{{ ${this.amount()} | wrNumber: 'currency' : '${this.currency()}' }}`;
    if (style === 'percent') return `{{ ${this.amount()} | wrNumber: 'percent' }}`;
    return `{{ ${this.amount()} | wrNumber }}`;
  });

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Value', signal: this.amount, min: 0, max: 100000, step: 0.01, precision: 2 },
    { kind: 'select', label: 'Style', signal: this.style, options: ['decimal', 'percent', 'currency'] },
    { kind: 'select', label: 'Currency', signal: this.currency, options: ['USD', 'EUR', 'GBP', 'UZS'] },
  ];

  protected readonly snippets = {
    install: `import { WrNumber } from 'ngwr/pipes';

@Component({ imports: [WrNumber] })
export class MyComponent { /* ... */ }`,
    decimal: `{{ 1234.5 | wrNumber }}  <!-- "1,234.5" -->`,
    percent: `{{ 0.875 | wrNumber: 'percent' }}  <!-- "88%" -->`,
    currency: `{{ 19.99 | wrNumber: 'currency' : 'USD' }}  <!-- "$19.99" -->`,
    options: `{{ 19.9 | wrNumber: { minimumFractionDigits: 2 } }}      <!-- "19.90" -->
{{ 1234567 | wrNumber: { notation: 'compact' } }}        <!-- "1.2M"  -->`,
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
