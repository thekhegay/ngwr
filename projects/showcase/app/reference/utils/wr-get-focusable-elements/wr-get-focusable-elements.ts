import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-get-focusable-elements-page',
  templateUrl: './wr-get-focusable-elements.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrGetFocusableElementsPage {
  protected readonly snippet = `import { wrGetFocusableElements } from 'ngwr/utils';

const els = wrGetFocusableElements(menuRef.nativeElement);
els[0]?.focus();`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrGetFocusableElements(root)',
      description:
        'Every focusable descendant of `root`, in DOM order. Skips disabled and `tabindex="-1"` elements, and unrendered ones unless they hold focus. A positive `tabindex` is not sorted.',
      type: '(root: HTMLElement) => readonly HTMLElement[]',
      default: '—',
    },
  ];
}
