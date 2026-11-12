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

  protected readonly clockKeys = [
    'time12h',
    'time24h',
    'timeSeconds',
    'time12hSeconds',
    'time24hSeconds',
    'shortDateTime12h',
    'shortDateTime24h',
    'shortDateTimeSeconds',
    'shortDateTime12hSeconds',
    'shortDateTime24hSeconds',
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
        'time24hSeconds',
        'shortDateTime12h',
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
    clock: `{{ now | wrDate: 'time24h' }}               <!-- 10:51     -->
{{ now | wrDate: 'time12hSeconds' }}        <!-- 10:51:07 AM -->
{{ now | wrDate: 'shortDateTimeSeconds' }}  <!-- 6/12/2026, 10:51:07 AM -->`,
    tokens: `{{ now | wrDate: 'dd.MM.yyyy' }}  <!-- 12.06.2026   -->
{{ now | wrDate: 'd MMMM yyyy' }} <!-- 12 June 2026 -->`,
    zone: `<!-- provideWr(withDates({ timeZone: 'Asia/Almaty' })) -->
{{ '2026-11-12T08:45:00Z' | wrDate: 'HH:mm' }}       <!-- 13:45      -->
{{ '2026-11-12' | wrDate: 'dd.MM.yyyy' }}            <!-- 12.11.2026 -->`,
    fn: `import { inject } from '@angular/core';
import { WrDateAdapter } from 'ngwr/date';
import { wrFormatDate } from 'ngwr/pipes';

const dates = inject(WrDateAdapter); // once, in a field or a constructor

wrFormatDate(row.createdAt, dates);                   // shortDate
wrFormatDate(row.createdAt, dates, 'mediumDateTime'); // Jun 12, 2026, 10:51 AM
wrFormatDate(row.createdAt, dates, 'dd.MM.yyyy');     // 12.06.2026`,
    parse: `import { wrParseDate } from 'ngwr/date';

wrParseDate('2026-03-01 14:30:00');        // 1 March 2026, 14:30 local
wrParseDate('2026-03-01');                 // 1 March 2026, 00:00 local
wrParseDate('2026-03-01T09:30:00+05:00');  // that instant
wrParseDate(1772343000000);                // epoch milliseconds
wrParseDate('n/a');                        // null`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrDate',
      description: 'Formats through `WrDateAdapter`: the native one, or your own.',
      type: "(value: Date | string | number | null | undefined, format: WrDateFormat | string = 'shortDate') => string",
      default: '—',
    },
    {
      name: 'wrFormatDate',
      description: 'The pipe as a function, over the adapter given.',
      type: "(value: Date | string | number | null | undefined, adapter: WrDateAdapter<Date>, format: WrDateFormat | string = 'shortDate') => string",
      default: '—',
    },
    {
      name: 'wrParseDate',
      description:
        'From `ngwr/date`. A backend value as a `Date`: the space form, a date-only string as the local day, an ISO string, epoch milliseconds or a `Date`. `null` for anything that holds no date.',
      type: '(value: Date | string | number | null | undefined) => Date | null',
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
