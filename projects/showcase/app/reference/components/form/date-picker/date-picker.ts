import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { WrButton } from 'ngwr/button';
import {
  type WrDatePickerSize,
  type WrDateRange,
  type WrDateRangePreset,
  WrDatePicker,
  WrDateRangePicker,
  wrLastDays,
  wrLastMonth,
  wrThisMonth,
} from 'ngwr/date-picker';
import { WrFormError, WrFormField } from 'ngwr/form';
import { WrKbd } from 'ngwr/keyboard';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-date-picker-page',
  templateUrl: './date-picker.html',
  imports: [
    ReactiveFormsModule,
    WrDatePicker,
    WrDateRangePicker,
    WrFormField,
    WrFormError,
    WrButton,
    WrKbd,
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
  protected readonly refused = signal<Date | null>(null);

  protected readonly time = signal<Date | null>(new Date());
  protected readonly time24 = signal<Date | null>(new Date());
  protected readonly timeSeconds = signal<Date | null>(new Date());

  protected readonly datetime = signal<Date | null>(null);
  protected readonly datetimeSeconds = signal<Date | null>(null);

  protected readonly period = signal<WrDateRange | null>(null);
  protected readonly window = signal<WrDateRange | null>(null);

  protected readonly presetPeriod = signal<WrDateRange | null>(null);
  protected readonly presets: readonly WrDateRangePreset[] = [
    { label: 'Last 7 days', range: wrLastDays(7) },
    { label: 'Last 30 days', range: wrLastDays(30) },
    { label: 'This month', range: wrThisMonth() },
    { label: 'Last month', range: wrLastMonth() },
  ];

  protected readonly sizes: readonly WrDatePickerSize[] = ['sm', 'md', 'lg'];
  protected readonly sized = signal<Date | null>(null);
  protected readonly sizedPeriod = signal<WrDateRange | null>(null);

  protected readonly clearableDate = signal<Date | null>(new Date());
  protected readonly clearablePeriod = signal<WrDateRange | null>([new Date(), new Date()]);

  // Bound so the lint rule's unbound-method check stays satisfied.
  private readonly required = Validators.required.bind(Validators);
  protected readonly reactiveForm = new FormGroup({
    due: new FormControl<Date | null>(null, this.required),
    period: new FormControl<WrDateRange | null>(null),
  });

  protected submitReactive(): void {
    this.reactiveForm.markAllAsTouched();
  }

  protected readonly today = new Date();
  protected readonly firstOfNextMonth = new Date(this.today.getFullYear(), this.today.getMonth() + 1, 1);
  protected readonly isWeekday = (d: Date): boolean => d.getDay() > 0 && d.getDay() < 6;

  protected readonly snippets = {
    openFromCode: `<wr-date-picker #due [(value)]="picked" (opened)="onOpened()" (closed)="onClosed()" />
<button wr-btn [attr.aria-expanded]="due.isOpen()" (click)="due.open()">Open</button>`,

    basic: `<wr-date-picker [(value)]="picked" placeholder="Pick a date" />`,

    format: `<wr-date-picker [(value)]="picked" format="dd.MM.yyyy" />`,

    bounds: `<wr-date-picker
  [(value)]="picked"
  [min]="today"
  [max]="firstOfNextMonth"
  [dateFilter]="isWeekday"
/>`,

    refused: `<wr-date-picker #dueField [(value)]="due" format="dd.MM.yyyy" [min]="today" />

@if (dueField.inputError(); as error) {
  <small>{{ error.message }}</small>
}`,

    time: `<wr-date-picker mode="time" [(value)]="picked" />`,

    time24: `<wr-date-picker mode="time" timeFormat="24h" [(value)]="picked" />`,

    timeSeconds: `<wr-date-picker
  mode="time"
  timeFormat="24h"
  [showSeconds]="true"
  [step]="5"
  [(value)]="picked"
/>`,

    datetime: `<wr-date-picker mode="datetime" [(value)]="when" />`,

    datetimeSeconds: `<wr-date-picker
  mode="datetime"
  format="dd.MM.yyyy HH:mm:ss"
  timeFormat="24h"
  [showSeconds]="true"
  [step]="5"
  [(value)]="when"
/>`,

    range: `import { type WrDateRange, WrDateRangePicker } from 'ngwr/date-picker';

@Component({ imports: [WrDateRangePicker] })
export class MyComponent {
  protected readonly period = signal<WrDateRange | null>(null);
}`,

    rangeTemplate: `<wr-date-range-picker
  [(value)]="period"
  startPlaceholder="From"
  endPlaceholder="To"
/>`,

    rangeDateTime: `<wr-date-range-picker
  mode="datetime"
  timeFormat="24h"
  format="dd.MM.yyyy HH:mm"
  [(value)]="window"
/>`,

    presets: `import { type WrDateRangePreset, wrLastDays, wrLastMonth, wrThisMonth } from 'ngwr/date-picker';

protected readonly presets: readonly WrDateRangePreset[] = [
  { label: 'Last 7 days', range: wrLastDays(7) },
  { label: 'Last 30 days', range: wrLastDays(30) },
  { label: 'This month', range: wrThisMonth() },
  { label: 'Last month', range: wrLastMonth() },
  // A range of your own: a fixed pair, or a function of { adapter, today }.
  { label: 'Yesterday', range: ({ adapter, today }) => [adapter.addDays(today, -1), adapter.addDays(today, -1)] },
];`,

    presetsTemplate: `<wr-date-range-picker [(value)]="period" [presets]="presets" presetsLabel="Quick ranges" />`,

    sizes: `<wr-date-picker size="sm" [(value)]="picked" />
<wr-date-range-picker size="lg" [(value)]="period" />`,

    clearable: `<wr-date-picker clearable [(value)]="picked" />
<wr-date-range-picker clearable [(value)]="period" />`,

    forms: `<!-- Signal Forms -->
<wr-date-picker [formField]="form.due" />

<!-- Reactive forms -->
<form [formGroup]="form">
  <wr-form-field label="Due date" required>
    <wr-date-picker formControlName="due" placeholder="Pick a date" />
    <wr-form-error key="required">Pick a due date.</wr-form-error>
  </wr-form-field>
</form>

<!-- The range picker's value is WrDateRange | null. -->
<wr-date-range-picker formControlName="period" />

<!-- ngModel -->
<wr-date-picker [(ngModel)]="due" name="due" />`,
    formsTs: `import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { type WrDateRange, WrDatePicker, WrDateRangePicker } from 'ngwr/date-picker';
import { WrFormError, WrFormField } from 'ngwr/form';

@Component({
  imports: [ReactiveFormsModule, WrFormField, WrFormError, WrDatePicker, WrDateRangePicker],
  templateUrl: './my.html',
})
export class MyComponent {
  protected readonly form = new FormGroup({
    due: new FormControl<Date | null>(null, Validators.required),
    period: new FormControl<WrDateRange | null>(null),
  });
}`,
  };

  protected readonly api = API.WrDatePicker;

  protected readonly rangeApi: readonly DocApiRow[] = [
    {
      name: 'value',
      description: 'The range as `[start, end]`. An end is `null` until picked; ends in the wrong order are swapped.',
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
        'Format for both ends. Defaults to `shortDate`, or `shortDateTime` with the clock of `timeFormat` and `showSeconds`.',
      type: 'WrDateFormat | string | null',
      default: 'null',
    },
    { name: 'startPlaceholder', description: 'Placeholder for the start input.', type: 'string', default: "''" },
    { name: 'endPlaceholder', description: 'Placeholder for the end input.', type: 'string', default: "''" },
    { name: 'separator', description: 'Glyph rendered between the two inputs.', type: 'string', default: "'–'" },
    {
      name: 'minDate',
      description: 'Earliest selectable date, for both ends. Not `min`, unlike `<wr-date-picker>`.',
      type: 'Date | null',
      default: 'null',
    },
    {
      name: 'maxDate',
      description: 'Latest selectable date, for both ends.',
      type: 'Date | null',
      default: 'null',
    },
    {
      name: 'dateFilter',
      description: 'Predicate disabling individual dates.',
      type: '((date: Date) => boolean) | null',
      default: 'null',
    },
    {
      name: 'timeFormat',
      description: '12 / 24-hour clock, in the time panels and both fields. Applies in `datetime` mode.',
      type: "'auto' | '12h' | '24h'",
      default: "'auto'",
    },
    {
      name: 'showSeconds',
      description: 'Show seconds on both time panels and in both fields.',
      type: 'boolean',
      default: 'false',
    },
    { name: 'step', description: 'Minute / second step for the time panels.', type: 'number', default: '1' },
    {
      name: 'size',
      description: 'Control size, forwarded to both fields. The popup keeps its size.',
      type: 'WrDatePickerSize',
      default: "'md'",
    },
    {
      name: 'clearable',
      description: 'Show a clear (×) button once either end is picked. It sets both ends to `null`.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'clearLabel',
      description: 'Clear button aria-label. Falls back to `common.clear`.',
      type: 'string | null',
      default: 'null',
    },
    {
      name: 'presets',
      description:
        'One-click ranges beside the calendar, labelled by the app. `range` is a `[start, end]` pair or a function of `{ adapter, today }`.',
      type: 'readonly WrDateRangePreset[]',
      default: '[]',
    },
    {
      name: 'presetsLabel',
      description: 'Accessible name of the preset list.',
      type: 'string | null',
      default: 'null',
    },
    { name: 'disabled', description: 'Block interaction.', type: 'boolean', default: 'false' },
    {
      name: 'panelAriaLabel',
      description:
        'Accessible name of the popup. Defaults to the catalog’s `datePicker.panelRange*` string for the `mode`.',
      type: 'string | null',
      default: 'null',
    },
    {
      name: 'panelClass',
      description: 'Extra classes for the popup’s overlay pane, as a string or an array.',
      type: 'WrClassInput',
      default: 'null',
    },
    {
      name: '(touch)',
      description: 'Emitted on blur so a bound field can mark itself touched.',
      type: 'void',
      default: '—',
    },
    { name: '(opened)', description: 'Fires after the popup opens.', type: 'void', default: '—' },
    { name: '(closed)', description: 'Fires after the popup closes.', type: 'void', default: '—' },
    {
      name: 'readonly',
      description: 'The value cannot change and the popup does not open. `<wr-date-picker>` still opens its popup.',
      type: 'boolean',
      default: 'false',
    },
  ];
}
