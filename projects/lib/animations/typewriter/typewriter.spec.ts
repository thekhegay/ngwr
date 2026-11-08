import { Component, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WrTypewriterTrigger } from './types';
import {
  TYPEWRITER_BLINK,
  TYPEWRITER_BOOT_BLINKS,
  TYPEWRITER_BREATH,
  TYPEWRITER_DELETE_MAX,
  TYPEWRITER_DELETE_MIN,
  TYPEWRITER_END_BLINKS,
  TYPEWRITER_FADE,
  TYPEWRITER_HOLD,
  TYPEWRITER_PUNCT_BEAT,
  TYPEWRITER_SPACE_BEAT,
  TYPEWRITER_TYPE_MAX,
  TYPEWRITER_TYPE_MIN,
  WrTypewriter,
  typewriterDeleting,
  typewriterTyping,
} from './typewriter';

@Component({
  imports: [WrTypewriter],
  template: `<p>
    <wr-typewriter [lines]="lines()" [loop]="loop()" [hold]="hold()" [delay]="delay()" [trigger]="trigger()" />
  </p>`,
})
class Host {
  readonly lines = signal<readonly string[]>(['Checks that keep an Angular library true.']);
  readonly loop = signal(false);
  readonly hold = signal(TYPEWRITER_HOLD);
  readonly delay = signal(0);
  readonly trigger = signal<WrTypewriterTrigger>('view');
}

/** A host rect well under the fold of jsdom's 768px viewport, and one inside it. */
const BELOW = { top: 1000, bottom: 1040 } as DOMRectReadOnly;
const INSIDE = { top: 100, bottom: 140 } as DOMRectReadOnly;

