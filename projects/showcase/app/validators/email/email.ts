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

@Component({
  selector: 'ngwr-vld-email-page',
  templateUrl: './email.html',
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
export default class EmailValidatorPage {
  protected readonly control = new FormControl('', { nonNullable: true, validators: [WrValidators.email] });

  protected readonly snippet = `import { FormControl, Validators } from '@angular/forms';
import { WrValidators } from 'ngwr/validators';

const email = new FormControl('', [
  Validators.required,
  WrValidators.email,
]);

email.setValue('ada@');
email.errors; // { email: true }`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'signature',
      description: 'Static — drop directly into a `validators` array.',
      type: 'ValidatorFn',
      default: '—',
    },
    {
      name: 'error key',
      description: 'On failure: `{ email: true }`. Empty value passes (compose with `Validators.required`).',
      type: '{ email: true }',
      default: '—',
    },
  ];
}
