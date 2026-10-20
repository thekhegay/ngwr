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
        // Only tokens the native adapter knows; an unknown one prints as is.
        'd MMMM yyyy',
      ],
    },
  ];

  protected readonly snippets = {
    named: `{{ now | wrDate }}                    <!-- shortDate (default) -->
{{ now | wrDate: 'mediumDate' }}      <!-- Jun 12, 2026        -->
{{ now | wrDate: 'time' }}            <!-- 10:51 AM            -->
{{ now | wrDate: 'mediumDateTime' }}  <!-- Jun 12, 2026, 10:51 AM -->`,
    tokens: `{{ now | wrDate: 'dd.MM.yyyy' }}  <!-- 12.06.2026   -->
{{ now | wrDate: 'd MMMM yyyy' }} <!-- 12 June 2026 -->`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrDate',
      description: 'Formats through `WrDateAdapter`: the native one, or your own.',
      type: "(value: Date | string | number | null | undefined, format: WrDateFormat | string = 'shortDate') => string",
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'wr-date-picker',
      url: ['/reference/components', 'date-picker'],
      description: 'Pick the date.',
    },
    {
      kind: 'Guide',
      title: 'Date adapters',
      url: ['/docs', 'configuration'],
      description: 'Pin the locale or bring your own.',
    },
  ];
}
