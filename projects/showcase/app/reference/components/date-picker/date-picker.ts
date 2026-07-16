import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrDatePicker } from 'ngwr/date-picker';

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
}
