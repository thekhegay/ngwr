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
    // Two components, two different imports — and the second half is the one a
    // reader cannot derive. The API table below lists the layout directives by
    // SELECTOR (\`[wrDialogTitle]\`), while \`imports: []\` takes the CLASS, so a
    // page that named only \`WrDialog\` left the four class names spelled nowhere.
    install: `// The component that OPENS a dialog injects the service.
import { WrDialog } from 'ngwr/dialog';

@Component({...})
export class MyComponent {
  private readonly dialog = inject(WrDialog);
}

// The component OPENED as a dialog imports the layout directives it uses.
// Selector -> class: [wrDialogTitle] -> WrDialogTitle, and so on.
import { WrDialogClose, WrDialogContent, WrDialogFooter, WrDialogTitle } from 'ngwr/dialog';

@Component({
  imports: [WrDialogTitle, WrDialogContent, WrDialogFooter, WrDialogClose],
  templateUrl: './confirm.html',
})
export class ConfirmComponent {}`,
    open: `const ref = dialog.open(ConfirmComponent, {
  data: { title: 'Delete', message: 'Are you sure?' },
  width: '24rem',
});

const ok = await ref.awaitClose(); // result from <wr-btn wrDialogClose value>`,
    template: `// Inside the opened component. Every attribute below is a directive:
// imports: [WrDialogTitle, WrDialogContent, WrDialogFooter, WrDialogClose]
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
    closeButton: `// The × comes for free — nothing to add. It sits in the panel's top-right
// corner, is labelled from the \`dialog.close\` i18n key, and the title row
// reserves the gutter so a long heading wraps instead of running under it.
dialog.open(EditUserComponent);

// Turn it off when the content already owns its dismiss, or when the dialog
// must be resolved through its own actions:
dialog.open(EditUserComponent, { closable: false });

// Override just the accessible name:
dialog.open(EditUserComponent, { closeLabel: 'Discard changes' });`,
    lifetime: `// A dialog outlives the component that opened it. \`WrDialog\` is root-provided
// and the panel's injector hangs off the root environment injector, so an
// \`@if\` that removes the opener leaves the panel, its backdrop and the
// \`cdk-global-scrollblock\` on the page. (Navigation is the one exception:
// \`closeOnNavigation\` is on by default.) Close the ref when you go away.
import { DestroyRef, inject } from '@angular/core';

@Component({...})
export class MyComponent {
  private readonly dialog = inject(WrDialog);
  private readonly destroyRef = inject(DestroyRef);

  async confirmDelete(): Promise<void> {
    const ref = this.dialog.open<ConfirmComponent, boolean>(ConfirmComponent);
    const stop = this.destroyRef.onDestroy(() => ref.close());

    // awaitClose() is a Promise, so takeUntilDestroyed() does not apply to it —
    // that operator takes an Observable. Two ways to not act on a stale result:
    const ok = await ref.awaitClose();
    stop();                                  // nothing left to cancel
    if (ok) this.store.remove();
  }
}

// Or subscribe instead of awaiting, and takeUntilDestroyed() does apply —
// \`ref.closed\` is an Observable, and the ref is the same one either way.
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

ref.closed.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(ok => { … });`,
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
      description:
        'Close as soon as the URL changes — Back and `router.navigate()` alike. Turn it off only for a dialog that owns the navigation.',
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
      name: 'responsive',
      description: 'Present as a bottom-sheet on small viewports. Undefined follows provideWrResponsiveOverlays().',
      type: 'boolean',
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
      description:
        'The same ref under a second key, used by `[wrDialogClose]`. Prefer `inject(WrDialogRef)` — it already supports `{ optional: true }` and typed generics.',
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
