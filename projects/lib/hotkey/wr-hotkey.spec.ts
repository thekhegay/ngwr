import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WrHotkey } from './wr-hotkey';
import { WrHotkeyBinding } from './wr-hotkey-binding';

@Component({
  imports: [WrHotkeyBinding],
  template: `
    @if (shown()) {
      <button type="button" wrHotkey="mod+p" hotkeyLabel="Print">Print</button>
      <button type="button" wrHotkey="escape">Close</button>
    }
  `,
})
class Host {
  readonly shown = signal(true);
}

/**
 * `parse-spec.spec.ts` covers the parser — which chord a string means. This
 * covers the half that runs at runtime: registration, dispatch order, the
 * typing guard, and teardown. Events are dispatched at the real target so the
 * service's own listener is what decides, not a hand-called method.
 */
describe('WrHotkey', () => {
  let hotkey: WrHotkey;

  const press = (init: KeyboardEventInit, target: EventTarget = document): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    hotkey = TestBed.inject(WrHotkey);
  });

  it('fires the handler for a matching chord and not for others', () => {
    const fn = vi.fn();
    hotkey.bind('ctrl+k', fn);

    press({ key: 'k', ctrlKey: true });
    expect(fn).toHaveBeenCalledTimes(1);

    press({ key: 'k' });
    press({ key: 'j', ctrlKey: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('prevents default by default, and leaves the event alone when told not to', () => {
    hotkey.bind('ctrl+k', () => undefined);
    expect(press({ key: 'k', ctrlKey: true }).defaultPrevented).toBe(true);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    TestBed.inject(WrHotkey).bind('ctrl+j', () => undefined, { preventDefault: false });
    expect(press({ key: 'j', ctrlKey: true }).defaultPrevented).toBe(false);
  });

  describe('the typing guard', () => {
    const withFocusedField = (tag: 'input' | 'textarea', run: (el: HTMLElement) => void): void => {
      const el = document.createElement(tag);
      document.body.appendChild(el);
      try {
        el.focus();
        run(el);
      } finally {
        el.remove();
      }
    };

    it('stays quiet while the user is typing', () => {
      const fn = vi.fn();
      hotkey.bind('ctrl+k', fn);

      // A shortcut that fires mid-sentence is the classic complaint: the user
      // is writing, not commanding.
      withFocusedField('input', el => press({ key: 'k', ctrlKey: true }, el));
      withFocusedField('textarea', el => press({ key: 'k', ctrlKey: true }, el));

      expect(fn).not.toHaveBeenCalled();
    });

    it('fires in a field when the binding opts in', () => {
      const fn = vi.fn();
      hotkey.bind('ctrl+k', fn, { allowInInput: true });

      withFocusedField('input', el => press({ key: 'k', ctrlKey: true }, el));

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('treats a contenteditable as typing too', () => {
      const fn = vi.fn();
      hotkey.bind('ctrl+k', fn);
      const el = document.createElement('div');
      el.setAttribute('contenteditable', 'true');
      document.body.appendChild(el);

      try {
        // jsdom does not derive `isContentEditable` from the attribute, and the
        // guard reads the property — so a spec that only sets the attribute
        // would pass while the real guard did nothing.
        Object.defineProperty(el, 'isContentEditable', { value: true, configurable: true });
        press({ key: 'k', ctrlKey: true }, el);
      } finally {
        el.remove();
      }

      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('ordering', () => {
    it('runs the higher priority binding first', () => {
      const order: string[] = [];
      hotkey.bind('ctrl+k', () => order.push('low'), { priority: 0, preventDefault: false });
      hotkey.bind('ctrl+k', () => order.push('high'), { priority: 10, preventDefault: false });

      press({ key: 'k', ctrlKey: true });

      expect(order).toEqual(['high', 'low']);
    });

    it('stops the chain once a handler claims the event', () => {
      const second = vi.fn();
      hotkey.bind('ctrl+k', event => event.preventDefault(), { priority: 10, preventDefault: false });
      hotkey.bind('ctrl+k', second, { priority: 0, preventDefault: false });

      press({ key: 'k', ctrlKey: true });

      // Claiming the event is how a modal shortcut shadows a global one.
      expect(second).not.toHaveBeenCalled();
    });

    it('runs every binding on a chord under the shipped defaults', () => {
      const seen: string[] = [];
      hotkey.bind('ctrl+k', () => seen.push('a'));
      hotkey.bind('ctrl+k', () => seen.push('b'));

      // Both take the default `preventDefault: true`. The service used to apply
      // that itself and then read `defaultPrevented` back as "a handler consumed
      // the chord", so only the first binding ever ran — for every chord, under
      // the options every consumer gets by default. `cancelable` is what makes
      // it visible: on a non-cancelable event `preventDefault()` is a no-op and
      // the bug hides.
      const event = press({ key: 'k', ctrlKey: true });

      expect(seen).toEqual(['a', 'b']);
      // …and the browser default is still suppressed, which is all the option
      // was ever supposed to mean.
      expect(event.defaultPrevented).toBe(true);
    });

    it('lets one binding claim the chord AND suppress the browser', () => {
      const second = vi.fn();
      hotkey.bind('ctrl+k', event => event.preventDefault(), { priority: 10 });
      hotkey.bind('ctrl+k', second, { priority: 0 });

      // The two roles have to stay expressible together: a modal shortcut that
      // shadows the global one usually also wants the browser to keep its hands
      // off the chord.
      expect(press({ key: 'k', ctrlKey: true }).defaultPrevented).toBe(true);
      expect(second).not.toHaveBeenCalled();
    });

    it('is not silenced by a listener that prevented the event before it', () => {
      const seen: string[] = [];
      hotkey.bind('ctrl+k', () => seen.push('a'), { priority: 10, preventDefault: false });
      hotkey.bind('ctrl+k', () => seen.push('b'), { priority: 0, preventDefault: false });

      // An event can arrive already default-prevented from somewhere else on
      // the propagation path. That is not a claim by any binding here, so the
      // chain reads its own delta rather than the raw flag. Dispatched from a
      // child so the capturing listener on `document` runs first.
      const child = document.createElement('div');
      document.body.appendChild(child);
      const claim = (event: Event): void => event.preventDefault();
      document.addEventListener('keydown', claim, true);

      try {
        press({ key: 'k', ctrlKey: true }, child);
      } finally {
        document.removeEventListener('keydown', claim, true);
        child.remove();
      }

      expect(seen).toEqual(['a', 'b']);
    });
  });

  describe('teardown', () => {
    it('stops firing after unbind', () => {
      const fn = vi.fn();
      const handle = hotkey.bind('ctrl+k', fn);
      handle.unbind();

      press({ key: 'k', ctrlKey: true });

      expect(fn).not.toHaveBeenCalled();
    });

    it('leaves later bindings alone when a stale handle unbinds twice', () => {
      // Double-unbind is ordinary: a directive that releases on destroy and
      // again when its input changes. The second call must be a no-op — it used
      // to walk a bucket that had already been replaced, find it empty, and
      // detach the listener that the NEW binding was relying on.
      const first = vi.fn();
      const handle = hotkey.bind('ctrl+k', first);
      handle.unbind();

      const second = vi.fn();
      hotkey.bind('ctrl+k', second);
      handle.unbind();

      press({ key: 'k', ctrlKey: true });

      expect(second).toHaveBeenCalledTimes(1);
      expect(first).not.toHaveBeenCalled();
    });

    it('drops its DOM listeners when the injector goes', () => {
      // Counting listeners, not silence. Clearing the registry alone makes the
      // handler stop firing, so an assertion on the handler passes while the
      // `keydown` listener is still on the document — which is the actual leak:
      // one per destroyed route that provided its own `WrHotkey`, each holding
      // its closure alive. It also made this suite lie, since a leaked binding
      // from an earlier test kept calling `preventDefault()` and broke a later
      // test's handler chain.
      const added = vi.spyOn(document, 'addEventListener');
      const removed = vi.spyOn(document, 'removeEventListener');
      try {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({});
        TestBed.inject(WrHotkey).bind('ctrl+k', vi.fn());
        const keydownAdds = added.mock.calls.filter(([type]) => type === 'keydown').length;
        expect(keydownAdds).toBe(1);

        TestBed.resetTestingModule();

        const keydownRemoves = removed.mock.calls.filter(([type]) => type === 'keydown').length;
        expect(keydownRemoves).toBe(keydownAdds);
      } finally {
        added.mockRestore();
        removed.mockRestore();
      }
    });

    it('keeps sibling bindings on the same target alive', () => {
      const kept = vi.fn();
      const dropped = vi.fn();
      hotkey.bind('ctrl+k', kept, { preventDefault: false });
      hotkey.bind('ctrl+j', dropped).unbind();

      press({ key: 'k', ctrlKey: true });
      press({ key: 'j', ctrlKey: true });

      expect([kept.mock.calls.length, dropped.mock.calls.length]).toEqual([1, 0]);
    });
  });

  describe('bindings', () => {
    it('lists what is registered, in order, with the label or null', () => {
      hotkey.bind('mod+k', vi.fn(), { label: 'Open the palette' });
      hotkey.bind('escape', vi.fn());

      expect(hotkey.bindings()).toEqual([
        { chord: 'mod+k', label: 'Open the palette' },
        { chord: 'escape', label: null },
      ]);
    });

    it('keeps the chord as registered, not as parsed', () => {
      // A cheat sheet prints the chord, and `mod` is the token the formatter
      // turns into ⌘ or Ctrl per platform. The parsed form has lost it.
      hotkey.bind('Mod+Shift+K', vi.fn());
      expect(hotkey.bindings()[0].chord).toBe('Mod+Shift+K');
    });

    it('drops a binding when its handle unbinds, and only that one', () => {
      const a = hotkey.bind('ctrl+a', vi.fn(), { label: 'A' });
      hotkey.bind('ctrl+b', vi.fn(), { label: 'B' });

      a.unbind();
      expect(hotkey.bindings().map(b => b.label)).toEqual(['B']);

      // A stale second unbind changes nothing.
      a.unbind();
      expect(hotkey.bindings().map(b => b.label)).toEqual(['B']);
    });

    it('lists an element-scoped binding too', () => {
      const scoped = document.createElement('div');
      hotkey.bind('ctrl+k', vi.fn(), { element: scoped, label: 'Scoped' });
      expect(hotkey.bindings()).toEqual([{ chord: 'ctrl+k', label: 'Scoped' }]);
    });

    it('follows [wrHotkey]: listed while its owner lives, gone when it is destroyed', () => {
      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();

      expect(hotkey.bindings()).toEqual([
        { chord: 'mod+p', label: 'Print' },
        { chord: 'escape', label: null },
      ]);

      fixture.componentInstance.shown.set(false);
      fixture.detectChanges();
      expect(hotkey.bindings()).toEqual([]);

      fixture.componentInstance.shown.set(true);
      fixture.detectChanges();
      expect(hotkey.bindings().map(b => b.chord)).toEqual(['mod+p', 'escape']);

      fixture.destroy();
      expect(hotkey.bindings()).toEqual([]);
    });

    it('is empty once the injector goes', () => {
      hotkey.bind('ctrl+k', vi.fn());
      TestBed.resetTestingModule();
      expect(hotkey.bindings()).toEqual([]);
    });
  });

  describe('scoping to an element', () => {
    it('only fires for events inside the bound element', () => {
      const scoped = document.createElement('div');
      document.body.appendChild(scoped);
      const fn = vi.fn();

      try {
        hotkey.bind('ctrl+k', fn, { element: scoped });

        press({ key: 'k', ctrlKey: true }, document);
        expect(fn).not.toHaveBeenCalled();

        press({ key: 'k', ctrlKey: true }, scoped);
        expect(fn).toHaveBeenCalledTimes(1);
      } finally {
        scoped.remove();
      }
    });
  });
});
