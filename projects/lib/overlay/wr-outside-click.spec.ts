import type { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { Subscription } from 'rxjs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { provideWrOverlay } from './provide-wr-overlay';
import { WR_OVERLAY } from './tokens/wr-overlay.token';
import { WrOutsideClick } from './wr-outside-click';

@Component({ template: '<button type="button" class="inside">inside</button>' })
class Pane {}

/**
 * Every overlay in the library dismisses through this, so the contract is worth
 * stating precisely: a click is judged by where the PRESS started, the top-most
 * pane that contains the event stops the walk, and the document listeners exist
 * only while something is watching.
 *
 * Events are dispatched on real nodes in the real document, because the whole
 * subject is which element an event passes through — a hand-called handler
 * would test the arithmetic and skip the question.
 */
describe('WrOutsideClick', () => {
  let outside: WrOutsideClick;
  let overlay: Overlay;
  const refs: OverlayRef[] = [];
  const subs: Subscription[] = [];
  let elsewhere: HTMLElement;

  const openPane = (): OverlayRef => {
    const ref = overlay.create();
    ref.attach(new ComponentPortal(Pane));
    TestBed.tick();
    refs.push(ref);
    return ref;
  };

  const watch = (ref: OverlayRef): { events: MouseEvent[] } => {
    const events: MouseEvent[] = [];
    subs.push(outside.outsidePointerEvents(ref).subscribe(e => events.push(e)));
    return { events };
  };

  const fire = (type: string, target: EventTarget, init: MouseEventInit = {}): void => {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, detail: 1, ...init }));
  };

  /** A press then a release on the same node — what an ordinary click really is. */
  const clickOn = (target: EventTarget): void => {
    fire('pointerdown', target);
    fire('click', target);
  };

  const insideOf = (ref: OverlayRef): HTMLElement => ref.overlayElement.querySelector<HTMLElement>('.inside')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    outside = TestBed.inject(WrOutsideClick);
    overlay = TestBed.inject(WR_OVERLAY);
    elsewhere = document.createElement('button');
    document.body.appendChild(elsewhere);
  });

  afterEach(() => {
    for (const s of subs.splice(0)) s.unsubscribe();
    for (const r of refs.splice(0)) r.dispose();
    elsewhere.remove();
    TestBed.resetTestingModule();
  });

  it('emits for a click outside the pane', () => {
    const ref = openPane();
    const { events } = watch(ref);

    clickOn(elsewhere);

    expect(events).toHaveLength(1);
  });

  it('stays quiet for a click inside the pane', () => {
    const ref = openPane();
    const { events } = watch(ref);

    clickOn(insideOf(ref));

    expect(events).toHaveLength(0);
  });

  it('judges a drag by where the press STARTED, not where it ended', () => {
    const ref = openPane();
    const { events } = watch(ref);

    // Selecting text in a panel and releasing past its edge is an ordinary
    // gesture. Closing there yanks the panel away mid-selection.
    fire('pointerdown', insideOf(ref));
    fire('click', elsewhere);

    expect(events).toHaveLength(0);
  });

  it('still closes for a press that starts outside and ends inside', () => {
    const ref = openPane();
    const { events } = watch(ref);

    fire('pointerdown', elsewhere);
    fire('click', insideOf(ref));

    expect(events).toHaveLength(0);
  });

  it('emits on auxclick and contextmenu too', () => {
    const ref = openPane();
    const { events } = watch(ref);

    fire('auxclick', elsewhere);
    fire('contextmenu', elsewhere);

    // A right-click elsewhere is a dismissal as much as a left one; leaving the
    // panel up under a context menu is the visible failure.
    expect(events).toHaveLength(2);
  });

  it('does not carry a stale press origin into a keyboard-activated click', () => {
    const ref = openPane();
    const { events } = watch(ref);

    // A press inside that never produces a click — a drag released off-window, a
    // node removed under the finger, a cancelled touch. The origin outlives it.
    fire('pointerdown', insideOf(ref));

    // Then Enter on a button elsewhere. A keyboard click carries `detail: 0` and
    // has no `pointerdown` of its own, so judging it by the stale origin marks
    // it "inside" and the panel refuses to close for a keyboard user.
    fire('click', elsewhere, { detail: 0 });

    expect(events).toHaveLength(1);
  });

  describe('stacking', () => {
    it('closes only the panes above the one that was clicked', () => {
      const bottom = openPane();
      const top = openPane();
      const bottomEvents = watch(bottom).events;
      const topEvents = watch(top).events;

      clickOn(insideOf(bottom));

      // A `wr-select` inside a `wr-popover`: clicking the popover must close the
      // select and leave the popover standing.
      expect([bottomEvents.length, topEvents.length]).toEqual([0, 1]);
    });

    it('stops at the pane that was clicked, leaving everything under it alone', () => {
      const bottom = openPane();
      const middle = openPane();
      const top = openPane();
      const bottomEvents = watch(bottom).events;
      const middleEvents = watch(middle).events;
      const topEvents = watch(top).events;

      clickOn(insideOf(middle));

      // Three deep is the shallowest stack that can tell "stop here" from "skip
      // this one": with only two panes the containing one is always last, so
      // continuing past it and stopping at it look identical. Everything ABOVE
      // the click closes, everything below stays.
      expect([bottomEvents.length, middleEvents.length, topEvents.length]).toEqual([0, 0, 1]);
    });

    it('closes every pane for a click outside all of them', () => {
      const bottom = openPane();
      const top = openPane();
      const bottomEvents = watch(bottom).events;
      const topEvents = watch(top).events;

      clickOn(elsewhere);

      expect([bottomEvents.length, topEvents.length]).toEqual([1, 1]);
    });

    it('ignores a watcher whose overlay has been detached', () => {
      const ref = openPane();
      const { events } = watch(ref);
      ref.detach();
      TestBed.tick();

      clickOn(elsewhere);

      expect(events).toHaveLength(0);
    });

    it('survives a watcher that unsubscribes itself while the event is being walked', () => {
      const first = openPane();
      const second = openPane();
      const seen: string[] = [];
      const subA = outside.outsidePointerEvents(first).subscribe(() => {
        seen.push('first');
        subA.unsubscribe(); // closing an overlay does exactly this, synchronously
      });
      subs.push(outside.outsidePointerEvents(second).subscribe(() => seen.push('second')));

      clickOn(elsewhere);

      expect(seen.sort()).toEqual(['first', 'second']);
    });

    it('survives a watcher that closes a DIFFERENT one mid-walk', () => {
      const a = openPane();
      const b = openPane();
      const c = openPane();
      const seen: string[] = [];
      const subA = outside.outsidePointerEvents(a).subscribe(() => seen.push('a'));
      subs.push(subA);
      subs.push(outside.outsidePointerEvents(b).subscribe(() => seen.push('b')));
      // A dismissal that tears down a sibling — a panel closing its own child
      // popover, say. Removing a LOWER index shifts everything above it down.
      subs.push(
        outside.outsidePointerEvents(c).subscribe(() => {
          seen.push('c');
          subA.unsubscribe();
        })
      );

      clickOn(elsewhere);

      // Walking the live array re-reads the shifted slot: `c` is notified a
      // second time and `b` is skipped entirely, so a panel that should have
      // closed stays open.
      expect(seen.filter(x => x === 'c')).toHaveLength(1);
      expect(seen).toContain('b');
    });
  });

  describe('listener lifecycle', () => {
    it('installs listeners with the first watcher and removes them with the last', () => {
      const add = vi.spyOn(document, 'addEventListener');
      const remove = vi.spyOn(document, 'removeEventListener');
      try {
        const ref = openPane();
        const subA = outside.outsidePointerEvents(ref).subscribe();
        const clickAdds = add.mock.calls.filter(([type]) => type === 'click').length;
        expect(clickAdds).toBe(1);

        const subB = outside.outsidePointerEvents(ref).subscribe();
        // Shared: an app with ten overlays open still has one set of listeners.
        expect(add.mock.calls.filter(([type]) => type === 'click').length).toBe(1);

        subA.unsubscribe();
        expect(remove.mock.calls.filter(([type]) => type === 'click').length).toBe(0);

        subB.unsubscribe();
        expect(remove.mock.calls.filter(([type]) => type === 'click').length).toBe(1);
      } finally {
        add.mockRestore();
        remove.mockRestore();
      }
    });
  });

  describe('on the server', () => {
    it('subscribes to nothing and touches no document', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideWrOverlay(), { provide: PLATFORM_ID, useValue: 'server' }],
      });
      const service = TestBed.inject(WrOutsideClick);
      const add = vi.spyOn(document, 'addEventListener');
      try {
        const sub = service.outsidePointerEvents({ hasAttached: () => true } as OverlayRef).subscribe();
        expect(add).not.toHaveBeenCalled();
        sub.unsubscribe();
      } finally {
        add.mockRestore();
      }
    });
  });
});
