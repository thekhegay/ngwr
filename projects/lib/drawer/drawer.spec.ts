import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrDrawerTitle } from './directives';
import { WrDrawer } from './drawer';
import type { WrDrawerPosition } from './interfaces';

@Component({
  imports: [WrDrawer],
  template: `
    <wr-drawer
      [(open)]="open"
      [position]="position()"
      [closable]="closable()"
      [closeOnEscape]="closeOnEscape()"
      [closeOnBackdropClick]="closeOnBackdropClick()"
      [closeLabel]="closeLabel()"
      [showHandle]="showHandle()"
    >
      <p class="body">Drawer body</p>
    </wr-drawer>
  `,
})
class Host {
  readonly open = signal(false);
  readonly position = signal<WrDrawerPosition>('right');
  readonly showHandle = signal(false);
  readonly closable = signal(true);
  readonly closeOnEscape = signal(true);
  readonly closeOnBackdropClick = signal(true);
  readonly closeLabel = signal<string | null>(null);
}

/** A title that can change identity or vanish while the drawer stays open. */
@Component({
  imports: [WrDrawer, WrDrawerTitle],
  template: `
    <wr-drawer [(open)]="open">
      @if (showTitle()) {
        @if (long()) {
          <h2 wrDrawerTitle>Advanced filters</h2>
        } @else {
          <h2 wrDrawerTitle>Filters</h2>
        }
      }
      <p class="body">Drawer body</p>
    </wr-drawer>
  `,
})
class TitleHost {
  readonly open = signal(false);
  readonly showTitle = signal(true);
  readonly long = signal(false);
}

/**
 * The declarative half of the drawer — the imperative `WrDrawerManager` has its
 * own suite. The panel mounts into the CDK overlay container rather than the
 * fixture, so everything inside it is queried off `document`, and
 * `provideWrOverlay()` keeps this file's container out of the next one's.
 *
 * `position` is a real mode axis, not a style flag: `bottom` is how the drawer
 * doubles as a bottom sheet, and each side lands its own overlay class that
 * consumer CSS targets.
 */
