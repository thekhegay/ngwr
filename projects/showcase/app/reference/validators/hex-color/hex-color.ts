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
  selector: 'ngwr-vld-hex-color-page',
  templateUrl: './hex-color.html',
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
export default class HexColorValidatorPage {
  protected readonly control = new FormControl('', { nonNullable: true, validators: [WrValidators.hexColor] });

  protected readonly snippet = `import { FormControl } from '@angular/forms';
import { WrValidators } from 'ngwr/validators';

const colour = new FormControl('', [WrValidators.hexColor]);

colour.setValue('#1a2b3c');  // → valid
colour.setValue('#xyz');     // → { hexColor: true }`;

  protected readonly api: readonly DocApiRow[] = [
    { name: 'signature', description: 'Static — drop into a `validators` array.', type: 'ValidatorFn', default: '—' },
    {
      name: 'accepted shapes',
      description: '`#abc`, `#abcd`, `#a1b2c3`, `#a1b2c3d4` (case-insensitive). Hash required.',
      type: 'string',
      default: '—',
    },
    {
      name: 'error key',
      description: 'On failure: `{ hexColor: true }`. Empty value passes.',
      type: '{ hexColor: true }',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'wr-color-picker',
      url: ['/reference/components', 'color-picker'],
      description: 'Emits the hex strings this rule accepts.',
    },
    {
      kind: 'Component',
      title: 'wr-input',
      url: ['/reference/components', 'input'],
      description: 'For free-typed color values.',
    },
  ];
}
