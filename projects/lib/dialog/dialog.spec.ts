import { type Direction, Directionality } from '@angular/cdk/bidi';
import { ScrollDispatcher } from '@angular/cdk/scrolling';
import { Location } from '@angular/common';
import { ApplicationRef, Component, EnvironmentInjector, PLATFORM_ID, inject, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { WrMeta, withMeta } from 'ngwr/meta';
import { WrOverlayOrder } from 'ngwr/overlay';
import type { WrFeature } from 'ngwr/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { compileSass } from '../spec-sass';

import { WrDialog } from './dialog';
import { WrDialogRef } from './dialog-ref';
import { WrDialogClose, WrDialogContent, WrDialogFooter, WrDialogTitle } from './directives';
import { WR_DIALOG_DATA } from './tokens';
import type { WrDialogAlertOptions, WrDialogConfirmOptions, WrDialogIntent, WrDialogOptions } from './types';
import { withDialog } from './with-dialog';

/**
 * `WrDialog` is a service, so there is no element to render in a host template:
 * the dialog is a component mounted into a CDK overlay, and every assertion goes
 * through `document` rather than the fixture. Its container belongs to the
 * TestBed's root injector, so it is torn down with the injector instead of
 * leaking into the next spec file.
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
    // ngwr overlays are isolated by default: an ngwr dialog must never share a
    // stacking context with Material or NG-ZORRO.
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

  /**
   * The array form above was the only one covered, and the string form THREW:
   * the CDK hands `panelClass` to `classList.add()` without splitting it, so one
   * `'tall narrow'` reached `add('tall narrow')` and took the open call down with
   * `InvalidCharacterError`. Which is the form anyone writing utility classes
   * reaches for first.
   */
  it('splits a space-separated panelClass instead of throwing on it', async () => {
    await open({ panelClass: 'tall narrow' });

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

  /**
   * The body is a real scroll container (`overflow: auto`), and an anchored
   * overlay opened inside it — a `<wr-select>` halfway down a long form — follows
   * its trigger only through `ScrollDispatcher`: CDK's `reposition()` strategy
   * listens to nothing else, and its one document-level fallback listener is
   * non-capturing, which an element's `scroll` (it does not bubble) never
   * reaches.
   *
   * The registration is what a unit test can hold. Whether the panel then lands
   * in the right PLACE is layout, and jsdom has none — every rect is 0×0 — so the
   * assertion is the dispatch, not the pixel.
   */
  it('registers the dialog body with the scroll dispatcher', async () => {
    await open();
    const body = panel()!.querySelector<HTMLElement>('.wr-dialog__content')!;

    const seen: unknown[] = [];
    // `scrolled(0)` skips the default 20ms audit window, so the emission is
    // synchronous and no clock has to be driven.
    const sub = TestBed.inject(ScrollDispatcher)
      .scrolled(0)
      .subscribe(scrollable => seen.push(scrollable));
    // NOT bubbling, which is the whole point: this is the event a browser fires
    // on an inner scroll container, and the one the document listener misses.
    body.dispatchEvent(new Event('scroll'));
    sub.unsubscribe();

    expect(seen).toHaveLength(1);
  });

  /**
   * A dialog is not tied to the route it was opened on by anything else: the
   * overlay belongs to a root service and is dismissed only by the backdrop,
   * Escape or an explicit `close()`. Pressing Back therefore swapped the routed
   * view underneath and left the modal pane, its backdrop and its focus trap over
   * a page the user never opened them on.
   */
  describe('navigation', () => {
    it('closes when the app navigates', async () => {
      const ref = await open();
      const result = ref.awaitClose();

      TestBed.inject(Location).go('/elsewhere');
      await settle();

      expect(panel()).toBeNull();
      expect(backdrop()).toBeNull();
      // Closed through the ref, not disposed behind its back: a caller sitting on
      // `awaitClose()` has to be released, and the focus trap has to come down.
      await expect(result).resolves.toBeUndefined();
    });

    it('closes on the Back button', async () => {
      await open();

      window.dispatchEvent(new PopStateEvent('popstate'));
      await settle();

      expect(panel()).toBeNull();
    });

    it('takes every stacked dialog with it', async () => {
      await open();
      await open();
      expect(document.querySelectorAll('.wr-dialog-panel')).toHaveLength(2);

      TestBed.inject(Location).go('/elsewhere-again');
      await settle();

      // Both, not just the first: `Location` notifies its listeners with a
      // `forEach` over an array each close removes an entry from.
      expect(document.querySelectorAll('.wr-dialog-panel')).toHaveLength(0);
    });

    it('stays put for a dialog that owns the navigation', async () => {
      await open({ closeOnNavigation: false });

      TestBed.inject(Location).go('/still-here');
      await settle();

      expect(panel()).not.toBeNull();
    });
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

/**
 * Every documented `[align]` on the footer directive. It is a plain directive
 * on the consumer's own element, so the modifier is the entire contract — there
 * is no other observable difference between the three values.
 */
describe('WrDialogFooter emits a modifier for every documented align', () => {
  @Component({
    imports: [WrDialogFooter],
    template: `<div wrDialogFooter [align]="align()">Actions</div>`,
  })
  class FooterHost {
    readonly align = signal<'start' | 'center' | 'end'>('end');
  }

  let fixture: ReturnType<typeof TestBed.createComponent<FooterHost>>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(FooterHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it.each<'start' | 'center' | 'end'>(['start', 'center', 'end'])('align %s', align => {
    fixture.componentInstance.align.set(align);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('div')!.classList).toContain(
      `wr-dialog__footer--${align}`
    );
  });
});

/**
 * A dialog outlives a direction change. The CDK captures the direction as a
 * string when the overlay is created and writes it once, on attach — so an app
 * that flips while a modal is up mirrors the page and leaves the panel behind,
 * still resolving `start` and `end` the other way round. This site's own
 * LTR/RTL switch is the demonstration: it is a menu item, so the flip always
 * arrives with an overlay already on screen.
 *
 * The assertions read the attribute the CDK actually writes, which is on the
 * WRAPPER around the pane rather than on the pane `panelClass` lands on.
 */
describe('WrDialog follows a direction change while a dialog is open', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let dir: Directionality;
  const opened: WrDialogRef<Confirm, boolean>[] = [];

  const panels = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-dialog-panel')];
  const dirs = (): (string | null)[] => panels().map(p => p.parentElement!.getAttribute('dir'));

  const open = async (): Promise<void> => {
    opened.push(fixture.componentInstance.dialog.open<Confirm, boolean>(Confirm));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  /** A signal write is state, not an event: it lands on the next pass. */
  const flip = async (next: Direction): Promise<void> => {
    dir.valueSignal.set(next);
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    dir = TestBed.inject(Directionality);
    fixture.detectChanges();
  });

  afterEach(() => {
    for (const ref of opened.splice(0)) ref.close();
    fixture.destroy();
  });

  it('rewrites the panel’s dir, so the content inside it mirrors with the page', async () => {
    await open();
    expect(dirs()).toEqual(['ltr']);

    await flip('rtl');

    expect(dirs()).toEqual(['rtl']);
  });

  it('follows on every dialog in the stack, not only the last one opened', async () => {
    await open();
    await open();

    await flip('rtl');

    // Each `open()` builds its own `OverlayRef`, so the follower has to be per
    // ref: one installed for the service would leave the dialog underneath —
    // the one the user goes back to — rendering the old way.
    expect(dirs()).toEqual(['rtl', 'rtl']);
  });

  it('gives a reopened dialog a follower of its own', async () => {
    await open();
    for (const ref of opened.splice(0)) ref.close();
    await fixture.whenStable();

    await open();
    await flip('rtl');

    expect(dirs()).toEqual(['rtl']);
  });
});

/**
 * What the stylesheet promises that jsdom cannot show: it applies no sheet, and
 * the CDK's structural one arrives at runtime. Held against the COMPILED CSS;
 * that the gutter then holds was measured in Chromium at 390px.
 */
describe('WrDialog panel gutter', () => {
  const css = compileSass("@use 'dialog/styles';").replace(/\/\*[\s\S]*?\*\//g, '');
  /** Every rule block whose selector list is exactly `selector`, joined. */
  const rules = (selector: string): string =>
    [...css.matchAll(new RegExp(`(?:^|\\n)${selector.replace(/\./g, '\\.')} \\{([^}]*)\\}`, 'g'))]
      .map(m => m[1])
      .join('\n');

  it('out-specifies the CDK pane rule that caps it at 100%', () => {
    // `.cdk-overlay-pane { max-width: 100%; max-height: 100% }` is injected after
    // the app stylesheet, so a one-class rule here loses on source order.
    expect(rules('.wr-dialog-panel.cdk-overlay-pane')).toMatch(/max-width:\s*calc\(100vw - 2rem\)/);
    expect(rules('.wr-dialog-panel.cdk-overlay-pane')).toMatch(/max-height:\s*calc\(100dvh - 2rem\)/);
    expect(rules('.wr-dialog-panel')).not.toMatch(/max-(width|height)/);
  });
});

/**
 * Without `exportAs` a template cannot reach the directive at all -
 * `#t="wrDialogTitle"` fails to compile rather than resolving to nothing - so
 * mounting the host is half the assertion. The other half is that the reference
 * is the directive and not the heading it sits on: `id` is what a consumer
 * reads to point an `aria-labelledby` of their own at the title.
 */
describe('WrDialogTitle template reference', () => {
  @Component({
    imports: [WrDialogTitle],
    template: `<h2 wrDialogTitle #ref="wrDialogTitle">Delete item</h2>`,
  })
  class ExportHost {
    readonly title = viewChild.required<WrDialogTitle>('ref');
  }

  it('publishes the instance as `wrDialogTitle`', () => {
    TestBed.resetTestingModule();

    const fixture = TestBed.createComponent(ExportHost);
    fixture.detectChanges();

    const title = fixture.componentInstance.title();
    expect(title).toBeInstanceOf(WrDialogTitle);
    expect((fixture.nativeElement as HTMLElement).querySelector('h2')?.id).toBe(title.id);

    fixture.destroy();
  });
});

/**
 * `confirm()` is `open()` around one internal component, so the suite reads
 * the same overlay DOM the one above does and asks only what is new: the
 * answer, the role, the focus, the labels, and every way out resolving `false`.
 */
describe('WrDialog.confirm', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const opener = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.opener')!;
  const panel = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-dialog-panel');
  const backdrop = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-dialog-backdrop');
  const confirmButton = (): HTMLElement | null =>
    document.querySelector<HTMLElement>('.wr-dialog-confirm__action--confirm');
  const cancelButton = (): HTMLElement | null =>
    document.querySelector<HTMLElement>('.wr-dialog-confirm__action--cancel');

  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  /** The answer, which every test settles before reading the DOM. */
  const confirm = (options: Partial<WrDialogConfirmOptions> = {}): Promise<boolean> =>
    fixture.componentInstance.dialog.confirm({ title: 'Delete item?', ...options });

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      new DOMRect(0, 0, 120, 32),
    ] as unknown as DOMRectList);

    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fixture.destroy();
  });

  it('resolves true only when the confirm button is pressed', async () => {
    const answer = confirm();
    await settle();
    expect(panel()).toBeTruthy();

    confirmButton()!.click();
    await settle();

    await expect(answer).resolves.toBe(true);
    expect(panel()).toBeNull();
  });

  it('resolves false from the cancel button', async () => {
    const answer = confirm();
    await settle();

    cancelButton()!.click();
    await settle();

    await expect(answer).resolves.toBe(false);
  });

  it('resolves false from Escape', async () => {
    const answer = confirm();
    await settle();

    panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle();

    await expect(answer).resolves.toBe(false);
  });

  it('resolves false from the backdrop, and keeps the backdrop closed when told to', async () => {
    const answer = confirm();
    await settle();
    backdrop()!.click();
    await settle();
    await expect(answer).resolves.toBe(false);

    const stubborn = confirm({ closeOnBackdropClick: false });

    await settle();
    backdrop()!.click();
    await settle();
    expect(panel()).toBeTruthy();
    cancelButton()!.click();
    await settle();
    await expect(stubborn).resolves.toBe(false);
  });

  it('resolves false when the app navigates away from under it', async () => {
    const answer = confirm();
    await settle();

    TestBed.inject(Location).go('/elsewhere');
    await settle();

    await expect(answer).resolves.toBe(false);
    expect(panel()).toBeNull();
  });

  it('settles once on a double click', async () => {
    const answer = confirm();
    await settle();

    // One element, two clicks: the first closes the dialog, the second lands
    // on the same button after the overlay is gone.
    const button = confirmButton()!;
    button.click();
    button.click();
    await settle();

    await expect(answer).resolves.toBe(true);
    expect(panel()).toBeNull();
  });

  it('announces an alertdialog named by the title and described by the message', async () => {
    void confirm({ message: 'This cannot be undone.' });
    await settle();

    expect(panel()!.getAttribute('role')).toBe('alertdialog');
    expect(panel()!.getAttribute('aria-modal')).toBe('true');
    const name = document.getElementById(panel()!.getAttribute('aria-labelledby')!);
    const description = document.getElementById(panel()!.getAttribute('aria-describedby')!);
    expect(name?.textContent?.trim()).toBe('Delete item?');
    expect(description?.textContent?.trim()).toBe('This cannot be undone.');
    // The two buttons are the answers: no corner dismiss on top of them.
    expect(document.querySelector('.wr-dialog__close')).toBeNull();
  });

  it('describes nothing when there is no message', async () => {
    void confirm();
    await settle();

    expect(panel()!.hasAttribute('aria-describedby')).toBe(false);
    expect(document.querySelector('.wr-dialog__content')).toBeNull();
  });

  it('renders the message as text, never as HTML', async () => {
    void confirm({ message: '<b>bold</b>' });
    await settle();

    const content = document.querySelector<HTMLElement>('.wr-dialog__content')!;
    expect(content.textContent).toContain('<b>bold</b>');
    expect(content.querySelector('b')).toBeNull();
  });

  it('paints the confirm button in the requested color and marks the panel content for danger', async () => {
    void confirm({ confirmColor: 'danger' });
    await settle();

    expect(confirmButton()!.classList.contains('wr-btn--danger')).toBe(true);
    expect(document.querySelector('.wr-dialog-confirm--danger')).toBeTruthy();
    cancelButton()!.click();
    await settle();

    void confirm();

    await settle();
    expect(confirmButton()!.classList.contains('wr-btn--primary')).toBe(true);
    expect(document.querySelector('.wr-dialog-confirm--danger')).toBeNull();
  });

  it('focuses the safe answer on a danger question, the confirm button otherwise', async () => {
    opener().focus();
    const danger = confirm({ confirmColor: 'danger' });
    await settle();
    expect(document.activeElement).toBe(cancelButton());
    cancelButton()!.click();
    await settle();
    await danger;
    expect(document.activeElement).toBe(opener());

    void confirm();

    await settle();
    expect(document.activeElement).toBe(confirmButton());
  });

  it('labels the answers OK and Cancel, and takes a label per call', async () => {
    void confirm();
    await settle();
    expect(confirmButton()!.textContent?.trim()).toBe('OK');
    expect(cancelButton()!.textContent?.trim()).toBe('Cancel');
    cancelButton()!.click();
    await settle();

    void confirm({ confirmLabel: 'Delete', cancelLabel: 'Keep' });

    await settle();
    expect(confirmButton()!.textContent?.trim()).toBe('Delete');
    expect(cancelButton()!.textContent?.trim()).toBe('Keep');
  });

  it('reads the labels from a registered catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'en', availableLocales: ['en'] }),
        provideWrI18nStaticLoader({ en: { common: { ok: 'Ano', cancel: 'Zrusit' } } }),
      ],
    });
    const dialogs = TestBed.inject(WrDialog);
    TestBed.tick();
    await Promise.resolve();
    await Promise.resolve();
    TestBed.tick();

    void dialogs.confirm({ title: 'Smazat?' });
    TestBed.tick();
    await Promise.resolve();

    expect(confirmButton()!.textContent?.trim()).toBe('Ano');
    expect(cancelButton()!.textContent?.trim()).toBe('Zrusit');
  });

  it('resolves false on the server without opening anything', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });

    const answer = TestBed.inject(WrDialog).confirm({ title: 'Delete item?' });

    await expect(answer).resolves.toBe(false);
    expect(panel()).toBeNull();
  });
});

