import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DECODE_GAP,
  DECODE_GLYPH_MS,
  DECODE_HOLD,
  DECODE_SETTLE,
  Decode,
  type DecodeTrigger,
  decodeShape,
} from './decode';

@Component({
  imports: [Decode],
  template: `<span ngwrDecode [trigger]="trigger()" [delay]="delay()" [glyphs]="glyphs()">Ab 9, {{ where() }}</span>`,
})
class Host {
  readonly trigger = signal<DecodeTrigger>('view');
  readonly delay = signal(0);
  readonly glyphs = signal<string | null>(null);
  readonly where = signal('x');
}

@Component({
  imports: [Decode],
  template: `<button type="button"><span ngwrDecode trigger="hover">Go</span></button>`,
})
class HoverHost {}

@Component({
  imports: [Decode],
  template: `<p ngwrDecode>{{ text }}</p>`,
})
class LongHost {
  readonly text = 'a'.repeat(61);
}

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
  fire(isIntersecting: boolean): void {
    const entry = { isIntersecting } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

/** Frames run only when the spec says so, at the time it says. */
class Frames {
  private readonly queue = new Map<number, FrameRequestCallback>();
  private id = 0;
  readonly request = (cb: FrameRequestCallback): number => {
    this.queue.set(++this.id, cb);
    return this.id;
  };
  readonly cancel = (id: number): void => {
    this.queue.delete(id);
  };
  get pending(): number {
    return this.queue.size;
  }
  /** Run every pending frame at `now`. */
  at(now: number): void {
    const callbacks = [...this.queue.values()];
    this.queue.clear();
    callbacks.forEach(cb => cb(now));
  }
}

const platform = (reduced: boolean): unknown => ({
  provide: WrPlatform,
  useValue: { prefersReducedMotion: signal(reduced), pageVisible: signal(true) },
});

const SLOT = '.ngwr-decode__slot';
const SCRAMBLE = 'ngwr-decode__slot--scramble';
const SR = '.ngwr-decode__sr';

describe('Decode', () => {
  let frames: Frames;

  const render = async <T>(
    host: new () => T,
    providers: unknown[] = [platform(false)]
  ): Promise<ReturnType<typeof TestBed.createComponent<T>>> => {
    TestBed.configureTestingModule({ providers: providers as never[] });
    const fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  const target = (fixture: { nativeElement: HTMLElement }): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>('.ngwr-decode')!;

  const slots = (el: HTMLElement): HTMLElement[] => Array.from(el.querySelectorAll<HTMLElement>(SLOT));

  const wrapper = (el: HTMLElement): HTMLElement => el.querySelector<HTMLElement>('.ngwr-decode__slots')!;

  const scrambled = (el: HTMLElement): boolean[] => slots(el).map(s => s.classList.contains(SCRAMBLE));

  const enterView = (): void => {
    StubIntersectionObserver.instances[0].fire(true);
  };

  /** Into view and through the first frame, which builds the slots. */
  const play = (): void => {
    enterView();
    frames.at(0);
  };

  beforeEach(() => {
    frames = new Frames();
    StubIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
    vi.stubGlobal('requestAnimationFrame', frames.request);
    vi.stubGlobal('cancelAnimationFrame', frames.cancel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('waits for most of the host to be in view, then splits into slots and scrambles them all', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const before = Array.from(el.childNodes);
    const text = el.textContent;

    expect(StubIntersectionObserver.instances[0].options?.threshold).toBeGreaterThanOrEqual(0.5);
    expect(StubIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(el);
    expect(el.classList.contains('ngwr-decode--run')).toBe(false);

    enterView();
    // Armed by the first frame, not by the observer callback.
    expect(el.classList.contains('ngwr-decode--run')).toBe(false);
    expect(Array.from(el.childNodes)).toEqual(before);
    frames.at(0);

    expect(el.classList.contains('ngwr-decode--run')).toBe(true);
    expect(StubIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(wrapper(el).getAttribute('aria-hidden')).toBe('true');
    expect(wrapper(el).textContent).toBe(text);
    expect(slots(el).map(s => s.textContent)).toEqual(['A', 'b', '9', ',', 'x']);
    expect(scrambled(el)).toEqual([true, true, true, true, true]);
    expect(slots(el).every(s => (s.dataset['glyph'] ?? '').length > 0)).toBe(true);
    expect(wrapper(el).style.getPropertyValue('--ngwr-decode-settle')).toBe(`${DECODE_SETTLE}ms`);
    // The authored text nodes are out of the document, not destroyed.
    const texts = before.filter(node => node.nodeType === Node.TEXT_NODE);
    expect(texts.length).toBeGreaterThan(0);
    expect(texts.every(node => !el.contains(node) && node.textContent !== '')).toBe(true);
  });

  it('keeps the real character as the slot text and the glyph out of it, with spaces as plain text', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    play();

    for (const slot of slots(el)) {
      expect(slot.childNodes).toHaveLength(1);
      expect(slot.firstChild!.nodeType).toBe(Node.TEXT_NODE);
    }
    const kinds = Array.from(wrapper(el).childNodes).map(node =>
      node.nodeType === Node.TEXT_NODE ? `text:${node.textContent}` : 'slot'
    );
    expect(kinds).toEqual(['slot', 'slot', 'text: ', 'slot', 'slot', 'text: ', 'slot']);
  });

  it('draws each glyph from the shape of its own character', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    play();

    const [upper, lower, digit, symbol] = slots(el);
    expect(upper.classList.contains('ngwr-decode__slot--upper')).toBe(true);
    expect(lower.classList.contains('ngwr-decode__slot--lower')).toBe(true);
    expect(digit.classList.contains('ngwr-decode__slot--digit')).toBe(true);
    expect(symbol.classList.contains('ngwr-decode__slot--symbol')).toBe(true);

    const seen = {
      upper: new Set<string>(),
      lower: new Set<string>(),
      digit: new Set<string>(),
      symbol: new Set<string>(),
    };
    for (let i = 1; i <= 20; i++) {
      frames.at(i * DECODE_GLYPH_MS);
      seen.upper.add(upper.dataset['glyph']!);
      seen.lower.add(lower.dataset['glyph']!);
      seen.digit.add(digit.dataset['glyph']!);
      seen.symbol.add(symbol.dataset['glyph']!);
    }
    expect([...seen.upper].every(g => /^[A-Z0-9]$/.test(g))).toBe(true);
    expect([...seen.lower].every(g => /^[a-z]$/.test(g))).toBe(true);
    expect([...seen.digit].every(g => /^[0-9]$/.test(g))).toBe(true);
    expect([...seen.symbol].every(g => /^[^A-Za-z0-9\s]$/.test(g))).toBe(true);
    expect(seen.upper.size).toBeGreaterThan(1);
  });

  it('takes a glyph set of its own for every slot', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.glyphs.set('01');
    fixture.detectChanges();
    const el = target(fixture);
    play();

    frames.at(DECODE_GLYPH_MS);
    frames.at(DECODE_GLYPH_MS * 2);
    expect(slots(el).every(s => s.dataset['glyph'] === '0' || s.dataset['glyph'] === '1')).toBe(true);
  });

  it('changes glyphs about every 55 ms, not every frame, and never to the same one', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    play();
    const first = slots(el)[0];
    const glyph = first.dataset['glyph'];

    frames.at(16);
    frames.at(32);
    expect(first.dataset['glyph']).toBe(glyph);

    frames.at(DECODE_GLYPH_MS);
    expect(first.dataset['glyph']).not.toBe(glyph);
  });

  it('locks the slots in reading order, holds first, then restores the authored nodes after the last has eased', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const before = Array.from(el.childNodes);
    play();

    frames.at(DECODE_HOLD - 1);
    expect(scrambled(el)).toEqual([true, true, true, true, true]);

    frames.at(DECODE_HOLD);
    expect(scrambled(el)).toEqual([false, true, true, true, true]);

    frames.at(DECODE_HOLD + DECODE_GAP * 2);
    expect(scrambled(el)).toEqual([false, false, false, true, true]);

    const last = DECODE_HOLD + DECODE_GAP * 4;
    frames.at(last);
    expect(scrambled(el)).toEqual([false, false, false, false, false]);
    expect(slots(el)).toHaveLength(5);
    expect(el.classList.contains('ngwr-decode--run')).toBe(true);

    frames.at(last + DECODE_SETTLE - 1);
    expect(slots(el)).toHaveLength(5);

    frames.at(last + DECODE_SETTLE);
    const after = Array.from(el.childNodes);
    expect(after).toHaveLength(before.length);
    after.forEach((node, i) => expect(node).toBe(before[i]));
    expect(el.querySelectorAll(SLOT)).toHaveLength(0);
    expect(el.className).toBe('ngwr-decode');
    expect(frames.pending).toBe(0);
  });

  it('keeps the screen-reader copy beside the slots and drops it after', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const text = el.textContent;
    play();

    const copy = el.querySelector<HTMLElement>(SR)!;
    expect(copy.textContent).toBe(text);
    expect(copy.getAttribute('aria-hidden')).toBeNull();
    expect(copy.previousElementSibling).toBe(wrapper(el));

    frames.at(DECODE_HOLD + DECODE_GAP * 4 + DECODE_SETTLE);

    expect(el.querySelector(SR)).toBeNull();
  });

  it('shows a binding that changed during the play once restored', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    play();

    fixture.componentInstance.where.set('y');
    fixture.detectChanges();
    expect(wrapper(el).textContent).toBe('Ab 9, x');

    frames.at(DECODE_HOLD + DECODE_GAP * 4 + DECODE_SETTLE);

    expect(el.textContent).toBe('Ab 9, y');
  });

  it('leaves the text as authored through the delay, then plays', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.delay.set(300);
    fixture.detectChanges();
    const el = target(fixture);
    const before = Array.from(el.childNodes);
    play();

    frames.at(299);
    expect(Array.from(el.childNodes)).toEqual(before);
    expect(el.classList.contains('ngwr-decode--run')).toBe(false);

    frames.at(300);
    expect(slots(el)).toHaveLength(5);
    frames.at(300 + DECODE_HOLD);
    expect(scrambled(el)).toEqual([false, true, true, true, true]);
  });

  it('shrinks the gap so a long text still locks its last slot by 1.2 s after the hold', async () => {
    const fixture = await render(LongHost);
    const el = target(fixture);
    play();

    expect(slots(el)).toHaveLength(61);
    frames.at(DECODE_HOLD + 1200 - 1);
    expect(scrambled(el).at(-1)).toBe(true);
    frames.at(DECODE_HOLD + 1200);
    expect(scrambled(el).at(-1)).toBe(false);
  });

  it('in hover mode plays on pointer enter and focus of the focusable ancestor, replays, but never restarts mid-play', async () => {
    const fixture = await render(HoverHost);
    const el = target(fixture);
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('button')!;
    const before = Array.from(el.childNodes);
    expect(StubIntersectionObserver.instances).toHaveLength(0);

    button.dispatchEvent(new Event('pointerenter'));
    frames.at(0);
    expect(slots(el)).toHaveLength(2);
    const built = slots(el);

    frames.at(DECODE_HOLD);
    expect(scrambled(el)).toEqual([false, true]);
    button.dispatchEvent(new Event('pointerenter'));
    button.dispatchEvent(new Event('focusin', { bubbles: true }));
    frames.at(DECODE_HOLD + 1);
    expect(slots(el)).toEqual(built);
    expect(scrambled(el)).toEqual([false, true]);
    expect(frames.pending).toBe(1);

    frames.at(DECODE_HOLD + DECODE_GAP + DECODE_SETTLE);
    expect(Array.from(el.childNodes)).toEqual(before);
    expect(frames.pending).toBe(0);

    button.dispatchEvent(new Event('focusin', { bubbles: true }));
    frames.at(5000);
    expect(slots(el)).toHaveLength(2);
    expect(slots(el)[0]).not.toBe(built[0]);
  });

  it('leaves the DOM alone under reduced motion', async () => {
    const fixture = await render(Host, [platform(true)]);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(frames.pending).toBe(0);
    expect(el.className).toBe('ngwr-decode');
    expect(el.querySelectorAll(SLOT)).toHaveLength(0);
    expect(el.querySelector(SR)).toBeNull();
  });

  it('does nothing on the server', async () => {
    const fixture = await render(Host, [{ provide: PLATFORM_ID, useValue: 'server' }]);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(el.className).toBe('ngwr-decode');
    expect(el.querySelectorAll(SLOT)).toHaveLength(0);
  });

  it('does nothing without IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const fixture = await render(Host);
    const el = target(fixture);

    expect(el.className).toBe('ngwr-decode');
    expect(frames.pending).toBe(0);
    expect(el.querySelectorAll(SLOT)).toHaveLength(0);
  });

  it('stops observing on destroy before the play', async () => {
    const fixture = await render(Host);
    const observer = StubIntersectionObserver.instances[0];

    fixture.destroy();

    expect(observer.disconnect).toHaveBeenCalled();
  });

  it('cleans up when destroyed mid-play', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const before = Array.from(el.childNodes);
    play();
    frames.at(DECODE_HOLD);
    expect(frames.pending).toBe(1);

    expect(() => fixture.destroy()).not.toThrow();

    expect(Array.from(el.childNodes)).toEqual(before);
    expect(el.querySelectorAll(SLOT)).toHaveLength(0);
    expect(frames.pending).toBe(0);
  });

  it('drops the hover listeners on destroy', async () => {
    const fixture = await render(HoverHost);
    const el = target(fixture);
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('button')!;

    fixture.destroy();
    button.dispatchEvent(new Event('pointerenter'));

    expect(frames.pending).toBe(0);
    expect(el.querySelectorAll(SLOT)).toHaveLength(0);
  });
});

describe('decodeShape', () => {
  it('reads the shape of a grapheme', () => {
    expect(['A', 'Ж', 'É'].map(decodeShape)).toEqual(['upper', 'upper', 'upper']);
    expect(['a', 'ж', 'é'].map(decodeShape)).toEqual(['lower', 'lower', 'lower']);
    expect(['0', '9'].map(decodeShape)).toEqual(['digit', 'digit']);
    expect([',', '-', '漢', '👋🏽'].map(decodeShape)).toEqual(['symbol', 'symbol', 'symbol', 'symbol']);
  });
});
