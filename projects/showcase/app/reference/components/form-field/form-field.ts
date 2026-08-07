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

  /** Zero-config demo: no `<wr-form-error>` at all, messages come from the catalog. */
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
    install: `import { WrFormField, WrFormError } from 'ngwr/form';

@Component({
  imports: [WrFormField, WrFormError, /* … */],
})
export class MyComponent {}`,

    basic: `<wr-form-field label="Email" hint="We'll never share it." required>
  <input wrInput [formControl]="email" type="email" />
  <wr-form-error key="required">Email is required.</wr-form-error>
  <wr-form-error key="email">That isn't a valid email.</wr-form-error>
</wr-form-field>`,

    optional: `<wr-form-field label="Bio" optional>
  <textarea wrTextarea [formControl]="bio" rows="3"></textarea>
</wr-form-field>`,

    notes: `<!-- Hint shows under the control. Hidden the moment an error becomes
     visible (the matching <wr-form-error> takes its slot). -->

<!-- Errors only render after the control is touched OR dirty,
     so the user doesn't see red on first paint. -->`,
    auto: `<!-- No <wr-form-error> at all. wr-form-field renders the message the
     validator reports, from the ngwr/i18n \`validation.*\` catalog. -->
<wr-form-field label="Handle" required>
  <input wrInput formControlName="handle" />
</wr-form-field>

<wr-form-field label="Age">
  <input wrInput formControlName="age" type="number" />
</wr-form-field>`,
    provider: `import { provideWrFormErrors } from 'ngwr/form';

bootstrapApplication(App, {
  providers: [
    provideWrFormErrors({
      // Only the keys you name — the rest keep resolving through the catalog.
      required: 'Please fill this in.',
      minlength: ({ error }) => \`At least \${(error as { requiredLength: number }).requiredLength} characters.\`,
    }),
  ],
});`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'label', description: 'Label text shown above the projected control.', type: 'string', default: "''" },
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
      description:
        'One message per validator key. Renders only when the control is touched / dirty and has that error.',
      type: 'component',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Directive',
      title: 'wrInput',
      url: ['/reference/components', 'input'],
      description: 'The most common control to wrap. Add `wrInput` to a native `<input>` and drop it inside.',
    },
    {
      kind: 'Component',
      title: 'wr-select',
      url: ['/reference/components', 'select'],
      description: 'Pairs cleanly — the form-field surfaces select errors too.',
    },
    {
      kind: 'Validator',
      title: 'WrValidators',
      url: ['/reference/validators'],
      description:
        'The error-key contract — every `WrValidators.*` member has a stable key for `<wr-form-error key="…">`.',
    },
  ];
}
