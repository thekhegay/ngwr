import { type EnvironmentProviders } from '@angular/core';
import { TestBed } from '@angular/core/testing';

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
      // There is one host, so `position` is not really per-toast: the second
      // call relocates the first toast too. Pinning the actual behaviour.
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
      expect(document.querySelector('.wr-toast-host__close-all')?.textContent?.trim()).toBe('Close all (2)');
    });

    it('clears everything through "Close all"', () => {
      toast.show({ message: 'One', duration: 0 });
      toast.show({ message: 'Two', duration: 0 });
      tick();
      mouse(host()!, 'mouseenter');

      document.querySelector<HTMLButtonElement>('.wr-toast-host__close-all')!.click();
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
          // The docs say a single label can be overridden, but `Partial<WrToastConfig>`
          // only makes the top-level fields optional — `labels` still has to be
          // passed whole or the call does not type-check. The runtime merge does
          // support a partial; the type does not.
          labels: { close: 'Закрыть', copy: 'Копировать', copied: 'Скопировано', closeAll: 'Закрыть все' },
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
      // `maxStack`'s doc comment says the oldest is dismissed when the cap is
      // exceeded; what actually happens is the opposite — the newest waits in a
      // queue and the oldest keeps its place. Pinning the real behaviour.
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
