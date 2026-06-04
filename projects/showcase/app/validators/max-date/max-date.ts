import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { WrInput } from 'ngwr/input';
import { WrValidators } from 'ngwr/validators';

import {
  type DocApiRow,
  DocApiComponent,
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
    WrInput,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class MaxDateValidatorPage {
  protected readonly max = MAX;
  protected readonly control = new FormControl('', {
    nonNullable: true,
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
}
