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
}
