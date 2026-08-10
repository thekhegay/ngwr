import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTypewriter } from './typewriter';

@Component({
  imports: [WrTypewriter],
  template: `
    <wr-typewriter
      [text]="text()"
      [texts]="texts()"
      [typingSpeed]="10"
      [deletingSpeed]="10"
      [pauseDuration]="100"
      [loop]="loop()"
      [showCursor]="showCursor()"
      [hideCursorWhileTyping]="hideCursorWhileTyping()"
      [reverseMode]="reverseMode()"
      [textColors]="textColors()"
      (sentenceComplete)="done.push($event)"
    />
  `,
})
class Host {
  readonly text = signal<string | undefined>('Hello');
  readonly texts = signal<readonly string[] | undefined>(undefined);
  readonly loop = signal(true);
  readonly showCursor = signal(true);
  readonly hideCursorWhileTyping = signal(false);
  readonly reverseMode = signal(false);
  readonly textColors = signal<readonly string[]>([]);
  readonly done: { text: string; index: number }[] = [];
}

/** A platform that asks for less motion. */
const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: signal(false).asReadonly(),
  prefersReducedMotion: signal(true).asReadonly(),
};

/**
 * A `setTimeout` state machine, so the clock is faked and every assertion is on a
 * known number of ticks. `setTimeout` is faked but the microtask queue is not,
 * which is what lets `whenStable` — and therefore `afterNextRender`, where the
 * machine starts — still resolve.
 */
describe('WrTypewriter', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const typed = (): string => root().querySelector('.wr-typewriter__content')!.textContent;
  const cursor = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-typewriter__cursor');

  const advance = (ms: number): void => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };

  const mount = async (providers: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('types one character per tick', async () => {
    await mount();
    expect(typed()).toBe('');

    // The first tick is scheduled at the `initialDelay`, which is 0 here — so
    // advancing 10ms runs the tick at 0 AND the one at 10.
    advance(0);
    expect(typed()).toBe('H');

    advance(10);
    expect(typed()).toBe('He');

    advance(20);
    expect(typed()).toBe('Hell');
  });

  it('reports the sentence once it is complete', async () => {
    await mount();
    advance(10 * 5);

    expect(typed()).toBe('Hello');
    expect(fixture.componentInstance.done).toEqual([{ text: 'Hello', index: 0 }]);
  });

  it('deletes and moves on to the next string', async () => {
    await mount();
    fixture.componentInstance.text.set(undefined);
    fixture.componentInstance.texts.set(['ab', 'cd']);
    fixture.detectChanges();

    advance(10 * 2);
    expect(typed()).toBe('ab');

    // One tick to notice the sentence is complete, then the pause, then one
    // deletion per tick down to empty.
    advance(100);
    expect(typed()).toBe('a');
    advance(10);
    expect(typed()).toBe('');

    // One more tick to advance the index, then the pause, then the next string.
    advance(10 + 100);
    expect(typed()).toBe('c');
    advance(10);
    expect(typed()).toBe('cd');

    // The completion event lands one tick after the last character does — the
    // machine notices "nothing left to type" on its next visit, not on the write.
    expect(fixture.componentInstance.done.map(d => d.text)).toEqual(['ab']);
    advance(10);
    expect(fixture.componentInstance.done.map(d => d.text)).toEqual(['ab', 'cd']);
  });

  it('stops on the last string when it is not looping', async () => {
    await mount();
    fixture.componentInstance.loop.set(false);
    fixture.detectChanges();
    advance(10 * 5);
    expect(typed()).toBe('Hello');

    advance(10_000);
    expect(typed()).toBe('Hello');
  });

  it('types a reversed string without breaking a surrogate pair', async () => {
    // `split('')` reverses UTF-16 units, which turns 🚀 into two lone surrogates
    // — a pair of replacement glyphs rather than the rocket, typed backwards.
    await mount();
    fixture.componentInstance.text.set('ab🚀');
    fixture.componentInstance.reverseMode.set(true);
    fixture.detectChanges();

    advance(10 * 3);
    expect(typed()).toBe('🚀ba');
    expect([...typed()].length).toBe(3);
  });

  it('shows the whole sentence at once for someone who asked for less motion', async () => {
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    advance(1);

    expect(typed()).toBe('Hello');
    expect(fixture.componentInstance.done).toEqual([{ text: 'Hello', index: 0 }]);
  });

  it('still cycles sentences under reduced motion, because the swap is content', async () => {
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    fixture.componentInstance.text.set(undefined);
    fixture.componentInstance.texts.set(['one', 'two']);
    fixture.detectChanges();

    advance(1);
    expect(typed()).toBe('one');

    advance(100);
    expect(typed()).toBe('two');
  });

  it('carries the whole first sentence into the prerendered HTML', async () => {
    // No animation on the server, and an empty span would ship as the page's
    // visible text.
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(typed()).toBe('Hello');
  });

  it('keeps the cursor out of the accessible tree, and drops it when asked', async () => {
    await mount();
    expect(cursor()!.getAttribute('aria-hidden')).toBe('true');

    fixture.componentInstance.showCursor.set(false);
    fixture.detectChanges();
    expect(cursor()).toBeNull();
  });

  it('hides the cursor while it is typing when asked to', async () => {
    await mount();
    fixture.componentInstance.hideCursorWhileTyping.set(true);
    fixture.detectChanges();
    expect(cursor()).not.toBeNull();

    advance(10);
    expect(cursor()).toBeNull();
  });

  it('cycles the colours it was given, one per sentence', async () => {
    await mount();
    fixture.componentInstance.text.set(undefined);
    fixture.componentInstance.texts.set(['a', 'b']);
    fixture.componentInstance.textColors.set(['red', 'blue']);
    fixture.detectChanges();

    const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-typewriter')!;
    expect(host().style.color).toBe('red');

    advance(10 + 100 + 10 + 100);
    expect(host().style.color).toBe('blue');
  });

  it('stops its timer when it goes away', async () => {
    await mount();
    advance(10);
    fixture.destroy();

    expect(vi.getTimerCount()).toBe(0);
  });
});
