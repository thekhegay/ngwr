import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, type EnvironmentProviders } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrDialog, WrDialogContent, type WrDialogRef } from 'ngwr/dialog';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { provideWrToastConfig } from './provide-wr-toast-config';
import { WrToast } from './services/toast';

/**
 * Toast has no template of its own — a consumer injects `WrToast` and calls
 * `show()`, and the stack is rendered by an internal host that the service
 * attaches to a CDK overlay. So every query goes through the document (the
 * host is not inside any fixture), and this spec provides `provideWrOverlay()`
 * so its container does not leak into the next spec file.
 *
 * Timers are faked for the whole file: auto-dismiss is core to the component,
 * and a real `setTimeout` left behind by a still-open toast would fire against
 * a destroyed TestBed injector during a later test.
 */
describe('WrToast', () => {
  let toast: WrToast;

  const setup = (extra: EnvironmentProviders[] = []): WrToast => {
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), ...extra] });
    return TestBed.inject(WrToast);
  };

  /** The service renders through the overlay, so CD has to be pumped by hand. */
  const tick = (): void => TestBed.tick();

  const host = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-toast-host');
  const items = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-toast')];
  const messages = (): (string | undefined)[] =>
    items().map(t => t.querySelector('.wr-toast__message')?.textContent?.trim());
  const actions = (t: HTMLElement): HTMLButtonElement[] => [
    ...t.querySelectorAll<HTMLButtonElement>('.wr-toast__action'),
  ];
  const mouse = (el: Element, type: 'mouseenter' | 'mouseleave'): void => {
    el.dispatchEvent(new MouseEvent(type));
    tick();
  };
  /** `focusin` / `focusout` bubble, which is how the host hears about focus
   * landing on a button inside it. */
  const focusEvent = (el: Element, type: 'focusin' | 'focusout'): void => {
    el.dispatchEvent(new FocusEvent(type, { bubbles: true }));
    tick();
  };
  const closeAll = (): HTMLButtonElement | null =>
    document.querySelector<HTMLButtonElement>('.wr-toast-host__close-all');

  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    toast.dismissAll();
    vi.useRealTimers();
  });

  describe('with the default config', () => {
    beforeEach(() => {
      toast = setup();
    });

    it('renders nothing until something is shown', () => {
      expect(host()).toBeNull();
    });

    it('opens a toast carrying its title and message', () => {
      toast.show({ type: 'success', title: 'Saved', message: 'Profile updated.' });
      tick();

      const item = items()[0];
      expect(item.querySelector('.wr-toast__title')?.textContent?.trim()).toBe('Saved');
      expect(item.querySelector('.wr-toast__message')?.textContent?.trim()).toBe('Profile updated.');
      expect(item.classList.contains('wr-toast--success')).toBe(true);
    });

    it('omits the title element entirely when no title was given', () => {
      toast.show({ message: 'Permalink copied' });
      tick();
      expect(items()[0].querySelector('.wr-toast__title')).toBeNull();
    });

    it('announces the stack as a labelled region', () => {
      // The accessibility contract: the container is a landmark, each toast is
      // its own live region inside it.
      toast.show({ message: 'Hello' });
      tick();

      expect(host()?.getAttribute('role')).toBe('region');
      expect(host()?.getAttribute('aria-label')).toBe('Notifications');
    });

    it('announces an ordinary toast politely through role=status', () => {
      toast.show({ message: 'Hello' });
      tick();

      expect(items()[0].getAttribute('role')).toBe('status');
      expect(items()[0].getAttribute('aria-live')).toBe('polite');
    });

    it('escalates a danger toast to role=alert and an assertive announcement', () => {
      toast.show({ type: 'danger', message: 'Network error' });
      tick();

      expect(items()[0].getAttribute('role')).toBe('alert');
      expect(items()[0].getAttribute('aria-live')).toBe('assertive');
    });

    it('interrupts for a warning but keeps it a status, not an alert', () => {
      // Deliberately asymmetric: warning is urgent enough to interrupt speech
      // but not urgent enough for the `alert` role. Worth pinning because it
      // reads like an oversight and is not.
      toast.show({ type: 'warning', message: 'Disk almost full' });
      tick();

      expect(items()[0].getAttribute('role')).toBe('status');
      expect(items()[0].getAttribute('aria-live')).toBe('assertive');
    });

    it('stacks several toasts oldest-first', () => {
      toast.show({ message: 'One' });
      toast.show({ message: 'Two' });
      toast.show({ message: 'Three' });
      tick();

      expect(messages()).toEqual(['One', 'Two', 'Three']);
    });

    it('opens in the configured corner and layout mode', () => {
      toast.show({ message: 'One' });
      tick();

      expect(host()?.classList.contains('wr-toast-host--top-end')).toBe(true);
      expect(host()?.classList.contains('wr-toast-host--stack')).toBe(true);
    });

    it('honours a per-toast position override', () => {
      toast.show({ message: 'Down here', position: 'bottom-start' });
      tick();

      expect(host()?.classList.contains('wr-toast-host--bottom-start')).toBe(true);
      expect(host()?.classList.contains('wr-toast-host--top-end')).toBe(false);
    });

    it('moves the whole existing stack when a later toast asks for another corner', () => {
      // There is one host, so `position` is not per-toast: the second call
      // relocates the first toast too. `WrToastOptions.position` used to claim
      // it applied "for this toast only"; its doc now says this outright.
      toast.show({ message: 'One' });
      tick();
      toast.show({ message: 'Two', position: 'bottom-end' });
      tick();

      expect(host()?.classList.contains('wr-toast-host--bottom-end')).toBe(true);
      expect(messages()).toEqual(['One', 'Two']);
    });

    it('auto-dismisses after the default duration, not before', () => {
      toast.show({ message: 'One' });
      tick();

      vi.advanceTimersByTime(3999);
      tick();
      expect(items()).toHaveLength(1);

      vi.advanceTimersByTime(1);
      tick();
      expect(items()).toHaveLength(0);
    });

    it('honours a per-toast duration', () => {
      toast.show({ message: 'Quick', duration: 1000 });
      tick();

      vi.advanceTimersByTime(1000);
      tick();
      expect(items()).toHaveLength(0);
    });

    it('tears the host down once the last toast is gone', () => {
      // Not cosmetic: the host is `position: fixed` and the pane sits over the
      // page, so leaving it attached would keep an empty overlay in the DOM.
      toast.show({ message: 'One', duration: 1000 });
      tick();

      vi.advanceTimersByTime(1000);
      tick();
      expect(host()).toBeNull();
    });

    it('keeps a duration of 0 on screen indefinitely', () => {
      toast.show({ message: 'Sticky', duration: 0 });
      tick();

      vi.advanceTimersByTime(60_000);
      tick();
      expect(items()).toHaveLength(1);
    });

    it('shows a progress bar only while a countdown is actually running', () => {
      toast.show({ message: 'Timed', duration: 1000 });
      toast.show({ message: 'Sticky', duration: 0 });
      tick();

      expect(items()[0].querySelector('.wr-toast__progress')).toBeTruthy();
      expect(items()[1].querySelector('.wr-toast__progress')).toBeNull();
    });

    it('pauses the countdown while the pointer rests on a toast', () => {
      toast.show({ message: 'One', duration: 1000 });
      tick();

      vi.advanceTimersByTime(500);
      mouse(items()[0], 'mouseenter');

      vi.advanceTimersByTime(5000);
      tick();
      expect(items()).toHaveLength(1);

      // Resuming honours what was left, not a fresh full duration.
      mouse(items()[0], 'mouseleave');
      vi.advanceTimersByTime(499);
      tick();
      expect(items()).toHaveLength(1);

      vi.advanceTimersByTime(1);
      tick();
      expect(items()).toHaveLength(0);
    });

    it('dismisses through the returned ref, leaving the rest of the stack alone', () => {
      const first = toast.show({ message: 'One' });
      toast.show({ message: 'Two' });
      tick();

      first.dismiss();
      tick();

      expect(messages()).toEqual(['Two']);
    });

    it('ignores a second dismiss on the same ref', () => {
      const ref = toast.show({ message: 'One' });
      toast.show({ message: 'Two' });
      tick();

      ref.dismiss();
      ref.dismiss();
      tick();

      expect(messages()).toEqual(['Two']);
    });

    it('exposes the requested options on the ref', () => {
      const ref = toast.show({ message: 'One', type: 'success' });
      expect(ref.options.message).toBe('One');
      expect(ref.options.type).toBe('success');
    });

    it('closes from the toast’s own close button', () => {
      toast.show({ message: 'One' });
      tick();

      const close = actions(items()[0])[0];
      expect(close.getAttribute('aria-label')).toBe('Close');

      close.click();
      tick();
      expect(items()).toHaveLength(0);
    });

    it('drops the close button when the toast is not dismissible', () => {
      toast.show({ message: 'One', dismissible: false });
      tick();
      expect(actions(items()[0])).toHaveLength(0);
    });

    it('adds a copy button only when asked for', () => {
      toast.show({ message: 'Plain' });
      toast.show({ message: 'Copyable', showCopy: true });
      tick();

      expect(actions(items()[0]).map(b => b.getAttribute('aria-label'))).toEqual(['Close']);
      expect(actions(items()[1]).map(b => b.getAttribute('aria-label'))).toEqual(['Copy', 'Close']);
    });

    it('hides "Close all" until the collapsed stack is hovered open', () => {
      // In stack mode the toasts cascade on top of each other, so a button that
      // appeared immediately would sit under the cursor and flicker.
      toast.show({ message: 'One', duration: 0 });
      toast.show({ message: 'Two', duration: 0 });
      tick();
      expect(document.querySelector('.wr-toast-host__close-all')).toBeNull();

      mouse(host()!, 'mouseenter');
      expect(closeAll()?.textContent?.trim()).toBe('Close all (2)');
    });

    it('expands the stack when focus enters it, so "Close all" is keyboard-reachable', () => {
      // The stack used to expand on `mouseenter` only, which made "Close all"
      // mouse-only: a keyboard or screen-reader user could never reach it.
      toast.show({ message: 'One', duration: 0 });
      toast.show({ message: 'Two', duration: 0 });
      tick();
      expect(closeAll()).toBeNull();

      focusEvent(actions(items()[0])[0], 'focusin');

      expect(closeAll()?.textContent?.trim()).toBe('Close all (2)');
    });

    it('collapses again once focus leaves, on the same anti-flicker delay as the pointer', () => {
      toast.show({ message: 'One', duration: 0 });
      toast.show({ message: 'Two', duration: 0 });
      tick();
      focusEvent(actions(items()[0])[0], 'focusin');

      focusEvent(actions(items()[0])[0], 'focusout');
      vi.advanceTimersByTime(119);
      tick();
      expect(closeAll()).not.toBeNull();

      vi.advanceTimersByTime(1);
      tick();
      expect(closeAll()).toBeNull();
    });

    it('stays expanded while focus moves between two toasts', () => {
      // `focusout` on the old element fires before `focusin` on the new one, so
      // a naive collapse would blink the stack shut mid-tab.
      toast.show({ message: 'One', duration: 0 });
      toast.show({ message: 'Two', duration: 0 });
      tick();
      focusEvent(actions(items()[0])[0], 'focusin');

      focusEvent(actions(items()[0])[0], 'focusout');
      focusEvent(actions(items()[1])[0], 'focusin');
      vi.advanceTimersByTime(500);
      tick();

      expect(closeAll()).not.toBeNull();
    });

    it('keeps the stack expanded while focus is inside even after the pointer leaves', () => {
      toast.show({ message: 'One', duration: 0 });
      toast.show({ message: 'Two', duration: 0 });
      tick();
      mouse(host()!, 'mouseenter');
      focusEvent(actions(items()[0])[0], 'focusin');

      mouse(host()!, 'mouseleave');
      vi.advanceTimersByTime(500);
      tick();

      expect(closeAll()).not.toBeNull();
    });

    it('clears everything through "Close all"', () => {
      toast.show({ message: 'One', duration: 0 });
      toast.show({ message: 'Two', duration: 0 });
      tick();
      mouse(host()!, 'mouseenter');

      closeAll()!.click();
      tick();

      expect(host()).toBeNull();
    });

    it('carries the public BEM classes', () => {
      // These are public API — consumers style against them.
      toast.show({ title: 'Saved', message: 'Profile updated.' });
      tick();

      expect(host()?.classList.contains('wr-toast-host')).toBe(true);
      expect(items()[0].classList.contains('wr-toast')).toBe(true);
      expect(items()[0].querySelector('.wr-toast__body')).toBeTruthy();
      expect(items()[0].querySelector('.wr-toast__actions')).toBeTruthy();
    });
  });

  describe('with provideWrToastConfig', () => {
    beforeEach(() => {
      toast = setup([
        provideWrToastConfig({
          position: 'bottom-end',
          mode: 'list',
          duration: 1000,
          showProgress: false,
          showCopy: true,
          maxStack: 2,
          closeAllThreshold: 2,
          // A partial `labels` — `copied` is deliberately left to the default.
          // The runtime merge always supported this, but the parameter was
          // `Partial<WrToastConfig>`, which is shallow, so overriding a single
          // string was a compile error. Passing a subset here is the guard.
          labels: { close: 'Закрыть', copy: 'Копировать', closeAll: 'Закрыть все' },
        }),
      ]);
    });

    it('opens in the configured corner and mode', () => {
      toast.show({ message: 'One' });
      tick();

      expect(host()?.classList.contains('wr-toast-host--bottom-end')).toBe(true);
      expect(host()?.classList.contains('wr-toast-host--list')).toBe(true);
    });

    it('uses the configured duration as the default', () => {
      toast.show({ message: 'One' });
      tick();

      vi.advanceTimersByTime(1000);
      tick();
      expect(items()).toHaveLength(0);
    });

    it('applies the configured button defaults and labels', () => {
      toast.show({ message: 'One' });
      tick();

      expect(items()[0].querySelector('.wr-toast__progress')).toBeNull();
      expect(actions(items()[0]).map(b => b.getAttribute('aria-label'))).toEqual(['Копировать', 'Закрыть']);
    });

    it('shows "Close all" straight away in list mode', () => {
      // No cascade in list mode, so the button has a stable position and can
      // appear as soon as the threshold is met — no hover required.
      toast.show({ message: 'One', duration: 0 });
      toast.show({ message: 'Two', duration: 0 });
      tick();

      expect(document.querySelector('.wr-toast-host__close-all')?.textContent?.trim()).toBe('Закрыть все (2)');
    });

    it('caps the visible stack and queues the overflow instead of dropping it', () => {
      // `maxStack`'s doc comment used to say the oldest was dismissed when the
      // cap was exceeded; the opposite is true and is what consumers rely on —
      // the newest waits in a queue and nothing on screen is yanked away.
      toast.show({ message: 'One', duration: 0 });
      toast.show({ message: 'Two', duration: 0 });
      toast.show({ message: 'Three', duration: 0 });
      tick();

      expect(messages()).toEqual(['One', 'Two']);
      // The queued one is counted by "Close all", so nothing is silently lost.
      expect(document.querySelector('.wr-toast-host__close-all')?.textContent?.trim()).toBe('Закрыть все (3)');
    });

    it('promotes a queued toast when a slot frees up', () => {
      toast.show({ message: 'One', duration: 0 });
      const second = toast.show({ message: 'Two', duration: 0 });
      toast.show({ message: 'Three', duration: 0 });
      tick();

      second.dismiss();
      tick();

      expect(messages()).toEqual(['One', 'Three']);
    });

    it('starts a queued toast’s countdown only once it becomes visible', () => {
      // Otherwise a toast could expire while it was never on screen.
      toast.show({ message: 'One' });
      toast.show({ message: 'Two' });
      toast.show({ message: 'Three' });
      tick();

      // The two visible ones time out together; the third only starts now.
      vi.advanceTimersByTime(1000);
      tick();
      expect(messages()).toEqual(['Three']);

      vi.advanceTimersByTime(1000);
      tick();
      expect(items()).toHaveLength(0);
    });
  });
});

