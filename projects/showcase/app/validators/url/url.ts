import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { WrInput } from 'ngwr/input';
import { WrValidators } from 'ngwr/validators';

import {
  type DocApiRow,
  type DocSeeAlsoLink,
  DocApiComponent,
  DocSeeAlsoComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-vld-url-page',
  templateUrl: './url.html',
  imports: [
    JsonPipe,
    ReactiveFormsModule,
    WrInput,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class UrlValidatorPage {
  protected readonly any = new FormControl('', { nonNullable: true, validators: [WrValidators.url()] });
  protected readonly httpsOnly = new FormControl('', {
    nonNullable: true,
    validators: [WrValidators.url({ protocols: ['https'] })],
  });

  protected readonly snippet = `import { FormControl } from '@angular/forms';
import { WrValidators } from 'ngwr/validators';

const link = new FormControl('', [WrValidators.url()]);

const secure = new FormControl('', [
  WrValidators.url({ protocols: ['https'] }),
]);
secure.setValue('http://example.com');
secure.errors; // { url: { allowed: ['https'] } }`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'signature',
      description: 'Factory — call it to get a `ValidatorFn`.',
      type: '(opts?) => ValidatorFn',
      default: '—',
    },
    {
      name: 'options.protocols',
      description: 'Whitelist of accepted schemes. Trailing `:` optional. Case-insensitive.',
      type: 'readonly string[]',
      default: 'any scheme',
    },
    {
      name: 'error key',
      description:
        'On unparseable input: `{ url: true }`. On scheme mismatch: `{ url: { allowed: [...] } }`. Empty value passes.',
      type: '{ url: true | { allowed: string[] } }',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'wr-input',
      url: ['/components', 'input'],
      description: 'Host control for link entry.',
    },
    {
      kind: 'Component',
      title: 'wr-form-field',
      url: ['/components', 'form-field'],
      description: 'Label / hint / error scaffolding around it.',
    },
  ];
}
