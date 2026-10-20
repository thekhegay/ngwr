import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { WrButton } from 'ngwr/button';
import { WrFormError, WrFormItem } from 'ngwr/form';
import { WrInput } from 'ngwr/input';

import {
  DocApiComponent,
  type DocApiRow,
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
    WrFormItem,
    WrFormError,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class FormComponent {
  protected readonly email = signal('');
  protected readonly emailInvalid = signal(false);

  protected readonly snippets = {
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
