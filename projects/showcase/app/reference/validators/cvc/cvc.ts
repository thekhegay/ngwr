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
  selector: 'ngwr-vld-cvc-page',
  templateUrl: './cvc.html',
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
export default class CvcValidatorPage {
  protected readonly visa = new FormControl('', { nonNullable: true, validators: [WrValidators.cvc(3)] });
  protected readonly amex = new FormControl('', { nonNullable: true, validators: [WrValidators.cvc(4)] });

  protected readonly snippet = `import { FormControl } from '@angular/forms';
import { WrValidators } from 'ngwr/validators';

const cvc  = new FormControl('', [WrValidators.cvc()]);   // 3 digits
const amex = new FormControl('', [WrValidators.cvc(4)]);  // 4 digits`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'signature',
      description: 'Factory — call with the expected length.',
      type: '(length?: number) => ValidatorFn',
      default: '—',
    },
    {
      name: 'length',
      description: 'Exact digit count. 3 for Visa/MC/Discover, 4 for Amex.',
      type: 'number',
      default: '3',
    },
    {
      name: 'error key',
      description: 'On failure: `{ cvc: true }`. Empty value passes.',
      type: '{ cvc: true }',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'wr-input',
      url: ['/reference/components', 'input'],
      description: 'Host control for the 3-4 digit code.',
    },
    {
      kind: 'Validator',
      title: 'cardNumber',
      url: ['/reference/validators', 'card-number'],
      description: 'Sibling rule for the card number itself.',
    },
  ];
}
