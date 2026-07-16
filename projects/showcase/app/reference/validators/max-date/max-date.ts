import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { WrDatePicker } from 'ngwr/date-picker';
import { WrValidators } from 'ngwr/validators';

import {
  type DocApiRow,
  type DocSeeAlsoLink,
  DocApiComponent,
  DocSeeAlsoComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

const MAX = '2026-12-31';

@Component({
  selector: 'ngwr-vld-max-date-page',
  templateUrl: './max-date.html',
  imports: [
    JsonPipe,
    ReactiveFormsModule,
    WrDatePicker,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class MaxDateValidatorPage {
  protected readonly max = MAX;
  protected readonly control = new FormControl<Date | null>(null, {
    validators: [WrValidators.maxDate(MAX)],
  });

  protected readonly snippet = `import { FormControl } from '@angular/forms';
import { WrValidators } from 'ngwr/validators';

const end = new FormControl('', [
  WrValidators.maxDate('2026-12-31'),
]);`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'signature',
      description: 'Factory — call with a `Date` or any value `new Date(v)` accepts.',
      type: '(max: Date | string | number) => ValidatorFn',
      default: '—',
    },
    {
      name: 'error key',
      description: 'On failure: `{ maxDate: { max: Date } }`. Empty value passes.',
      type: '{ maxDate: { max } }',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'wr-date-picker',
      url: ['/reference/components', 'date-picker'],
      description: 'Calendar-popup input - pair it with maxDate for range ceilings.',
    },
    {
      kind: 'Component',
      title: 'wr-calendar',
      url: ['/reference/components', 'calendar'],
      description: 'Inline month view with its own [max] guard.',
    },
    {
      kind: 'Validator',
      title: 'minDate',
      url: ['/reference/validators', 'min-date'],
      description: 'The matching lower-bound rule.',
    },
  ];
}
