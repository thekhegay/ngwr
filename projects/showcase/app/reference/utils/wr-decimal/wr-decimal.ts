import { Component, computed, signal } from '@angular/core';

import { WrInputNumber } from 'ngwr/input-number';
import { wrDecimalAdd } from 'ngwr/utils';

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

@Component({
  selector: 'ngwr-utl-wr-decimal-page',
  templateUrl: './wr-decimal.html',
  imports: [
    DocPageComponent,
    DocSectionComponent,
    DocCodeComponent,
    DocSnippetComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
    WrInputNumber,
  ],
})
export default class WrDecimalPage {
  protected readonly a = signal<string | null>('0.1');
  protected readonly b = signal<string | null>('0.2');
  protected readonly exact = computed(() => wrDecimalAdd(this.a(), this.b()) ?? '-');
  protected readonly float = computed(() => String(Number(this.a()) + Number(this.b())));

  protected readonly snippet = `import { wrDecimal, wrDecimalAdd, wrDecimalDivide, wrDecimalRound } from 'ngwr/utils';

wrDecimalAdd('0.1', '0.2');            // '0.3'
wrDecimalAdd('9007199254740993.01', 1); // '9007199254740994.01'
wrDecimalDivide('10', 3, 2);           // '3.33'
wrDecimalRound('1.005', 2);            // '1.01'
wrDecimal('abc');                      // null`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrDecimal',
      description:
        'Reads a value as an exact decimal and returns the canonical string, or `null` when it is not a number.',
      type: '(value: unknown) => string | null',
      default: '-',
    },
    {
      name: 'wrDecimalAdd',
      description: '`a + b` at the wider scale of the two.',
      type: '(a: WrDecimalLike, b: WrDecimalLike) => string | null',
      default: '-',
    },
    {
      name: 'wrDecimalSubtract',
      description: '`a - b` at the wider scale of the two.',
      type: '(a: WrDecimalLike, b: WrDecimalLike) => string | null',
      default: '-',
    },
    {
      name: 'wrDecimalMultiply',
      description: '`a * b`; the scales add.',
      type: '(a: WrDecimalLike, b: WrDecimalLike) => string | null',
      default: '-',
    },
    {
      name: 'wrDecimalDivide',
      description: '`a / b` at exactly `decimals` places, half away from zero. `null` for a zero divisor.',
      type: '(a: WrDecimalLike, b: WrDecimalLike, decimals: number) => string | null',
      default: '-',
    },
    {
      name: 'wrDecimalCompare',
      description: 'Orders two decimals by value: `-1`, `0` or `1`. `1.50` and `1.5` are equal.',
      type: '(a: WrDecimalLike, b: WrDecimalLike) => -1 | 0 | 1 | null',
      default: '-',
    },
    {
      name: 'wrDecimalRound',
      description: 'Sets the scale to exactly `decimals` places: pads with zeros or rounds half away from zero.',
      type: '(value: WrDecimalLike, decimals: number) => string | null',
      default: '-',
    },
    {
      name: 'WrDecimalLike',
      description:
        'What the helpers read. `null` and `undefined` read as malformed, so data can be passed straight in.',
      type: 'string | number | bigint | null | undefined',
      default: '-',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Util', title: 'wrRound', url: ['/reference/utils', 'wr-round'] },
    { kind: 'Component', title: 'Number Input', url: ['/reference/components', 'input-number'] },
    { kind: 'Component', title: 'Table', url: ['/reference/components', 'table'] },
  ];
}
