import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type PointerFollower, PointerTracker } from './pointer-tracker';

/** `requestAnimationFrame` by hand: frames run when the spec says. */
class Frames {
  private readonly queue = new Map<number, FrameRequestCallback>();
  private id = 0;
  readonly request = vi.fn((cb: FrameRequestCallback): number => {
    this.queue.set(++this.id, cb);
    return this.id;
  });
  readonly cancel = vi.fn((id: number): void => {
    this.queue.delete(id);
  });
  get pending(): number {
    return this.queue.size;
  }
  run(time = 16): void {
    const callbacks = [...this.queue.values()];
    this.queue.clear();
    callbacks.forEach(cb => cb(time));
  }
}

const pointer = (type: string, init: PointerEventInit): PointerEvent => {
  // jsdom has no PointerEvent constructor; a MouseEvent with the type set does.
  const event = new MouseEvent(type, init) as PointerEvent;
  Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'mouse' });
  return event;
};

const RECT = { left: 100, top: 50, width: 300, height: 200, right: 400, bottom: 250 } as DOMRect;

describe('PointerTracker', () => {
  let frames: Frames;
  let host: HTMLElement;
  let follower: { [K in keyof PointerFollower]: Mock<PointerFollower[K]> };
  let tracker: PointerTracker;
  let measure: Mock<() => DOMRect>;

  const enter = (clientX: number, clientY: number, pointerType = 'mouse'): void => {
    host.dispatchEvent(pointer('pointerenter', { clientX, clientY, pointerType }));
  };
  const move = (clientX: number, clientY: number, pointerType = 'mouse'): void => {
    host.dispatchEvent(pointer('pointermove', { clientX, clientY, pointerType }));
  };
  const leave = (): void => {
    host.dispatchEvent(pointer('pointerleave', {}));
  };

  beforeEach(() => {
    frames = new Frames();
    vi.stubGlobal('requestAnimationFrame', frames.request);
    vi.stubGlobal('cancelAnimationFrame', frames.cancel);
    host = document.createElement('div');
    document.body.append(host);
    measure = vi.fn<() => DOMRect>(() => RECT);
    host.getBoundingClientRect = measure;
    follower = { enter: vi.fn<() => void>(), frame: vi.fn<(time: number) => void>(), leave: vi.fn<() => void>() };
    tracker = new PointerTracker(host, window, follower);
    tracker.start();
  });

  afterEach(() => {
    tracker.stop();
    host.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('measures the host and tells the follower once at enter, then one frame however many moves came in', () => {
    enter(130, 80);
    move(140, 85);
    move(150, 90);

    expect(follower.enter).toHaveBeenCalledTimes(1);
    expect(tracker.inside).toBe(true);
    expect(tracker.rect).toBe(RECT);
    expect(measure).toHaveBeenCalledTimes(1);
    expect(frames.request).toHaveBeenCalledTimes(1);
    expect(follower.frame).not.toHaveBeenCalled();

    frames.run(32);
    expect(follower.frame).toHaveBeenCalledTimes(1);
    expect(follower.frame).toHaveBeenCalledWith(32);
    expect([tracker.clientX, tracker.clientY]).toEqual([150, 90]);

    move(160, 100);
    expect(frames.request).toHaveBeenCalledTimes(2);
  });

  it('starts from a move when no enter came first', () => {
    move(130, 80);

    expect(follower.enter).toHaveBeenCalledTimes(1);
    expect(tracker.inside).toBe(true);
    expect(frames.pending).toBe(1);
  });

  it('cancels the pending frame and tells the follower at leave, with the rect gone', () => {
    enter(130, 80);
    frames.run();
    move(200, 150);

    leave();

    expect(follower.leave).toHaveBeenCalledTimes(1);
    expect(tracker.inside).toBe(false);
    expect(tracker.rect).toBeNull();
    expect(frames.cancel).toHaveBeenCalledTimes(1);
    expect(frames.pending).toBe(0);
    // The last point stays readable for a follower that fades where it was.
    expect([tracker.clientX, tracker.clientY]).toEqual([200, 150]);
  });

  it('measures again on scroll or resize while the pointer is inside, never per move, and asks for a frame', () => {
    enter(130, 80);
    move(140, 85);
    frames.run();
    move(150, 90);
    frames.run();
    expect(measure).toHaveBeenCalledTimes(1);

    const moved = { ...RECT, top: 40, bottom: 240 } as DOMRect;
    measure.mockReturnValue(moved);
    window.dispatchEvent(new Event('scroll'));
    expect(measure).toHaveBeenCalledTimes(2);
    expect(tracker.rect).toBe(moved);
    expect(frames.pending).toBe(1);
    frames.run();

    window.dispatchEvent(new Event('resize'));
    expect(measure).toHaveBeenCalledTimes(3);
    frames.run();

    leave();
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    expect(measure).toHaveBeenCalledTimes(3);
  });

  it('lets the follower ask for frames after the pointer left', () => {
    enter(130, 80);
    frames.run();
    leave();
    expect(frames.pending).toBe(0);

    tracker.schedule();
    tracker.schedule();
    expect(frames.pending).toBe(1);
    frames.run(48);
    expect(follower.frame).toHaveBeenLastCalledWith(48);
  });

  it('ignores a touch pointer', () => {
    enter(130, 80, 'touch');
    move(140, 85, 'touch');

    expect(follower.enter).not.toHaveBeenCalled();
    expect(tracker.inside).toBe(false);
    expect(frames.request).not.toHaveBeenCalled();
  });

  it('starts once however often it is asked', () => {
    tracker.start();
    enter(130, 80);

    expect(follower.enter).toHaveBeenCalledTimes(1);
    expect(frames.request).toHaveBeenCalledTimes(1);
  });

  it('stops: a pointer inside leaves, the pending frame goes, and later events do nothing', () => {
    enter(130, 80);
    frames.run();
    move(140, 85);
    expect(frames.pending).toBe(1);

    tracker.stop();

    expect(follower.leave).toHaveBeenCalledTimes(1);
    expect(tracker.inside).toBe(false);
    expect(frames.pending).toBe(0);

    enter(130, 80);
    move(140, 85);
    window.dispatchEvent(new Event('scroll'));
    expect(follower.enter).toHaveBeenCalledTimes(1);
    expect(frames.request).toHaveBeenCalledTimes(2);
    expect(measure).toHaveBeenCalledTimes(1);
  });

  it('stops clean with no pointer inside, and cancels a frame the follower asked for', () => {
    tracker.schedule();
    expect(frames.pending).toBe(1);

    tracker.stop();

    expect(follower.leave).not.toHaveBeenCalled();
    expect(frames.pending).toBe(0);
  });
});
