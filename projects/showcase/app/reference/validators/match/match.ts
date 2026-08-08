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
      description:
        "On mismatch: `{ match: { target: 'password' } }`. There is no empty guard — a filled value against an empty one reports.",
      type: '{ match: { target } }',
      default: '—',
    },
    {
      name: 'initial values',
      description:
        'Cannot report a mismatch until something revalidates the control — a control runs its validators before it has a parent, so the sibling lookup finds nothing. `formControlName` revalidates when it binds; a guard or a service reading `form.valid` first does not. Put `matchFields` on the group to close that window.',
      type: '—',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Validator',
      title: 'matchFields',
      url: ['/reference/validators', 'match-fields'],
      description: 'The group-level counterpart — reports a mismatch that was there from the start.',
    },
    {
      kind: 'Component',
      title: 'wr-input',
      url: ['/reference/components', 'input'],
      description: 'Password + confirm fields this rule usually guards.',
    },
    {
      kind: 'Component',
      title: 'wr-form-field',
      url: ['/reference/components', 'form-field'],
      description: 'Label / hint / error scaffolding for the pair.',
    },
  ];
}