describe('WrDialog.confirm while the app is torn down', () => {
  it('settles false instead of hanging', async () => {
    TestBed.resetTestingModule();
    const answer = TestBed.inject(WrDialog).confirm({ title: 'Delete item?' });
    TestBed.tick();
    expect(document.querySelector('.wr-dialog-panel')).toBeTruthy();

    // The root injector is destroyed with the testing module, as it is when an
    // app is torn down: the overlay container goes, and nothing else would
    // ever complete the ref.
    TestBed.resetTestingModule();

    await expect(answer).resolves.toBe(false);
    expect(document.querySelector('.wr-dialog-panel')).toBeNull();
  });
});

/**
 * `alert()` is `confirm()`'s component with one button, so this asks what
 * differs: the one button, where focus lands, and a promise with no value.
 */
describe('WrDialog.alert', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const panel = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-dialog-panel');
  const buttons = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-dialog__footer button')];
  const okButton = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-dialog-confirm__action--ok');

  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const alert = (options: Partial<WrDialogAlertOptions> = {}): Promise<void> =>
    fixture.componentInstance.dialog.alert({ title: 'Range too large', ...options });

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      new DOMRect(0, 0, 120, 32),
    ] as unknown as DOMRectList);

    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fixture.destroy();
  });

  it('renders one button, labelled OK, and takes a label per call', async () => {
    void alert();
    await settle();
    expect(buttons()).toEqual([okButton()]);
    expect(okButton()!.textContent?.trim()).toBe('OK');
    expect(okButton()!.classList.contains('wr-btn--primary')).toBe(true);
    okButton()!.click();
    await settle();

    void alert({ okLabel: 'Close' });
    await settle();
    expect(buttons()).toHaveLength(1);
    expect(okButton()!.textContent?.trim()).toBe('Close');
  });

  it('reads the label from a registered catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'en', availableLocales: ['en'] }),
        provideWrI18nStaticLoader({ en: { common: { ok: 'Rozumim' } } }),
      ],
    });
    const dialogs = TestBed.inject(WrDialog);
    TestBed.tick();
    await Promise.resolve();
    await Promise.resolve();
    TestBed.tick();

    void dialogs.alert({ title: 'Hotovo' });
    TestBed.tick();
    await Promise.resolve();

    expect(okButton()!.textContent?.trim()).toBe('Rozumim');
  });

  it('focuses its button', async () => {
    void alert();
    await settle();
    await fixture.whenStable();

    expect(document.activeElement).toBe(okButton());
  });

  it('announces an alertdialog named by the title and described by the message, whatever the intent', async () => {
    void alert({ message: 'Pick at most 31 days.' });
    await settle();

    const el = panel()!;
    expect(el.getAttribute('role')).toBe('alertdialog');
    expect(document.getElementById(el.getAttribute('aria-labelledby')!)!.textContent?.trim()).toBe('Range too large');
    expect(document.getElementById(el.getAttribute('aria-describedby')!)!.textContent).toBe('Pick at most 31 days.');
    expect(el.querySelector('.wr-dialog__close')).toBeNull();
    okButton()!.click();
    await settle();

    void alert({ intent: 'success' });
    await settle();
    expect(panel()!.getAttribute('role')).toBe('alertdialog');
  });

  it('resolves with no value from the button, once', async () => {
    const settled = vi.fn();
    const done = alert().then(settled);
    await settle();

    const button = okButton()!;
    button.click();
    button.click();
    await done;
    await settle();

    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith(undefined);
    expect(panel()).toBeNull();
  });

  it('resolves with no value from Escape', async () => {
    const done = alert();
    await settle();

    panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    await expect(done).resolves.toBeUndefined();
    await settle();
    expect(panel()).toBeNull();
  });

  it('resolves from the backdrop, and keeps the backdrop closed when told to', async () => {
    const done = alert();
    await settle();
    document.querySelector<HTMLElement>('.wr-dialog-backdrop')!.click();
    await expect(done).resolves.toBeUndefined();
    await settle();

    void alert({ closeOnBackdropClick: false });
    await settle();
    document.querySelector<HTMLElement>('.wr-dialog-backdrop')!.click();
    await settle();
    expect(panel()).toBeTruthy();
  });

  it('passes the toasts option through to the overlay order', async () => {
    const add = vi.spyOn(TestBed.inject(WrOverlayOrder), 'add');

    void alert({ toasts: 'below' });
    await settle();

    expect(add).toHaveBeenCalledWith(expect.anything(), 'below');
  });

  it('resolves on the server without opening anything', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });

    await expect(TestBed.inject(WrDialog).alert({ title: 'Saved' })).resolves.toBeUndefined();
    expect(panel()).toBeNull();
  });

  it('settles instead of hanging when the app is torn down', async () => {
    TestBed.resetTestingModule();
    const done = TestBed.inject(WrDialog).alert({ title: 'Saved' });
    TestBed.tick();
    expect(panel()).toBeTruthy();

    TestBed.resetTestingModule();

    await expect(done).resolves.toBeUndefined();
  });
});

