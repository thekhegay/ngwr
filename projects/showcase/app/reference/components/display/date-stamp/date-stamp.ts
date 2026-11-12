import { Component } from '@angular/core';

import { WrDateStamp } from 'ngwr/date-stamp';
import { type WrTableColumns, WrTable, WrTableCell } from 'ngwr/table';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

interface Shift {
  readonly id: string;
  readonly driver: string;
  readonly createdAt: string;
  readonly closedAt: string | null;
}

@Component({
  selector: 'ngwr-date-stamp-page',
  templateUrl: './date-stamp.html',
  imports: [
    WrDateStamp,
    WrTable,
    WrTableCell,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class DateStampPageComponent {
  protected readonly created = new Date(Date.UTC(2026, 10, 12, 8, 45, 30));

  protected readonly columns: WrTableColumns<Shift> = {
    id: { title: 'Shift' },
    driver: { title: 'Driver' },
    createdAt: { title: 'Opened' },
    closedAt: { title: 'Closed' },
  };

  protected readonly rows: readonly Shift[] = [
    { id: 'SH-1042', driver: 'Ann Lee', createdAt: '2026-11-12T02:00:00Z', closedAt: '2026-11-12T14:05:00Z' },
    { id: 'SH-1043', driver: 'Omar Haddad', createdAt: '2026-11-12T14:00:00Z', closedAt: '2026-11-13T02:10:00Z' },
    { id: 'SH-1044', driver: 'Mei Tanaka', createdAt: '2026-11-13T02:00:00Z', closedAt: null },
  ];

  protected readonly snippets = {
    basic: `<wr-date-stamp [value]="order.createdAt" />
<wr-date-stamp value="2026-11-12T08:45:00Z" />`,
    table: `<wr-table [columns]="columns" [items]="shifts">
  <ng-template wrTableCell="createdAt" let-value>
    <wr-date-stamp [value]="value" />
  </ng-template>
  <ng-template wrTableCell="closedAt" let-value>
    <wr-date-stamp [value]="value" />
  </ng-template>
</wr-table>`,
    formats: `<wr-date-stamp [value]="at" dateFormat="longDate" timeFormat="time24hSeconds" />
<wr-date-stamp [value]="at" dateFormat="d MMM yyyy" timeFormat="HH:mm" />`,
    zone: `import { provideWr } from 'ngwr';
import { withDates } from 'ngwr/date';
import { provideWrI18n } from 'ngwr/i18n';

providers: [
  provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru', 'en'] }),
  provideWr(withDates({ timeZone: 'Asia/Almaty' })),
],

// <wr-date-stamp value="2026-11-12T08:45:00Z" />
// 12 нояб. 2026 г.
// 13:45`,
    dateOnly: `<wr-date-stamp value="2026-11-12" />`,
    empty: `<wr-date-stamp [value]="null" />
<wr-date-stamp [value]="shift.closedAt" emptyLabel="not closed" />`,
  };

  protected readonly api = API.WrDateStamp;
}
