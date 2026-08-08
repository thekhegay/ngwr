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
  /**
   * Deliberately prefilled with two values that disagree — the case the
   * child-level `match` cannot see, because it runs before the control has a
   * parent. This group is invalid on the very first frame.
   */
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
    // match — gives the confirm field its own message, once touched
    confirm:  new FormControl('', [WrValidators.match('password')]),
  },
  // matchFields — makes the form correct from the first frame
  { validators: [WrValidators.matchFields('password', 'confirm')] },
);`;

  protected readonly nested = `// Names are AbstractControl.get() paths.
WrValidators.matchFields('billing.zip', 'shipping.zip');

// N-ary: every name is compared against the first.
WrValidators.matchFields('a', 'b', 'c');`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'signature',
      description: 'Factory — call with two or more control names. Attach the result to the GROUP that owns them.',
      type: '(first: string, second: string, ...rest: readonly string[]) => ValidatorFn',
      default: '—',
    },
    {
      name: 'lookup',
      description:
        'Names are `AbstractControl.get()` paths, so `billing.zip` reaches into a nested group and `items.0` into a `FormArray`. Name a LEAF: a name that resolves to a group or an array is refused too, because comparing two containers by reference can never succeed. Either case turns the whole check off — never a partial comparison — and warns once per validator instance in dev.',
      type: '—',
      default: '—',
    },
    {
      name: 'error key',
      description:
        'On mismatch: `{ matchFields: { fields: [...] } }`, on the GROUP. The payload echoes the configured names and deliberately carries no control values.',
      type: '{ matchFields: { fields } }',
      default: '—',
    },
    {
      name: 'empty values',
      description:
        '`null`, `undefined` and `""` count as the same empty value. All empty passes; one filled against one empty reports.',
      type: '—',
      default: '—',
    },
    {
      name: 'comparison',
      description:
        'Strict `===`, so two `Date` objects for the same instant are NOT equal — compare a derived primitive instead.',
      type: '—',
      default: '—',
    },
    {
      name: 'disabled controls',
      description:
        'Skipped, so the rule compares exactly what `group.value` contains. Fewer than two enabled names short-circuits to valid.',
      type: '—',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Validator',
      title: 'match',
      url: ['/reference/validators', 'match'],
      description: 'The child-level half of the pairing — what gives a field its message.',
    },
    {
      kind: 'Component',
      title: 'wr-form-field',
      url: ['/reference/components', 'form-field'],
      description: 'Renders a message per error key — for the one control projected into it.',
    },
  ];
}
