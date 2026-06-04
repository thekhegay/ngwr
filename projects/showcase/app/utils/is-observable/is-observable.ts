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
      name: 'isObservable(v)',
      description:
        'Detects an rxjs Observable. Use to write APIs that transparently accept either a plain value or a stream.',
      type: '(v: unknown) => v is Observable<unknown>',
      default: '—',
    },
  ];
}