/**
 * Toast's four labels lived as English literals in `DEFAULT_TOAST_CONFIG`, which
 * meant `toast.close`, `toast.copy`, `toast.copied` and `toast.closeAll` shipped
 * in both catalogs and were read by nothing — an app on the Russian catalog got
 * an English close button and no gate said a word, because the region's own name
 * was the literal `'Notifications'` in a host binding and the rest matched the
 * fallback exactly.
 *
 * The order that has to hold: a configured string WINS (it is the consumer's
 * explicit choice), then the catalog, then English.
 */
describe('WrToast labels', () => {
  let toast: WrToast;

  const tick = (): void => TestBed.tick();
  const host = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-toast-host');
  const items = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-toast')];
  const actions = (t: HTMLElement): HTMLButtonElement[] => [
    ...t.querySelectorAll<HTMLButtonElement>('.wr-toast__action'),
  ];
  const cyrillic = (value: string | null | undefined): boolean => /\p{Script=Cyrillic}/u.test(value ?? '');

  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('takes every one of them from the catalog', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideWrOverlay(),
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    toast = TestBed.inject(WrToast);

    toast.show({ message: 'Раз', showCopy: true });
    toast.show({ message: 'Два' });
    tick();
    // The static loader resolves a promise before the catalog is live, and
    // there is no fixture here to `whenStable()` on — the host renders through
    // the overlay, not into one.
    await Promise.resolve();
    tick();

    expect(cyrillic(host()?.getAttribute('aria-label')), 'the live region is still named in English').toBe(true);
    for (const label of actions(items()[0]).map(b => b.getAttribute('aria-label'))) {
      expect(cyrillic(label), `"${label ?? ''}" is still English`).toBe(true);
    }
  });

  it('still lets provideWrToastConfig win over the catalog', () => {
    TestBed.configureTestingModule({
      providers: [
        provideWrOverlay(),
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
        provideWrToastConfig({ labels: { close: 'Dismiss', copy: 'Copy', copied: 'Copied', closeAll: 'Clear' } }),
      ],
    });
    toast = TestBed.inject(WrToast);

    toast.show({ message: 'One' });
    tick();

    expect(actions(items()[0]).map(b => b.getAttribute('aria-label'))).toEqual(['Dismiss']);
  });

  it('falls back to English when no catalog is registered', () => {
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    toast = TestBed.inject(WrToast);

    toast.show({ message: 'One' });
    tick();

    expect(host()?.getAttribute('aria-label')).toBe('Notifications');
    expect(actions(items()[0]).map(b => b.getAttribute('aria-label'))).toEqual(['Close']);
  });
});

