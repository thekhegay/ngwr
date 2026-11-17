import { Component, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { WrButton } from 'ngwr/button';
import { WrCheckbox } from 'ngwr/checkbox';
import { WrDatePicker, WrDateRangePicker, type WrDateRange } from 'ngwr/date-picker';
import { WrForm, WrFormError, WrFormField, WrFormItem, WrFormSpan } from 'ngwr/form';
import { WrInput } from 'ngwr/input';
import { WrOption, WrSelect } from 'ngwr/select';
import { WrTextarea } from 'ngwr/textarea';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-form-page',
  templateUrl: './form.html',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    WrCheckbox,
    WrDatePicker,
    WrDateRangePicker,
    WrOption,
    WrSelect,
    WrTextarea,
    RouterLink,
    WrInput,
    WrButton,
    WrForm,
    WrFormSpan,
    WrFormField,
    WrFormItem,
    WrFormError,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class FormComponent {
  protected readonly email = signal('');
  protected readonly emailInvalid = signal(false);

  protected readonly country = signal<string | null>(null);
  protected readonly birthday = signal<Date | null>(null);
  protected readonly bio = signal('');
  protected readonly newsletter = signal(false);
  protected readonly status = signal<string | null>(null);
  protected readonly range = signal<WrDateRange | null>(null);

  /** Starts empty and touched, so its error shows from the first paint. */
  protected readonly name = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required.bind(Validators)],
  });

  constructor() {
    this.name.markAsTouched();
  }

  protected readonly snippets = {
    column: `<form wrForm>
  <wr-form-field label="Name"><input wrInput /></wr-form-field>
  <wr-form-field label="Email"><input wrInput type="email" /></wr-form-field>
  <div><wr-btn color="primary">Save</wr-btn></div>
</form>`,
    inline: `<form wrForm inline>
  <wr-form-field label="From"><input wrInput type="date" /></wr-form-field>
  <wr-form-field label="To"><input wrInput type="date" /></wr-form-field>
  <wr-btn color="primary">Apply</wr-btn>
</form>`,
    columns: `<form wrForm columns="2">
  <wr-form-field label="First name"><input wrInput /></wr-form-field>
  <wr-form-field label="Last name"><input wrInput /></wr-form-field>
  <wr-form-field label="Address" wrFormSpan><input wrInput /></wr-form-field>
  <wr-form-field label="Longitude"><input wrInput /></wr-form-field>
  <wr-form-field label="Latitude"><input wrInput /></wr-form-field>
</form>`,
    profile: `<form wrForm columns="2">
  <wr-form-field label="First name" required><input wrInput /></wr-form-field>
  <wr-form-field label="Last name" required><input wrInput /></wr-form-field>
  <wr-form-field label="Email" wrFormSpan><input wrInput type="email" /></wr-form-field>
  <wr-form-field label="Country">
    <wr-select [(value)]="country">
      <wr-option value="gb">United Kingdom</wr-option>
      <wr-option value="de">Germany</wr-option>
    </wr-select>
  </wr-form-field>
  <wr-form-field label="Date of birth"><wr-date-picker [(value)]="birthday" /></wr-form-field>
  <wr-form-field label="About you" optional wrFormSpan>
    <wr-textarea [rows]="3" [(value)]="bio" />
  </wr-form-field>
  <wr-checkbox wrFormSpan [(checked)]="newsletter">Send me product news</wr-checkbox>
  <div wrForm inline wrFormSpan>
    <button wr-btn type="button" color="primary">Save</button>
    <button wr-btn type="button">Cancel</button>
  </div>
</form>`,
    filters: `<form wrForm inline>
  <wr-form-field label="Search"><input wrInput type="search" /></wr-form-field>
  <wr-form-field label="Status">
    <wr-select [(value)]="status">
      <wr-option value="open">Open</wr-option>
      <wr-option value="paid">Paid</wr-option>
    </wr-select>
  </wr-form-field>
  <wr-form-field label="Created"><wr-date-range-picker [(value)]="range" /></wr-form-field>
  <button wr-btn type="button" color="primary">Apply</button>
</form>`,
    threeColumns: `<form wrForm columns="3">
  <wr-form-field label="Street" wrFormSpan="2"><input wrInput /></wr-form-field>
  <wr-form-field label="Apartment"><input wrInput /></wr-form-field>
  <wr-form-field label="City"><input wrInput /></wr-form-field>
  <wr-form-field label="Region"><input wrInput /></wr-form-field>
  <wr-form-field label="Postcode"><input wrInput /></wr-form-field>
</form>`,
    gapDemo: `<form wrForm columns="2" style="--wr-form-gap: var(--wr-space-xs)">
  <wr-form-field label="First name"><input wrInput /></wr-form-field>
  <wr-form-field label="Last name"><input wrInput /></wr-form-field>
  <wr-form-field label="Email" wrFormSpan><input wrInput type="email" /></wr-form-field>
</form>`,
    align: `<form wrForm inline style="--wr-form-inline-align: flex-start">
  <wr-form-field label="Name">
    <input wrInput [formControl]="name" />
    <wr-form-error key="required">Name is required.</wr-form-error>
  </wr-form-field>
  <wr-form-field label="City"><input wrInput /></wr-form-field>
</form>`,
    basic: `<wr-form-item>
  <label>Email</label>
  <input wrInput type="email" [(ngModel)]="email" />
</wr-form-item>`,
    error: `<wr-form-item [hasError]="invalid()">
  <label>Email</label>
  <input wrInput type="email" [(ngModel)]="email" />
  <wr-form-error>Please enter a valid email.</wr-form-error>
</wr-form-item>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'hasError', description: 'Colour the label and input as an error.', type: 'boolean', default: 'false' },
  ];

  protected readonly layoutApi = API.WrForm;

  protected readonly spanApi = API.WrFormSpan;

  /** Reference copy: `ngwr/form` ships both wrappers. */
  protected readonly fieldApi = API.WrFormField;

  protected readonly errorApi = API.WrFormError;

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'wr-form-field',
      url: ['/reference/components', 'form-field'],
      description: 'The default wrapper.',
    },
    {
      kind: 'Directive',
      title: 'wrInput',
      url: ['/reference/components', 'input'],
      description: 'The control both wrappers hold.',
    },
  ];

  protected validate(): void {
    this.emailInvalid.set(!this.email().includes('@'));
  }
}
