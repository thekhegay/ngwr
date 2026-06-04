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
  selector: 'ngwr-vld-no-whitespace-page',
  templateUrl: './no-whitespace.html',
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
export default class NoWhitespaceValidatorPage {
  protected readonly control = new FormControl('', { nonNullable: true, validators: [WrValidators.noWhitespace] });

  protected readonly snippet = `import { FormControl } from '@angular/forms';
import { WrValidators } from 'ngwr/validators';

const username = new FormControl('', [WrValidators.noWhitespace]);

username.setValue('foo bar');
username.errors; // { noWhitespace: true }`;

  protected readonly api: readonly DocApiRow[] = [
    { name: 'signature', description: 'Static — drop into a `validators` array.', type: 'ValidatorFn', default: '—' },
    {
      name: 'error key',
      description: 'On failure: `{ noWhitespace: true }`. Empty value passes.',
      type: '{ noWhitespace: true }',
      default: '—',
    },
  ];
}
