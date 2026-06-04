import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-get-focusable-elements-page',
  templateUrl: './get-focusable-elements.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class GetFocusableElementsPage {
  protected readonly snippet = `import { getFocusableElements } from 'ngwr/utils';

const els = getFocusableElements(menuRef.nativeElement);
els[0]?.focus();   // move focus to the first interactive child`;

  protected readonly whySnippet = `// Native — the obvious one-liner misses several cases.
const els = root.querySelectorAll<HTMLElement>(
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
);
// → misses [contenteditable], doesn't filter invisible elements,
//   doesn't honour tabindex order, returns disabled controls.

// ngwr — selector + visibility filter + tabindex sort, all included.
const els = getFocusableElements(root);`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'getFocusableElements(root)',
      description:
        'Returns every focusable descendant of `root` in DOM order, filtered for visibility and `tabindex`-disabled elements.',
      type: '(root: HTMLElement) => readonly HTMLElement[]',
      default: '—',
    },
  ];
}
