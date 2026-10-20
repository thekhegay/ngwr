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

// A deliberate, searchable \`any\`.
function fromLegacyBridge(payload: SafeAny): void {
  // narrow before use
}

// What every panelClass takes.
const extra: WrClassInput = wide() ? 'w-[40rem] shadow-2xl' : null;`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'Maybe<T>',
      description: '`T | null | undefined`. [isDefined](/reference/utils/is-defined) narrows it back to `T`.',
      type: 'type alias',
      default: '—',
    },
    {
      name: 'SafeAny',
      description: 'A deliberate `any` for interop boundaries, easy to search for.',
      type: 'type alias',
      default: '—',
    },
    {
      name: 'WrClassInput',
      description:
        'Extra classes for a part ngwr renders: `string | readonly string[] | null | undefined`. Every `panelClass` takes it; [toClassList](/reference/utils/to-class-list) normalises one.',
      type: 'type alias',
      default: '—',
    },
  ];
}
