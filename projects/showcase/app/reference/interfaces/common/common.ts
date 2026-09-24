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
    install: `import type { Maybe, SafeAny, WrClassInput } from 'ngwr/utils';`,
    usage: `function findUser(id: string): Maybe<User> {
  return db.get(id) ?? null;
}

// Interop boundary where the shape genuinely isn't known —
// unlike \`any\`, the intent is explicit and greppable.
function fromLegacyBridge(payload: SafeAny): void {
  // narrow before use
}

// What every panelClass takes. A space-separated string is the
// common case; an array is there for a list built in TypeScript.
const extra: WrClassInput = wide() ? 'w-[40rem] shadow-2xl' : null;`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'Maybe<T>',
      description:
        'A value that may be absent — `T | null | undefined`. Pairs with [isDefined](/reference/utils/is-defined) to narrow back to `T`.',
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
    {
      name: 'WrClassInput',
      description:
        'Extra classes handed to a part ngwr renders itself — `string | readonly string[] | null | undefined`. The type every `panelClass` takes; [toClassList](/reference/utils/to-class-list) normalises one.',
      type: 'type alias',
      default: '—',
    },
  ];
}
