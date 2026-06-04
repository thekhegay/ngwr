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
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'format',
      description: 'Format used for display + parsing. Either a named key or a raw token string.',
      type: "'shortDate' | 'mediumDate' | 'longDate' | string",
      default: "'shortDate'",
    },
    { name: 'placeholder', description: 'Placeholder text.', type: 'string', default: "''" },
    { name: 'min', description: 'Earliest selectable date.', type: 'Date | null', default: 'null' },
    { name: 'max', description: 'Latest selectable date.', type: 'Date | null', default: 'null' },
    {
      name: 'dateFilter',
      description: 'Predicate disabling individual dates.',
      type: '(date: Date) => boolean',
      default: 'null',
    },
    { name: 'disabled', description: 'Block interaction.', type: 'boolean', default: 'false' },
    {
      name: 'readonly',
      description: 'Input is not typeable; icon still opens the calendar.',
      type: 'boolean',
      default: 'false',
    },
  ];
}
