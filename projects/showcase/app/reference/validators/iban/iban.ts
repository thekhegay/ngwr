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
  selector: 'ngwr-vld-iban-page',
  templateUrl: './iban.html',
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
export default class IbanValidatorPage {
  protected readonly control = new FormControl('', { nonNullable: true, validators: [WrValidators.iban] });

  protected readonly snippet = `import { FormControl } from '@angular/forms';
import { WrValidators } from 'ngwr/validators';

const iban = new FormControl('', [WrValidators.iban]);

iban.setValue('GB82 WEST 1234 5698 7654 32'); // → valid (passes mod-97)`;

  protected readonly api: readonly DocApiRow[] = [
    { name: 'signature', description: 'Static — drop into a `validators` array.', type: 'ValidatorFn', default: '—' },
    {
      name: 'checks',
      description:
        'Structure (2 letters + 2 digits + alphanumerics) and ISO 13616 mod-97. Per-country length tables are **not** enforced.',
      type: '—',
      default: '—',
    },
    {
      name: 'error key',
      description: 'On failure: `{ iban: true }`. Empty value passes.',
      type: '{ iban: true }',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'wr-input',
      url: ['/reference/components', 'input'],
      description: 'Host control for account entry.',
    },
    {
      kind: 'Validator',
      title: 'cardNumber',
      url: ['/reference/validators', 'card-number'],
      description: 'Sibling rule for card payments.',
    },
  ];
}
