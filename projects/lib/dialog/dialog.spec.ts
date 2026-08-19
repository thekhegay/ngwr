import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrDialog } from './dialog';
import { WrDialogRef } from './dialog-ref';
import { WrDialogClose, WrDialogContent, WrDialogFooter, WrDialogTitle } from './directives';
import type { WrDialogOptions } from './interfaces';
import { WR_DIALOG_DATA } from './tokens';

/**
 * `WrDialog` is a service, so there is no element to render in a host template:
 * the dialog is a component mounted into a CDK overlay, and every assertion goes
 * through `document` rather than the fixture. The spec provides
 * `provideWrOverlay()` for the same reason `select.spec.ts` does — its container
 * is torn down with the injector instead of leaking into the next spec file.
 */
interface ConfirmData {
  readonly message: string;
}

@Component({
  imports: [WrDialogTitle, WrDialogContent, WrDialogFooter, WrDialogClose],
  template: `
    <h2 wrDialogTitle>Delete item</h2>
    <div wrDialogContent>{{ data?.message }}</div>
    <div wrDialogFooter align="start">
      <button type="button" wrDialogClose>Cancel</button>
      <button type="button" [wrDialogClose]="true">Confirm</button>
    </div>
  `,
})
class Confirm {
  /** The payload handed to `open({ data })`. */
  readonly data = inject<ConfirmData | undefined>(WR_DIALOG_DATA, { optional: true });

  /** Content can also close itself — the counterpart to `[wrDialogClose]`. */
  readonly ref = inject<WrDialogRef<Confirm, boolean>>(WrDialogRef);
}

/** A dialog whose heading arrives — and leaves — while the dialog is open. */
@Component({
  imports: [WrDialogTitle, WrDialogContent],
  template: `
    @if (showTitle()) {
      <h2 wrDialogTitle>Edit item</h2>
    }
    <div wrDialogContent>Loading…</div>
  `,
})
class LateTitle {
  readonly showTitle = signal(false);
}

@Component({ template: `<button type="button" class="opener">Open</button>` })
class Host {
  readonly dialog = inject(WrDialog);
}

