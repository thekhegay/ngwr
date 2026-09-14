import { type Direction, Directionality } from '@angular/cdk/bidi';
import type { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, type EffectRef, Injector, PLATFORM_ID, effect, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { provideWrOverlay } from './provide-wr-overlay';
import { WR_OVERLAY } from './tokens/wr-overlay.token';
import { wrFollowDirection } from './wr-follow-direction';

@Component({ template: '<p>panel</p>' })
class Pane {}

/**
 * The CDK captures direction as a string when an overlay is created and writes
 * it once, on attach — so an app that flips while a panel is open mirrors the
 * page and leaves the panel behind. These cases pin the contract that fixes
 * that, and they read the RENDERED result: the `dir` attribute the CDK writes,
 * on the HOST wrapper rather than on the pane, which is where `panelClass`
 * lands.
 *
 * Both channels are exercised, because they are not interchangeable —
 * `valueSignal` is the state every writer must touch, `change` is the
 * `[dir]` directive's push and what the library's own RTL test doubles carry.
 */
describe('wrFollowDirection', () => {
  let overlay: Overlay;
  let injector: Injector;
  let ambient: Directionality;
  /** Only for the `change`-only double; the real `Directionality` never emits. */
  let changes: Subject<Direction>;

  const refs: OverlayRef[] = [];
  const stops: (() => void)[] = [];
  const watchers: EffectRef[] = [];

  /** Fresh module per case: an overlay container must not outlive its test. */
  const configure = (extra: unknown[] = []): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), ...extra] });
    overlay = TestBed.inject(WR_OVERLAY);
    injector = TestBed.inject(Injector);
    ambient = TestBed.inject(Directionality);
  };

  /** A `Directionality` shaped like half the library's RTL specs: no signal. */
  const configureWithChangeOnlyDouble = (): void => {
    changes = new Subject<Direction>();
    configure([{ provide: Directionality, useValue: { value: 'ltr', change: changes } }]);
  };

  const openPane = (config?: OverlayConfig): OverlayRef => {
    const ref = overlay.create(config);
    ref.attach(new ComponentPortal(Pane));
    TestBed.tick();
    refs.push(ref);
    return ref;
  };

  const follow = (
    ref: OverlayRef,
    dir: Directionality | null,
    onChange?: (direction: Direction) => void
  ): (() => void) => {
    const stop = wrFollowDirection(ref, dir, injector, onChange);
    stops.push(stop);
    return stop;
  };

  /** What the CDK writes, and what every logical CSS rule inside the pane reads. */
  const hostDir = (ref: OverlayRef): string | null => ref.hostElement.getAttribute('dir');

  /** A signal write is state, not an event: it lands on the next change detection. */
  const flipTo = (direction: Direction): void => {
    ambient.valueSignal.set(direction);
    TestBed.tick();
  };

  beforeEach(() => configure());

  afterEach(() => {
    for (const stop of stops.splice(0)) stop();
    for (const watcher of watchers.splice(0)) watcher.destroy();
    for (const ref of refs.splice(0)) ref.dispose();
    TestBed.resetTestingModule();
  });

  it('rewrites the host `dir` when the ambient direction flips', () => {
    const ref = openPane();
    expect(hostDir(ref)).toBe('ltr');

    follow(ref, ambient);
    flipTo('rtl');

    // Without this the pane keeps rendering `ltr` under a mirrored page — and a
    // `wr-segmented` inside it, which reads `Directionality` live, slides its
    // thumb to a slot the pane still lays out the other way round.
    expect(hostDir(ref)).toBe('rtl');
  });

  it('repositions, so `start` and `end` resolve against the direction just set', () => {
    const ref = openPane();
    const reposition = vi.spyOn(ref, 'updatePosition');
    follow(ref, ambient);

    flipTo('rtl');

    // `setDirection()` rewrites the attribute and nothing else; the CDK will not
    // re-resolve an anchor until someone applies the strategy again.
    expect(reposition).toHaveBeenCalledTimes(1);
  });

  it('hands the caller the new direction before it repositions', () => {
    const ref = openPane();
    const seen: string[] = [];
    const reposition = vi.spyOn(ref, 'updatePosition').mockImplementation(() => seen.push('reposition'));
    follow(ref, ambient, direction => seen.push(`callback:${direction}:${ref.getDirection()}:${hostDir(ref)}`));

    flipTo('rtl');

    // The four sites that mirror their own `offsetX` rebuild the position LIST
    // in here, so it has to run while the new direction is already on the ref
    // and before the strategy is applied — otherwise the re-apply resolves
    // against the offsets of the direction just left.
    expect(seen).toEqual(['callback:rtl:rtl:rtl', 'reposition']);
    reposition.mockRestore();
  });

  it('ignores a write that lands on the direction the overlay already has', () => {
    const ref = openPane();
    const reposition = vi.spyOn(ref, 'updatePosition');
    const seen: Direction[] = [];
    follow(ref, ambient, direction => seen.push(direction));

    // The watch's own first run, then a genuine no-op write. Repositioning for
    // either yanks a panel the user is reading, and the first would do it to
    // every overlay in the app the moment it opened.
    TestBed.tick();
    flipTo('ltr');

    expect([seen, reposition.mock.calls.length]).toEqual([[], 0]);
  });

  it('brings an overlay whose direction was captured earlier into line', () => {
    ambient.valueSignal.set('rtl');
    const ref = openPane({ direction: 'ltr' });
    expect(hostDir(ref)).toBe('ltr');

    follow(ref, ambient);
    TestBed.tick();

    // The guard asks the REF what direction it is on, never a value captured
    // when the follower was installed — so a ref that starts out disagreeing
    // with the app is reconciled instead of frozen.
    expect(hostDir(ref)).toBe('rtl');
  });

  it('follows a flip that arrives only through `Directionality.change`', () => {
    configureWithChangeOnlyDouble();
    const ref = openPane();
    const reposition = vi.spyOn(ref, 'updatePosition');
    follow(ref, TestBed.inject(Directionality));

    changes.next('rtl');

    // No `TestBed.tick()`: `change` is an event, and this double carries no
    // signal at all — reading one unguarded would throw here instead.
    expect(hostDir(ref)).toBe('rtl');

    changes.next('rtl');
    expect(reposition).toHaveBeenCalledTimes(1);
  });

  it('survives being installed from inside an `effect`', () => {
    const ref = openPane();
    const isOpen = signal(false);
    // The shape half the call sites have: `effect(() => { if (isOpen()) … })`.
    // `effect()` refuses in dev mode to be created inside a reactive context,
    // so a follower that installs its watch bare throws right here — inside
    // change detection, where the failure reads as "the overlay never followed".
    watchers.push(
      effect(
        () => {
          if (isOpen()) follow(ref, ambient);
        },
        { injector }
      )
    );

    isOpen.set(true);
    TestBed.tick();
    flipTo('rtl');

    expect(hostDir(ref)).toBe('rtl');
  });

  it('does nothing at all when there is no `Directionality`', () => {
    const ref = openPane();

    // A bare `TestBed` that provides nothing: the caller's optional inject hands
    // over `null`, and there is no ambient direction to follow.
    const stop = follow(ref, null);
    stop();
    stop();
    TestBed.tick();

    expect(hostDir(ref)).toBe('ltr');
  });

  describe('teardown', () => {
    it('stops when the overlay is disposed', () => {
      const ref = openPane();
      const setDirection = vi.spyOn(ref, 'setDirection');
      follow(ref, ambient);

      ref.dispose();
      flipTo('rtl');

      // Not hygiene: `setDirection()` writes through the host element that
      // `dispose()` nulls, so a watch that outlived its overlay would throw on
      // the next flip — inside change detection, far from the overlay.
      expect(setDirection).not.toHaveBeenCalled();
    });

    it('stops when the overlay merely detaches', () => {
      const ref = openPane();
      const setDirection = vi.spyOn(ref, 'setDirection');
      follow(ref, ambient);

      // A detached pane is not in the document; there is nothing to keep in
      // step. A ref that is attached again needs a new follower.
      ref.detach();
      TestBed.tick();
      flipTo('rtl');

      expect(setDirection).not.toHaveBeenCalled();
    });

    it('registers nothing for an overlay that is already gone', () => {
      const ref = overlay.create();
      ref.attach(new ComponentPortal(Pane));
      TestBed.tick();
      ref.dispose();
      const setDirection = vi.spyOn(ref, 'setDirection');

      follow(ref, ambient);
      flipTo('rtl');

      // A disposed ref emits no detachment — it has already completed — so the
      // completion channel is the only one that can take this follower down.
      expect(setDirection).not.toHaveBeenCalled();
    });

    it('is safe to stop twice', () => {
      const ref = openPane();
      const setDirection = vi.spyOn(ref, 'setDirection');
      const stop = follow(ref, ambient);

      stop();
      stop();
      flipTo('rtl');

      expect(setDirection).not.toHaveBeenCalled();
    });

    it('gives a reopened overlay a follower of its own', () => {
      const closed = openPane();
      follow(closed, ambient);
      const reopened = openPane();
      follow(reopened, ambient);

      // Closing is always a `dispose()` in this library and reopening always a
      // new ref, so the follower that went down with the first one must not
      // take the second's with it.
      closed.dispose();
      flipTo('rtl');

      expect(hostDir(reopened)).toBe('rtl');
    });
  });

  describe('on the server', () => {
    it('rewrites the attribute and leaves the reposition inert', () => {
      configure([{ provide: PLATFORM_ID, useValue: 'server' }]);
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);
      try {
        const positionStrategy = overlay
          .position()
          .flexibleConnectedTo(anchor)
          .withPositions([{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' }]);
        const ref = openPane({ positionStrategy });
        follow(ref, ambient);

        flipTo('rtl');

        // Nothing here reads a browser global of its own, and the CDK's own
        // strategy returns early off the browser — so a component that opens an
        // overlay during prerender can install this unconditionally.
        expect(hostDir(ref)).toBe('rtl');
      } finally {
        anchor.remove();
      }
    });
  });
});
