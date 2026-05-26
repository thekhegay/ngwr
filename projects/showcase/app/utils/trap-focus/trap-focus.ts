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

  protected readonly whySnippet = `// Native — what an accessible dialog actually needs to do.
@HostListener('keydown', ['$event'])
onKey(e: KeyboardEvent) {
  if (e.key !== 'Tab') return;
  const focusables = getAllVisibleFocusableSortedByTabindex(this.el.nativeElement);
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
}
// → Then you implement \`getAllVisibleFocusableSortedByTabindex\` per dialog.

// ngwr — one line.
@HostListener('keydown', ['$event'])
onKey(e: KeyboardEvent) {
  trapFocus(this.el.nativeElement, e);
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
