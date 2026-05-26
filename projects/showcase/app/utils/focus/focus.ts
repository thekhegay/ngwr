import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-focus-page',
  templateUrl: './focus.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class FocusPage {
  protected readonly snippet = `import { getFocusableElements, trapFocus } from 'ngwr/utils';

const els = getFocusableElements(rootEl);  // ordered focusables
@HostListener('keydown', ['$event']) onKey(e: KeyboardEvent) {
  trapFocus(rootEl, e); // cycles Tab inside rootEl
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'getFocusableElements(root)',
      description: 'Every focusable descendant in DOM order, visibility-filtered.',
      type: '(root: HTMLElement) => readonly HTMLElement[]',
      default: '—',
    },
    {
      name: 'trapFocus(root, event)',
      description: 'Cycle Tab focus inside `root` — call from a keydown handler. Returns true when handled.',
      type: '(root, e) => boolean',
      default: '—',
    },
  ];
}
