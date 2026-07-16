import { Component, computed, signal } from '@angular/core';

import { WrDate } from 'ngwr/pipes';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-pipe-wr-date-page',
  templateUrl: './wr-date.html',
  imports: [
    WrDate,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocPlaygroundComponent,
    DocSeeAlsoComponent,
  ],
})
export default class WrDatePipePage {
  protected readonly now = signal(new Date());

  protected readonly namedKeys = [
    'shortDate',
    'mediumDate',
    'longDate',
    'time',
    'shortDateTime',
    'mediumDateTime',
  ] as const;

  protected readonly format = signal<string>('mediumDateTime');

  protected readonly playgroundSnippet = computed(() => `{{ now | wrDate: '${this.format()}' }}`);

  protected readonly controls: readonly DocControl[] = [
    {
      kind: 'select',
      label: 'Format',
      signal: this.format,
      options: [
        'shortDate',
        'mediumDate',
        'longDate',
        'time',
        'shortDateTime',
        'mediumDateTime',
        'dd.MM.yyyy',
        'EEEE, d MMMM',
      ],
    },
  ];

  protected readonly snippets = {
    install: `import { WrDate } from 'ngwr/pipes';

@Component({ imports: [WrDate] })
export class MyComponent { /* ... */ }`,
    named: `{{ now | wrDate }}                    <!-- shortDate (default) -->
{{ now | wrDate: 'mediumDate' }}      <!-- Jun 12, 2026        -->
{{ now | wrDate: 'time' }}            <!-- 10:51 AM            -->
{{ now | wrDate: 'mediumDateTime' }}  <!-- Jun 12, 2026, 10:51 AM -->`,
    tokens: `{{ now | wrDate: 'dd.MM.yyyy' }}   <!-- 12.06.2026 -->
{{ now | wrDate: 'EEEE, d MMMM' }} <!-- Friday, 12 June -->`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrDate',
      description:
        'Delegates to WrDateAdapter when provided; falls back to Intl.DateTimeFormat with the same named keys.',
      type: "(value: Date | string | number, format = 'shortDate') => string",
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'wr-date-picker',
      url: ['/reference/components', 'date-picker'],
      description: 'Produces the Date values this pipe renders.',
    },
    {
      kind: 'Guide',
      title: 'Date adapters',
      url: ['/start', 'configuration'],
      description: 'Wire date-fns or Luxon to unlock token strings.',
    },
  ];
}
