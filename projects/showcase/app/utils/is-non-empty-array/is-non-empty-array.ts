import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-is-non-empty-array-page',
  templateUrl: './is-non-empty-array.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class IsNonEmptyArrayPage {
  protected readonly snippet = `import { isNonEmptyArray } from 'ngwr/utils';

if (isNonEmptyArray(rows)) {
  // rows is [Row, ...Row[]] — \`rows[0]\` is non-nullable
  highlight(rows[0]);
}`;

  protected readonly whySnippet = `// Native — with \`noUncheckedIndexedAccess\` enabled, length check
// doesn't propagate to the indexed access.
if (rows.length > 0) {
  highlight(rows[0]);
  //        ^? Row | undefined          ← still nullable!
}

// ngwr — narrows the tuple shape, so [0] is Row.
if (isNonEmptyArray(rows)) {
  highlight(rows[0]);
  //        ^? Row                      ← clean
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'isNonEmptyArray(v)',
      description:
        'Asserts the array has at least one element; narrows the type to `[T, ...T[]]` so index 0 is non-nullable.',
      type: '<T>(v: readonly T[]) => v is readonly [T, ...T[]]',
      default: '—',
    },
  ];
}
