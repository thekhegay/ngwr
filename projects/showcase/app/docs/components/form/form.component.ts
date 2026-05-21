import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrButtonComponent } from 'ngwr/button';
import { WrFormErrorComponent, WrFormItemComponent } from 'ngwr/form';
import { WrInputComponent } from 'ngwr/input';

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
  templateUrl: './form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrInputComponent,
    WrButtonComponent,
    WrFormItemComponent,
    WrFormErrorComponent,
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
    install: `import { WrFormItemComponent, WrFormErrorComponent } from 'ngwr/form';

@Component({ imports: [WrFormItemComponent, WrFormErrorComponent] })
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
