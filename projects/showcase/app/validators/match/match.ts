import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

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
  selector: 'ngwr-vld-match-page',
  templateUrl: './match.html',
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
export default class MatchValidatorPage {
  protected readonly form = new FormGroup({
    password: new FormControl('', { nonNullable: true }),
    confirm: new FormControl('', { nonNullable: true, validators: [WrValidators.match('password')] }),
  });

  protected readonly snippet = `import { FormControl, FormGroup } from '@angular/forms';
import { WrValidators } from 'ngwr/validators';

const form = new FormGroup({
  password: new FormControl(''),
  confirm:  new FormControl('', [WrValidators.match('password')]),
});`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'signature',
      description: 'Factory — call with the sibling control name.',
      type: '(name: string) => ValidatorFn',
      default: '—',
    },
    {
      name: 'lookup',
      description:
        'Looks up the sibling via `control.parent.get(name)`. Returns null when the parent or sibling is missing.',
      type: '—',
      default: '—',
    },
    {
      name: 'error key',
      description: "On mismatch: `{ match: { name: 'password' } }`. Empty value passes.",
      type: '{ match: { name } }',
      default: '—',
    },
  ];
}
