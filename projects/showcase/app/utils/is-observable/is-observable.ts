import { ChangeDetectionStrategy, Component } from '@angular/core';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
      name: 'isObservable(v)',
      description: 'Detects an rxjs Observable. Use to write APIs that transparently accept either a plain value or a stream.',
      type: '(v: unknown) => v is Observable<unknown>',
      default: '—',
    },
  ];
}