class StubIntersectionObserver {
  static instances: StubIntersectionObserver[] = [];
  readonly disconnect = vi.fn();
  readonly observe = vi.fn();
  constructor(
    private readonly callback: IntersectionObserverCallback,
    public readonly options?: IntersectionObserverInit
  ) {
    StubIntersectionObserver.instances.push(this);
  }
  fire(isIntersecting: boolean, boundingClientRect: DOMRectReadOnly = BELOW): void {
    const entry = { isIntersecting, boundingClientRect } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

interface PlatformStub {
  readonly prefersReducedMotion: WritableSignal<boolean>;
  readonly pageVisible: WritableSignal<boolean>;
}

const stub = (reduced = false): PlatformStub => ({ prefersReducedMotion: signal(reduced), pageVisible: signal(true) });

const platform = (value: PlatformStub): unknown => ({ provide: WrPlatform, useValue: value });

const FIRST = 'Checks that keep an Angular library true.';
const SECOND = 'Zoneless.';
const BOX = '.wr-typewriter__box';
const SR = '.wr-typewriter__sr';
const GHOST = '.wr-typewriter__ghost';
const TYPED = '.wr-typewriter__typed';
const REST = '.wr-typewriter__rest';

const sum = (waits: readonly number[]): number => waits.reduce((total, wait) => total + wait, 0);

/** How long typing `line` takes from its first character to its last: every wait but the first, which the component replaces. */
const typing = (line: string): number => sum(typewriterTyping(line).slice(1));

const deleting = (line: string): number => sum(typewriterDeleting(line));

describe('WrTypewriter', () => {
  const render = async (
    providers: unknown[] = [platform(stub())],
    setup?: (host: Host) => void
  ): Promise<ReturnType<typeof TestBed.createComponent<Host>>> => {
    TestBed.configureTestingModule({ providers: providers as never[] });
    const fixture = TestBed.createComponent(Host);
    setup?.(fixture.componentInstance);
    fixture.detectChanges();
    await fixture.whenStable();
    // Fake only now: the initial render and `whenStable` run on the real clock.
    vi.useFakeTimers();
    return fixture;
  };

  const target = (fixture: { nativeElement: HTMLElement }): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>('wr-typewriter')!;

  const text = (el: HTMLElement, selector: string): string => el.querySelector(selector)?.textContent ?? '';

  const ghosts = (el: HTMLElement): string[] =>
    Array.from(el.querySelectorAll<HTMLElement>(GHOST)).map(ghost => ghost.textContent ?? '');

  const caret = (el: HTMLElement): boolean => el.classList.contains('wr-typewriter--caret');
  const busy = (el: HTMLElement): boolean => el.classList.contains('wr-typewriter--busy');
  const out = (el: HTMLElement): boolean => el.classList.contains('wr-typewriter--out');

  /** `view` mode makes two observers, the armer first; `load` mode only the viewer. */
  const armer = (): StubIntersectionObserver => StubIntersectionObserver.instances[0];
  const viewer = (): StubIntersectionObserver =>
    StubIntersectionObserver.instances[StubIntersectionObserver.instances.length - 1];

  const near = (fixture: { detectChanges(): void }, rect: DOMRectReadOnly = BELOW): void => {
    armer().fire(true, rect);
    fixture.detectChanges();
  };

  const view = (fixture: { detectChanges(): void }, intersecting: boolean): void => {
    viewer().fire(intersecting);
    fixture.detectChanges();
  };

  /** The clock runs `ms`, then the DOM catches up. */
  const tick = (fixture: { detectChanges(): void }, ms: number): void => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };

  /** Armed under the fold, then scrolled into view: the usual way in. */
  const start = (fixture: { detectChanges(): void }): void => {
    near(fixture);
    view(fixture, true);
  };

  beforeEach(() => {
    StubIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  describe('rhythm', () => {
    it('types a character in 35 to 55 ms, with a longer beat after a space and after punctuation', () => {
      const waits = typewriterTyping('Hi, you. ok');
      expect(waits).toHaveLength('Hi, you. ok'.length);
      waits.forEach((wait, i) => {
        const previous = 'Hi, you. ok'[i - 1];
        const beat =
          previous === ' ' ? TYPEWRITER_SPACE_BEAT : previous === ',' || previous === '.' ? TYPEWRITER_PUNCT_BEAT : 0;
        expect(wait).toBeGreaterThanOrEqual(TYPEWRITER_TYPE_MIN + beat);
        expect(wait).toBeLessThanOrEqual(TYPEWRITER_TYPE_MAX + beat);
      });
      // The beat after a mark outweighs the variation: ", " and ". " read as pauses.
      expect(waits[3]).toBeGreaterThan(waits[1] + 100);
      expect(waits[4]).toBeGreaterThan(waits[1]);
    });

    it('deletes about twice as fast as it types, with no beats', () => {
      const waits = typewriterDeleting('Hi, you. ok');
      expect(waits).toHaveLength('Hi, you. ok'.length);
      for (const wait of waits) {
        expect(wait).toBeGreaterThanOrEqual(TYPEWRITER_DELETE_MIN);
        expect(wait).toBeLessThanOrEqual(TYPEWRITER_DELETE_MAX);
      }
      expect(sum(waits) * 2).toBeLessThanOrEqual(sum(typewriterTyping('Hi, you. ok')) + 1);
    });

    it('varies from character to character, the same way every time for one text and another way for another', () => {
      const waits = typewriterTyping('abcdefghijklmnop');
      expect(new Set(waits).size).toBeGreaterThan(3);
      expect(typewriterTyping('abcdefghijklmnop')).toEqual(waits);
      expect(typewriterTyping('abcdefghijklmnoq')).not.toEqual(waits);
    });

    it('counts graphemes, so an emoji is one keystroke', () => {
      expect(typewriterTyping('👋🏽 hi')).toHaveLength(4);
      expect(typewriterDeleting('👋🏽 hi')).toHaveLength(4);
    });
  });

  it('shows the first line whole in a hidden box, with no caret, and every line once for a screen reader', async () => {
    const fixture = await render(undefined, host => host.lines.set([FIRST, SECOND]));
    const el = target(fixture);

    expect(el.querySelector(BOX)?.getAttribute('aria-hidden')).toBe('true');
    expect(text(el, TYPED)).toBe(FIRST);
    expect(text(el, REST)).toBe('');
    expect(caret(el)).toBe(false);
    const sr = el.querySelector<HTMLElement>(SR)!;
    expect(sr.textContent).toBe(`${FIRST} ${SECOND}`);
    expect(sr.getAttribute('aria-hidden')).toBeNull();
    // What is left for a reader once the hidden box is out: the paragraph with every line in it.
    const paragraph = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('p')!
      .cloneNode(true) as HTMLElement;
    paragraph.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove());
    expect(paragraph.textContent?.replace(/\s+/g, ' ').trim()).toBe(`${FIRST} ${SECOND}`);
  });

  it('renders the same first line on the server and watches nothing', async () => {
    const fixture = await render([{ provide: PLATFORM_ID, useValue: 'server' }], host =>
      host.lines.set([FIRST, SECOND])
    );
    const el = target(fixture);

    expect(text(el, TYPED)).toBe(FIRST);
    expect(text(el, REST)).toBe('');
    expect(caret(el)).toBe(false);
    expect(ghosts(el)).toEqual([SECOND]);
    expect(text(el, SR)).toBe(`${FIRST} ${SECOND}`);
    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps every other line laid out in the same cell, so the box is the longest line from the start', async () => {
    const fixture = await render(undefined, host => host.lines.set([SECOND, FIRST, 'Signals.']));
    const el = target(fixture);

    expect(ghosts(el)).toEqual([FIRST, 'Signals.']);
    start(fixture);
    expect(ghosts(el)).toEqual([FIRST, 'Signals.']);

    // On to the second line: the first joins the ghosts and the longest still stands among them.
    tick(fixture, typing(SECOND) + TYPEWRITER_HOLD + deleting(SECOND));
    expect(text(el, TYPED)).toBe('');
    expect(text(el, REST)).toBe(FIRST);
    expect(ghosts(el)).toEqual([SECOND, 'Signals.']);
  });

  it('watches a band under the viewport and most of the host, and hides the text only once the host is near', async () => {
    const fixture = await render();
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(2);
    expect(armer().options?.rootMargin).toMatch(/^0px 0px \d+% 0px$/);
    expect(armer().options?.threshold).toBe(0);
    expect(viewer().options?.threshold).toBeGreaterThanOrEqual(0.5);
    expect(armer().observe).toHaveBeenCalledWith(el);
    expect(viewer().observe).toHaveBeenCalledWith(el);

    // Far below: nothing changes, however long.
    armer().fire(false);
    fixture.detectChanges();
    tick(fixture, 5000);
    expect(text(el, TYPED)).toBe(FIRST);
    expect(caret(el)).toBe(false);

    // In the band, under the fold: the text goes while nobody sees it, and the armer has done its job.
    near(fixture);
    expect(text(el, TYPED)).toBe('');
    expect(text(el, REST)).toBe(FIRST);
    expect(caret(el)).toBe(true);
    expect(armer().disconnect).toHaveBeenCalled();

    // Not in view yet: nothing types.
    tick(fixture, 5000);
    expect(text(el, TYPED)).toBe('');
  });

  it('never erases a host that is already in view when it boots: it stands whole, the caret blinks twice and goes', async () => {
    const fixture = await render(undefined, host => host.lines.set([FIRST, SECOND]));
    const el = target(fixture);

    near(fixture, INSIDE);
    view(fixture, true);
    expect(text(el, TYPED)).toBe(FIRST);
    expect(caret(el)).toBe(true);
    expect(busy(el)).toBe(false);

    tick(fixture, TYPEWRITER_BOOT_BLINKS * TYPEWRITER_BLINK - 1);
    expect(caret(el)).toBe(true);
    expect(out(el)).toBe(false);
    tick(fixture, 1);
    expect(out(el)).toBe(true);
    tick(fixture, TYPEWRITER_FADE);
    expect(caret(el)).toBe(false);
    expect(out(el)).toBe(false);
    expect(text(el, TYPED)).toBe(FIRST);
    expect(ghosts(el)).toEqual([SECOND]);

    // Nor does it type later.
    tick(fixture, 10_000);
    expect(text(el, TYPED)).toBe(FIRST);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('types the characters in order, one per beat, to the rhythm of the text', async () => {
    const fixture = await render();
    const el = target(fixture);
    const waits = typewriterTyping(FIRST);
    start(fixture);

    // The first character comes at once with no delay; the rest each after their own wait.
    tick(fixture, 0);
    expect(text(el, TYPED)).toBe('C');
    expect(busy(el)).toBe(true);
    for (let i = 1; i < waits.length; i++) {
      tick(fixture, waits[i] - 1);
      expect(text(el, TYPED)).toBe(FIRST.slice(0, i));
      tick(fixture, 1);
      expect(text(el, TYPED)).toBe(FIRST.slice(0, i + 1));
    }
    expect(text(el, REST)).toBe('');
  });

  it('spends the delay once, before the first character', async () => {
    const fixture = await render(undefined, host => host.delay.set(300));
    const el = target(fixture);
    start(fixture);

    tick(fixture, 299);
    expect(text(el, TYPED)).toBe('');
    tick(fixture, 1);
    expect(text(el, TYPED)).toBe('C');
  });

  it('stops on the last line without `loop`: the caret blinks a few times, fades, and nothing is left running', async () => {
    const fixture = await render();
    const el = target(fixture);
    start(fixture);

    tick(fixture, typing(FIRST));
    expect(text(el, TYPED)).toBe(FIRST);
    expect(caret(el)).toBe(true);
    expect(busy(el)).toBe(false);

    tick(fixture, TYPEWRITER_END_BLINKS * TYPEWRITER_BLINK - 1);
    expect(out(el)).toBe(false);
    tick(fixture, 1);
    expect(out(el)).toBe(true);
    tick(fixture, TYPEWRITER_FADE);
    expect(caret(el)).toBe(false);
    expect(text(el, TYPED)).toBe(FIRST);
    expect(vi.getTimerCount()).toBe(0);

    // Nor does leaving and coming back start it over.
    view(fixture, false);
    view(fixture, true);
    tick(fixture, 10_000);
    expect(text(el, TYPED)).toBe(FIRST);
    expect(caret(el)).toBe(false);
  });

  it('holds a finished line, deletes it faster than it typed, breathes, and types the next', async () => {
    const fixture = await render(undefined, host => host.lines.set([SECOND, FIRST]));
    const el = target(fixture);
    start(fixture);

    tick(fixture, typing(SECOND));
    expect(text(el, TYPED)).toBe(SECOND);
    expect(busy(el)).toBe(false);

    tick(fixture, TYPEWRITER_HOLD - 1);
    expect(text(el, TYPED)).toBe(SECOND);
    const back = typewriterDeleting(SECOND);
    tick(fixture, 1 + back[back.length - 1]);
    expect(text(el, TYPED)).toBe(SECOND.slice(0, -1));
    expect(busy(el)).toBe(true);
    expect(deleting(SECOND) * 2).toBeLessThanOrEqual(sum(typewriterTyping(SECOND)) + 1);

    tick(fixture, deleting(SECOND) - back[back.length - 1]);
    expect(text(el, TYPED)).toBe('');
    expect(text(el, REST)).toBe(FIRST);
    expect(ghosts(el)).toEqual([SECOND]);

    tick(fixture, TYPEWRITER_BREATH - 1);
    expect(text(el, TYPED)).toBe('');
    tick(fixture, 1);
    expect(text(el, TYPED)).toBe('C');

    tick(fixture, typing(FIRST));
    expect(text(el, TYPED)).toBe(FIRST);
    tick(fixture, TYPEWRITER_END_BLINKS * TYPEWRITER_BLINK + TYPEWRITER_FADE);
    expect(caret(el)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps cycling with `loop`', async () => {
    const fixture = await render(undefined, host => {
      host.lines.set([SECOND, FIRST]);
      host.loop.set(true);
    });
    const el = target(fixture);
    start(fixture);

    const round = (line: string): number => typing(line) + TYPEWRITER_HOLD + deleting(line) + TYPEWRITER_BREATH;
    tick(fixture, round(SECOND));
    expect(text(el, TYPED)).toBe('C');
    tick(fixture, round(FIRST));
    expect(text(el, TYPED)).toBe('Z');
    tick(fixture, round(SECOND));
    expect(text(el, TYPED)).toBe('C');
    expect(caret(el)).toBe(true);
  });

  it('takes its own hold', async () => {
    const fixture = await render(undefined, host => {
      host.lines.set([SECOND, FIRST]);
      host.hold.set(500);
    });
    const el = target(fixture);
    start(fixture);

    tick(fixture, typing(SECOND) + 499);
    expect(busy(el)).toBe(false);
    tick(fixture, 1 + TYPEWRITER_DELETE_MAX);
    expect(text(el, TYPED)).toBe(SECOND.slice(0, -1));
  });

  it('pauses off screen and while the document is hidden, and goes on from the same character', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    const el = target(fixture);
    const waits = typewriterTyping(FIRST);
    start(fixture);
    tick(fixture, sum(waits.slice(1, 6)));
    expect(text(el, TYPED)).toBe(FIRST.slice(0, 6));

    view(fixture, false);
    tick(fixture, 10_000);
    expect(text(el, TYPED)).toBe(FIRST.slice(0, 6));
    expect(busy(el)).toBe(true);

    view(fixture, true);
    page.pageVisible.set(false);
    fixture.detectChanges();
    tick(fixture, 10_000);
    expect(text(el, TYPED)).toBe(FIRST.slice(0, 6));

    page.pageVisible.set(true);
    fixture.detectChanges();
    tick(fixture, waits[6]);
    expect(text(el, TYPED)).toBe(FIRST.slice(0, 7));
  });

  it('stands whole with no caret under reduced motion, and finishes the line when motion is reduced while it types', async () => {
    const reduced = await render([platform(stub(true))]);
    expect(StubIntersectionObserver.instances).toHaveLength(0);
    tick(reduced, 10_000);
    expect(text(target(reduced), TYPED)).toBe(FIRST);
    expect(caret(target(reduced))).toBe(false);
    TestBed.resetTestingModule();
    vi.useRealTimers();

    const page = stub();
    const fixture = await render([platform(page)]);
    const el = target(fixture);
    start(fixture);
    tick(fixture, typing(FIRST) / 2);
    expect(text(el, TYPED)).not.toBe(FIRST);

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();
    expect(text(el, TYPED)).toBe(FIRST);
    expect(text(el, REST)).toBe('');
    expect(caret(el)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does nothing without IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const fixture = await render();
    const el = target(fixture);

    tick(fixture, 10_000);
    expect(text(el, TYPED)).toBe(FIRST);
    expect(caret(el)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('arms at once with `trigger="load"`, in view or not, and types once most of the host is in view', async () => {
    const fixture = await render(undefined, host => host.trigger.set('load'));
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(1);
    expect(text(el, TYPED)).toBe('');
    expect(text(el, REST)).toBe(FIRST);
    expect(caret(el)).toBe(true);

    tick(fixture, 5000);
    expect(text(el, TYPED)).toBe('');

    view(fixture, true);
    tick(fixture, typing(FIRST));
    expect(text(el, TYPED)).toBe(FIRST);
  });

  it('stops observing and drops its timer on destroy', async () => {
    const fixture = await render();
    const el = target(fixture);
    const [first, second] = StubIntersectionObserver.instances;
    start(fixture);
    tick(fixture, typing(FIRST) / 2);

    fixture.destroy();

    expect(first.disconnect).toHaveBeenCalled();
    expect(second.disconnect).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    const typed = text(el, TYPED);
    expect(() => vi.advanceTimersByTime(10_000)).not.toThrow();
    expect(text(el, TYPED)).toBe(typed);
  });
});
