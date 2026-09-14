/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Direction, Directionality } from '@angular/cdk/bidi';
import type { OverlayRef } from '@angular/cdk/overlay';
import { type Injector, effect, untracked } from '@angular/core';

import { Subscription } from 'rxjs';

import { noop } from 'ngwr/utils';

/**
 * Keep an OPEN overlay on the application's reading direction.
 *
 * The CDK reads the direction ONCE, as a string, when the overlay is created
 * (`overlayConfig.direction ||= directionality.value`), writes it as the host's
 * `dir` on attach, and never looks at it again — `updatePosition()` does not
 * touch it and `setDirection()` is the only thing that does. So an application
 * that flips direction while a panel is open mirrors the page and leaves the
 * panel behind, still `ltr`, still resolving `start` to the left. This site's
 * own LTR/RTL switch is the demonstration: it lives inside a `wr-dropdown`, and
 * the `wr-segmented` it is built from reads `Directionality` live — so the thumb
 * slides to the other slot while the pane around it still renders `ltr`, and
 * parks under the wrong label.
 *
 * Call it once per `OverlayRef`, right after `overlay.create(...)`. The follower
 * ends itself when that overlay detaches or is disposed, so a reopen — which is
 * always a NEW ref in this library — needs a new call, and the returned teardown
 * is only for stopping early.
 *
 * `onDirectionChange` is for the sites whose position LIST is itself
 * direction-dependent (the four that pass their table through
 * {@link wrMirrorOffsets}): it runs with the new direction already on the ref
 * and before the overlay repositions, so the strategy is carrying the mirrored
 * offsets by the time the CDK re-resolves them.
 *
 * SSR-safe: it touches no browser global of its own, and the CDK's position
 * strategies no-op off the browser, so a flip on the server only rewrites the
 * attribute.
 *
 * @param overlayRef The overlay to keep in step, freshly created.
 * @param dir The `Directionality` the caller injected. `null` — an optional
 *   inject with no provider, i.e. a bare `TestBed` — means there is nothing
 *   ambient to follow and this does nothing at all.
 * @param injector Owns the `valueSignal` watch; the caller's own is right.
 * @param onDirectionChange Re-applies direction-dependent state, e.g.
 *   `strategy.withPositions(wrMirrorOffsets(TABLE, direction === 'rtl'))`.
 * @returns Stops following. Idempotent, and unnecessary in the normal case.
 *
 * @example
 * ```ts
 * this.overlayRef = this.overlay.create({ positionStrategy, ... });
 * wrFollowDirection(this.overlayRef, this.dir, this.injector, direction =>
 *   positionStrategy.withPositions(
 *     wrMirrorOffsets(WR_POPCONFIRM_POSITIONS[this.position()], direction === 'rtl')
 *   )
 * );
 * ```
 */
export function wrFollowDirection(
  overlayRef: OverlayRef,
  dir: Directionality | null,
  injector: Injector,
  onDirectionChange?: (direction: Direction) => void
): () => void {
  if (!dir) return noop;

  const apply = (next: Direction): void => {
    // Comparing against the REF rather than a direction captured up here does
    // three jobs at once: the watch's mandatory first run is a no-op, a flip
    // that arrives down both channels is applied once, and a same-value write
    // never yanks a panel the user is reading.
    if (next === overlayRef.getDirection()) return;

    overlayRef.setDirection(next); // rewrites the host's `dir`; it does NOT reposition
    onDirectionChange?.(next); // the caller re-mirrors its position list here
    overlayRef.updatePosition(); // re-resolves start/end against the direction just set
  };

  // Two channels, because they are not the same thing. `valueSignal` is the
  // state — `Directionality.value` is a getter over it, so nothing can change
  // direction without writing it. `change` is an EventEmitter the root instance
  // never emits: it reads the document once at construction and only completes
  // the emitter on destroy, so it belongs to the `[dir]` directive (and to an
  // app, like this site's header, that emits it by hand as a courtesy). Keying
  // on `change` alone would be dead for an app that just writes the signal;
  // keying on the signal alone would ignore the `{ value, change }` test double
  // that a dozen of the library's RTL specs hand their component.
  //
  // `untracked` because of WHERE this is called from: half the call sites open
  // their overlay out of an `effect(() => { if (this.isOpen()) … })`, and
  // `effect()` refuses in dev mode to be created inside a reactive context.
  // Laundering only the CREATION is exactly right — the watch below still
  // depends on `valueSignal` and on nothing else.
  const watch = untracked(() =>
    effect(
      () => {
        // Read as a plain optional function rather than as a `Signal`, because
        // the case being guarded is a double that has no signal at all: falling
        // back to `value` registers no dependency, so the watch simply never
        // re-runs and `change` carries that case on its own.
        const read: (() => Direction) | undefined = dir.valueSignal;
        apply(read ? read() : dir.value);
      },
      { injector }
    )
  );

  // rxjs owns the teardown, and an `OverlayRef` is why. Open and close happen in
  // an event handler or an effect, never in an injection context, so the idiom
  // that suggests itself — `takeUntilDestroyed(destroyRef)` — would tie this to
  // the DIRECTIVE's lifetime: a menu opened fifty times would leave fifty
  // followers behind, each pinning a disposed ref. (`WrOutsideClick`'s JSDoc
  // records that same mistake, made at ten call sites.) `detachments()` is the
  // overlay's own lifetime and the one channel every dismissal goes through.
  // And it is not hygiene: `setDirection()` writes through the host element
  // `dispose()` nulls, so a watch that outlives its overlay THROWS on the next
  // flip.
  const teardown = new Subscription();
  const stop = (): void => teardown.unsubscribe();

  teardown.add(() => watch.destroy());
  teardown.add(dir.change.subscribe(apply));
  // Both handlers, for the reason `WrOutsideClick` gives: a live ref arrives
  // through `next`, one already disposed before this call has only `complete`
  // left to give.
  teardown.add(overlayRef.detachments().subscribe({ next: stop, complete: stop }));

  // `Subscription.unsubscribe()` is a no-op once closed, so the caller's copy of
  // this and the automatic one cannot fight, and calling it twice is free.
  return stop;
}
