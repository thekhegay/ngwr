import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-is-observable-page',
  templateUrl: './is-observable.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class IsObservablePage {
  protected readonly snippet = `import { isObservable } from 'ngwr/utils';

if (isObservable(input)) {
  input.subscribe(v => render(v));
} else {
  render(input);
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'isObservable(value)',
      description: 'True for an Observable. Pass the element type to narrow it: `isObservable<Row>(x)`.',
      type: '<T = unknown>(value: unknown) => value is Observable<T>',
      default: '—',
    },
  ];
}
