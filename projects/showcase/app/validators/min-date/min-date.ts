import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { WrDatePicker } from 'ngwr/date-picker';
import { WrValidators } from 'ngwr/validators';

import {
  type DocApiRow,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

const MIN = '2026-01-01';

@Component({
  selector: 'ngwr-vld-min-date-page',
  templateUrl: './min-date.html',
  imports: [
    JsonPipe,
    ReactiveFormsModule,
    WrDatePicker,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class MinDateValidatorPage {
  protected readonly min = MIN;
  protected readonly control = new FormControl<Date | null>(null, {
    validators: [WrValidators.minDate(MIN)],
  });

  protected readonly snippet = `import { FormControl } from '@angular/forms';
import { WrValidators } from 'ngwr/validators';

const start = new FormControl('', [
  WrValidators.minDate('2026-01-01'),
]);

start.setValue('2025-12-31');
start.errors; // { minDate: { min: Date(2026-01-01) } }`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'signature',
      description: 'Factory — call with a `Date` or any value `new Date(v)` accepts (ISO string, epoch ms).',
      type: '(min: Date | string | number) => ValidatorFn',
      default: '—',
    },
    {
      name: 'error key',
      description: 'On failure: `{ minDate: { min: Date } }`. Empty value passes.',
      type: '{ minDate: { min } }',
      default: '—',
    },
  ];
}
