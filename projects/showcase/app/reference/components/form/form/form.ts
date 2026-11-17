import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { WrButton } from 'ngwr/button';
import { WrForm, WrFormError, WrFormField, WrFormItem, WrFormSpan } from 'ngwr/form';
import { WrInput } from 'ngwr/input';

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
    gap: `.settings-form {
  --wr-form-gap: var(--wr-space-xl);
  // Fields whose errors show: line the labels up instead of the bottom edges.
  --wr-form-inline-align: flex-start;
}`,
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
