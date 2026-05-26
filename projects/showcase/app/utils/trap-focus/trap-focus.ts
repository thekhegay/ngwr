import { ChangeDetectionStrategy, Component } from '@angular/core';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class TrapFocusPage {
  protected readonly snippet = `import { trapFocus } from 'ngwr/utils';

@HostListener('keydown', ['$event']) onKey(e: KeyboardEvent) {
  // Cycle Tab focus inside the dialog while it's open.
  trapFocus(dialogRef.nativeElement, e);
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'trapFocus(root, event)',
      description: 'Cycle Tab focus inside `root` — call from a keydown handler. Returns `true` when the event was a Tab that got handled.',
      type: '(root: HTMLElement, e: KeyboardEvent) => boolean',
      default: '—',
    },
  ];
}
