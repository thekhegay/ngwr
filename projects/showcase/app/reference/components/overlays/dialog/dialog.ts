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
    open: `const ref = dialog.open(ConfirmComponent, {
  data: { title: 'Delete', message: 'Are you sure?' },
  width: '24rem',
});

const ok = await ref.awaitClose();`,
    template: `<!-- Inside the opened component.
     imports: [WrDialogTitle, WrDialogContent, WrDialogFooter, WrDialogClose] -->
<h2 wrDialogTitle>Delete</h2>
<div wrDialogContent>Are you sure?</div>
<div wrDialogFooter>
  <wr-btn wrDialogClose>Cancel</wr-btn>
  <wr-btn color="danger" [wrDialogClose]="true">Delete</wr-btn>
</div>`,
    selfClose: `import { WR_DIALOG_DATA, WrDialogRef } from 'ngwr/dialog';

@Component({...})
export class EditUserComponent {
  private readonly ref = inject<WrDialogRef<EditUserComponent, boolean>>(WrDialogRef);
  protected readonly data = inject<EditUserData>(WR_DIALOG_DATA);

  save(): void {
    this.store.saveUser(this.form.value);
    this.ref.close(true);
  }
}`,
    closeButton: `dialog.open(EditUserComponent, { closable: false });
dialog.open(EditUserComponent, { closeLabel: 'Discard changes' });`,
    lifetime: `@Component({...})
export class MyComponent {
  private readonly dialog = inject(WrDialog);
  private readonly destroyRef = inject(DestroyRef);

  async confirmDelete(): Promise<void> {
    const ref = this.dialog.open<ConfirmComponent, boolean>(ConfirmComponent);
    const stop = this.destroyRef.onDestroy(() => ref.close());

    const ok = await ref.awaitClose();
    stop();
    if (ok) this.store.remove();
  }
}

// Or subscribe:
ref.closed.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(ok => { … });`,
    focus: `<!-- cdkFocusInitial needs no import. -->
<h2 wrDialogTitle>Rename project</h2>
<div wrDialogContent>
  <wr-form-field label="Name">
    <input wrInput cdkFocusInitial [(value)]="name" />
  </wr-form-field>
</div>
<div wrDialogFooter>
  <wr-btn wrDialogClose>Cancel</wr-btn>
  <wr-btn color="primary" [wrDialogClose]="name()">Save</wr-btn>
</div>`,
    refResult: `const ref = this.dialog.open<ConfirmComponent, 'saved' | 'discarded'>(ConfirmComponent);

const result = await ref.awaitClose(); // 'saved' | 'discarded' | undefined
if (result === undefined) return;      // dismissed`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'open(component, options?)',
      description: 'Opens a dialog. Returns a WrDialogRef.',
      type: '(component, WrDialogOptions) => WrDialogRef',
      default: '—',
    },
  ];

  protected readonly refApi: readonly DocApiRow[] = [
    {
      name: 'WrDialogRef<C, R>',
      description: 'Returned by `open()` and injectable inside the dialog. `C` is the component, `R` the result.',
      type: 'class',
    },
    {
      name: 'close(result?)',
      description: 'Close the dialog, optionally with a result. A second call does nothing.',
      type: '(result?: R) => void',
      sub: true,
    },
    {
      name: 'awaitClose()',
      description: 'Resolves with the close result.',
      type: '() => Promise<R | undefined>',
      sub: true,
    },
    {
      name: 'closed',
      description: 'The same result as an Observable. Emits once, then completes; a late subscriber still gets it.',
      type: 'ReplaySubject<R | undefined>',
      sub: true,
    },
    {
      name: 'componentInstance',
      description: 'The opened component. Throws if read from its own constructor.',
      type: 'C',
      sub: true,
    },
    {
      name: 'overlayRef',
      description: 'The underlying CDK `OverlayRef`. Never dispose it; call `close()`.',
      type: 'OverlayRef',
      sub: true,
    },
  ];

  protected readonly optionsApi: readonly DocApiRow[] = [
    {
      name: 'WrDialogOptions',
      description: 'Second argument of `open()`. Every field is optional.',
      type: 'interface',
      default: '—',
    },
    {
      name: 'data',
      description: 'Payload exposed to the content via WR_DIALOG_DATA.',
      type: 'D',
      default: '—',
      sub: true,
    },
    { name: 'width', description: 'Panel width — any CSS length.', type: 'string', default: '—', sub: true },
    { name: 'maxWidth', description: 'Panel maximum width.', type: 'string', default: '—', sub: true },
    {
      name: 'closeOnBackdropClick',
      description: 'Close when the backdrop is clicked.',
      type: 'boolean',
      default: 'true',
      sub: true,
    },
    { name: 'closeOnEscape', description: 'Close on Escape.', type: 'boolean', default: 'true', sub: true },
    {
      name: 'closeOnNavigation',
      description: 'Close when the URL changes.',
      type: 'boolean',
      default: 'true',
      sub: true,
    },
    {
      name: 'closable',
      description: 'Show the built-in dismiss (×) in the top-right corner.',
      type: 'boolean',
      default: 'true',
      sub: true,
    },
    {
      name: 'closeLabel',
      description: 'Accessible name for the dismiss button. Falls back to the dialog.close catalog key.',
      type: 'string',
      default: '—',
      sub: true,
    },
    {
      name: 'panelClass',
      description: 'Extra class(es) on the panel.',
      type: 'string | readonly string[]',
      default: '—',
      sub: true,
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
      description: 'The same ref, used by `[wrDialogClose]`. Prefer `inject(WrDialogRef)`.',
      type: 'InjectionToken<WrDialogRef<C, R>>',
      default: '—',
    },
  ];

  protected readonly directivesApi: readonly DocApiRow[] = [
    {
      name: '[wrDialogTitle]',
      description: 'Styles the title row, and supplies the panel’s `aria-labelledby`. Import `WrDialogTitle`.',
      type: 'directive',
      default: '—',
    },
    {
      name: '[wrDialogContent]',
      description: 'Styles the scrollable body. Import `WrDialogContent`.',
      type: 'directive',
      default: '—',
    },
    {
      name: '[wrDialogFooter]',
      description: 'Styles the footer. Import `WrDialogFooter`.',
      type: 'directive',
      default: '—',
    },
    {
      name: 'align',
      description: 'Footer alignment.',
      type: "'start' | 'center' | 'end'",
      default: "'end'",
      sub: true,
    },
    {
      name: '[wrDialogClose]',
      description: 'Closes the dialog when clicked. Import `WrDialogClose`.',
      type: 'directive',
      default: '—',
    },
    {
      name: 'wrDialogClose',
      description: 'Value passed to `close()`. Bare attribute closes with `undefined`.',
      type: 'R | undefined',
      default: 'undefined',
      sub: true,
    },
  ];

  protected async openConfirm(): Promise<void> {
    const ref = this.dialog.open<ConfirmDialogComponent, boolean, ConfirmData>(ConfirmDialogComponent, {
      data: { title: 'Delete item?', message: 'This action cannot be undone.' },
      width: '24rem',
    });
    const result = await ref.awaitClose();
    this.lastResult.set(result === true ? 'Confirmed' : 'Cancelled');
  }
}