describe('WrDialog', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const opener = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.opener')!;
  const panel = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-dialog-panel');
  const backdrop = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-dialog-backdrop');
  const dismiss = (): HTMLButtonElement | null => document.querySelector<HTMLButtonElement>('.wr-dialog__close');

  /**
   * Opening happens outside change detection, and two things the dialog does are
   * deferred to the next render: the `aria-labelledby` wiring and the focus
   * trap's initial focus. `whenStable()` is what flushes them under zoneless CD —
   * reading the DOM straight after `open()` reads a dialog that is not wired yet.
   */
  const open = async (options: WrDialogOptions<ConfirmData> = {}): Promise<WrDialogRef<Confirm, boolean>> => {
    const ref = fixture.componentInstance.dialog.open<Confirm, boolean, ConfirmData>(Confirm, options);
    fixture.detectChanges();
    await fixture.whenStable();
    return ref;
  };

  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  /**
   * Test-environment shim, not a claim about the component: jsdom lays nothing
   * out, so every element measures 0×0, and the CDK's `InteractivityChecker`
   * reads a zero-sized element as invisible — the focus trap would then find
   * nothing tabbable and never move focus at all. Handing elements a box is what
   * lets the focus assertions test the dialog rather than the DOM stub.
   */
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      new DOMRect(0, 0, 120, 32),
    ] as unknown as DOMRectList);

    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fixture.destroy();
  });

  it('renders nothing until something calls open()', () => {
    expect(panel()).toBeNull();
  });

  it('mounts the component into the ngwr overlay container, not the caller’s template', async () => {
    await open();

    expect(panel()).toBeTruthy();
    expect(panel()!.textContent).toContain('Delete item');
    // The isolated container is the point of `provideWrOverlay()`: an ngwr
    // dialog must never share a stacking context with Material or NG-ZORRO.
    expect(document.querySelector('.wr-overlay-container')?.contains(panel())).toBe(true);
    expect((fixture.nativeElement as HTMLElement).contains(panel())).toBe(false);
  });

  it('announces the panel as a modal dialog', async () => {
    await open();

    expect(panel()!.getAttribute('role')).toBe('dialog');
    expect(panel()!.getAttribute('aria-modal')).toBe('true');
  });

  it('names the dialog after its wrDialogTitle heading', async () => {
    await open();

    const labelledBy = panel()!.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)?.textContent?.trim()).toBe('Delete item');
  });

  it('names the dialog from whichever title is in the panel right now', async () => {
    // The title belongs to the caller's component, so it can arrive late (an
    // async load behind an `@if`) or go away again while the dialog stays open.
    // Resolving the id once at open time meant a late heading never named the
    // dialog at all, and a removed one left `aria-labelledby` pointing at a node
    // that is no longer in the document — which is not a name either: the dialog
    // announces as unnamed, with nothing on screen to say so.
    const ref = fixture.componentInstance.dialog.open<LateTitle>(LateTitle);
    await settle();

    const named = (): string | null => panel()!.getAttribute('aria-labelledby');
    const titleId = (): string | null =>
      document.querySelector<HTMLElement>('.wr-dialog__title')?.getAttribute('id') ?? null;

    expect(named()).toBeNull();

    ref.componentRef!.instance.showTitle.set(true);
    await settle();

    expect(titleId()).toBeTruthy();
    expect(named()).toBe(titleId());

    ref.componentRef!.instance.showTitle.set(false);
    await settle();

    expect(named()).toBeNull();

    ref.close();
  });

  it('carries the public BEM classes on the panel and on the content directives', async () => {
    await open();

    // Consumers style against these, and the `--closable` modifier is what makes
    // the title reserve the corner gutter.
    expect(panel()!.classList.contains('wr-dialog-panel')).toBe(true);
    expect(panel()!.classList.contains('wr-dialog-panel--closable')).toBe(true);
    expect(panel()!.querySelector('.wr-dialog__title')).toBeTruthy();
    expect(panel()!.querySelector('.wr-dialog__content')).toBeTruthy();
    expect(panel()!.querySelector('.wr-dialog__footer')).toBeTruthy();
    expect(panel()!.querySelector('.wr-dialog__footer--start')).toBeTruthy();
  });

  it('adds panelClass alongside the default one rather than replacing it', async () => {
    await open({ panelClass: ['tall', 'narrow'] });

    expect(panel()!.classList.contains('wr-dialog-panel')).toBe(true);
    expect(panel()!.classList.contains('tall')).toBe(true);
    expect(panel()!.classList.contains('narrow')).toBe(true);
  });

  it('applies the width options to the panel', async () => {
    await open({ width: '24rem', maxWidth: '90vw' });

    expect(panel()!.style.width).toBe('24rem');
    expect(panel()!.style.maxWidth).toBe('90vw');
  });

  it('hands WR_DIALOG_DATA to the mounted component', async () => {
    const ref = await open({ data: { message: 'This cannot be undone' } });

    expect(ref.componentInstance.data).toEqual({ message: 'This cannot be undone' });
    expect(panel()!.textContent).toContain('This cannot be undone');
  });

  it('moves focus into the dialog and returns it to the opener on close', async () => {
    opener().focus();
    expect(document.activeElement).toBe(opener());

    const ref = await open();
    expect(panel()!.contains(document.activeElement)).toBe(true);

    ref.close();
    await settle();
    // Focus restoration is what makes a dialog usable from the keyboard: without
    // it the next Tab starts from the top of the document.
    expect(document.activeElement).toBe(opener());
  });

  it('closes on Escape', async () => {
    await open();

    panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle();

    expect(panel()).toBeNull();
  });

  it('ignores Escape when closeOnEscape is false', async () => {
    await open({ closeOnEscape: false });

    panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle();

    expect(panel()).toBeTruthy();
  });

  it('closes on a backdrop click', async () => {
    await open();
    expect(backdrop()).toBeTruthy();

    backdrop()!.click();
    await settle();

    expect(panel()).toBeNull();
  });

  it('keeps the backdrop but ignores its clicks when closeOnBackdropClick is false', async () => {
    await open({ closeOnBackdropClick: false });

    // The backdrop is still rendered — it is what makes the dialog modal to the
    // mouse — it just stops being a dismiss affordance.
    backdrop()!.click();
    await settle();

    expect(panel()).toBeTruthy();
  });

  it('renders a labelled dismiss button by default', async () => {
    await open({ closeLabel: 'Close' });

    expect(dismiss()).toBeTruthy();
    expect(dismiss()!.getAttribute('aria-label')).toBe('Close');

    dismiss()!.click();
    await settle();
    expect(panel()).toBeNull();
  });

  it('names the dismiss button in English when no i18n is configured at all', async () => {
    await open();

    // Regression: this used to announce the raw catalog key, "dialog.close".
    // `provideWrI18n()` is optional by design and `t()` returns the key on a
    // miss, so the bare call left a screen reader reading the key out verbatim
    // — and axe cannot catch it, because a name IS present.
    expect(dismiss()!.getAttribute('aria-label')).toBe('Close dialog');
  });

  it('lets a registered catalog win over the English fallback', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrOverlay(),
        provideWrI18n({ defaultLocale: 'en', availableLocales: ['en'] }),
        provideWrI18nStaticLoader({ en: { dialog: { close: 'Zavrit' } } }),
      ],
    });
    const dialogs = TestBed.inject(WrDialog);
    // Let the loader land BEFORE the dialog opens — that gap is the whole
    // subject here.
    TestBed.tick();
    await Promise.resolve();
    await Promise.resolve();
    TestBed.tick();

    dialogs.open(Confirm);
    TestBed.tick();
    await Promise.resolve();

    // The fallback used to be read once, at injection — and this service is
    // root-provided, so it was constructed before any async catalog had loaded
    // and then answered "Close dialog" for the life of the app. A localized
    // application got an English dismiss button on every dialog.
    expect(dismiss()!.getAttribute('aria-label')).toBe('Zavrit');
  });

  it('renders no dismiss button when closable is false', async () => {
    await open({ closable: false });

    expect(dismiss()).toBeNull();
    expect(panel()!.classList.contains('wr-dialog-panel--closable')).toBe(false);
  });

  it('returns the close result to the caller', async () => {
    const ref = await open();

    ref.close(true);
    await expect(ref.awaitClose()).resolves.toBe(true);
  });

  it('replays the result to a caller that awaits after the fact', async () => {
    // `closed` is a ReplaySubject on purpose: content can close itself before
    // `open()` even returns, and a caller that awaits later must still see the
    // result instead of a bare `complete` resolving `undefined`.
    const ref = await open();
    ref.close(false);
    await settle();

    await expect(ref.awaitClose()).resolves.toBe(false);
  });

  it('closes with the value bound to [wrDialogClose]', async () => {
    const ref = await open();

    panel()!.querySelectorAll<HTMLButtonElement>('.wr-dialog__footer button')[1].click();
    await settle();

    expect(panel()).toBeNull();
    await expect(ref.awaitClose()).resolves.toBe(true);
  });

  it('closes with undefined when wrDialogClose is a bare attribute', async () => {
    // The empty-string attribute value means "no result", not a result of `''`.
    const ref = await open();

    panel()!.querySelectorAll<HTMLButtonElement>('.wr-dialog__footer button')[0].click();
    await settle();

    await expect(ref.awaitClose()).resolves.toBeUndefined();
  });

  it('lets the content close itself through the injected ref', async () => {
    const ref = await open();

    ref.componentInstance.ref.close(true);
    await settle();

    expect(panel()).toBeNull();
    await expect(ref.awaitClose()).resolves.toBe(true);
  });

  it('ignores a second close and keeps the first result', async () => {
    const ref = await open();

    ref.close(true);
    ref.close(false);
    await settle();

    await expect(ref.awaitClose()).resolves.toBe(true);
  });

  it('drops the component instance once closed', async () => {
    const ref = await open();
    ref.close();
    await settle();

    // The ref is often held past the close (awaiting the result); it must not
    // pin the destroyed component, its host element and its view in memory.
    expect(() => ref.componentInstance).toThrow();
  });

  it('stacks two dialogs, and closing the top one leaves the other open', async () => {
    await open();
    const second = await open();

    expect(document.querySelectorAll('.wr-dialog-panel')).toHaveLength(2);

    second.close();
    await settle();

    expect(document.querySelectorAll('.wr-dialog-panel')).toHaveLength(1);
  });
});