describe('WrDrawer', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const panel = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-drawer-overlay');
  const body = (): HTMLElement | null => document.querySelector<HTMLElement>('.body');
  const closeButton = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-drawer__close');
  const backdrop = (): HTMLElement | null => document.querySelector<HTMLElement>('.cdk-overlay-backdrop');

  const open = (): void => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
  };

  const escape = (): void => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders nothing until it is opened', () => {
    expect(panel()).toBeNull();
    expect(body()).toBeNull();
  });

  it('mounts its projected content on open', () => {
    open();

    expect(panel()).not.toBeNull();
    expect(body()!.textContent.trim()).toBe('Drawer body');
  });

  it('presents itself as a modal dialog', () => {
    open();

    // Modal is the promise the backdrop and the focus trap make; without the
    // role and `aria-modal` a screen reader keeps reading the page behind it.
    expect(panel()!.getAttribute('role')).toBe('dialog');
    expect(panel()!.getAttribute('aria-modal')).toBe('true');
  });

  it('names the dialog from whichever title is in the panel right now', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    const titled = TestBed.createComponent(TitleHost);
    titled.detectChanges();

    titled.componentInstance.open.set(true);
    await titled.whenStable();

    const named = (): string | null => panel()!.getAttribute('aria-labelledby');
    const titleId = (): string | null =>
      document.querySelector<HTMLElement>('.wr-drawer__title')?.getAttribute('id') ?? null;

    expect(named()).toBe(titleId());

    // The title is projected content, so it can be swapped or dropped while the
    // drawer stays open. Resolving the id once at open time left the attribute
    // naming an element that is no longer in the document, and a dangling
    // reference is not a name — the dialog announces as unnamed, with nothing on
    // screen to say so.
    titled.componentInstance.long.set(true);
    await titled.whenStable();

    expect(document.querySelector('.wr-drawer__title')!.textContent).toBe('Advanced filters');
    expect(named()).toBe(titleId());

    titled.componentInstance.showTitle.set(false);
    await titled.whenStable();

    expect(named()).toBeNull();

    titled.destroy();
  });

  it('takes itself back out of the document on close', () => {
    open();
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });

  describe('position', () => {
    const positions: readonly WrDrawerPosition[] = ['left', 'right', 'top', 'bottom'];

    it('lands a side-specific class on the overlay, for every side', () => {
      for (const position of positions) {
        fixture.componentInstance.position.set(position);
        fixture.detectChanges();
        open();

        // Public API: consumer CSS targets these, and `bottom` is what makes
        // the drawer a bottom sheet rather than a side panel.
        expect(panel()!.className).toContain(`wr-drawer-overlay--${position}`);

        fixture.componentInstance.open.set(false);
        fixture.detectChanges();
      }
    });

    it('defaults to the right', () => {
      open();
      expect(panel()!.className).toContain('wr-drawer-overlay--right');
    });
  });

  describe('dismissal', () => {
    it('closes on Escape and writes back through the two-way binding', () => {
      open();
      escape();

      expect(fixture.componentInstance.open()).toBe(false);
      expect(panel()).toBeNull();
    });

    it('ignores Escape when told to', () => {
      fixture.componentInstance.closeOnEscape.set(false);
      fixture.detectChanges();
      open();

      escape();

      expect(fixture.componentInstance.open()).toBe(true);
    });

    it('closes on a backdrop click', () => {
      open();
      expect(backdrop()).not.toBeNull();

      backdrop()!.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.open()).toBe(false);
    });

    it('keeps the backdrop but ignores its clicks when told to', () => {
      fixture.componentInstance.closeOnBackdropClick.set(false);
      fixture.detectChanges();
      open();

      backdrop()!.click();
      fixture.detectChanges();

      // The backdrop still has to be there — it is what makes the drawer read
      // as modal — it just must not dismiss.
      expect(backdrop()).not.toBeNull();
      expect(fixture.componentInstance.open()).toBe(true);
    });

    it('closes from its own dismiss button', () => {
      open();

      closeButton()!.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.open()).toBe(false);
    });

    it('names the dismiss button in plain English with no i18n configured', () => {
      open();

      // `t()` hands back the KEY on a miss, so a bare call would name this
      // button "drawer.close" — a name axe cannot fault, because a name is
      // present. The manager path had exactly that bug.
      expect(closeButton()!.getAttribute('aria-label')).toBe('Close drawer');
    });

    it('lets the host override the dismiss label', () => {
      fixture.componentInstance.closeLabel.set('Close filters');
      fixture.detectChanges();
      open();

      expect(closeButton()!.getAttribute('aria-label')).toBe('Close filters');
    });

    it('renders no dismiss button when closable is off', () => {
      fixture.componentInstance.closable.set(false);
      fixture.detectChanges();
      open();

      expect(closeButton()).toBeNull();
      // Escape still has to work, or an unclosable drawer is a trap.
      escape();
      expect(fixture.componentInstance.open()).toBe(false);
    });
  });

  describe('swipe to dismiss', () => {
    const swipePanel = (): HTMLElement => document.querySelector<HTMLElement>('.wr-drawer__panel')!;
    const handle = (): HTMLElement => document.querySelector<HTMLElement>('.wr-drawer__handle')!;

    /**
     * jsdom has neither `PointerEvent` nor pointer capture, so the gesture is
     * driven with `MouseEvent`s carrying the two properties the handlers read —
     * the idiom `wr-splitter`'s spec uses. `isPrimary` has to be set explicitly:
     * it does not exist on `MouseEvent`, and the start guard rejects `undefined`.
     */
    const pointer = (type: string, clientY: number): void => {
      const el = handle();
      el.setPointerCapture = (): undefined => undefined;
      el.releasePointerCapture = (): undefined => undefined;
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientY });
      Object.defineProperty(event, 'isPrimary', { value: true });
      el.dispatchEvent(event);
      fixture.detectChanges();
    };

    const openSheet = (): void => {
      fixture.componentInstance.position.set('bottom');
      fixture.componentInstance.showHandle.set(true);
      fixture.detectChanges();
      open();
      // jsdom lays nothing out, so the panel measures 0 and every drag clears
      // 30% of it. A stubbed 400px gives the threshold a real number.
      Object.defineProperty(swipePanel(), 'offsetHeight', { value: 400, configurable: true });
    };

    it('closes on a release past 30% of the panel', () => {
      openSheet();

      pointer('pointerdown', 0);
      pointer('pointermove', 160);
      pointer('pointerup', 160);

      expect(fixture.componentInstance.open()).toBe(false);
    });

    it('snaps back on a release short of the threshold', () => {
      openSheet();

      pointer('pointerdown', 0);
      pointer('pointermove', 40);
      pointer('pointerup', 40);

      expect(fixture.componentInstance.open()).toBe(true);
      expect(swipePanel().style.transform).toBe('');
    });

    it('abandons a cancelled swipe instead of dismissing on it', () => {
      // `pointercancel` was wired to the RELEASE handler, so a gesture the
      // system took away — a call, a second finger, an orientation change —
      // dismissed the drawer past a threshold the user never let go at, and the
      // overlay was disposed at the dragged offset so there was nothing to
      // take back.
      openSheet();

      pointer('pointerdown', 0);
      pointer('pointermove', 160);
      pointer('pointercancel', 160);

      expect(fixture.componentInstance.open()).toBe(true);
      expect(swipePanel().style.transform).toBe('');
    });
  });
});
