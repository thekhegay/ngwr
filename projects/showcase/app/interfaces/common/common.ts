import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-interfaces-common-page',
  templateUrl: './common.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class CommonTypesPage {
  protected readonly snippets = {
    install: `import type { Maybe, SafeAny } from 'ngwr/utils';`,
    usage: `function findUser(id: string): Maybe<User> {
  return db.get(id) ?? null;
}

// Interop boundary where the shape genuinely isn't known —
// unlike \`any\`, the intent is explicit and greppable.
function fromLegacyBridge(payload: SafeAny): void {
  // narrow before use
}`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'Maybe<T>',
      description:
        'A value that may be absent — `T | null | undefined`. Pairs with [isDefined](/utils/is-defined) to narrow back to `T`.',
      type: 'type alias',
      default: '—',
    },
    {
      name: 'SafeAny',
      description:
        'Explicitly untyped value for interop boundaries. Same mechanics as `any`, but the name is searchable and signals intent.',
      type: 'type alias',
      default: '—',
    },
  ];
}
