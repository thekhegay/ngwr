import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-is-observable-page',
  templateUrl: './wr-is-observable.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrIsObservablePage {
  protected readonly snippet = `import { wrIsObservable } from 'ngwr/utils';

if (wrIsObservable(input)) {
  input.subscribe(v => render(v));
} else {
  render(input);
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrIsObservable(value)',
      description: 'True for an Observable. Pass the element type to narrow it: `wrIsObservable<Row>(x)`.',
      type: '<T = unknown>(value: unknown) => value is Observable<T>',
      default: '—',
    },
  ];
}
