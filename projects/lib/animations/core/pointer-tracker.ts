/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * What an effect does with the hovering pointer a {@link WrPointerTracker} follows.
 *
 * @internal
 */
export interface WrPointerFollower {
  /** The first hovering pointer came in. The host is measured: `rect` is set. */
  enter(): void;
  /**
   * One animation frame, for any number of moves since the last. `clientX`,
   * `clientY` and `rect` hold the latest point and box. `time` is the frame's
   * timestamp, for a follower that eases toward the point over several frames.
   */
  frame(time: number): void;
  /** The pointer left, or the tracker stopped while it was inside. A pending frame is cancelled first; `rect` is `null`. */
  leave(): void;
}

/**
 * The pointer-tracking plumbing shared by the card effects: `[wrSpotlight]`
 * and `[wrTilt]`. It listens on the host for a hovering pointer, hands the
 * follower one `enter`, then one `frame` per animation frame however many
 * moves came in, and one `leave`; the follower paints.
 *
 * The host's rect is read once at enter, and again on a window `scroll` or
 * `resize` while the pointer is inside (the card moved under a still pointer:
 * one more frame is scheduled), never per move. A touch pointer is ignored: it
 * has no hover, and a tap would leave the effect on. A move with no enter
 * before it (the directive attached under a resting pointer) counts as the
 * enter. Nothing here decides about reduced motion, forced colours or the
 * server: the directive does, and simply never calls `start()`.
 *
 * `schedule()` is public so a follower that needs more frames after the
 * pointer left (an ease back to rest) can ask for them: it is not tied to the
 * pointer being inside. `stop()` cancels whatever is pending.
 *
 * @internal
 */
export class WrPointerTracker {
  /** The last client point seen. */
  clientX = 0;
  clientY = 0;
  /** The host's border box, measured at enter; `null` while no pointer is inside. */
  rect: DOMRect | null = null;

  private listeners: AbortController | null = null;
  /** Window `scroll` and `resize`, alive only while the pointer is inside. */
  private tracking: AbortController | null = null;
  /** The pending frame's id, `0` when none is pending. */
  private frame = 0;

  constructor(
    private readonly host: HTMLElement,
    private readonly view: Window,
    private readonly follower: WrPointerFollower
  ) {}

  /** Whether a hovering pointer is inside the host. */
  get inside(): boolean {
    return this.rect !== null;
  }

  start(): void {
    if (this.listeners) return;
    this.listeners = new AbortController();
    const options = { signal: this.listeners.signal, passive: true };
    this.host.addEventListener('pointerenter', event => this.follow(event), options);
    this.host.addEventListener('pointermove', event => this.follow(event), options);
    this.host.addEventListener('pointerleave', () => this.off(), options);
  }

  /** Drops every listener and the pending frame; a pointer still inside leaves first. */
  stop(): void {
    this.listeners?.abort();
    this.listeners = null;
    if (this.rect !== null) this.off();
    this.cancel();
  }

  /** One frame for any number of calls. */
  schedule(): void {
    if (this.frame !== 0) return;
    this.frame = this.view.requestAnimationFrame(time => {
      this.frame = 0;
      this.follower.frame(time);
    });
  }

  private follow(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    this.clientX = event.clientX;
    this.clientY = event.clientY;
    if (this.rect === null) this.on();
    this.schedule();
  }

  private on(): void {
    this.rect = this.host.getBoundingClientRect();
    this.tracking = new AbortController();
    const options = { signal: this.tracking.signal, passive: true };
    const refresh = (): void => {
      this.rect = this.host.getBoundingClientRect();
      this.schedule();
    };
    this.view.addEventListener('scroll', refresh, { ...options, capture: true });
    this.view.addEventListener('resize', refresh, options);
    this.follower.enter();
  }

  private off(): void {
    this.tracking?.abort();
    this.tracking = null;
    this.rect = null;
    this.cancel();
    this.follower.leave();
  }

  private cancel(): void {
    if (this.frame === 0) return;
    this.view.cancelAnimationFrame(this.frame);
    this.frame = 0;
  }
}
