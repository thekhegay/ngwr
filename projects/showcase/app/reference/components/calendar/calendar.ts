import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrCalendar, type WrCalendarRange } from 'ngwr/calendar';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-calendar-page',
  templateUrl: './calendar.html',
  imports: [
    FormsModule,
    WrCalendar,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class CalendarPageComponent {
  protected readonly single = signal<Date | null>(new Date());
  protected readonly range = signal<WrCalendarRange>([null, null]);

  protected readonly minDate = new Date(new Date().getFullYear(), 0, 1);
  protected readonly maxDate = new Date(new Date().getFullYear(), 11, 31);
  protected readonly isWeekday = (d: Date): boolean => d.getDay() > 0 && d.getDay() < 6;

  protected readonly snippets = {
    install: `import { WrCalendar } from 'ngwr/calendar';
import { provideWrDateAdapter } from 'ngwr/date-adapter';

// In main.ts
bootstrapApplication(AppComponent, {
  providers: [provideWrDateAdapter()],
});

// In any component
@Component({ imports: [WrCalendar, FormsModule] })
export class MyComponent {
  protected readonly picked = signal<Date | null>(new Date());
}`,

    single: `<wr-calendar [(date)]="picked" />`,

    range: `<wr-calendar mode="range" [(range)]="picked" />`,

    bounds: `<wr-calendar
  [(date)]="picked"
  [min]="firstOfYear"
  [max]="lastOfYear"
  [dateFilter]="isWeekday"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'mode', description: 'Selection mode.', type: "'single' | 'range'", default: "'single'" },
    { name: 'date', description: 'Two-way bound single date.', type: 'Date | null', default: 'null' },
    {
      name: 'range',
      description: 'Two-way bound `[start, end]` tuple.',
      type: '[Date, Date]',
      default: '[null, null]',
    },
    { name: 'min', description: 'Earliest selectable date (inclusive).', type: 'Date | null', default: 'null' },
    { name: 'max', description: 'Latest selectable date (inclusive).', type: 'Date | null', default: 'null' },
    {
      name: 'dateFilter',
      description: 'Predicate — return `false` to disable specific days.',
      type: '(date: Date) => boolean',
      default: 'null',
    },
    { name: 'disabled', description: 'Block interaction.', type: 'boolean', default: 'false' },
  ];
}
