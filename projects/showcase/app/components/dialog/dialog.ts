import { Component, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrDialog } from 'ngwr/dialog';

import { ConfirmDialogComponent, type ConfirmData } from './confirm-dialog';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-dialog-page',
  templateUrl: './dialog.html',
  imports: [WrButton, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class DialogPageComponent {
  private readonly dialog = inject(WrDialog);
  protected readonly lastResult = signal<string>('—');

  protected readonly snippets = {
    install: `import { WrDialog } from 'ngwr/dialog';

@Component({...})
export class MyComponent {
  private readonly dialog = inject(WrDialog);
}`,
    open: `const ref = dialog.open(ConfirmComponent, {
  data: { title: 'Delete', message: 'Are you sure?' },
  width: '24rem',
});

const ok = await ref.awaitClose(); // result from <wr-btn wrDialogClose value>`,
    template: `// Inside the opened component
<h2 wrDialogTitle>Delete</h2>
<div wrDialogContent>Are you sure?</div>
<div wrDialogFooter>
  <wr-btn wrDialogClose>Cancel</wr-btn>
  <wr-btn color="danger" [wrDialogClose]="true">Delete</wr-btn>
</div>`,
    responsive: `// Per dialog — slides up as a bottom-sheet on small screens.
dialog.open(ConfirmComponent, { responsive: true });

// Or app-wide, for every overlay:
provideWrResponsiveOverlays();          // default breakpoint 640px
provideWrResponsiveOverlays({ breakpoint: 768 });`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'open(component, options?)',
      description: 'Opens a dialog. Returns a WrDialogRef.',
      type: '(component, WrDialogOptions) => WrDialogRef',
      default: '—',
    },
  ];

  protected readonly directivesApi: readonly DocApiRow[] = [
    { name: '[wrDialogTitle]', description: 'Styles the title row.', type: 'directive', default: '—' },
    { name: '[wrDialogContent]', description: 'Styles the scrollable body.', type: 'directive', default: '—' },
    {
      name: '[wrDialogFooter]',
      description: 'Styles the footer; align="start" | "center" | "end" (default end).',
      type: 'directive',
      default: '—',
    },
    {
      name: '[wrDialogClose]="value?"',
      description: 'Closes the dialog when clicked; optional value becomes the close result.',
      type: 'directive',
      default: '—',
    },
  ];

  protected async openConfirm(responsive = false): Promise<void> {
    const ref = this.dialog.open<ConfirmDialogComponent, boolean, ConfirmData>(ConfirmDialogComponent, {
      data: { title: 'Delete item?', message: 'This action cannot be undone.' },
      width: '24rem',
      responsive,
    });
    const result = await ref.awaitClose();
    this.lastResult.set(result === true ? 'Confirmed' : 'Cancelled');
  }
}
