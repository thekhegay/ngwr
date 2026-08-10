import { Component, signal } from '@angular/core';

import { WrCalendar, type WrCalendarRange } from 'ngwr/calendar';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-calendar-page',
  templateUrl: './calendar.html',
  imports: [WrCalendar, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
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
@Component({ imports: [WrCalendar] })
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

  protected readonly api = API.WrCalendar;
}
