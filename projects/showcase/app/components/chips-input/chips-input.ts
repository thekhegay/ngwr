import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrChipsInput, type WrChipsValidator } from 'ngwr/chips-input';

import {
  type DocApiRow,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-chips-input-page',
  templateUrl: './chips-input.html',
  imports: [
    WrChipsInput,
    FormsModule,
    JsonPipe,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class ChipsInputPage {
  protected readonly recipients = signal<readonly string[]>(['ada@ngwr.dev']);
  protected readonly tags = signal<readonly string[]>(['typescript', 'angular']);

  /** Reasonable email check — enough to demo the validator hook. */
  protected readonly isEmail: WrChipsValidator = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  protected readonly snippets = {
    install: `import { WrChipsInput } from 'ngwr/chips-input';`,
    basic: `<wr-chips-input [(ngModel)]="tags" placeholder="Add a tag" />`,
    validate: `protected isEmail: WrChipsValidator = v =>
  /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v);

<wr-chips-input
  [(ngModel)]="recipients"
  placeholder="Add email + Enter or comma"
  [validate]="isEmail"
  [maxItems]="5"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'placeholder', description: 'Input placeholder. Shown only when the chip list is empty.', type: 'string', default: "''" },
    { name: 'disabled', description: 'Disable the entire control.', type: 'boolean', default: 'false' },
    {
      name: 'separators',
      description: 'Keys / characters that commit the draft. `Enter` is the key name; everything else is a literal character watched in keypresses and pastes.',
      type: 'readonly string[]',
      default: "['Enter', ',']",
    },
    { name: 'maxItems', description: 'Maximum chips. `0` = unlimited.', type: 'number', default: '0' },
    { name: 'allowDuplicates', description: 'Allow the same value to appear more than once.', type: 'boolean', default: 'false' },
    { name: 'validate', description: 'Custom predicate `(value, existing) => boolean`. Return `false` to silently reject.', type: 'WrChipsValidator', default: 'null' },
    { name: '(chipsChange)', description: 'Emits the new chip array on add / remove.', type: 'EventEmitter<readonly string[]>', default: '—' },
    { name: 'ControlValueAccessor', description: 'Implements CVA — bind with `[(ngModel)]` or `[formControl]`. Value type: `readonly string[]`.', type: 'CVA', default: '—' },
  ];
}
