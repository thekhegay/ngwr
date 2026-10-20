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
    DocSeeAlsoComponent,
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
      description: 'Call it with the sibling control name.',
      type: '(name: string) => ValidatorFn',
      default: '—',
    },
    {
      name: 'lookup',
      description: 'Reads `control.parent.get(name)`. Passes when the parent or the sibling is missing.',
      type: '—',
      default: '—',
    },
    {
      name: 'error key',
      description: "On mismatch: `{ match: { target: 'password' } }`. A filled value against an empty one fails.",
      type: '{ match: { target } }',
      default: '—',
    },
    {
      name: 'initial values',
      description: 'Not reported until the control revalidates. Add `matchFields` to the group.',
      type: '—',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Validator',
      title: 'matchFields',
      url: ['/reference/validators', 'match-fields'],
      description: 'The same check on the group.',
    },
    {
      kind: 'Component',
      title: 'wr-input',
      url: ['/reference/components', 'input'],
    },
    {
      kind: 'Component',
      title: 'wr-form-field',
      url: ['/reference/components', 'form-field'],
      description: 'Label and error.',
    },
  ];
}
