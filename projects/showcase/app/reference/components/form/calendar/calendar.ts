import { Component, signal } from '@angular/core';
import { FormField, form, readonly, required } from '@angular/forms/signals';

import { WrCalendar, type WrCalendarRange } from 'ngwr/calendar';
import { WrFormField } from 'ngwr/form';
import { WrKbd } from 'ngwr/keyboard';
import { WrSwitch } from 'ngwr/switch';

import {
  DocApiComponent,
  type DocCodeFile,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-calendar-page',
  templateUrl: './calendar.html',
  imports: [
    FormField,
    WrCalendar,
    WrFormField,
    WrKbd,
    WrSwitch,
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
    single: `<wr-calendar [(date)]="picked" />`,

    range: `<wr-calendar mode="range" [(range)]="picked" />`,

    bounds: `<wr-calendar
  [(date)]="picked"
  [min]="firstOfYear"
  [max]="lastOfYear"
  [dateFilter]="isWeekday"
/>`,
  };

  protected readonly locked = signal(false);
  private readonly model = signal<{ due: Date | null }>({ due: null });
  protected readonly task = form(this.model, path => {
    required(path.due, { message: 'Pick a day.' });
    readonly(path.due, () => this.locked());
  });

  protected readonly formFiles: readonly DocCodeFile[] = [
    {
      label: 'HTML',
      language: 'angular-html',
      code: `<wr-form-field label="Due date">
  <wr-calendar [formField]="task.due" />
</wr-form-field>
<wr-switch [(checked)]="locked">Read-only</wr-switch>`,
    },
    {
      label: 'TS',
      language: 'angular-ts',
      code: `import { Component, signal } from '@angular/core';
import { FormField, form, readonly, required } from '@angular/forms/signals';

import { WrCalendar } from 'ngwr/calendar';
import { WrFormField } from 'ngwr/form';
import { WrSwitch } from 'ngwr/switch';

@Component({
  selector: 'app-task',
  templateUrl: './task.html',
  imports: [FormField, WrCalendar, WrFormField, WrSwitch],
})
export class Task {
  protected readonly locked = signal(false);
  private readonly model = signal<{ due: Date | null }>({ due: null });
  protected readonly task = form(this.model, path => {
    required(path.due, { message: 'Pick a day.' });
    readonly(path.due, () => this.locked());
  });
}`,
    },
  ];

  protected readonly api = API.WrCalendar;
}
