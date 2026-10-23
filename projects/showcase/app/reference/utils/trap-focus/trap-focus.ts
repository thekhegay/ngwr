import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-trap-focus-page',
  templateUrl: './trap-focus.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class TrapFocusPage {
  protected readonly snippet = `import { trapFocus } from 'ngwr/utils';

@HostListener('keydown', ['$event']) onKey(e: KeyboardEvent) {
  trapFocus(dialogRef.nativeElement, e);
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'trapFocus(root, event)',
      description:
        'Cycles Tab focus inside `root`. Call it from a keydown handler; returns `true` when it handled a Tab.',
      type: '(root: HTMLElement, e: KeyboardEvent) => boolean',
      default: '—',
    },
  ];
}
