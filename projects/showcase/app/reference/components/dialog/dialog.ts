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
    focus: `<!-- Inside the opened component. Nothing to import: the focus trap looks
     for the attribute by name, so a bare \`cdkFocusInitial\` is enough. -->
<h2 wrDialogTitle>Rename project</h2>
<div wrDialogContent>
  <wr-form-field label="Name">
    <input wrInput cdkFocusInitial [(value)]="name" />
  </wr-form-field>
</div>
<div wrDialogFooter>
  <wr-btn wrDialogClose>Cancel</wr-btn>
  <wr-btn color="primary" [wrDialogClose]="name()">Save</wr-btn>
</div>

<!-- Without \`cdkFocusInitial\` the first tabbable element wins — here the same
     input, since the ✕ is appended AFTER your content and comes last. A panel
     of plain text focuses nothing; Escape still closes it. -->`,
    topLayer: `// The overlay container is isolated, and that is what \`provideWrOverlay()\`
// promises — not a place in your z-index scale. These do nothing:
//
//   .wr-overlay-container .cdk-overlay-pane { z-index: 1100; }
//   header { z-index: 100000; }
//
// To opt the whole application out of the top layer and back into ordinary
// stacking, configure the CDK itself at bootstrap:
import { OVERLAY_DEFAULT_CONFIG } from '@angular/cdk/overlay';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: OVERLAY_DEFAULT_CONFIG, useValue: { usePopover: false } },
  ],
});

// Opting out is a real trade: overlays go back to being clipped by an
// ancestor's \`overflow\` and to competing on z-index with everything else.`,
    nested: `// A dialog that owns a form: keep the backdrop, ignore its clicks.
const ref = this.dialog.open(EditUserComponent, {
  closeOnBackdropClick: false,   // a click beside an open select cannot lose the form
  // closeOnEscape stays true — Escape closes the select first, the dialog next.
});`,
    refResult: `const ref = this.dialog.open<ConfirmComponent, 'saved' | 'discarded'>(ConfirmComponent);

// \`undefined\` is every dismissal: ✕, Escape, backdrop, navigation, and a bare
// [wrDialogClose]. Give the outcomes you care about their own values.
const result = await ref.awaitClose();   // 'saved' | 'discarded' | undefined
if (result === undefined) return;        // dismissed — leave the page as it was

// Or subscribe, when the caller is not an async method:
ref.closed.subscribe(result => { … });   // emits once, then completes`,
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

  protected readonly refApi: readonly DocApiRow[] = [
    {
      name: 'WrDialogRef<C, R>',
      description:
        'Returned by `open()`, and provided inside the dialog’s own injector. `C` is the opened component, `R` the close result.',
      type: 'class',
    },
    {
      name: 'close(result?)',
      description:
        'Dismiss the dialog, optionally with a result. Idempotent — a second call is a no-op, so a save handler racing the ✕ cannot emit twice.',
      type: '(result?: R) => void',
      sub: true,
    },
    {
      name: 'awaitClose()',
      description:
        'Resolves with the close result once the dialog is dismissed. A Promise, so `takeUntilDestroyed()` does not apply to it — see “Lifetime” above.',
      type: '() => Promise<R | undefined>',
      sub: true,
    },
    {
      name: 'closed',
      description:
        'The same result as an Observable — emits once, then completes. A `ReplaySubject`, so subscribing after the dialog has already closed still gets the value rather than a bare completion.',
      type: 'ReplaySubject<R | undefined>',
      sub: true,
    },
    {
      name: 'componentInstance',
      description:
        'The instantiated dialog component, for reading a signal on it or calling one of its methods. Throws while the dialog is still attaching — which is only reachable from the content’s own constructor.',
      type: 'C',
      sub: true,
    },
    {
      name: 'overlayRef',
      description:
        'The underlying CDK `OverlayRef` — an escape hatch for the cases the options do not cover. Do not dispose it directly: that bypasses `closed`, leaves `awaitClose()` pending and never destroys the focus trap. Call `close()`.',
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
