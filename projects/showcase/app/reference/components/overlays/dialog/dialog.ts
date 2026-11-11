import { Component, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrDialog } from 'ngwr/dialog';

import { ConfirmDialogComponent, type ConfirmData } from './confirm-dialog';
import { WaitingDialogComponent } from './waiting-dialog';

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
  protected readonly lastAnswer = signal<string>('-');
  protected readonly lastSignalResult = signal<string>('-');

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
    confirm: `const ok = await this.dialog.confirm({
  title: 'Delete this item?',
  message: 'This cannot be undone.',
  confirmLabel: 'Delete',
  confirmColor: 'danger',
});
if (ok) this.store.remove(item);`,
    tabTitle: `// One dialog.
this.dialog.open(EditLampComponent, { tabTitle: true });

// Every dialog. The option on open() or confirm() still wins.
provideWr(withDialog({ tabTitle: true }));

// The joiner comes from ngwr/meta. The default is ' - '.
provideWr(withDialog({ tabTitle: true }), withMeta({ titleSeparator: ' · ' }));`,
    closeWhen: `const ref = this.dialog.open(UploadingComponent);
ref.closeWhen(this.upload.isDone, 'uploaded');

const result = await ref.awaitClose(); // 'uploaded', or undefined when dismissed first`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'open(component, options?)',
      description: 'Opens a dialog. Returns a WrDialogRef.',
      type: '(component, WrDialogOptions) => WrDialogRef',
      default: '—',
    },
    {
      name: 'confirm(options)',
      description:
        'Asks a question. `true` only for the confirm button; Escape, the backdrop, cancel, a navigation and app teardown resolve `false`. On the server it resolves `false` at once.',
      type: '(WrDialogConfirmOptions) => Promise<boolean>',
      default: '-',
    },
    {
      name: 'withDialog(defaults)',
      description: 'App-wide defaults, as a feature of `provideWr()`. Takes `tabTitle`.',
      type: '(WrDialogDefaults) => WrFeature',
      default: '-',
    },
  ];

  protected readonly confirmApi: readonly DocApiRow[] = [
    {
      name: 'WrDialogConfirmOptions',
      description:
        'Argument of `confirm()`. Also takes `width`, `maxWidth`, `panelClass`, `closeOnBackdropClick`, `closeOnEscape`, `closeOnNavigation` and `tabTitle` from `WrDialogOptions`.',
      type: 'interface',
      default: '-',
    },
    { name: 'title', description: 'The question. Names the dialog.', type: 'string', default: '-', sub: true },
    {
      name: 'message',
      description: 'Plain text under the title, never HTML. Describes the dialog.',
      type: 'string',
      default: '-',
      sub: true,
    },
    {
      name: 'confirmLabel',
      description: 'Confirm button text. Falls back to the common.ok catalog key.',
      type: 'string',
      default: '-',
      sub: true,
    },
    {
      name: 'cancelLabel',
      description: 'Cancel button text. Falls back to the common.cancel catalog key.',
      type: 'string',
      default: '-',
      sub: true,
    },
    {
      name: 'confirmColor',
      description: 'Color of the confirm button. `danger` also puts initial focus on cancel.',
      type: 'WrColor',
      default: "'primary'",
      sub: true,
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
      name: 'closeWhen(source, result?)',
      description:
        'Closes with `result` once `source` reads `true`. The watcher dies with the dialog, so nothing leaks and no injection context is needed.',
      type: '(Signal<boolean>, R?) => void',
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
    {
      name: 'role',
      description: 'An `alertdialog` is also described by its `[wrDialogContent]`.',
      type: "'dialog' | 'alertdialog'",
      default: "'dialog'",
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
    {
      name: 'tabTitle',
      description:
        'The browser tab reads the dialog title in front of the page title while the dialog is open. The default comes from `withDialog()`.',
      type: 'boolean',
      default: 'false',
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
      name: 'id',
      description: 'The element id, which an `alertdialog` names in `aria-describedby`.',
      type: 'string',
      // eslint-disable-next-line no-template-curly-in-string -- `check:api-docs` compares this with the source
      default: '`wr-dialog-content-${++uid}`',
      sub: true,
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

  protected openNamed(): void {
    this.dialog.open<ConfirmDialogComponent, boolean, ConfirmData>(ConfirmDialogComponent, {
      data: { title: 'Delete item?', message: 'The tab is named after this dialog until it closes.' },
      width: '24rem',
      tabTitle: true,
    });
  }

  protected async ask(): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'Save changes?',
      message: 'The draft is kept either way.',
      confirmLabel: 'Save',
    });
    this.lastAnswer.set(String(ok));
  }

  protected async askDanger(): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'Delete this item?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      confirmColor: 'danger',
    });
    this.lastAnswer.set(String(ok));
  }

  protected async openUntilDone(): Promise<void> {
    const done = signal(false);
    const ref = this.dialog.open<WaitingDialogComponent, string>(WaitingDialogComponent, { width: '24rem' });
    ref.closeWhen(done, 'uploaded');
    setTimeout(() => done.set(true), 3000);
    const result = await ref.awaitClose();
    this.lastSignalResult.set(result ?? 'dismissed');
  }
}
