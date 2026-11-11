import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-trap-focus-page',
  templateUrl: './wr-trap-focus.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrTrapFocusPage {
  protected readonly snippet = `import { wrTrapFocus } from 'ngwr/utils';

@HostListener('keydown', ['$event']) onKey(e: KeyboardEvent) {
  wrTrapFocus(dialogRef.nativeElement, e);
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrTrapFocus(root, event)',
      description:
        'Cycles Tab focus inside `root`. Call it from a keydown handler; returns `true` when it handled a Tab.',
      type: '(root: HTMLElement, e: KeyboardEvent) => boolean',
      default: '—',
    },
  ];
}
