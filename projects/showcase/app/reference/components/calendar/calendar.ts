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

  /**
   * The bounds demo gets its own date, and starts empty. Sharing `single` let a
   * click in the unbounded calendar above write a date this one's own `min` /
   * `max` / `dateFilter` reject — `isSelected` compares days and `isDisabled`
   * reads the bounds, so the cell rendered selected AND disabled at once, and
   * `viewDate` follows an out-of-range year into a grid with nothing enabled.
   * Empty rather than seeded because a seed has to dodge both the weekend
   * filter and the year bounds, and the routes are prerendered — a Saturday
   * build would ship the broken render as static HTML.
   */
  protected readonly bounded = signal<Date | null>(null);

  protected readonly snippets = {
    install: `import { WrCalendar } from 'ngwr/calendar';
import { provideWrDateAdapter } from 'ngwr/date';

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
