import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-is-defined-page',
  templateUrl: './is-defined.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class IsDefinedPage {
  protected readonly snippet = `import { isDefined } from 'ngwr/utils';

const items: (string | null | undefined)[] = ['a', null, 'b', undefined];
const present = items.filter(isDefined);   // string[] — narrowed`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'isDefined(v)',
      description: 'Type-narrowing guard that excludes `null` and `undefined`. Composes cleanly with `Array.filter`.',
      type: '<T>(v: T | null | undefined) => v is T',
      default: '—',
    },
  ];
}
