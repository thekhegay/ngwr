import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrFallingText } from './falling-text';
import type { WrFallingTextTrigger } from './interfaces';

@Component({
  imports: [WrFallingText],
  template: `
    <wr-falling-text [text]="text()" [highlightWords]="highlightWords()" [trigger]="trigger()" [gravity]="gravity()" />
  `,
})
class Host {
  readonly text = signal('gravity pulls every word down');
  readonly highlightWords = signal<readonly string[]>(['grav', 'word']);
  readonly trigger = signal<WrFallingTextTrigger>('auto');
  readonly gravity = signal(980);
}

/** Frames the page asked for, held rather than fired. */
let frames: FrameRequestCallback[] = [];

/** Host box the stub reports, and the size of each word inside it. */
const HOST_W = 600;
const HOST_H = 200;
const WORD_W = 100;
const WORD_H = 20;

/**
 * Everything the simulator needs that jsdom does not have.
 *
 * It measures the host and every word before it starts and bails on a zero-sized
 * box — which is every box here — so the boxes are supplied: a 600x200 host with
 * five 100x20 words spaced along the top, none of them overlapping. `Math.random`
 * is pinned at the midpoint so the words are released with no sideways velocity
 * and no spin, which makes the fall reproducible: they drop straight down, bounce,
 * and come to rest on the floor. Frames are held rather than fired, and run by
 * hand — a backgrounded jsdom does not schedule any.
 */
const withLayout = (): void => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(frame => frames.push(frame));
  const box = (x: number, y: number, w: number, h: number): DOMRect => ({
    x,
    y,
    width: w,
    height: h,
    top: y,
    left: x,
    right: x + w,
    bottom: y + h,
    toJSON: () => ({}),
  });
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element): DOMRect {
    if (this.classList.contains('wr-falling-text__word')) {
      const all = [...(this.parentElement?.querySelectorAll('.wr-falling-text__word') ?? [])];
      return box(all.indexOf(this) * (WORD_W + 10), 10, WORD_W, WORD_H);
    }
    if (this.tagName.toLowerCase() === 'wr-falling-text') return box(0, 0, HOST_W, HOST_H);
    return box(0, 0, 0, 0);
  });
};

/** Run every frame the page is currently holding, once, at `ts`. */
const runFrame = (ts: number): void => {
  const pending = frames;
  frames = [];
  for (const frame of pending) frame(ts);
};

/** Step at a steady 60 fps until the loop stops asking for a frame. Returns how many ran. */
const runUntilParked = (limit = 1200): number => {
  let n = 0;
  while (frames.length > 0 && n < limit) {
    n++;
    runFrame(n * (1000 / 60));
  }
  return n;
};

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * Unlike the other canvas effects in this cluster, the words here are real DOM
 * spans that a physics loop moves — so the TEXT is testable even though the motion
 * is not. The split and the highlight matching are the component's own logic; the
 * physics needs a browser with layout, which jsdom is not.
 *
 * The two tests at the bottom are the exception, and they buy it: `withLayout()`
 * hands the simulator the boxes and the randomness it would otherwise read off the
 * page, which makes the fall deterministic enough to say WHERE the words stopped
 * and WHETHER the loop stopped with them. They still assert nothing about how the
 * fall looked on the way down.
 */
