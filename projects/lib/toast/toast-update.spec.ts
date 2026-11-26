import { Component, ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrToast } from './services/toast';
import { WrToastOutlet } from './toast-outlet';
import { withToast } from './with-toast';

@Component({
  imports: [WrToastOutlet],
  template: '<wr-toast-outlet name="alarms" mode="list" />',
})
class OutletHost {}

describe('WrToast update, loading and promise', () => {
  let toast: WrToast;

  const tick = (): void => TestBed.tick();
  const items = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-toast')];
  const messages = (): (string | undefined)[] =>
    items().map(t => t.querySelector('.wr-toast__message')?.textContent?.trim());
  const types = (): string[] =>
    items().map(t => [...t.classList].find(c => c.startsWith('wr-toast--') && c !== 'wr-toast--untitled') ?? '');
  /** Lets a settled promise's handlers run, then renders. */
  const settle = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(0);
    tick();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideWr(withToast({ mode: 'list' }))] });
    toast = TestBed.inject(WrToast);
  });

  afterEach(() => {
    toast.dismissAll();
    toast.dismissAll('alarms');
    vi.useRealTimers();
  });

  describe('update()', () => {
    it('changes the text and the type of the same element, in its place', () => {
      toast.show({ message: 'first', duration: 0 });
      const ref = toast.show({ message: 'Saving', duration: 0 });
      toast.show({ message: 'last', duration: 0 });
      tick();
      const before = items()[1];

      ref.update({ type: 'success', title: 'Done', message: 'Saved' });
      tick();

      expect(messages()).toEqual(['first', 'Saved', 'last']);
      expect(items()[1]).toBe(before);
      expect(before.classList.contains('wr-toast--success')).toBe(true);
      expect(before.classList.contains('wr-toast--info')).toBe(false);
      expect(before.querySelector('.wr-toast__title')?.textContent?.trim()).toBe('Done');
    });

    it('changes the other options a live toast reads', () => {
      const run = vi.fn();
      const ref = toast.show({ message: 'Saving', duration: 0 });
      tick();

      ref.update({ closable: false, showCopy: true, class: 'audit', action: { label: 'Undo', run } });
      tick();

      const [item] = items();
      expect(item.querySelector('.wr-toast__action--close')).toBeNull();
      expect(item.querySelector('.wr-toast__action--copy')).not.toBeNull();
      expect(item.classList.contains('audit')).toBe(true);
      item.querySelector<HTMLButtonElement>('.wr-toast__action--run')!.click();
      expect(run).toHaveBeenCalledOnce();
    });

    it('announces through the role of the new type', () => {
      const ref = toast.show({ message: 'Saving', duration: 0 });
      tick();
      expect(items()[0].getAttribute('role')).toBe('status');

      ref.update({ type: 'danger', message: 'Not saved' });
      tick();

      expect(items()[0].getAttribute('role')).toBe('alert');
      expect(items()[0].getAttribute('aria-live')).toBe('assertive');
    });

    it('starts the countdown again, with the new duration', () => {
      const ref = toast.show({ message: 'Saving' });
      tick();
      vi.advanceTimersByTime(3000);

      ref.update({ message: 'Still saving', duration: 2000 });
      tick();
      vi.advanceTimersByTime(1999);
      tick();
      expect(messages()).toEqual(['Still saving']);

      vi.advanceTimersByTime(1);
      tick();
      expect(items()).toHaveLength(0);
    });

    it('draws a new progress bar for the new countdown', () => {
      const ref = toast.show({ message: 'Saving' });
      tick();
      const bar = items()[0].querySelector('.wr-toast__progress');

      ref.update({ message: 'Still saving' });
      tick();

      const next = items()[0].querySelector('.wr-toast__progress');
      expect(next).not.toBeNull();
      expect(next).not.toBe(bar);
    });

    it('holds the new countdown while the pointer is in the stack', () => {
      const ref = toast.show({ message: 'Saving' });
      tick();
      document.querySelector('.wr-toast-host')!.dispatchEvent(new MouseEvent('mouseenter'));
      tick();

      ref.update({ message: 'Saved' });
      tick();
      vi.advanceTimersByTime(60_000);
      tick();

      expect(messages()).toEqual(['Saved']);
    });

    it('reports the updated options on the ref', () => {
      const ref = toast.show({ message: 'Saving', title: 'Upload' });

      ref.update({ message: 'Saved', type: 'success' });

      expect(ref.options).toEqual({ message: 'Saved', title: 'Upload', type: 'success' });
    });

    it('does nothing once the toast is dismissed', () => {
      const ref = toast.show({ message: 'Saving', duration: 0 });
      toast.show({ message: 'other', duration: 0 });
      tick();
      ref.dismiss();
      tick();

      ref.update({ message: 'Saved' });
      tick();

      expect(messages()).toEqual(['other']);
      expect(ref.options.message).toBe('Saving');
    });

    it('does nothing once the toast has expired', () => {
      const ref = toast.show({ message: 'Saving' });
      tick();
      vi.advanceTimersByTime(4000);
      tick();

      ref.update({ message: 'Saved' });
      tick();

      expect(items()).toHaveLength(0);
    });

    it('updates a toast still waiting behind maxStack, which keeps its turn', () => {
      for (let i = 1; i <= 5; i++) toast.show({ message: `${i}`, duration: 0 });
      const waiting = toast.show({ message: 'waiting', duration: 0 });
      toast.show({ message: 'after', duration: 0 });
      tick();

      waiting.update({ message: 'updated' });
      toast.dismiss(1);
      tick();

      expect(messages()).toEqual(['2', '3', '4', '5', 'updated']);
    });

    it('updates a toast in an outlet, in its place', () => {
      const fixture = TestBed.createComponent(OutletHost);
      fixture.detectChanges();
      toast.show({ message: 'a', outlet: 'alarms', duration: 0 });
      const ref = toast.show({ message: 'b', outlet: 'alarms', duration: 0 });
      toast.show({ message: 'c', outlet: 'alarms', duration: 0 });
      tick();

      ref.update({ message: 'B', type: 'warning' });
      tick();

      const inOutlet = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-toast')];
      expect(inOutlet.map(t => t.querySelector('.wr-toast__message')?.textContent?.trim())).toEqual(['a', 'B', 'c']);
      expect(inOutlet[1].classList.contains('wr-toast--warning')).toBe(true);
      fixture.destroy();
    });
  });

  describe('loading', () => {
    it('renders a spinner hidden from assistive technology, and no progress bar', () => {
      toast.loading('Saving');
      tick();

      const [item] = items();
      expect(item.classList.contains('wr-toast--loading')).toBe(true);
      expect(item.querySelector('.wr-toast__icon wr-spinner')).not.toBeNull();
      expect(item.querySelector('.wr-toast__icon')?.getAttribute('aria-hidden')).toBe('true');
      expect(item.querySelector('.wr-toast__progress')).toBeNull();
      expect(item.getAttribute('role')).toBe('status');
      expect(item.getAttribute('aria-live')).toBe('polite');
    });

    it('stays past the default duration, and past its own', () => {
      toast.loading('Saving');
      toast.show({ type: 'loading', message: 'Uploading', duration: 1000 });
      tick();

      vi.advanceTimersByTime(60_000);
      tick();

      expect(messages()).toEqual(['Saving', 'Uploading']);
    });

    it('passes the other options through', () => {
      toast.loading('Saving', { title: 'Profile', closable: false });
      tick();

      const [item] = items();
      expect(item.querySelector('.wr-toast__title')?.textContent?.trim()).toBe('Profile');
      expect(item.querySelector('.wr-toast__action--close')).toBeNull();
    });

    it('counts down with the duration of the type it is updated to', () => {
      const ref = toast.loading('Saving');
      tick();
      vi.advanceTimersByTime(60_000);

      ref.update({ type: 'success', message: 'Saved' });
      tick();
      expect(items()[0].querySelector('wr-spinner')).toBeNull();
      expect(items()[0].querySelector('.wr-toast__progress')).not.toBeNull();

      vi.advanceTimersByTime(3999);
      tick();
      expect(messages()).toEqual(['Saved']);

      vi.advanceTimersByTime(1);
      tick();
      expect(items()).toHaveLength(0);
    });

    it('stays when it is updated without leaving the type', () => {
      const ref = toast.loading('Saving');
      tick();

      ref.update({ message: 'Still saving' });
      tick();
      vi.advanceTimersByTime(60_000);
      tick();

      expect(messages()).toEqual(['Still saving']);
    });
  });

  describe('promise()', () => {
    it('shows loading, then success in the same toast, and returns the promise', async () => {
      let resolve!: (value: number) => void;
      const work = new Promise<number>(r => (resolve = r));

      const returned = toast.promise(work, { loading: 'Saving', success: 'Saved', error: 'Not saved' });
      tick();
      const [item] = items();
      expect(returned).toBe(work);
      expect(types()).toEqual(['wr-toast--loading']);

      resolve(3);
      await settle();

      expect(messages()).toEqual(['Saved']);
      expect(types()).toEqual(['wr-toast--success']);
      expect(items()[0]).toBe(item);
      await expect(returned).resolves.toBe(3);
    });

    it('builds the success message from the value', async () => {
      void toast.promise(Promise.resolve(3), {
        loading: 'Saving',
        success: n => `Saved ${n} rows`,
        error: 'Not saved',
      });
      await settle();

      expect(messages()).toEqual(['Saved 3 rows']);
    });

    it('turns into a danger toast on rejection, and leaves the rejection to the caller', async () => {
      const work = Promise.reject<number>(new Error('offline'));

      const returned = toast.promise(work, {
        loading: 'Saving',
        success: 'Saved',
        error: reason => `Not saved: ${(reason as Error).message}`,
      });
      await settle();

      expect(messages()).toEqual(['Not saved: offline']);
      expect(types()).toEqual(['wr-toast--danger']);
      expect(items()[0].getAttribute('role')).toBe('alert');
      await expect(returned).rejects.toThrow('offline');
    });

    it('takes a plain string for the error', async () => {
      const work = Promise.reject<number>(new Error('offline'));
      work.catch(() => undefined);

      void toast.promise(work, { loading: 'Saving', success: 'Saved', error: 'Not saved' });
      await settle();

      expect(messages()).toEqual(['Not saved']);
    });

    it('closes the outcome after the default duration', async () => {
      void toast.promise(Promise.resolve(1), { loading: 'Saving', success: 'Saved', error: 'Not saved' });
      await settle();

      vi.advanceTimersByTime(4000);
      tick();

      expect(items()).toHaveLength(0);
    });

    it('dismisses the loading toast when a message function throws, and reports it', async () => {
      const handled = vi.spyOn(TestBed.inject(ErrorHandler), 'handleError').mockImplementation(() => undefined);
      const broken = new Error('formatter');
      const throws = (): string => {
        throw broken;
      };
      const failed = Promise.reject<number>(new Error('offline'));

      const resolved = toast.promise(Promise.resolve(3), { loading: 'Saving', success: throws, error: 'Not saved' });
      const rejected = toast.promise(failed, { loading: 'Sending', success: 'Sent', error: throws });
      tick();
      expect(messages()).toEqual(['Saving', 'Sending']);
      await settle();

      expect(items()).toHaveLength(0);
      expect(handled.mock.calls).toEqual([[broken], [broken]]);
      await expect(resolved).resolves.toBe(3);
      await expect(rejected).rejects.toThrow('offline');
    });

    it('shows no outcome for a toast dismissed while pending', async () => {
      let resolve!: (value: number) => void;
      const work = new Promise<number>(r => (resolve = r));
      void toast.promise(work, { loading: 'Saving', success: 'Saved', error: 'Not saved' });
      tick();

      toast.dismissAll();
      resolve(1);
      await settle();

      expect(items()).toHaveLength(0);
    });

    it('passes options to every state', async () => {
      void toast.promise(
        Promise.resolve(1),
        { loading: 'Saving', success: 'Saved', error: 'Not saved' },
        { title: 'Profile' }
      );
      tick();
      expect(items()[0].querySelector('.wr-toast__title')?.textContent?.trim()).toBe('Profile');

      await settle();

      expect(items()[0].querySelector('.wr-toast__title')?.textContent?.trim()).toBe('Profile');
    });
  });
});
