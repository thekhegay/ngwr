import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TILT_MAX_ANGLE, TILT_PERSPECTIVE, Tilt, tiltAngles, tiltRate, tiltTransform } from './tilt';

@Component({
  imports: [Tilt],
  template: `<a class="ngwr-link-card" href="#" ngwrTilt>
    <span class="ngwr-link-card__title">Forms guide</span>
    <span class="ngwr-link-card__desc">Signal Forms, end to end.</span>
  </a>`,
})
class Host {}

/** `requestAnimationFrame` by hand: frames run when the spec says, with a clock that moves 16ms a frame. */
class Frames {
  private readonly queue = new Map<number, FrameRequestCallback>();
  private id = 0;
  private now = 0;
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
  /** Forget what the render scheduled: Angular's own scheduler races a frame against a task and cancels the loser. */
  reset(): void {
    this.queue.clear();
    this.request.mockClear();
    this.cancel.mockClear();
  }
  run(step = 16): void {
    this.now += step;
    const callbacks = [...this.queue.values()];
    this.queue.clear();
    callbacks.forEach(cb => cb(this.now));
  }
  /** Frames until nothing asks for another; fails rather than spins if the loop never settles. */
  settle(): number {
    let count = 0;
    while (this.pending > 0) {
      if (++count > 200) throw new Error('the frame loop did not settle');
      this.run();
    }
    return count;
  }
}

const pointer = (type: string, init: PointerEventInit): PointerEvent => {
  // jsdom has no PointerEvent constructor; a MouseEvent with the type set does.
  const event = new MouseEvent(type, init) as PointerEvent;
  Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'mouse' });
  return event;
};

/** Where the card sits in the viewport in every spec. */
const RECT = { left: 100, top: 50, width: 300, height: 200 };
const CENTRE = { x: 250, y: 150 };

/** The angles the inline `transform` carries, or `null` when there is none. */
const angles = (el: HTMLElement): { x: number; y: number } | null => {
  const transform = el.style.getPropertyValue('transform');
  if (transform === '') return null;
  const match = /^perspective\((\d+)px\) rotateX\((-?[\d.]+)deg\) rotateY\((-?[\d.]+)deg\)$/.exec(transform);
  if (!match) throw new Error(`unexpected transform: ${transform}`);
  expect(Number(match[1])).toBe(TILT_PERSPECTIVE);
  return { x: Number(match[2]), y: Number(match[3]) };
};

