import { ChangeDetectionStrategy, Component } from '@angular/core';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class GetFocusableElementsPage {
  protected readonly snippet = `import { getFocusableElements } from 'ngwr/utils';

const els = getFocusableElements(menuRef.nativeElement);
els[0]?.focus();   // move focus to the first interactive child`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'getFocusableElements(root)',
      description: 'Returns every focusable descendant of `root` in DOM order, filtered for visibility and `tabindex`-disabled elements.',
      type: '(root: HTMLElement) => readonly HTMLElement[]',
      default: '—',
    },
  ];
}
