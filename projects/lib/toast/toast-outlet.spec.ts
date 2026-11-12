import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrToast } from './services/toast';
import { WrToastOutlet } from './toast-outlet';

@Component({
  imports: [WrToastOutlet],
  template: `
    <div class="alarms" style="position: relative">
      @if (mounted()) {
        <wr-toast-outlet name="alarms" mode="list" position="top" [maxStack]="maxStack()" />
      }
    </div>
    <div class="notes" style="position: relative">
      <wr-toast-outlet name="notes" mode="list" />
    </div>
  `,
})
class Page {
  readonly mounted = signal(true);
  readonly maxStack = signal(3);
}

/**
 * An outlet renders its channel in the page, so its toasts are read out of the
 * fixture, and the global stack out of the document as in `toast.spec.ts`.
 * Timers are faked for the same reason as there.
 */
describe('WrToastOutlet', () => {
  let toast: WrToast;
  let fixture: ComponentFixture<Page>;

  const tick = (): void => {
    TestBed.tick();
    fixture.detectChanges();
  };
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const box = (name: 'alarms' | 'notes'): HTMLElement => root().querySelector<HTMLElement>(`.${name}`)!;
  const items = (root: ParentNode): HTMLElement[] => [...root.querySelectorAll<HTMLElement>('.wr-toast')];
  const messages = (root: ParentNode): (string | undefined)[] =>
    items(root).map(t => t.querySelector('.wr-toast__message')?.textContent?.trim());
  const globalHost = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-toast-overlay .wr-toast-host');
  const mouse = (el: Element, type: 'mouseenter' | 'mouseleave'): void => {
    el.dispatchEvent(new MouseEvent(type));
    tick();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    toast = TestBed.inject(WrToast);
    fixture = TestBed.createComponent(Page);
    tick();
  });

  afterEach(() => {
    toast.dismissAll();
    toast.dismissAll('alarms');
    toast.dismissAll('notes');
    fixture.destroy();
    vi.useRealTimers();
  });

  it('renders nothing but its own element until a toast is sent', () => {
    const outlet = box('alarms').querySelector('wr-toast-outlet');

    expect(outlet?.classList.contains('wr-toast-outlet')).toBe(true);
    expect(outlet?.getAttribute('name')).toBe('alarms');
    expect(outlet?.children).toHaveLength(0);
  });

  it('routes a toast to the outlet of its name, inside the container', () => {
    toast.show({ message: 'Door forced', type: 'danger', outlet: 'alarms' });
    tick();

    expect(messages(box('alarms'))).toEqual(['Door forced']);
    expect(messages(box('notes'))).toEqual([]);

    const item = items(box('alarms'))[0];
    expect(item.closest('wr-toast-outlet')?.parentElement).toBe(box('alarms'));
    expect(item.closest('.wr-overlay-container, .cdk-overlay-container')).toBeNull();
    expect(item.closest('[popover]')).toBeNull();
    expect(globalHost()).toBeNull();
  });

  it('leaves a toast with no outlet in the global overlay', () => {
    toast.show({ message: 'Saved' });
    tick();

    expect(globalHost()?.querySelector('.wr-toast__message')?.textContent?.trim()).toBe('Saved');
    expect(items(root())).toHaveLength(0);
  });

  it('places the stack by the position input', () => {
    toast.show({ message: 'a', outlet: 'alarms', position: 'bottom-start' });
    toast.show({ message: 'b', outlet: 'notes' });
    tick();

    // The per-toast corner is the global stack's; an outlet has its own input.
    expect(box('alarms').querySelector('.wr-toast-host')?.classList.contains('wr-toast-host--top')).toBe(true);
    expect(box('notes').querySelector('.wr-toast-host')?.classList.contains('wr-toast-host--top-end')).toBe(true);
  });

  it('keeps two outlets and the global stack apart', () => {
    toast.show({ message: 'alarm', outlet: 'alarms', duration: 0 });
    toast.show({ message: 'note', outlet: 'notes', duration: 0 });
    toast.show({ message: 'global', duration: 0 });
    tick();

    expect(messages(box('alarms'))).toEqual(['alarm']);
    expect(messages(box('notes'))).toEqual(['note']);
    expect(messages(globalHost()!)).toEqual(['global']);

    toast.dismissAll('alarms');
    tick();
    expect(items(box('alarms'))).toHaveLength(0);
    expect(messages(box('notes'))).toEqual(['note']);
    expect(globalHost()).not.toBeNull();

    toast.dismissAll();
    tick();
    expect(globalHost()).toBeNull();
    expect(messages(box('notes'))).toEqual(['note']);
  });

  it('drops the oldest toast past its own maxStack', () => {
    for (const message of ['1', '2', '3', '4', '5']) toast.show({ message, outlet: 'alarms' });
    for (const message of ['1', '2', '3', '4', '5']) toast.show({ message, outlet: 'notes' });
    tick();

    expect(messages(box('alarms'))).toEqual(['3', '4', '5']);
    expect(messages(box('notes'))).toEqual(['1', '2', '3', '4', '5']);
  });

  it('drops down to a maxStack lowered while toasts are up', () => {
    for (const message of ['1', '2', '3']) toast.show({ message, outlet: 'alarms', duration: 0 });
    tick();

    fixture.componentInstance.maxStack.set(1);
    tick();

    expect(messages(box('alarms'))).toEqual(['3']);
  });

  it('closes its own stack from "Close all"', () => {
    toast.show({ message: 'a', outlet: 'alarms' });
    toast.show({ message: 'b', outlet: 'alarms' });
    toast.show({ message: 'note', outlet: 'notes' });
    tick();

    const button = box('alarms').querySelector<HTMLButtonElement>('.wr-toast-host__close-all');
    expect(button?.textContent?.trim()).toBe('Close all (2)');
    expect(box('notes').querySelector('.wr-toast-host__close-all')).toBeNull();

    button?.click();
    tick();

    expect(box('alarms').querySelector('.wr-toast-host')).toBeNull();
    expect(messages(box('notes'))).toEqual(['note']);
  });

  it('closes one toast from its Close button and from its ref', () => {
    toast.show({ message: 'a', outlet: 'alarms', duration: 0 });
    const ref = toast.show({ message: 'b', outlet: 'alarms', duration: 0 });
    toast.show({ message: 'c', outlet: 'alarms', duration: 0 });
    tick();

    items(box('alarms'))[0].querySelector<HTMLButtonElement>('.wr-toast__action--close')?.click();
    tick();
    expect(messages(box('alarms'))).toEqual(['b', 'c']);

    ref.dismiss();
    tick();
    expect(messages(box('alarms'))).toEqual(['c']);
  });

  it('runs an action once and closes its toast', () => {
    const run = vi.fn();
    toast.show({ message: 'Deleted', outlet: 'alarms', action: { label: 'Undo', run } });
    tick();

    box('alarms').querySelector<HTMLButtonElement>('.wr-toast__action--run')?.click();
    tick();

    expect(run).toHaveBeenCalledTimes(1);
    expect(items(box('alarms'))).toHaveLength(0);
  });

  it('counts a toast down by the duration of its outlet', () => {
    toast.show({ message: 'a', outlet: 'alarms' });
    tick();

    vi.advanceTimersByTime(3999);
    tick();
    expect(items(box('alarms'))).toHaveLength(1);

    vi.advanceTimersByTime(1);
    tick();
    expect(items(box('alarms'))).toHaveLength(0);
  });

  it('holds only the channel under the pointer', () => {
    toast.show({ message: 'alarm', outlet: 'alarms' });
    toast.show({ message: 'note', outlet: 'notes' });
    toast.show({ message: 'global' });
    tick();

    mouse(box('alarms').querySelector('.wr-toast-host')!, 'mouseenter');
    vi.advanceTimersByTime(5000);
    tick();

    expect(messages(box('alarms'))).toEqual(['alarm']);
    expect(items(box('notes'))).toHaveLength(0);
    expect(globalHost()).toBeNull();

    mouse(box('alarms').querySelector('.wr-toast-host')!, 'mouseleave');
    vi.advanceTimersByTime(4000);
    tick();
    expect(items(box('alarms'))).toHaveLength(0);
  });

  it('keeps toasts sent before the outlet mounts, without counting them down', () => {
    fixture.componentInstance.mounted.set(false);
    tick();

    for (const message of ['1', '2', '3', '4', '5', '6', '7']) toast.show({ message, outlet: 'alarms' });
    tick();
    expect(items(box('alarms'))).toHaveLength(0);

    vi.advanceTimersByTime(60_000);
    fixture.componentInstance.mounted.set(true);
    tick();

    // Capped while waiting too, by the maxStack the outlet last set.
    expect(messages(box('alarms'))).toEqual(['5', '6', '7']);

    vi.advanceTimersByTime(4000);
    tick();
    expect(items(box('alarms'))).toHaveLength(0);
  });

  it('pauses the countdown while the outlet is out of the page', () => {
    toast.show({ message: 'a', outlet: 'alarms' });
    tick();
    vi.advanceTimersByTime(1000);

    fixture.componentInstance.mounted.set(false);
    tick();
    vi.advanceTimersByTime(60_000);

    fixture.componentInstance.mounted.set(true);
    tick();
    expect(messages(box('alarms'))).toEqual(['a']);

    vi.advanceTimersByTime(2999);
    tick();
    expect(items(box('alarms'))).toHaveLength(1);

    vi.advanceTimersByTime(1);
    tick();
    expect(items(box('alarms'))).toHaveLength(0);
  });

  it('announces like the global stack, with no more live regions than toasts', () => {
    toast.show({ message: 'bad', type: 'danger', outlet: 'alarms' });
    toast.show({ message: 'fine', outlet: 'alarms' });
    tick();

    const [bad, fine] = items(box('alarms'));
    expect(bad.getAttribute('role')).toBe('alert');
    expect(bad.getAttribute('aria-live')).toBe('assertive');
    expect(fine.getAttribute('role')).toBe('status');
    expect(fine.getAttribute('aria-live')).toBe('polite');
    expect(box('alarms').querySelectorAll('[aria-live]')).toHaveLength(2);
    expect(box('alarms').querySelector('.wr-toast-host')?.getAttribute('role')).toBe('region');
  });

  it('stays at maxStack toasts and timers through a burst of 1000', () => {
    fixture.componentInstance.maxStack.set(5);
    tick();
    const before = vi.getTimerCount();
    const started = performance.now();

    for (let i = 1; i <= 1000; i++) toast.show({ message: `alarm ${i}`, type: 'danger', outlet: 'alarms' });
    tick();

    expect(performance.now() - started).toBeLessThan(1000);
    expect(messages(box('alarms'))).toEqual(['alarm 996', 'alarm 997', 'alarm 998', 'alarm 999', 'alarm 1000']);
    expect(box('alarms').querySelectorAll('[aria-live]')).toHaveLength(5);
    expect(vi.getTimerCount() - before).toBeLessThanOrEqual(5);
  });

  it('moves keyboard focus on as the global stack does: to the next toast, then back where it came from', () => {
    const matches = Object.getOwnPropertyDescriptor(Element.prototype, 'matches')!.value as (
      this: Element,
      selector: string
    ) => boolean;
    vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) {
      if (selector === ':focus-visible') return this === document.activeElement;
      return matches.call(this, selector);
    });
    const opener = document.body.appendChild(document.createElement('button'));
    opener.focus();
    const closeOf = (i: number): HTMLButtonElement =>
      items(box('alarms'))[i].querySelector<HTMLButtonElement>('.wr-toast__action--close')!;

    toast.show({ message: 'One', outlet: 'alarms', duration: 0 });
    toast.show({ message: 'Two', outlet: 'alarms', duration: 0 });
    tick();

    closeOf(0).focus();
    closeOf(0).click();
    tick();
    expect(document.activeElement).toBe(closeOf(0));
    expect(messages(box('alarms'))).toEqual(['Two']);

    closeOf(0).click();
    tick();
    expect(document.activeElement).toBe(opener);

    opener.remove();
    vi.restoreAllMocks();
  });

  it('warns once per extra outlet of a name already in the page', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    @Component({ imports: [WrToastOutlet], template: '<wr-toast-outlet name="notes" />' })
    class Twin {}

    const twin = TestBed.createComponent(Twin);
    twin.detectChanges();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('"notes"');

    twin.destroy();
    warn.mockRestore();
  });
});
