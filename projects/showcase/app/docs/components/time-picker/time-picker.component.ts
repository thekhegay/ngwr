import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrTimePickerComponent } from 'ngwr/time-picker';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-time-picker-page',
  templateUrl: './time-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrTimePickerComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TimePickerPageComponent {
  protected readonly basic = signal<Date | null>(new Date());
  protected readonly h24 = signal<Date | null>(new Date());
  protected readonly h12 = signal<Date | null>(new Date());
  protected readonly withSeconds = signal<Date | null>(new Date());

  protected readonly snippets = {
    install: `import { WrTimePickerComponent } from 'ngwr/time-picker';
import { provideWrDateAdapter } from 'ngwr/date-adapter';

bootstrapApplication(AppComponent, {
  providers: [provideWrDateAdapter()],
});

@Component({ imports: [WrTimePickerComponent, FormsModule] })
export class MyComponent {
  protected readonly picked = signal<Date | null>(new Date());
}`,

    basic: `<wr-time-picker [(ngModel)]="picked" />`,

    twentyFour: `<wr-time-picker [(ngModel)]="picked" format="24h" />`,

    twelve: `<wr-time-picker [(ngModel)]="picked" format="12h" />`,

    seconds: `<wr-time-picker [(ngModel)]="picked" [showSeconds]="true" [step]="5" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'format',
      description: '12-hour, 24-hour, or auto (derived from the active locale).',
      type: "'auto' | '12h' | '24h'",
      default: "'auto'",
    },
    { name: 'showSeconds', description: 'Render the seconds input.', type: 'boolean', default: 'false' },
    { name: 'step', description: 'Step value for minutes and seconds inputs.', type: 'number', default: '1' },
    { name: 'disabled', description: 'Block interaction.', type: 'boolean', default: 'false' },
    { name: 'readonly', description: 'Values cannot be changed.', type: 'boolean', default: 'false' },
  ];
}
