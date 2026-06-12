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

const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

@Component({
  selector: 'ngwr-vld-one-of-page',
  templateUrl: './one-of.html',
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
export default class OneOfValidatorPage {
  protected readonly sizes = SIZES;
  protected readonly control = new FormControl('', {
    nonNullable: true,
    validators: [WrValidators.oneOf(SIZES)],
  });

  protected readonly snippet = `import { FormControl } from '@angular/forms';
import { WrValidators } from 'ngwr/validators';

const size = new FormControl('', [
  WrValidators.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
]);`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'signature',
      description: 'Factory — call with the whitelist.',
      type: '<T>(allowed: readonly T[]) => ValidatorFn',
      default: '—',
    },
    {
      name: 'comparison',
      description: 'Strict `===`. Pass a typed const tuple to keep the union narrow on the consumer side.',
      type: '—',
      default: '—',
    },
    {
      name: 'error key',
      description: 'On failure: `{ oneOf: { allowed: [...] } }`. Empty value passes.',
      type: '{ oneOf: { allowed } }',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'wr-select',
      url: ['/components', 'select'],
      description: 'Constrained choice control - validate free input against its options.',
    },
    {
      kind: 'Component',
      title: 'wr-segmented',
      url: ['/components', 'segmented'],
      description: 'Inline single-choice alternative.',
    },
  ];
}