/**
 * ⚠️ This one guards the RULE, not the behaviour.
 *
 * The auto-close bar drains with a physical `scaleX`, and `transform-origin` has
 * no logical keyword — so the anchor cannot be renamed into a logical property,
 * it has to be swapped by a direction-aware rule. jsdom loads no stylesheets, so
 * the source is the only place a spec can see it.
 *
 * Measured in Chromium against the compiled `ngwr/toast` sheet, a 400px toast:
 * the origin was `0px 1px` in BOTH directions before, and is `0px 1px` in LTR
 * and `396px 1px` in RTL after — the bar now stays anchored at the reader's
 * start and drains toward the side their eye leaves from, in either direction.
 */
describe('the auto-close bar, as the stylesheet declares it', () => {
  const sheet = readFileSync(join(process.cwd(), 'projects/lib/toast/styles/_index.scss'), 'utf8');
  const rule = sheet.slice(sheet.indexOf('  &__progress {'), sheet.indexOf('  &:hover &__progress'));

  it('anchors the drain at the reader’s start in each direction', () => {
    expect(rule).toMatch(/transform-origin:\s*left/);
    expect(rule).toMatch(/\[dir='rtl'\] & \{[^}]*transform-origin:\s*right/);
  });

  it('keeps a reason on both halves of the physical pair, for check:rtl and for the reader', () => {
    expect(rule.match(/rtl-ok:/g) ?? []).toHaveLength(2);
  });
});

