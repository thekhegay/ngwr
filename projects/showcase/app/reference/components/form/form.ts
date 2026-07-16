import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrButton } from 'ngwr/button';
import { WrFormError, WrFormItem } from 'ngwr/form';
import { WrInput } from 'ngwr/input';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-form-page',
  templateUrl: './form.html',
  imports: [
    FormsModule,
    WrInput,
    WrButton,
    WrFormItem,
    WrFormError,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class FormComponent {
  protected readonly email = signal('');
  protected readonly emailInvalid = signal(false);

  protected readonly snippets = {
    install: `import { WrFormItem, WrFormError } from 'ngwr/form';

@Component({ imports: [WrFormItem, WrFormError] })
export class MyComponent {}`,
    basic: `<wr-form-item>
  <label>Email</label>
  <wr-input type="email" [(ngModel)]="email" />
</wr-form-item>`,
    error: `<wr-form-item [hasError]="invalid()">
  <label>Email</label>
  <wr-input type="email" [(ngModel)]="email" />
  <wr-form-error>Please enter a valid email.</wr-form-error>
</wr-form-item>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'hasError', description: 'Apply error coloring to label + input.', type: 'boolean', default: 'false' },
  ];

  protected validate(): void {
    this.emailInvalid.set(!this.email().includes('@'));
  }
}
