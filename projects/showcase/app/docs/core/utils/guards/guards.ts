import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-guards-page',
  templateUrl: './guards.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class GuardsUtilPageComponent {
  protected readonly snippet = `import { isDefined, isNonEmptyArray, isObservable } from 'ngwr/utils';

if (isDefined(value)) { /* value is T (not null | undefined) */ }
if (isNonEmptyArray(arr)) { /* arr has at least one element */ }
if (isObservable(input)) { /* input is Observable<unknown> */ }`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'isDefined(v)',
      description: 'Narrows out `null` and `undefined`.',
      type: '(v: T | null | undefined) => v is T',
      default: '—',
    },
    {
      name: 'isNonEmptyArray(v)',
      description: 'Asserts an array has at least one element.',
      type: '(v: T[]) => v is [T, ...T[]]',
      default: '—',
    },
    {
      name: 'isObservable(v)',
      description: 'Detects an rxjs Observable.',
      type: '(v: unknown) => v is Observable<unknown>',
      default: '—',
    },
  ];
}