describe('WrFallingText', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const words = (): string[] => [...root().querySelectorAll('.wr-falling-text__word')].map(el => el.textContent);
  const highlighted = (): string[] =>
    [...root().querySelectorAll('.wr-falling-text__word--hl')].map(el => el.textContent);
  const hostEl = (): HTMLElement => root().querySelector<HTMLElement>('wr-falling-text')!;
  const transforms = (): string[] =>
    [...root().querySelectorAll<HTMLElement>('.wr-falling-text__word')].map(el => el.style.transform);

  const mount = async (providers: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    frames = [];
    await mount();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('renders one span per word, so the sentence is still readable', () => {
    expect(words()).toEqual(['gravity', 'pulls', 'every', 'word', 'down']);
    expect(root().textContent.replace(/\s+/g, ' ').trim()).toBe('gravity pulls every word down');
  });

  it('highlights by prefix, not by whole word', () => {
    // `grav` matches `gravity` and `word` matches `word` — a whole-word match would
    // find only the second.
    expect(highlighted()).toEqual(['gravity', 'word']);
  });

  it('highlights nothing when no keywords are given', () => {
    fixture.componentInstance.highlightWords.set([]);
    fixture.detectChanges();

    expect(highlighted()).toEqual([]);
  });

  it('follows a change of text', () => {
    fixture.componentInstance.text.set('two words');
    fixture.detectChanges();

    expect(words()).toEqual(['two', 'words']);
  });

  it('renders nothing at all for empty text', () => {
    fixture.componentInstance.text.set('');
    fixture.detectChanges();

    expect(words()).toEqual([]);
  });

  it('renders the words on the server, without a physics loop', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(words().length).toBe(5);
  });

  it('leaves the words where they are for someone who asked for less motion', async () => {
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    expect(words().length).toBe(5);
    expect(() => fixture.destroy()).not.toThrow();
  });

  /**
   * The words settle, and the loop has to notice. `AIR_DRAG` damps velocities
   * asymptotically so they approach zero and never reach it — rest is read off the
   * transform the frame WOULD write instead, which a word lying on the floor stops
   * changing because the clamp pins it to the same `y` every frame. Unparked, the
   * integration and the O(n²) collision pass ran sixty times a second for the life
   * of the page over a block where nothing was moving.
   */
  it('parks the physics loop once the words have come to rest', async () => {
    withLayout();
    await mount();

    // Released on mount by the default `auto` trigger: the words are absolutised
    // at their typeset position and the loop is live. (The held frames are not
    // only the simulator's — Angular's zoneless scheduler asks for them too.)
    expect(transforms()[0]).toBe('translate(0px, 10px) rotate(0rad)');
    expect(frames.length).toBeGreaterThan(0);

    const ran = runUntilParked();

    expect(ran).toBeLessThan(1200);
    expect(frames).toEqual([]);

    // Parked lying on the floor, not frozen mid-fall: a word's box is 20 tall in a
    // 200 tall host, and `transform` positions its top-left corner.
    const floor = HOST_H - WORD_H;
    expect(transforms()).toEqual([
      `translate(0px, ${floor}px) rotate(0rad)`,
      `translate(110px, ${floor}px) rotate(0rad)`,
      `translate(220px, ${floor}px) rotate(0rad)`,
      `translate(330px, ${floor}px) rotate(0rad)`,
      `translate(440px, ${floor}px) rotate(0rad)`,
    ]);
  });

  it('wakes the parked loop when a word is grabbed', async () => {
    withLayout();
    await mount();
    runUntilParked();
    expect(frames).toEqual([]);

    const el = hostEl();
    // jsdom has neither `PointerEvent` nor pointer capture.
    el.setPointerCapture = (): void => void 0;
    const at = (type: string, x: number, y: number): void => {
      const e = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(e, { clientX: x, clientY: y, pointerId: 1, isPrimary: true });
      el.dispatchEvent(e);
    };

    const settled = transforms()[0];
    at('pointerdown', 50, 190);

    // The price of parking, and the regression it invites: the drag springs feed
    // velocity into the grabbed word, and a loop that stayed parked would never
    // commit any of it — the word would simply refuse to be picked up.
    expect(frames.length).toBe(1);

    at('pointermove', 300, 60);
    runFrame(20_000);

    expect(transforms()[0]).not.toBe(settled);
  });

  it('accepts every trigger without throwing in a layout-less environment', () => {
    for (const trigger of ['auto', 'scroll', 'click', 'hover'] as const) {
      fixture.componentInstance.trigger.set(trigger);
      expect(() => fixture.detectChanges(), trigger).not.toThrow();
    }
  });
});