/**
 * The stacking contract: while a toast is on screen, its host is the topmost
 * thing on the page.
 *
 * This is the one behaviour of the service that no amount of CSS can express,
 * and the reason is worth stating before the assertions. CDK 22 promotes every
 * overlay by calling `showPopover()` on its host element, and the browser's top
 * layer is ordered by the MOMENT of promotion — later beats earlier, and neither
 * z-index nor DOM order nor a containing block can reach across it. The toast
 * host is created once and kept until the last toast leaves, so its position in
 * that order is frozen at whenever the first toast of a run appeared, and every
 * dialog opened afterwards sits above it. A toast under a modal's backdrop is
 * not merely dim: the backdrop hit-tests over it, so its close button is
 * unreachable and a click aimed at it closes the dialog instead — a
 * `duration: 0` toast in that state can never be dismissed at all.
 *
 * jsdom has no top layer, so it is modelled: `showPopover` / `hidePopover` are
 * stubbed on `HTMLElement.prototype` into an array that IS the ordering the
 * browser keeps. Stubbing the prototype is also what makes CDK take the popover
 * path at all — it decides once, per overlay, on `'showPopover' in document.body`.
 * The array's LAST entry is what the user sees on top, and that is the only
 * thing asserted; which internal path put it there is not this spec's business.
 */
