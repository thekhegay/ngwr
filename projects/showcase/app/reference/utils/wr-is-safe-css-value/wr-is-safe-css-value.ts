import { Component } from '@angular/core';

import { wrIsSafeCssValue } from 'ngwr/utils';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

const CASES: readonly (readonly [value: string, why: string])[] = [
  ['var(--wr-color-primary)', 'One value, an allowed function.'],
  ['color-mix(in srgb, red 50%, blue)', 'The commas are inside the function.'],
  ['red 20%', 'Whitespace is fine: a gradient stop.'],
  ['red, blue', 'A top-level comma reaches the next slot.'],
  ['red), url(//x.test/a), linear-gradient(red', 'A closing parenthesis it never opened.'],
  ['url(//x.test/a)', 'An image function: it fetches.'],
  ['red; position: fixed', 'A semicolon ends the declaration.'],
];

@Component({
  selector: 'ngwr-utl-wr-is-safe-css-value-page',
  templateUrl: './wr-is-safe-css-value.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrIsSafeCssValuePage {
  protected readonly cases = CASES.map(([value, why]) => ({ value, why, safe: wrIsSafeCssValue(value) }));

  protected readonly snippet = `import { computed, input } from '@angular/core';
import { wrIsSafeCssValue } from 'ngwr/utils';

readonly from = input('var(--wr-color-primary)');
readonly to = input('var(--wr-color-success)');

protected readonly background = computed(() => {
  const from = wrIsSafeCssValue(this.from()) ? this.from() : 'var(--wr-color-primary)';
  const to = wrIsSafeCssValue(this.to()) ? this.to() : 'var(--wr-color-success)';
  return \`linear-gradient(90deg, \${from}, \${to})\`;
});`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrIsSafeCssValue',
      description:
        '`true` when the value stays inside the slot it is composed into. `false` for an empty string and for anything that is not a string.',
      type: '(value: string) => boolean',
      default: '-',
    },
  ];
}
