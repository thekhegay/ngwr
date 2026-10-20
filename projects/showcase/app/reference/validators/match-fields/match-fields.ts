import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

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
  selector: 'ngwr-vld-match-fields-page',
  templateUrl: './match-fields.html',
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
export default class MatchFieldsValidatorPage {
  /** Prefilled with two values that disagree: invalid from the first frame. */
  protected readonly form = new FormGroup(
    {
      password: new FormControl('hunter2', { nonNullable: true }),
      confirm: new FormControl('hunter3', { nonNullable: true, validators: [WrValidators.match('password')] }),
    },
    { validators: [WrValidators.matchFields('password', 'confirm')] }
  );

  protected readonly snippet = `import { FormControl, FormGroup } from '@angular/forms';
import { WrValidators } from 'ngwr/validators';

const form = new FormGroup(
  {
    password: new FormControl(''),
    confirm:  new FormControl(''),
  },
  { validators: [WrValidators.matchFields('password', 'confirm')] },
);`;

  protected readonly pairing = `const form = new FormGroup(
  {
    password: new FormControl(''),
    confirm:  new FormControl('', [WrValidators.match('password')]), // field message
  },
  { validators: [WrValidators.matchFields('password', 'confirm')] },
);`;

  protected readonly nested = `WrValidators.matchFields('billing.zip', 'shipping.zip');
WrValidators.matchFields('a', 'b', 'c');`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'signature',
      description: 'Call it with two or more control names. Add it to the group that owns them.',
      type: '(first: string, second: string, ...rest: readonly string[]) => ValidatorFn',
      default: '—',
    },
    {
      name: 'lookup',
      description:
        '`get()` paths: `billing.zip`, `items.0`. Name a leaf control. A missing name or a group turns the check off and warns in dev.',
      type: '—',
      default: '—',
    },
    {
      name: 'error key',
      description:
        'On mismatch: `{ matchFields: { fields: [...] } }` on the group. `fields` lists the compared names, never values.',
      type: '{ matchFields: { fields } }',
      default: '—',
    },
    {
      name: 'empty values',
      description: '`null`, `undefined` and `""` are equal. All empty passes; filled against empty fails.',
      type: '—',
      default: '—',
    },
    {
      name: 'comparison',
      description: 'Strict `===`: two `Date` objects for the same instant differ. Compare a primitive.',
      type: '—',
      default: '—',
    },
    {
      name: 'disabled controls',
      description: 'Skipped. Fewer than two enabled names passes.',
      type: '—',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Validator',
      title: 'match',
      url: ['/reference/validators', 'match'],
      description: 'The field-level check.',
    },
    {
      kind: 'Component',
      title: 'wr-form-field',
      url: ['/reference/components', 'form-field'],
      description: 'Label and error.',
    },
  ];
}