describe('WrDialog intent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const INTENTS: readonly WrDialogIntent[] = ['info', 'success', 'warning', 'danger'];
  const icon = (): SVGElement | null => document.querySelector<SVGElement>('.wr-dialog-confirm__icon');
  const title = (): HTMLElement => document.querySelector<HTMLElement>('.wr-dialog__title')!;
  const confirmButton = (): HTMLElement => document.querySelector<HTMLElement>('.wr-dialog-confirm__action--confirm')!;
  const cancelButton = (): HTMLElement => document.querySelector<HTMLElement>('.wr-dialog-confirm__action--cancel')!;

  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      new DOMRect(0, 0, 120, 32),
    ] as unknown as DOMRectList);

    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fixture.destroy();
  });

  it.each(INTENTS)('draws a decorative %s icon before the title of an alert', async intent => {
    void fixture.componentInstance.dialog.alert({ title: 'Export', intent });
    await settle();

    expect(icon()!.classList.contains(`wr-dialog-confirm__icon--${intent}`)).toBe(true);
    expect(icon()!.getAttribute('aria-hidden')).toBe('true');
    expect(icon()!.querySelector('path, circle')).toBeTruthy();
    expect(title().firstElementChild).toBe(icon());
    expect(title().textContent?.trim()).toBe('Export');
  });

  it.each(INTENTS)('draws a decorative %s icon before the title of a confirm', async intent => {
    void fixture.componentInstance.dialog.confirm({ title: 'Export?', intent });
    await settle();

    expect(icon()!.classList.contains(`wr-dialog-confirm__icon--${intent}`)).toBe(true);
    expect(icon()!.getAttribute('aria-hidden')).toBe('true');
    expect(title().firstElementChild).toBe(icon());
  });

  it('draws a different glyph for each intent', async () => {
    const glyphs = new Set<string>();
    for (const intent of INTENTS) {
      void fixture.componentInstance.dialog.alert({ title: 'Export', intent });
      await settle();
      glyphs.add(icon()!.innerHTML.replace(/<!--.*?-->/gs, ''));
      document.querySelector<HTMLElement>('.wr-dialog-confirm__action--ok')!.click();
      await settle();
    }

    expect(glyphs.size).toBe(INTENTS.length);
  });

  it('draws no icon without an intent', async () => {
    void fixture.componentInstance.dialog.confirm({ title: 'Export?' });
    await settle();

    expect(icon()).toBeNull();
  });

  it.each([
    ['danger', 'danger'],
    ['warning', 'warning'],
    ['info', 'primary'],
    ['success', 'primary'],
  ] as const)('colors the confirm button of a %s question %s', async (intent, color) => {
    void fixture.componentInstance.dialog.confirm({ title: 'Export?', intent });
    await settle();

    expect(confirmButton().classList.contains(`wr-btn--${color}`)).toBe(true);
  });

  it('starts a danger question on the cancel button', async () => {
    void fixture.componentInstance.dialog.confirm({ title: 'Delete?', intent: 'danger' });
    await settle();
    await fixture.whenStable();

    expect(document.activeElement).toBe(cancelButton());
  });

  it('lets confirmColor win over the intent', async () => {
    void fixture.componentInstance.dialog.confirm({ title: 'Delete?', intent: 'danger', confirmColor: 'success' });
    await settle();

    expect(confirmButton().classList.contains('wr-btn--success')).toBe(true);
    expect(icon()!.classList.contains('wr-dialog-confirm__icon--danger')).toBe(true);
  });

  it('keeps the button of a danger alert primary', async () => {
    void fixture.componentInstance.dialog.alert({ title: 'Range too large', intent: 'danger' });
    await settle();

    const ok = document.querySelector<HTMLElement>('.wr-dialog-confirm__action--ok')!;
    expect(ok.classList.contains('wr-btn--primary')).toBe(true);
  });
});

