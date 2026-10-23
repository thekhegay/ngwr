import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { WrButton } from 'ngwr/button';
import { WrFormError, WrFormField } from 'ngwr/form';
import { WrInput } from 'ngwr/input';

import {
  type DocApiRow,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-form-field-page',
  templateUrl: './form-field.html',
  imports: [
    ReactiveFormsModule,
    WrButton,
    WrFormError,
    WrFormField,
    WrInput,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class FormFieldPage {
  // Wrap `Validators.required` so the lint rule's unbound-method check stays satisfied.
  private readonly required = Validators.required.bind(Validators);
  private readonly emailValidator = Validators.email.bind(Validators);

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [this.required, this.emailValidator] }),
    name: new FormControl('', { nonNullable: true, validators: [this.required] }),
    bio: new FormControl('', { nonNullable: true }),
  });

  /** No `<wr-form-error>` and no `{ message }`: the copy is this site's own `validation.*` catalog. */
  protected readonly autoForm = new FormGroup({
    handle: new FormControl('', {
      nonNullable: true,
      validators: [this.required, Validators.minLength(4)],
    }),
    age: new FormControl('', { nonNullable: true, validators: [Validators.min(18)] }),
  });

  protected submitAuto(): void {
    this.autoForm.markAllAsTouched();
  }

  protected submit(): void {
    this.form.markAllAsTouched();
  }

  protected readonly snippets = {
    basic: `<wr-form-field label="Email" hint="We'll never share it." required>
  <input wrInput [formControl]="email" type="email" />
  <wr-form-error key="required">Email is required.</wr-form-error>
  <wr-form-error key="email">That isn't a valid email.</wr-form-error>
</wr-form-field>`,

    // `wrInput` gives the field its id and ARIA wiring.
    optional: `<wr-form-field label="Bio" optional hint="Up to 140 characters.">
  <input wrInput [formControl]="bio" placeholder="A short tagline" />
</wr-form-field>`,

    requiredPair: `<!-- Validators.required on the control, required on the field. -->
<wr-form-field label="Email" required>
  <input wrInput formControlName="email" type="email" />
</wr-form-field>

<!-- Or read it off the control; requiredValidator is Validators.required. -->
<wr-form-field label="Email" [required]="form.controls.email.hasValidator(requiredValidator)">
  <input wrInput formControlName="email" type="email" />
</wr-form-field>`,
    auto: `<!-- Messages come from validation.required, .minlength and .min in your catalog. -->
<wr-form-field label="Handle" required>
  <input wrInput formControlName="handle" />
</wr-form-field>

<wr-form-field label="Age">
  <input wrInput formControlName="age" type="number" />
</wr-form-field>`,
    message: `import { Component, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { WrFormField } from 'ngwr/form';
import { WrInput } from 'ngwr/input';

@Component({
  imports: [FormField, WrFormField, WrInput],
  template: \`
    <wr-form-field label="Work email" required>
      <input wrInput type="email" [formField]="signup.email" />
    </wr-form-field>
  \`,
})
export class Signup {
  private readonly model = signal({ email: '' });

  protected readonly signup = form(this.model, path => {
    required(path.email, { message: 'Enter your work email.' });
    email(path.email, { message: 'That is not an email address.' });
  });
}`,
    catalog: `provideWrI18nStaticLoader({
  en: {
    validation: {
      required: 'This field is required.',
      // Filled from the error payload: { requiredLength, actualLength }.
      minlength: 'Minimum length is {{requiredLength}}.',
      min: 'Enter {{min}} or more.',
    },
  },
  ru: {
    validation: {
      required: 'Обязательное поле.',
      minlength: 'Не короче {{requiredLength}} символов.',
      min: 'Не меньше {{min}}.',
    },
  },
}),`,
    markup: `<wr-form-field label="Handle" required>
  <input wrInput formControlName="handle" />
  <!-- Only for required; minlength still resolves. -->
  <wr-form-error key="required">Pick a handle.</wr-form-error>
</wr-form-field>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'label', description: 'Label text shown above the projected control.', type: 'string', default: "''" },
    {
      name: 'optionalLabel',
      description: 'Word inside the optional marker. Defaults to the `form.optional` catalog key.',
      type: 'string | null',
      default: 'null',
    },
    {
      name: 'autoErrors',
      description:
        'Show a message for each error no `<wr-form-error>` claims. Turn off to write every message by hand.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'hint',
      description: 'Subtext under the control. Hidden when an error is visible.',
      type: 'string',
      default: "''",
    },
    { name: 'required', description: 'Show a red `*` next to the label.', type: 'boolean', default: 'false' },
    {
      name: 'optional',
      description: 'Show `(optional)` next to the label. Ignored if `required` is on.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'controlId',
      description: 'Set the `<label for>` target manually. Auto-generated otherwise.',
      type: 'string',
      default: 'auto',
    },
    {
      name: '<wr-form-error>',
      description: 'One message per validator key. Shows when the control is touched or dirty and has that error.',
      type: 'component',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Directive', title: 'wrInput', url: ['/reference/components', 'input'] },
    { kind: 'Component', title: 'wr-select', url: ['/reference/components', 'select'] },
    { kind: 'Component', title: 'wr-form-item', url: ['/reference/components', 'form'], description: 'Layout only.' },
    { kind: 'Validator', title: 'WrValidators', url: ['/reference/validators'] },
  ];
}
