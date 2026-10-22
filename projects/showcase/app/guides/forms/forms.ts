import { Component } from '@angular/core';

import {
  DocCodeComponent,
  DocNgtrueComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

/** The forms guide: how ngwr controls bind to each kind of Angular form. */
@Component({
  selector: 'ngwr-gs-forms-page',
  templateUrl: './forms.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocNgtrueComponent, DocSeeAlsoComponent],
})
export default class FormsGuidePage {
  protected readonly snippets = {
    signal: `import { Component, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { WrFormField } from 'ngwr/form';
import { WrOption, WrSelect } from 'ngwr/select';

@Component({
  imports: [FormField, WrFormField, WrSelect, WrOption],
  template: \`
    <wr-form-field label="Plan" required>
      <wr-select [formField]="order.plan">
        <wr-option value="free">Free</wr-option>
        <wr-option value="pro">Pro</wr-option>
      </wr-select>
    </wr-form-field>
  \`,
})
export class Order {
  private readonly model = signal({ plan: '' });

  protected readonly order = form(this.model, path => {
    required(path.plan, { message: 'Pick a plan.' });
  });
}`,

    classic: `<form [formGroup]="form">
  <wr-select formControlName="plan">…</wr-select>
</form>

<wr-select [formControl]="plan">…</wr-select>

<wr-select [(ngModel)]="plan">…</wr-select>`,

    validatorsTemplate: `<!-- Ignored: no error, and the form submits. -->
<wr-select formControlName="plan" required>…</wr-select>

<!-- Works: the validator on the FormControl (below), the asterisk on the field. -->
<wr-form-field label="Plan" required>
  <wr-select formControlName="plan">…</wr-select>
</wr-form-field>`,

    validators: `form = new FormGroup({
  plan: new FormControl<string | null>(null, Validators.required),
});`,

    formError: `<wr-form-field label="Handle" required>
  <input wrInput formControlName="handle" />
  <wr-form-error key="required">Pick a handle.</wr-form-error>
</wr-form-field>`,

    catalog: `// app.config.ts: one message per error key, for every field
provideWrI18nStaticLoader({
  en: {
    validation: {
      required: 'This field is required.',
      minlength: 'Minimum length is {{requiredLength}}.',
      min: 'Enter {{min}} or more.',
    },
  },
}),`,

    schema: `import { form, metadata, required } from '@angular/forms/signals';
import { WR_FIELD } from 'ngwr/form';
import { WrSchemaForm } from 'ngwr/schema-form';

protected readonly signup = form(this.model, path => {
  required(path.name, { message: 'Enter your name.' });
  metadata(path.name, WR_FIELD, () => ({ kind: 'input', label: 'Name' }));
  metadata(path.plan, WR_FIELD, () => ({ kind: 'select', label: 'Plan', options: PLANS }));
});`,

    schemaTemplate: `<wr-schema-form [field]="signup" [columns]="2" />`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Component', title: 'WrFormField', url: ['/reference/components', 'form-field'] },
    { kind: 'Component', title: 'WrSchemaForm', url: ['/reference/components', 'schema-form'] },
    { kind: 'Validator', title: 'WrValidators', url: ['/reference', 'validators'] },
    { kind: 'Guide', title: 'Translations', url: ['/guides', 'translations'] },
  ];
}
