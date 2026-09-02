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
    WrInput,
    WrButton,
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
    install: `import { WrFormItem, WrFormError } from 'ngwr/form';
import { WrInput } from 'ngwr/input';   // the control in the examples below

@Component({ imports: [WrFormItem, WrFormError, WrInput] })
export class MyComponent {}`,
    // Both wrappers ship from `ngwr/form`, and this page used to carry the OTHER
    // one's API table while importing only `WrFormItem` — so "which do I use"
    // was answerable only from the far page. The answer lives here now.
    choosing: `<!-- <wr-form-item> — layout only. It knows nothing about the control it
     wraps: no label input, no hint, no id wiring, and \`hasError\` is a
     boolean YOU compute and pass. Reach for it when the control is not an
     Angular form control at all, or when you want the ngwr spacing and
     nothing else. -->
<wr-form-item [hasError]="invalid()">
  <label for="email">Email</label>
  <input id="email" wrInput [(ngModel)]="email" />
  @if (invalid()) { <wr-form-error>Enter a valid email.</wr-form-error> }
</wr-form-item>

<!-- <wr-form-field> — the default choice. It reads the projected control's
     NgControl, so it decides for itself when to show an error (touched or
     dirty), generates the <label for> target, wires aria-describedby, and
     renders the validator's message with no <wr-form-error> at all.
     Its own page has the full API. -->
<wr-form-field label="Email" hint="We'll never share it." required>
  <input wrInput formControlName="email" />
</wr-form-field>`,
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
    { name: 'hasError', description: 'Apply error coloring to label + input.', type: 'boolean', default: 'false' },
  ];

  /**
   * `<wr-form-field>` is documented on its OWN page, and this table is its
   * reference copy. It stays because both wrappers ship from the one
   * `ngwr/form` entry point and this is that entry point's page: dropping the
   * rows makes `check:api-docs` report every `WrFormField` member as
   * undocumented. What was actually confusing was the heading, which named an
   * API the page never imported and never explained the choice between — that
   * is what "Which wrapper" and the See also below are for.
   */
  protected readonly fieldApi = API.WrFormField;

  protected readonly errorApi = API.WrFormError;

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'wr-form-field',
      url: ['/reference/components', 'form-field'],
      description:
        'The richer wrapper, and the default choice — label, hint, required marker and validation messages resolved from the control itself.',
    },
    {
      kind: 'Directive',
      title: 'wrInput',
      url: ['/reference/components', 'input'],
      description: 'The control both wrappers are built around. `input[wrInput], textarea[wrInput]` — no `wrTextarea`.',
    },
  ];

  protected validate(): void {
    this.emailInvalid.set(!this.email().includes('@'));
  }
}
