import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrDateTimePicker } from 'ngwr/date-time-picker';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-date-time-picker-page',
  templateUrl: './date-time-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrDateTimePicker,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class DateTimePickerPageComponent {
  protected readonly basic = signal<Date | null>(null);
  protected readonly customFormat = signal<Date | null>(null);
  protected readonly withSeconds = signal<Date | null>(null);

  protected readonly snippets = {
    install: `import { WrDateTimePicker } from 'ngwr/date-time-picker';
import { provideWrDateAdapter } from 'ngwr/date-adapter';

bootstrapApplication(AppComponent, {
  providers: [provideWrDateAdapter()],
});

@Component({ imports: [WrDateTimePicker, FormsModule] })
export class MyComponent {
  protected readonly when = signal<Date | null>(null);
}`,

    basic: `<wr-date-time-picker [(ngModel)]="when" placeholder="Pick date & time" />`,

    format: `<wr-date-time-picker
  [(ngModel)]="when"
  format="dd.MM.yyyy HH:mm"
  timeFormat="24h"
/>`,

    seconds: `<wr-date-time-picker
  [(ngModel)]="when"
  format="dd.MM.yyyy HH:mm:ss"
  timeFormat="24h"
  [showSeconds]="true"
  [step]="5"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'format',
      description: 'Format used by the input field.',
      type: "'shortDateTime' | 'mediumDateTime' | string",
      default: "'shortDateTime'",
    },
    { name: 'placeholder', description: 'Placeholder text.', type: 'string', default: "''" },
    { name: 'min', description: 'Earliest selectable date.', type: 'Date | null', default: 'null' },
    { name: 'max', description: 'Latest selectable date.', type: 'Date | null', default: 'null' },
    {
      name: 'dateFilter',
      description: 'Disables individual dates (time is independent).',
      type: '(date: Date) => boolean',
      default: 'null',
    },
    {
      name: 'timeFormat',
      description: 'Forwarded to the inner `<wr-time-picker>`.',
      type: "'auto' | '12h' | '24h'",
      default: "'auto'",
    },
    {
      name: 'showSeconds',
      description: 'Render the seconds input in the time picker.',
      type: 'boolean',
      default: 'false',
    },
    { name: 'step', description: 'Minute / second step.', type: 'number', default: '1' },
    { name: 'disabled', description: 'Block interaction.', type: 'boolean', default: 'false' },
    { name: 'readonly', description: 'Input not typeable; icon still opens.', type: 'boolean', default: 'false' },
  ];
}