describe('tiltAngles', () => {
  it('gives the full angle at the corners, with the near edge dipping away', () => {
    // Top left: the top edge goes back (positive rotateX), the left edge goes back (negative rotateY).
    expect(tiltAngles(RECT.left, RECT.top, RECT)).toEqual({ x: TILT_MAX_ANGLE, y: -TILT_MAX_ANGLE });
    // Bottom right: the bottom edge goes back, the right edge goes back.
    expect(tiltAngles(RECT.left + RECT.width, RECT.top + RECT.height, RECT)).toEqual({
      x: -TILT_MAX_ANGLE,
      y: TILT_MAX_ANGLE,
    });
  });

  it('gives zero at the centre and half way along an edge on the other axis', () => {
    expect(tiltAngles(CENTRE.x, CENTRE.y, RECT)).toEqual({ x: 0, y: 0 });
    expect(tiltAngles(CENTRE.x, RECT.top, RECT)).toEqual({ x: TILT_MAX_ANGLE, y: 0 });
    expect(tiltAngles(RECT.left, CENTRE.y, RECT)).toEqual({ x: 0, y: -TILT_MAX_ANGLE });
  });

  it('scales with the distance from the centre, up to the angle asked for', () => {
    expect(tiltAngles(CENTRE.x + RECT.width / 4, CENTRE.y - RECT.height / 4, RECT, 6)).toEqual({ x: 3, y: 3 });
  });

  it('clamps a point past an edge, and gives zero for a card with no size', () => {
    expect(tiltAngles(RECT.left - 50, RECT.top + RECT.height + 50, RECT)).toEqual({
      x: -TILT_MAX_ANGLE,
      y: -TILT_MAX_ANGLE,
    });
    expect(tiltAngles(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe('tiltRate', () => {
  it('closes a part of the gap that grows with the frame time, and never the whole of it', () => {
    expect(tiltRate(16)).toBeCloseTo(0.148, 3);
    expect(tiltRate(100)).toBeCloseTo(0.632, 3);
    expect(tiltRate(16)).toBeLessThan(tiltRate(32));
    expect(tiltRate(0)).toBe(0);
    // A throttled tab's one huge frame steps as a 100ms one.
    expect(tiltRate(5000)).toBe(tiltRate(100));
    expect(tiltRate(-16)).toBe(0);
  });
});

describe('tiltTransform', () => {
  it('writes the perspective and both angles to two decimals', () => {
    expect(tiltTransform(1.23456, -0.5)).toBe(`perspective(${TILT_PERSPECTIVE}px) rotateX(1.23deg) rotateY(-0.50deg)`);
    expect(tiltTransform(0, 0)).toBe(`perspective(${TILT_PERSPECTIVE}px) rotateX(0.00deg) rotateY(0.00deg)`);
  });
});

describe('Tilt', () => {
  let frames: Frames;
  let measure: MockInstance<() => DOMRect>;

  const attach = (el: HTMLElement): void => {
    measure = vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ ...RECT, right: 400, bottom: 250 } as DOMRect);
    frames.reset();
  };

  const render = async (providers: unknown[] = []): Promise<HTMLElement> => {
    TestBed.configureTestingModule({ providers: providers as never[] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.ngwr-tilt')!;
    attach(el);
    return el;
  };

  const enter = (el: HTMLElement, clientX: number, clientY: number, pointerType = 'mouse'): void => {
    el.dispatchEvent(pointer('pointerenter', { clientX, clientY, pointerType }));
  };
  const move = (el: HTMLElement, clientX: number, clientY: number, pointerType = 'mouse'): void => {
    el.dispatchEvent(pointer('pointermove', { clientX, clientY, pointerType }));
  };
  const leave = (el: HTMLElement): void => {
    el.dispatchEvent(pointer('pointerleave', {}));
  };

  beforeEach(() => {
    frames = new Frames();
    vi.stubGlobal('requestAnimationFrame', frames.request);
    vi.stubGlobal('cancelAnimationFrame', frames.cancel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('adds nothing to the card but its class, and writes nothing until a pointer comes', async () => {
    const el = await render();

    expect(el.classList.contains('ngwr-tilt')).toBe(true);
    expect(el.classList.contains('ngwr-link-card')).toBe(true);
    expect(el.getAttribute('style')).toBeNull();
    expect(frames.request).not.toHaveBeenCalled();
  });

  it('writes one transform per frame however many moves came in, easing toward the point', async () => {
    const el = await render();
    const writes = vi.spyOn(el.style, 'setProperty');

    enter(el, CENTRE.x, 60);
    move(el, CENTRE.x, 55);
    move(el, CENTRE.x, RECT.top);

    expect(frames.request).toHaveBeenCalledTimes(1);
    expect(angles(el)).toBeNull();
    expect(el.style.getPropertyValue('will-change')).toBe('transform');

    frames.run();
    const first = angles(el)!;
    expect(writes.mock.calls.filter(([name]) => name === 'transform')).toHaveLength(1);
    // One step of the ease toward the top edge's full angle, not the angle itself.
    expect(first.x).toBeCloseTo(TILT_MAX_ANGLE * tiltRate(16), 2);
    expect(first.y).toBe(0);

    // The loop goes on by itself until the angle is there, then stops.
    const count = frames.settle();
    expect(count).toBeGreaterThan(5);
    expect(angles(el)).toEqual({ x: TILT_MAX_ANGLE, y: 0 });
    expect(writes.mock.calls.filter(([name]) => name === 'transform')).toHaveLength(count + 1);
    expect(frames.pending).toBe(0);
  });

  it('never leans past the limit, and lands on the exact angle', async () => {
    const el = await render();

    enter(el, RECT.left + RECT.width, RECT.top + RECT.height);
    let peak = 0;
    while (frames.pending > 0) {
      frames.run();
      const now = angles(el)!;
      peak = Math.max(peak, Math.abs(now.x), Math.abs(now.y));
    }

    expect(peak).toBeLessThanOrEqual(TILT_MAX_ANGLE);
    expect(angles(el)).toEqual({ x: -TILT_MAX_ANGLE, y: TILT_MAX_ANGLE });
  });

  it('follows a moving pointer from wherever the angle is, and a still one costs no frames', async () => {
    const el = await render();

    enter(el, RECT.left, CENTRE.y);
    frames.settle();
    expect(angles(el)).toEqual({ x: 0, y: -TILT_MAX_ANGLE });
    expect(frames.pending).toBe(0);

    move(el, RECT.left + RECT.width, CENTRE.y);
    frames.run();
    const step = angles(el)!;
    expect(step.y).toBeGreaterThan(-TILT_MAX_ANGLE);
    expect(step.y).toBeLessThan(0);
    frames.settle();
    expect(angles(el)).toEqual({ x: 0, y: TILT_MAX_ANGLE });
  });

  it('eases back to flat on leave and ends with no inline transform and no will-change', async () => {
    const el = await render();

    enter(el, RECT.left, RECT.top);
    frames.settle();
    expect(angles(el)).toEqual({ x: TILT_MAX_ANGLE, y: -TILT_MAX_ANGLE });

    leave(el);
    // The ease back needs frames of its own, after the pointer's frame is gone.
    expect(frames.pending).toBe(1);
    frames.run();
    const back = angles(el)!;
    expect(back.x).toBeLessThan(TILT_MAX_ANGLE);
    expect(back.x).toBeGreaterThan(0);
    expect(el.style.getPropertyValue('will-change')).toBe('transform');

    frames.settle();
    expect(angles(el)).toBeNull();
    expect(el.style.getPropertyValue('will-change')).toBe('');
    expect(el.getAttribute('style')).toBe('');
    expect(frames.pending).toBe(0);
  });

  it('keeps easing when the pointer comes back before the card is flat', async () => {
    const el = await render();

    enter(el, RECT.left, RECT.top);
    frames.settle();
    leave(el);
    frames.run();
    frames.run();
    const midway = angles(el)!;

    enter(el, RECT.left, RECT.top);
    frames.run();
    expect(angles(el)!.x).toBeGreaterThan(midway.x);
    frames.settle();
    expect(angles(el)).toEqual({ x: TILT_MAX_ANGLE, y: -TILT_MAX_ANGLE });
  });

  it('measures the card at enter, and again on scroll while the pointer is inside', async () => {
    const el = await render();

    enter(el, CENTRE.x, CENTRE.y);
    frames.settle();
    expect(measure).toHaveBeenCalledTimes(1);
    expect(angles(el)).toEqual({ x: 0, y: 0 });

    // The page scrolled the card up by half its height under a still pointer: the pointer is now at its bottom edge.
    measure.mockReturnValue({ ...RECT, top: -50, right: 400, bottom: 150 } as DOMRect);
    window.dispatchEvent(new Event('scroll'));
    expect(measure).toHaveBeenCalledTimes(2);
    frames.settle();
    expect(angles(el)).toEqual({ x: -TILT_MAX_ANGLE, y: 0 });
  });

  it('ignores a touch pointer', async () => {
    const el = await render();

    enter(el, RECT.left, RECT.top, 'touch');
    move(el, RECT.left, RECT.top, 'touch');

    expect(frames.request).not.toHaveBeenCalled();
    expect(el.getAttribute('style')).toBeNull();
  });

  it('ignores keyboard focus: the focus ring is the hint', async () => {
    const el = await render();

    el.focus();
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    el.dispatchEvent(new FocusEvent('focus'));

    expect(frames.request).not.toHaveBeenCalled();
    expect(el.getAttribute('style')).toBeNull();
  });

  it('does nothing under reduced motion', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(prefers-reduced-motion: reduce)' }))
    );
    const el = await render();

    enter(el, RECT.left, RECT.top);
    move(el, RECT.left, RECT.top);

    expect(frames.request).not.toHaveBeenCalled();
    expect(el.getAttribute('style')).toBeNull();
  });

  it('does nothing under forced colours', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(forced-colors: active)' }))
    );
    const el = await render();

    enter(el, RECT.left, RECT.top);

    expect(frames.request).not.toHaveBeenCalled();
    expect(el.getAttribute('style')).toBeNull();
  });

  it('does nothing on the server', async () => {
    const el = await render([{ provide: PLATFORM_ID, useValue: 'server' }]);

    enter(el, RECT.left, RECT.top);

    expect(frames.request).not.toHaveBeenCalled();
    expect(el.getAttribute('style')).toBeNull();
  });

  it('drops its listeners, inline styles and frames on destroy, mid-lean', async () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.ngwr-tilt')!;
    attach(el);

    enter(el, RECT.left, RECT.top);
    frames.run();
    expect(angles(el)).not.toBeNull();
    expect(frames.pending).toBe(1);

    fixture.destroy();

    expect(angles(el)).toBeNull();
    expect(el.style.getPropertyValue('will-change')).toBe('');
    expect(frames.pending).toBe(0);

    const requests = frames.request.mock.calls.length;
    enter(el, RECT.left, RECT.top);
    move(el, RECT.left, RECT.top);
    window.dispatchEvent(new Event('scroll'));
    expect(frames.request).toHaveBeenCalledTimes(requests);
    expect(measure).toHaveBeenCalledTimes(1);
    expect(el.getAttribute('style')).toBe('');
  });
});