describe('WrDialogRef.closeWhen', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const panels = (): NodeListOf<HTMLElement> => document.querySelectorAll<HTMLElement>('.wr-dialog-panel');

  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const open = async (): Promise<WrDialogRef<Confirm, string>> => {
    const ref = fixture.componentInstance.dialog.open<Confirm, string>(Confirm);
    await settle();
    return ref;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('closes with the result once the signal turns true', async () => {
    const done = signal(false);
    const ref = await open();
    ref.closeWhen(done, 'saved');
    await settle();
    expect(panels()).toHaveLength(1);

    done.set(true);
    await settle();

    expect(panels()).toHaveLength(0);
    await expect(ref.awaitClose()).resolves.toBe('saved');
  });

  it('closes with undefined when no result is given, like any dismissal', async () => {
    const done = signal(true);
    const ref = await open();
    ref.closeWhen(done);
    await settle();

    expect(panels()).toHaveLength(0);
    await expect(ref.awaitClose()).resolves.toBeUndefined();
  });

  it('closes a dialog whose signal is already true, after the open has finished', async () => {
    const done = signal(true);
    const ref = fixture.componentInstance.dialog.open<Confirm, string>(Confirm);
    ref.closeWhen(done, 'already');
    // Nothing has run yet: the close waits for change detection rather than
    // tearing the overlay down while `attach()` may still be on the stack.
    expect(panels()).toHaveLength(1);

    await settle();

    expect(panels()).toHaveLength(0);
    await expect(ref.awaitClose()).resolves.toBe('already');
  });

  it('lets any of several signals close it', async () => {
    const a = signal(false);
    const b = signal(false);
    const ref = await open();
    ref.closeWhen(a, 'a');
    ref.closeWhen(b, 'b');
    await settle();

    b.set(true);
    await settle();

    await expect(ref.awaitClose()).resolves.toBe('b');
  });

  it('drops the watcher when the dialog closes another way, so the signal cannot reach a later dialog', async () => {
    const done = signal(false);
    const first = await open();
    first.closeWhen(done, 'late');
    await settle();

    first.close('escaped');
    await settle();
    expect(panels()).toHaveLength(0);

    const second = await open();
    done.set(true);
    await settle();

    expect(panels()).toHaveLength(1);
    await expect(first.awaitClose()).resolves.toBe('escaped');
    second.close();
    await settle();
  });

  it('is a no-op on a closed dialog', async () => {
    const done = signal(true);
    const ref = await open();
    ref.close('first');
    await settle();

    expect(() => ref.closeWhen(done, 'second')).not.toThrow();
    await settle();

    await expect(ref.awaitClose()).resolves.toBe('first');
  });

  it('refuses on a ref that was not opened by WrDialog, which is the only one without an injector', () => {
    const ref = new WrDialogRef<unknown, unknown>({} as never);

    expect(() => ref.closeWhen(signal(true))).toThrow(/opened by WrDialog/);
  });
});

