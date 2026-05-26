import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrInputNumber } from 'ngwr/input-number';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-input-number-page',
  templateUrl: './input-number.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrInputNumber,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class InputNumberPageComponent {
  protected readonly basic = signal<number | null>(1);
  protected readonly bounded = signal<number | null>(50);
  protected readonly price = signal<number | null>(199.99);
  protected readonly weight = signal<number | null>(2.5);
  protected readonly noSteppers = signal<number | null>(42);

  protected readonly snippets = {
    install: `import { WrInputNumber } from 'ngwr/input-number';

@Component({ imports: [WrInputNumber, FormsModule] })
export class MyComponent {
  protected readonly value = signal<number | null>(0);
}`,

    basic: `<wr-input-number [(ngModel)]="value" />`,

    bounded: `<wr-input-number [(ngModel)]="value" [min]="0" [max]="100" [step]="5" />`,

    price: `<wr-input-number [(ngModel)]="price" prefix="$" [decimals]="2" />`,

    weight: `<wr-input-number [(ngModel)]="weight" suffix="kg" [decimals]="1" [step]="0.1" />`,

    noSteppers: `<wr-input-number [(ngModel)]="value" [showSteppers]="false" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'min', description: 'Minimum allowed value.', type: 'number', default: '-Infinity' },
    { name: 'max', description: 'Maximum allowed value.', type: 'number', default: 'Infinity' },
    {
      name: 'step',
      description: 'Step applied by stepper buttons and arrow keys (Shift = ×10).',
      type: 'number',
      default: '1',
    },
    {
      name: 'decimals',
      description: 'Fixed number of decimals shown on blur. `null` keeps the entered precision.',
      type: 'number | null',
      default: 'null',
    },
    { name: 'showSteppers', description: 'Render the ▲▼ stepper column.', type: 'boolean', default: 'true' },
    { name: 'prefix', description: 'Optional prefix label (e.g. `"$"`).', type: 'string', default: "''" },
    { name: 'suffix', description: 'Optional suffix label (e.g. `"kg"`).', type: 'string', default: "''" },
    { name: 'placeholder', description: 'Placeholder shown when empty.', type: 'string', default: "''" },
    { name: 'disabled', description: 'Block interaction.', type: 'boolean', default: 'false' },
    { name: 'readonly', description: 'Values cannot be changed.', type: 'boolean', default: 'false' },
  ];
}