@Component({
  imports: [WrDialogContent],
  template: `<div wrDialogContent>Modal content</div>`,
})
class StackProbe {}

describe('WrToast stacking', () => {
  let toast: WrToast;
  let dialog: WrDialog;
  let openDialogs: WrDialogRef<StackProbe>[] = [];

  /** The modelled top layer: last entry paints over every earlier one. */
  let topLayer: HTMLElement[] = [];

  const descriptors = {
    show: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover'),
    hide: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidePopover'),
  };

  const tick = (): void => TestBed.tick();

  /** MutationObserver records are delivered on a microtask, not a timer, so
   * fake timers do not reach them — yield the queue instead. */
  const settle = async (): Promise<void> => {
    tick();
    await Promise.resolve();
    await Promise.resolve();
    tick();
  };

  const toastHost = (): HTMLElement | null =>
    document.querySelector<HTMLElement>('.wr-toast-host')?.closest<HTMLElement>('[popover]') ?? null;

  const top = (): HTMLElement | undefined => topLayer.at(-1);

  beforeEach(() => {
    vi.useFakeTimers();
    topLayer = [];
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      writable: true,
      value(this: HTMLElement) {
        // The real one throws when already showing; nothing here calls it twice.
        topLayer = [...topLayer.filter(el => el !== this), this];
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'hidePopover', {
      configurable: true,
      writable: true,
      value(this: HTMLElement) {
        if (!topLayer.includes(this)) throw new DOMException('Not showing', 'InvalidStateError');
        topLayer = topLayer.filter(el => el !== this);
      },
    });

    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    toast = TestBed.inject(WrToast);
    dialog = TestBed.inject(WrDialog);
    openDialogs = [];
  });

  const openDialog = (): void => {
    openDialogs = [...openDialogs, dialog.open<StackProbe>(StackProbe)];
  };

  afterEach(() => {
    toast.dismissAll();
    for (const ref of openDialogs) ref.close();
    vi.useRealTimers();
    for (const [key, descriptor] of [
      ['showPopover', descriptors.show],
      ['hidePopover', descriptors.hide],
    ] as const) {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor);
      else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key];
    }
  });

  it('takes the popover path at all, which every assertion below rests on', () => {
    toast.show({ message: 'Saved' });
    tick();

    expect(toastHost()).not.toBeNull();
    expect(toastHost()?.getAttribute('popover')).toBe('manual');
    expect(top()).toBe(toastHost());
  });

  it('puts a toast raised from inside an open dialog above the dialog', async () => {
    // The host has to already exist — that is the whole defect. A run that opens
    // its first toast from inside the dialog was always fine, because the host
    // was promoted after it.
    toast.show({ message: 'Saved', duration: 0 });
    await settle();
    const host = toastHost();

    openDialog();
    await settle();

    toast.show({ type: 'danger', message: 'Network error', duration: 0 });
    await settle();

    expect(top()).toBe(host);
  });

  it('lifts a toast that was already on screen when the dialog opened', async () => {
    // The mirror image, and the same defect from the other side: nothing else is
    // coming to raise this one, so it would stay under the backdrop — visible,
    // dimmed and unclickable — for the whole of its duration.
    toast.show({ message: 'Saved', duration: 0 });
    await settle();
    const host = toastHost();

    openDialog();
    await settle();

    expect(top()).toBe(host);
  });

  it('clears a popover the container never sees, which only `show()` can do', async () => {
    // A native `<dialog>`, or another library's popover, promoted from outside
    // the overlay container. Nothing observes it, so the host is raised only
    // because a toast was raised — this is the `show()` half on its own.
    toast.show({ message: 'Saved', duration: 0 });
    await settle();
    const host = toastHost();

    const foreign = document.createElement('div');
    document.body.appendChild(foreign);
    foreign.showPopover();
    await settle();
    expect(top()).toBe(foreign);

    toast.show({ message: 'Copied', duration: 0 });
    await settle();

    expect(top()).toBe(host);
    foreign.remove();
  });

  it('stops watching once the last toast is gone', async () => {
    toast.show({ message: 'Saved', duration: 0 });
    await settle();
    toast.dismissAll();
    await settle();

    // Host disposed, so nothing of ours is in the top layer and no observer is
    // left holding the container after the run.
    expect(toastHost()).toBeNull();

    openDialog();
    await settle();
    expect(top()).not.toBeUndefined();
    expect(document.querySelector('.wr-toast-host')).toBeNull();
  });
});
