import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { type WrDateRange, WrDatePicker, WrDateRangePicker } from 'ngwr/date-picker';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-date-picker-page',
  templateUrl: './date-picker.html',
  imports: [
    FormsModule,
    WrDatePicker,
    WrDateRangePicker,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class DatePickerPageComponent {
  protected readonly basic = signal<Date | null>(null);
  protected readonly formatted = signal<Date | null>(null);
  protected readonly bounded = signal<Date | null>(null);

  protected readonly time = signal<Date | null>(new Date());
  protected readonly time24 = signal<Date | null>(new Date());
  protected readonly timeSeconds = signal<Date | null>(new Date());

  protected readonly datetime = signal<Date | null>(null);
  protected readonly datetimeSeconds = signal<Date | null>(null);

  protected readonly period = signal<WrDateRange | null>(null);
  protected readonly window = signal<WrDateRange | null>(null);

  protected readonly today = new Date();
  protected readonly nextMonth = new Date(this.today.getFullYear(), this.today.getMonth() + 1, this.today.getDate());
  protected readonly isWeekday = (d: Date): boolean => d.getDay() > 0 && d.getDay() < 6;

  protected readonly snippets = {
    install: `import { WrDatePicker } from 'ngwr/date-picker';
import { provideWrDateAdapter } from 'ngwr/date-adapter';

bootstrapApplication(AppComponent, {
  providers: [provideWrDateAdapter()],
});

@Component({ imports: [WrDatePicker, FormsModule] })
export class MyComponent {
  protected readonly picked = signal<Date | null>(null);
}`,

    basic: `<wr-date-picker [(ngModel)]="picked" placeholder="Pick a date" />`,

    format: `<wr-date-picker [(ngModel)]="picked" format="dd.MM.yyyy" />`,

    bounds: `<wr-date-picker
  [(ngModel)]="picked"
  [min]="today"
  [max]="nextMonth"
  [dateFilter]="isWeekday"
/>`,

    time: `<!-- Time-only: HH:MM stepper with optional AM/PM -->
<wr-date-picker mode="time" [(ngModel)]="picked" />`,

    time24: `<wr-date-picker mode="time" timeFormat="24h" [(ngModel)]="picked" />`,

    timeSeconds: `<wr-date-picker
  mode="time"
  timeFormat="24h"
  [showSeconds]="true"
  [step]="5"
  [(ngModel)]="picked"
/>`,

    datetime: `<!-- Date + time: calendar above, stepper below. Picking a date keeps the
     overlay open so the user can set the time next. -->
<wr-date-picker mode="datetime" [(ngModel)]="when" />`,

    datetimeSeconds: `<wr-date-picker
  mode="datetime"
  format="dd.MM.yyyy HH:mm:ss"
  timeFormat="24h"
  [showSeconds]="true"
  [step]="5"
  [(ngModel)]="when"
/>`,

    range: `import { type WrDateRange, WrDateRangePicker } from 'ngwr/date-picker';

@Component({ imports: [WrDateRangePicker, FormsModule] })
export class MyComponent {
  protected readonly period = signal<WrDateRange | null>(null);
}`,

    rangeTemplate: `<wr-date-range-picker
  [(ngModel)]="period"
  startPlaceholder="From"
  endPlaceholder="To"
/>`,

    rangeDateTime: `<!-- One time stepper per end; picking dates keeps the overlay open. -->
<wr-date-range-picker
  mode="datetime"
  timeFormat="24h"
  format="dd.MM.yyyy HH:mm"
  [(ngModel)]="window"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'mode',
      description:
        'Picker behavior. `date` (default) renders a calendar, `time` renders an HH:MM[:SS] stepper, `datetime` stacks both.',
      type: "'date' | 'time' | 'datetime'",
      default: "'date'",
    },
    {
      name: 'format',
      description:
        'Display + parse format. Pass a named key or raw token string. When omitted, derived from `mode` (`shortDate` / `shortTime` / `shortDateTime`).',
      type: "'shortDate' | 'shortTime' | 'shortDateTime' | string | null",
      default: 'null',
    },
    { name: 'placeholder', description: 'Placeholder text.', type: 'string', default: "''" },
    {
      name: 'min',
      description: 'Earliest selectable date. Ignored in `time` mode.',
      type: 'Date | null',
      default: 'null',
    },
    {
      name: 'max',
      description: 'Latest selectable date. Ignored in `time` mode.',
      type: 'Date | null',
      default: 'null',
    },
    {
      name: 'dateFilter',
      description: 'Predicate disabling individual dates. Ignored in `time` mode.',
      type: '(date: Date) => boolean',
      default: 'null',
    },
    {
      name: 'timeFormat',
      description: 'Time-panel 12 / 24-hour format. Applies in `time` + `datetime` modes.',
      type: "'auto' | '12h' | '24h'",
      default: "'auto'",
    },
    {
      name: 'showSeconds',
      description: 'Render the seconds column on the time panel.',
      type: 'boolean',
      default: 'false',
    },
    { name: 'step', description: 'Minute / second step for the time panel.', type: 'number', default: '1' },
    { name: 'disabled', description: 'Block interaction.', type: 'boolean', default: 'false' },
    {
      name: 'readonly',
      description: 'Input is not typeable; trigger icon still opens the overlay.',
      type: 'boolean',
      default: 'false',
    },
  ];

  protected readonly rangeApi: readonly DocApiRow[] = [
    {
      name: 'value',
      description:
        'The picked range as `[start, end]`. Either end may be `null` while half-picked; out-of-order ends are swapped on commit.',
      type: 'WrDateRange | null',
      default: 'null',
    },
    {
      name: 'mode',
      description: '`date` (default) renders a range calendar; `datetime` adds a time stepper per end.',
      type: "'date' | 'datetime'",
      default: "'date'",
    },
    {
      name: 'format',
      description:
        'Display + parse format for both ends. When omitted, derived from `mode` (`shortDate` / `shortDateTime`).',
      type: 'string | null',
      default: 'null',
    },
    { name: 'startPlaceholder', description: 'Placeholder for the start input.', type: 'string', default: "''" },
    { name: 'endPlaceholder', description: 'Placeholder for the end input.', type: 'string', default: "''" },
    { name: 'separator', description: 'Glyph rendered between the two inputs.', type: 'string', default: "'–'" },
    {
      name: 'minDate',
      description:
        'Earliest selectable date, both ends. Named `minDate` because signal forms reserve `min` for the value type — here a range.',
      type: 'Date | null',
      default: 'null',
    },
    {
      name: 'maxDate',
      description: 'Latest selectable date, both ends.',
      type: 'Date | null',
      default: 'null',
    },
    {
      name: 'dateFilter',
      description: 'Predicate disabling individual dates.',
      type: '(date: Date) => boolean',
      default: 'null',
    },
    {
      name: 'timeFormat',
      description: 'Time-panel 12 / 24-hour format. Applies in `datetime` mode.',
      type: "'auto' | '12h' | '24h'",
      default: "'auto'",
    },
    {
      name: 'showSeconds',
      description: 'Render the seconds column on both time panels.',
      type: 'boolean',
      default: 'false',
    },
    { name: 'step', description: 'Minute / second step for the time panels.', type: 'number', default: '1' },
    { name: 'disabled', description: 'Block interaction.', type: 'boolean', default: 'false' },
    {
      name: 'readonly',
      description: 'Inputs are not typeable; trigger icon still opens the overlay.',
      type: 'boolean',
      default: 'false',
    },
  ];
}
