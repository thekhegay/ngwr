import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { WrInput } from 'ngwr/input';
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

@Component({
  selector: 'ngwr-vld-card-number-page',
  templateUrl: './card-number.html',
  imports: [
    JsonPipe,
    ReactiveFormsModule,
    WrInput,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class CardNumberValidatorPage {
  protected readonly control = new FormControl('', { nonNullable: true, validators: [WrValidators.cardNumber] });

  protected readonly snippet = `import { FormControl } from '@angular/forms';
import { WrValidators } from 'ngwr/validators';

const card = new FormControl('', [WrValidators.cardNumber]);

card.setValue('4242 4242 4242 4242'); // valid
card.setValue('1234567890123456');    // { cardNumber: true }`;

  protected readonly api: readonly DocApiRow[] = [
    { name: 'signature', description: 'Add it to a `validators` array.', type: 'ValidatorFn', default: '—' },
    {
      name: 'accepted',
      description: '13 to 19 digits, valid Luhn checksum. Spaces and dashes are ignored.',
      type: 'string',
      default: '—',
    },
    {
      name: 'error key',
      description: 'On failure: `{ cardNumber: true }`. Empty value passes.',
      type: '{ cardNumber: true }',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'wr-input',
      url: ['/reference/components', 'input'],
    },
    {
      kind: 'Validator',
      title: 'cvc',
      url: ['/reference/validators', 'cvc'],
      description: 'The security code.',
    },
    {
      kind: 'Validator',
      title: 'iban',
      url: ['/reference/validators', 'iban'],
      description: 'Bank accounts.',
    },
  ];
}
