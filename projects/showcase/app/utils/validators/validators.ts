import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { WrInput } from 'ngwr/input';
import { WrValidators } from 'ngwr/validators';

import {
  type DocApiRow,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-util-validators-page',
  templateUrl: './validators.html',
  imports: [
    JsonPipe,
    ReactiveFormsModule,
    WrInput,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class UtilValidatorsPage {
  protected readonly demo = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [WrValidators.email] }),
    card: new FormControl('', { nonNullable: true, validators: [WrValidators.cardNumber] }),
    cvc: new FormControl('', { nonNullable: true, validators: [WrValidators.cvc(3)] }),
    iban: new FormControl('', { nonNullable: true, validators: [WrValidators.iban] }),
    url: new FormControl('', { nonNullable: true, validators: [WrValidators.url({ protocols: ['https'] })] }),
    hex: new FormControl('', { nonNullable: true, validators: [WrValidators.hexColor] }),
    size: new FormControl('', { nonNullable: true, validators: [WrValidators.oneOf(['xs', 'sm', 'md', 'lg', 'xl'])] }),
    password: new FormControl('', { nonNullable: true }),
    confirm: new FormControl('', { nonNullable: true, validators: [WrValidators.match('password')] }),
  });

  protected readonly snippets = {
    install: `import { WrValidators } from 'ngwr/validators';`,
    usage: `import { FormControl, FormGroup, Validators } from '@angular/forms';
import { WrValidators } from 'ngwr/validators';

const form = new FormGroup({
  email: new FormControl('', [Validators.required, WrValidators.email]),
  card:  new FormControl('', [WrValidators.cardNumber]),
  cvc:   new FormControl('', [WrValidators.cvc(3)]),
  url:   new FormControl('', [WrValidators.url({ protocols: ['https'] })]),
  size:  new FormControl('', [WrValidators.oneOf(['xs','sm','md','lg','xl'])]),
  password: new FormControl(''),
  confirm:  new FormControl('', [WrValidators.match('password')]),
});`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'email', description: 'RFC-5322-ish email check.', type: '(c) => ValidationErrors | null', default: '—' },
    {
      name: 'noWhitespace',
      description: 'No spaces or tabs in the value.',
      type: '(c) => ValidationErrors | null',
      default: '—',
    },
    {
      name: 'hexColor',
      description: '3, 4, 6, or 8-digit hex colour (with `#`).',
      type: '(c) => ValidationErrors | null',
      default: '—',
    },
    {
      name: 'url(opts?)',
      description: 'Valid URL. Pass `{ protocols: [...] }` to restrict scheme.',
      type: '(opts?) => ValidatorFn',
      default: '—',
    },
    {
      name: 'cardNumber',
      description: '13-19 digits + Luhn checksum (spaces / dashes stripped).',
      type: '(c) => ValidationErrors | null',
      default: '—',
    },
    {
      name: 'cvc(length?)',
      description: 'N digits (default 3; pass 4 for Amex).',
      type: '(length?) => ValidatorFn',
      default: '3',
    },
    {
      name: 'iban',
      description: 'Structure check + ISO 13616 mod-97. Country-length table NOT enforced.',
      type: '(c) => ValidationErrors | null',
      default: '—',
    },
    {
      name: 'match(targetName)',
      description: 'Value must equal a sibling control. Looks up via `control.parent.get(name)`.',
      type: '(name) => ValidatorFn',
      default: '—',
    },
    {
      name: 'oneOf(allowed)',
      description: 'Value must strict-equal one of `allowed`.',
      type: '(allowed) => ValidatorFn',
      default: '—',
    },
    {
      name: 'minDate(min)',
      description: 'Value (Date / parseable) must be ≥ `min`.',
      type: '(min) => ValidatorFn',
      default: '—',
    },
    {
      name: 'maxDate(max)',
      description: 'Value (Date / parseable) must be ≤ `max`.',
      type: '(max) => ValidatorFn',
      default: '—',
    },
  ];
}
