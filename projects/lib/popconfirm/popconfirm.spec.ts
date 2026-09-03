import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrPopconfirm } from './popconfirm';

@Component({
  imports: [WrPopconfirm],
  template: `
    <button
      type="button"
      [wrPopconfirm]="message()"
      (confirmed)="log.push('confirmed')"
      (cancelled)="log.push('cancelled')"
    >
      Delete
    </button>
    <button type="button" id="elsewhere">Something else</button>
  `,
})
class Host {
  readonly message = signal('Delete this for good?');
  readonly log: string[] = [];
}

/**
 * A popconfirm is a confirmation dialog that happens to be anchored to its
 * trigger, and everything about its contract follows from that: the panel is the
 * ONLY way to confirm or cancel, so a keyboard user has to be able to reach it.
 * The panel lives in the CDK overlay container, not in the fixture, so it is
 * queried off the document — and `provideWrOverlay()` keeps that container out of
 * the next spec file's.
 */
describe('WrPopconfirm', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const trigger = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!;
  const panel = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-popconfirm');
  const pane = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-popconfirm-overlay');
  const buttons = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-popconfirm wr-btn')];
  const cancel = (): HTMLElement => buttons()[0];
  const confirm = (): HTMLElement => buttons()[1];
  const log = (): string[] => fixture.componentInstance.log;

  const click = (el: HTMLElement): void => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();
  };

  const open = (): void => {
    click(trigger());
  };

  const elsewhere = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('#elsewhere')!;

  /** `WrOutsideClick` judges by where the PRESS started, so both halves are needed. */
  const clickOutside = (target: HTMLElement): void => {
    for (const type of ['pointerdown', 'click']) {
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, detail: 1 }));
    }
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('advertises the dialog it is about to open', () => {
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(panel()).toBeNull();
  });

  it('opens a named dialog that describes what it is asking', () => {
    // An unnamed `role="dialog"` announces as a bare "dialog" and trips axe's
    // `aria-dialog-name`; without `aria-describedby` the question itself is never
    // read out, which is the whole content of a confirmation.
    open();

    expect(pane()!.getAttribute('role')).toBe('dialog');
    expect(pane()!.getAttribute('aria-modal')).toBe('false');
    expect(pane()!.getAttribute('aria-label')).toBeTruthy();

    const describedBy = pane()!.getAttribute('aria-describedby')!;
    expect(document.getElementById(describedBy)!.textContent.trim()).toBe('Delete this for good?');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('moves focus into the panel, landing on the safe choice', () => {
    // Focus used to stay on the trigger, and the overlay container sits at the end
    // of `<body>` — so Tab went to the next thing on the PAGE and the only way to
    // confirm was unreachable. Cancel first, because the action being confirmed is
    // usually the destructive one.
    open();
    expect(document.activeElement).toBe(cancel());
  });

  it('takes Escape from wherever the focus happens to be', () => {
    // Worth pinning that this does NOT depend on focus: `overlayRef.keydownEvents()`
    // is fed by CDK's `OverlayKeyboardDispatcher`, which keeps one listener on the
    // document and routes to the topmost overlay. So Escape reaches the panel even
    // from `<body>` — a plausible reading of the code says otherwise.
    open();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(panel()).toBeNull();
    expect(log()).toEqual(['cancelled']);
  });

  it('hands focus back to the trigger when it closes', () => {
    open();
    click(cancel());
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('confirms, and closes', () => {
    open();
    click(confirm());

    expect(log()).toEqual(['confirmed']);
    expect(panel()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('cancels, and closes', () => {
    open();
    click(cancel());
    expect(log()).toEqual(['cancelled']);
  });

  it('toggles shut on a second press of the trigger', () => {
    open();
    expect(panel()).not.toBeNull();
    open();
    expect(panel()).toBeNull();
  });

  it('dismisses on a click outside', () => {
    open();
    clickOutside(elsewhere());
    expect(panel()).toBeNull();
    expect(log()).toEqual(['cancelled']);
  });

  it('leaves focus where the user put it when they close it by leaving', () => {
    // The counterpart of handing focus back: if the panel is dismissed by a click
    // somewhere else, focus belongs to whatever the user just reached for. Taking it
    // back to the trigger would be stealing.
    open();
    elsewhere().focus();
    expect(document.activeElement).toBe(elsewhere());

    clickOutside(elsewhere());
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(elsewhere());
  });

  it('takes the panel with it when the trigger is destroyed', () => {
    open();
    fixture.destroy();
    expect(panel()).toBeNull();
  });
});

@Component({
  imports: [WrPopconfirm],
  template: `<button type="button" wrPopconfirm="Удалить?">Удалить</button>`,
})
class RussianHost {}

/**
 * The catalog has carried `popconfirm.confirm` / `popconfirm.cancel` — translated —
 * for as long as the component has existed, and nothing read them: the two labels
 * were hard-coded English input defaults, so a Russian app showed English buttons
 * with the right translation sitting one file away.
 */
describe('WrPopconfirm under a localized catalog', () => {
  it('takes its button labels from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrOverlay(),
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(RussianHost);
    fixture.detectChanges();
    await fixture.whenStable();

    const trigger = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();

    const labels = [...document.querySelectorAll('.wr-popconfirm wr-btn')].map(el => el.textContent.trim());
    expect(labels).toEqual(['Отмена', 'Подтвердить']);

    fixture.destroy();
  });
});

/**
 * `exportAs` is what makes `#confirm="wrPopconfirm"` legal — without it the
 * template does not compile at all, so mounting the host is half the assertion and
 * the reference resolving to the directive is the other half.
 */
describe('WrPopconfirm template reference', () => {
  @Component({
    imports: [WrPopconfirm],
    template: `<button type="button" wrPopconfirm="Delete this?" #ref="wrPopconfirm">Delete</button>`,
  })
  class ExportHost {
    readonly popconfirm = viewChild.required<WrPopconfirm>('ref');
  }

  it('publishes the instance as `wrPopconfirm`', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });

    const fixture = TestBed.createComponent(ExportHost);
    fixture.detectChanges();

    const popconfirm = fixture.componentInstance.popconfirm();
    expect(popconfirm).toBeInstanceOf(WrPopconfirm);
    expect(popconfirm.isOpen()).toBe(false);

    fixture.destroy();
  });
});
