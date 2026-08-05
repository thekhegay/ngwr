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
    selfClose: `// Inside the opened component — close without a click.
import { WR_DIALOG_DATA, WrDialogRef } from 'ngwr/dialog';

@Component({...})
export class EditUserComponent {
  private readonly ref = inject(WrDialogRef);
  protected readonly data = inject<EditUserData>(WR_DIALOG_DATA);

  save(): void {
    this.store.saveUser(this.form.value);
    this.ref.close(true);            // the caller's awaitClose() resolves
  }
}

// The class token already types the generics — no cast, no WR_DIALOG_REF needed:
private readonly ref = inject<WrDialogRef<EditUserComponent, boolean>>(WR_DIALOG_REF);`,
    closeButton: `<!-- There is no built-in close (×) — dialogs close on backdrop click,
     Escape, and whatever you mark with [wrDialogClose]. Add a corner × like
     this when the design calls for one. -->
<div wrDialogTitle style="display: flex; align-items: center; gap: 0.5rem">
  <span style="flex: 1 1 auto">Edit user</span>
  <wr-btn size="sm" icon="close" [attr.aria-label]="'Close'" wrDialogClose />
</div>
<div wrDialogContent>…</div>`,
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

  protected readonly injectablesApi: readonly DocApiRow[] = [
    {
      name: 'WR_DIALOG_DATA',
      description: "The data payload passed to open(). undefined when you didn't pass any.",
      type: 'InjectionToken<D>',
      default: '—',
    },
    {
      name: 'WrDialogRef',
      description: 'The open dialog’s own ref — call close(result) to dismiss it from the content.',
      type: 'WrDialogRef<unknown, unknown>',
      default: '—',
    },
    {
      name: 'WR_DIALOG_REF',
      description:
        'The same ref under a second key, used by `[wrDialogClose]`. Prefer `inject(WrDialogRef)` — it already supports `{ optional: true }` and typed generics.',
      type: 'InjectionToken<WrDialogRef<C, R>>',
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
