import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrCard } from 'ngwr/card';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SPOTLIGHT_ON, SPOTLIGHT_X, SPOTLIGHT_Y, WrSpotlight } from './spotlight';

@Component({
  imports: [WrCard, WrSpotlight],
  template: `<wr-card wrSpotlight>
    <h3>Signal Forms</h3>
    <p>Text with <a href="#">a link</a>.</p>
  </wr-card>`,
})
class Host {}

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
  /** Forget what the render scheduled: Angular's own scheduler races a frame against a task and cancels the loser. */
  reset(): void {
    this.queue.clear();
    this.request.mockClear();
    this.cancel.mockClear();
  }
  run(): void {
    const callbacks = [...this.queue.values()];
    this.queue.clear();
    callbacks.forEach(cb => cb(16));
  }
}

const pointer = (type: string, init: PointerEventInit): PointerEvent => {
  // jsdom has no PointerEvent constructor; a MouseEvent with the type set does.
  const event = new MouseEvent(type, init) as PointerEvent;
  Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'mouse' });
  return event;
};

/** Where the card sits in the viewport in every spec: the point written is relative to this. */
const RECT = { left: 100, top: 50, width: 300, height: 200 };

const position = (el: HTMLElement): [string, string] => [
  el.style.getPropertyValue(SPOTLIGHT_X),
  el.style.getPropertyValue(SPOTLIGHT_Y),
];

describe('WrSpotlight', () => {
  let frames: Frames;
  /** The host's `getBoundingClientRect`, stubbed to {@link RECT}: how often the directive measures. */
  let measure: MockInstance<() => DOMRect>;

  const render = async (providers: unknown[] = []): Promise<HTMLElement> => {
    TestBed.configureTestingModule({ providers: providers as never[] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-spotlight')!;
    measure = vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ ...RECT, right: 400, bottom: 250 } as DOMRect);
    frames.reset();
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

    expect(el.classList.contains('wr-spotlight')).toBe(true);
    expect(el.classList.contains('wr-card')).toBe(true);
    expect(el.querySelector('a')?.textContent).toBe('a link');
    expect(position(el)).toEqual(['', '']);
    expect(frames.request).not.toHaveBeenCalled();
  });

  it('writes the point once per frame, relative to the card, however many moves came in', async () => {
    const el = await render();

    enter(el, 130, 80);
    move(el, 140, 85);
    move(el, 150, 90);
    move(el, 160, 100);

    expect(frames.request).toHaveBeenCalledTimes(1);
    expect(position(el)).toEqual(['', '']);

    frames.run();
    expect(position(el)).toEqual(['60px', '50px']);

    move(el, 101, 51);
    expect(frames.request).toHaveBeenCalledTimes(2);
    frames.run();
    expect(position(el)).toEqual(['1px', '1px']);
  });

  it('turns on at enter and off at leave, and leaves the light where it was', async () => {
    const el = await render();

    enter(el, 130, 80);
    expect(el.classList.contains(SPOTLIGHT_ON)).toBe(true);
    frames.run();

    move(el, 200, 150);
    leave(el);

    expect(el.classList.contains(SPOTLIGHT_ON)).toBe(false);
    // The move's frame is cancelled; the last written point stays for the fade.
    expect(frames.cancel).toHaveBeenCalledTimes(1);
    expect(frames.pending).toBe(0);
    expect(position(el)).toEqual(['30px', '30px']);
  });

  it('starts from a move when no enter came first', async () => {
    const el = await render();

    move(el, 130, 80);

    expect(el.classList.contains(SPOTLIGHT_ON)).toBe(true);
    frames.run();
    expect(position(el)).toEqual(['30px', '30px']);
  });

  it('measures the card at enter, and again on scroll or resize while the pointer is inside, never per move', async () => {
    const el = await render();

    enter(el, 130, 80);
    move(el, 140, 85);
    frames.run();
    move(el, 150, 90);
    frames.run();
    expect(measure).toHaveBeenCalledTimes(1);

    // The page scrolled 10px under a still pointer: the light moves with the card.
    measure.mockReturnValue({ ...RECT, top: 40, right: 400, bottom: 240 } as DOMRect);
    window.dispatchEvent(new Event('scroll'));
    expect(measure).toHaveBeenCalledTimes(2);
    expect(frames.pending).toBe(1);
    frames.run();
    expect(position(el)).toEqual(['50px', '50px']);

    window.dispatchEvent(new Event('resize'));
    expect(measure).toHaveBeenCalledTimes(3);
    frames.run();

    leave(el);
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    expect(measure).toHaveBeenCalledTimes(3);
  });

  it('ignores a touch pointer', async () => {
    const el = await render();

    enter(el, 130, 80, 'touch');
    move(el, 140, 85, 'touch');

    expect(el.classList.contains(SPOTLIGHT_ON)).toBe(false);
    expect(frames.request).not.toHaveBeenCalled();
    expect(position(el)).toEqual(['', '']);
  });

  it('leaves keyboard focus to the stylesheet: focus inside the card writes no point and no state', async () => {
    const el = await render();

    el.querySelector<HTMLElement>('a')!.focus();
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(el.classList.contains(SPOTLIGHT_ON)).toBe(false);
    expect(position(el)).toEqual(['', '']);
    expect(frames.request).not.toHaveBeenCalled();
  });

  it('follows the pointer under reduced motion all the same: the stylesheet drops only the fade', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(prefers-reduced-motion: reduce)' }))
    );
    const el = await render();

    enter(el, 130, 80);
    frames.run();

    expect(el.classList.contains(SPOTLIGHT_ON)).toBe(true);
    expect(position(el)).toEqual(['30px', '30px']);
  });

  it('does nothing under forced colours', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(forced-colors: active)' }))
    );
    const el = await render();

    enter(el, 130, 80);
    move(el, 140, 85);

    expect(el.classList.contains(SPOTLIGHT_ON)).toBe(false);
    expect(frames.request).not.toHaveBeenCalled();
  });

  it('does nothing on the server', async () => {
    const el = await render([{ provide: PLATFORM_ID, useValue: 'server' }]);

    enter(el, 130, 80);

    expect(el.classList.contains(SPOTLIGHT_ON)).toBe(false);
    expect(frames.request).not.toHaveBeenCalled();
  });

  it('drops its listeners, state and properties on destroy', async () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-spotlight')!;
    measure = vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ ...RECT, right: 400, bottom: 250 } as DOMRect);
    frames.reset();

    enter(el, 130, 80);
    frames.run();
    move(el, 140, 85);
    expect(frames.pending).toBe(1);

    fixture.destroy();

    expect(el.classList.contains(SPOTLIGHT_ON)).toBe(false);
    expect(frames.pending).toBe(0);
    expect(position(el)).toEqual(['', '']);

    enter(el, 130, 80);
    move(el, 140, 85);
    window.dispatchEvent(new Event('scroll'));
    expect(el.classList.contains(SPOTLIGHT_ON)).toBe(false);
    expect(frames.request).toHaveBeenCalledTimes(2);
    expect(measure).toHaveBeenCalledTimes(1);
  });
});
