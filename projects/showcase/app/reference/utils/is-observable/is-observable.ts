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

  protected readonly whySnippet = `// Native — \`instanceof Observable\` forces rxjs into the bundle.
import { Observable } from 'rxjs';   // ← pulled into every consumer
if (input instanceof Observable) input.subscribe(render);

// ngwr — duck-typed check. Zero runtime dependency on rxjs.
import { isObservable } from 'ngwr/utils';
if (isObservable(input)) input.subscribe(render);`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'isObservable(value)',
      description:
        'Detects an rxjs Observable. Use to write APIs that transparently accept either a plain value or a stream. The element type is a parameter, so `isObservable<Row>(x)` narrows to `Observable<Row>` rather than to `unknown`.',
      type: '<T = unknown>(value: unknown) => value is Observable<T>',
      default: '—',
    },
  ];
}
