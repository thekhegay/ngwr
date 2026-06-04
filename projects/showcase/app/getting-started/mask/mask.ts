import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { WrInput } from 'ngwr/input';
import { NgxMaskDirective } from 'ngx-mask';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-gs-mask-page',
  templateUrl: './mask.html',
  imports: [
    ReactiveFormsModule,
    NgxMaskDirective,
    WrInput,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
  ],
})
export default class MaskGuidePage {
  private readonly required = Validators.required.bind(Validators);

  protected readonly form = new FormGroup({
    phone: new FormControl('', { nonNullable: true, validators: [this.required] }),
    card: new FormControl('', { nonNullable: true }),
    expiry: new FormControl('', { nonNullable: true }),
    cvc: new FormControl('', { nonNullable: true }),
    ssn: new FormControl('', { nonNullable: true }),
    date: new FormControl('', { nonNullable: true }),
    money: new FormControl('', { nonNullable: true }),
  });

  protected readonly snippets = {
    why: `// ngwr does NOT ship a mask directive. ngx-mask is mature, well-maintained,
// and battle-tested — wrapping it would duplicate effort. Drop it in via the
// standard install + provider flow and use it directly on \`wrInput\`.`,

    install: `pnpm add ngx-mask`,

    bootstrap: `import { provideEnvironmentNgxMask } from 'ngx-mask';

bootstrapApplication(AppComponent, {
  providers: [
    // …your other providers
    provideEnvironmentNgxMask({
      // Optional global config — see ngx-mask docs for the full list.
      thousandSeparator: ' ',
      decimalMarker: ',',
    }),
  ],
});`,

    standalone: `import { NgxMaskDirective } from 'ngx-mask';

@Component({
  imports: [NgxMaskDirective, WrInput, ReactiveFormsModule],
})
export class MyForm { /* … */ }`,

    common: `<!-- Phone (US-style) -->
<input wrInput [formControl]="phone" mask="(000) 000-0000" placeholder="(555) 555-5555" />

<!-- Credit card -->
<input wrInput [formControl]="card" mask="0000 0000 0000 0000" placeholder="4242 4242 4242 4242" />

<!-- Expiry MM/YY -->
<input wrInput [formControl]="expiry" mask="00/00" placeholder="12/29" />

<!-- CVC (3 digits) -->
<input wrInput [formControl]="cvc" mask="000" placeholder="123" />

<!-- Date DD/MM/YYYY -->
<input wrInput [formControl]="date" mask="00/00/0000" placeholder="31/12/2026" />`,

    money: `<!-- Money: thousand separator with two-decimal precision.
     Pair with the global thousandSeparator / decimalMarker from bootstrap. -->
<input wrInput [formControl]="money" mask="separator.2" prefix="$ " placeholder="$ 1,234.56" />`,

    validators: `// ngx-mask plays nicely with Angular form validators.
new FormControl('', [
  Validators.required,
  WrValidators.cardNumber,   // ngwr's Luhn check
]);`,

    docs: `// Full reference for tokens, patterns, dynamic masks, and locale
// configuration is at https://jsdaddy.github.io/ngx-mask`,
  };
}