@Component({
  imports: [WrDialogTitle, WrDialogContent],
  template: `
    <h2 wrDialogTitle>
      {{ title() }}
    </h2>
    <div wrDialogContent>Body</div>
  `,
})
class Titled {
  readonly title = signal(inject<string | undefined>(WR_DIALOG_DATA, { optional: true }) ?? 'Edit lamp');
}

@Component({ template: `<p>No heading here</p>` })
class Untitled {}

/**
 * The tab title is `document.title`, read back after the app has settled: the
 * heading is read after a render and reaches `<head>` through a `WrMeta`
 * layer one tick later.
 */
describe('WrDialog tabTitle', () => {
  let originalTitle: string;
  let originalHead: ChildNode[];

  const settle = async (): Promise<void> => {
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
    TestBed.tick();
  };

  const setup = (...features: WrFeature[]): WrDialog => {
    TestBed.configureTestingModule({ providers: [provideWr(...features)] });
    return TestBed.inject(WrDialog);
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    originalTitle = document.title;
    originalHead = [...document.head.childNodes];
    document.title = 'Lamps - App';
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    for (const node of [...document.head.childNodes]) if (!originalHead.includes(node)) node.remove();
    document.title = originalTitle;
  });

  it('puts the dialog title in front of the page title and gives it back on close', async () => {
    const dialogs = setup(withMeta({ titleTemplate: '{{ title }} - App' }));
    TestBed.inject(WrMeta).set({ title: 'Lamps' });

    const ref = dialogs.open(Titled, { tabTitle: true });
    await settle();
    expect(document.title).toBe('Edit lamp - Lamps - App');

    ref.close();
    await settle();
    expect(document.title).toBe('Lamps - App');
  });

  it('works over a page title WrMeta does not manage', async () => {
    const dialogs = setup();

    const ref = dialogs.open(Titled, { tabTitle: true });
    await settle();
    expect(document.title).toBe('Edit lamp - Lamps - App');

    ref.close();
    await settle();
    expect(document.title).toBe('Lamps - App');
  });

  it('lets the top dialog name the tab and falls back to the one below', async () => {
    const dialogs = setup();
    const first = dialogs.open(Titled, { tabTitle: true });
    await settle();

    const second = dialogs.open(Titled, { tabTitle: true, data: 'Discard changes?' });
    await settle();
    expect(document.title).toBe('Discard changes? - Lamps - App');

    second.close();
    await settle();
    expect(document.title).toBe('Edit lamp - Lamps - App');

    first.close();
    await settle();
    expect(document.title).toBe('Lamps - App');
  });

  it('keeps the top dialog in the tab when the one below closes first', async () => {
    const dialogs = setup();
    const first = dialogs.open(Titled, { tabTitle: true });
    await settle();
    const second = dialogs.open(Titled, { tabTitle: true, data: 'Discard changes?' });
    await settle();

    first.close();
    await settle();
    expect(document.title).toBe('Discard changes? - Lamps - App');

    second.close();
    await settle();
    expect(document.title).toBe('Lamps - App');
  });

  it('follows a heading that changes while the dialog is open', async () => {
    const dialogs = setup();
    const ref = dialogs.open(Titled, { tabTitle: true });
    await settle();

    ref.componentInstance.title.set('Lamp 12');
    await settle();

    expect(document.title).toBe('Lamp 12 - Lamps - App');
  });

  it('does not bring a stale page title back when the page changed under the dialog', async () => {
    const dialogs = setup();
    const meta = TestBed.inject(WrMeta);
    const page = meta.push({ title: 'Lamps' });
    const ref = dialogs.open(Titled, { tabTitle: true, closeOnNavigation: false });
    await settle();

    page.pop();
    meta.push({ title: 'Shifts' });
    expect(document.title).toBe('Edit lamp - Shifts');

    ref.close();
    await settle();
    expect(document.title).toBe('Shifts');
  });

  it('changes nothing without the option, and never builds WrMeta', async () => {
    const dialogs = setup();
    const built = vi.spyOn(TestBed.inject(EnvironmentInjector), 'get');

    const ref = dialogs.open(Titled);
    await settle();
    expect(document.title).toBe('Lamps - App');
    expect(built.mock.calls.some(([token]) => token === WrMeta)).toBe(false);

    ref.close();
    await settle();
    expect(document.title).toBe('Lamps - App');
  });

  it('takes the app-wide default from withDialog()', async () => {
    const dialogs = setup(withDialog({ tabTitle: true }));

    dialogs.open(Titled);
    await settle();

    expect(document.title).toBe('Edit lamp - Lamps - App');
  });

  it('lets one dialog opt out of the app-wide default', async () => {
    const dialogs = setup(withDialog({ tabTitle: true }));

    dialogs.open(Titled, { tabTitle: false });
    await settle();

    expect(document.title).toBe('Lamps - App');
  });

  it('names the tab after a confirm, too', async () => {
    const dialogs = setup();

    const answer = dialogs.confirm({ title: 'Delete lamp?', tabTitle: true });
    await settle();
    expect(document.title).toBe('Delete lamp? - Lamps - App');

    document.querySelector<HTMLButtonElement>('.wr-dialog__footer button')!.click();
    await answer;
    await settle();
    expect(document.title).toBe('Lamps - App');
  });

  it('names the tab after an alert, without the icon getting in the way', async () => {
    const dialogs = setup();

    const done = dialogs.alert({ title: 'Range too large', intent: 'danger', tabTitle: true });
    await settle();
    expect(document.title).toBe('Range too large - Lamps - App');

    document.querySelector<HTMLButtonElement>('.wr-dialog__footer button')!.click();
    await done;
    await settle();
    expect(document.title).toBe('Lamps - App');
  });

  it('leaves the tab alone for a dialog without a title element', async () => {
    const dialogs = setup();

    const ref = dialogs.open(Untitled, { tabTitle: true });
    await settle();
    expect(document.title).toBe('Lamps - App');

    ref.close();
    await settle();
    expect(document.title).toBe('Lamps - App');
  });

  it('does nothing on the server', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });

    TestBed.inject(WrDialog).open(Titled, { tabTitle: true });
    await settle();

    expect(document.title).toBe('Lamps - App');
  });
});
