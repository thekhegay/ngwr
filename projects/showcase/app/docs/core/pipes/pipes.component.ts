import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { RangePipe, WrBytesPipe, WrDatePipe, WrNumberPipe, WrTruncatePipe } from 'ngwr/pipes';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-pipes-page',
  templateUrl: './pipes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RangePipe,
    WrBytesPipe,
    WrDatePipe,
    WrNumberPipe,
    WrTruncatePipe,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class PipesPageComponent {
  protected readonly now = signal(new Date());
  protected readonly amount = signal(1234567.89);
  protected readonly bytes = signal(1234567);
  protected readonly longText = signal('Lorem ipsum dolor sit amet, consectetur adipiscing elit.');

  protected readonly snippets = {
    install: `import { WrNumberPipe, WrBytesPipe, WrDatePipe, WrTruncatePipe, RangePipe } from 'ngwr/pipes';

@Component({ imports: [WrNumberPipe, WrBytesPipe, WrDatePipe, WrTruncatePipe, RangePipe] })
export class MyComponent { /* ... */ }`,

    number: `{{ 1234.5 | wrNumber }}                       <!-- "1,234.5"   -->
{{ 0.875  | wrNumber: 'percent' }}            <!-- "88%"       -->
{{ 19.99  | wrNumber: 'currency': 'USD' }}    <!-- "$19.99"    -->
{{ 19.99  | wrNumber: { minimumFractionDigits: 2 } }}`,

    bytes: `{{ 1234     | wrBytes }}     <!-- "1.2 KB"   -->
{{ 1234567  | wrBytes: 0 }}  <!-- "1 MB"     -->`,

    date: `{{ now | wrDate }}                          <!-- shortDate            -->
{{ now | wrDate: 'mediumDateTime' }}        <!-- named key            -->
{{ now | wrDate: 'dd.MM.yyyy' }}            <!-- raw token string     -->`,

    truncate: `{{ 'Hello, world' | wrTruncate: 5 }}           <!-- "Hello…"      -->
{{ 'Hello, world' | wrTruncate: 8: '...' }}    <!-- "Hello, w..." -->`,

    range: `@for (i of (5 | range); track i) {
  <li>Item {{ i + 1 }}</li>
}`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrNumber',
      description: "Intl.NumberFormat via Angular's LOCALE_ID. Accepts a style shortcut or full options object.",
      type: "(value, 'decimal' | 'percent' | 'currency' | options, currency?) => string",
      default: '—',
    },
    {
      name: 'wrBytes',
      description: 'Humanise byte counts using binary (1024-based) units.',
      type: '(value: number, decimals = 1) => string',
      default: '—',
    },
    {
      name: 'wrDate',
      description:
        'Delegates to WrDateAdapter when provided; falls back to Intl.DateTimeFormat with the same named keys.',
      type: "(value: Date | string | number, format = 'shortDate') => string",
      default: '—',
    },
    {
      name: 'wrTruncate',
      description: 'Clamp string length with optional ellipsis (defaults to "…").',
      type: '(value: string, length = 80, ellipsis = "…") => string',
      default: '—',
    },
    {
      name: 'range',
      description: 'Create `[0, 1, …, length - 1]` — useful for `@for` over a fixed count.',
      type: '(length: number) => number[]',
      default: '—',
    },
  ];
}
