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
els[0]?.focus();`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'getFocusableElements(root)',
      description:
        'Every focusable descendant of `root`, in DOM order. Skips disabled and `tabindex="-1"` elements, and unrendered ones unless they hold focus. A positive `tabindex` is not sorted.',
      type: '(root: HTMLElement) => readonly HTMLElement[]',
      default: '—',
    },
  ];
}
