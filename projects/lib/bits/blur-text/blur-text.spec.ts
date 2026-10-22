import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

// Through the ENTRY POINT, deliberately: the two unions used to be file-local
// aliases called `Unit` / `Direction`, so the `.d.ts` and the generated API table
// named a type no consumer could import. This line is the assertion.
import type { WrBlurTextDirection, WrBlurTextUnit } from 'ngwr/bits/blur-text';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrBlurText } from './blur-text';

@Component({
  imports: [WrBlurText],
  template: `
    <wr-blur-text
      [text]="text()"
      [animateBy]="animateBy()"
      [direction]="direction()"
      (animationComplete)="done = done + 1"
    />
  `,
})
class Host {
  readonly text = signal('Hi there');
  readonly animateBy = signal<WrBlurTextUnit>('words');
  readonly direction = signal<WrBlurTextDirection>('top');
  done = 0;
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: signal(false).asReadonly(),
  prefersReducedMotion: signal(true).asReadonly(),
};

/**
 * The sibling of `wr-split-text` — same piece-splitting shape, same viewport
 * trigger, same reduced-motion escape, and until now the same missing accessible
 * layer. The stub for `IntersectionObserver` and the reasoning behind running under
 * reduced motion are documented in `split-text.spec.ts`.
 */
describe('WrBlurText', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let observed: (() => void)[];
  /** Observers currently connected — `observe()` minus `disconnect()`. */
  let live: number;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const readable = (): string => root().querySelector('.wr-blur-text__sr-only')!.textContent;
  const pieces = (): string[] => [...root().querySelectorAll('.wr-blur-text__piece')].map(el => el.textContent);

  const mount = async (providers: unknown[] = []): Promise<void> => {
    observed = [];
    live = 0;
    class StubObserver {
      private connected = false;
      constructor(private readonly cb: IntersectionObserverCallback) {}
      observe(): void {
        this.connected = true;
        live++;
        observed.push(() =>
          this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
        );
      }
      disconnect(): void {
        // Counted, not a no-op: an observer that is never disconnected is the
        // whole defect this file has to be able to see.
        if (this.connected) live--;
        this.connected = false;
      }
    }
    vi.stubGlobal('IntersectionObserver', StubObserver);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const enterViewport = async (): Promise<void> => {
    observed.forEach(fire => fire());
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => mount([{ provide: WrPlatform, useValue: reducedMotion }]));

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('orders the pieces by their own text, not by the page direction', () => {
    // The pieces are flex items, ordered by the container's direction: under the
    // page's, 'Welcome to ngwr' read 'ngwr to Welcome' on an RTL page.
    expect(root().querySelector('wr-blur-text')!.getAttribute('dir')).toBe('auto');
  });

  it('carries the whole string once, with the pieces out of the tree', () => {
    expect(readable()).toBe('Hi there');
    for (const el of root().querySelectorAll('.wr-blur-text__piece')) {
      expect(el.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('splits by word by default, and by character when asked', () => {
    expect(pieces()).toEqual(['Hi', 'there']);

    fixture.componentInstance.animateBy.set('chars');
    fixture.detectChanges();
    expect(pieces()).toEqual(['H', 'i', 't', 'h', 'e', 'r', 'e']);
  });

  it('keeps a surrogate pair in one piece', () => {
    fixture.componentInstance.text.set('a🚀');
    fixture.componentInstance.animateBy.set('chars');
    fixture.detectChanges();

    expect(pieces()).toEqual(['a', '🚀']);
  });

  it('keeps the whitespace between words as its own piece', () => {
    expect(root().querySelectorAll('.wr-blur-text__space').length).toBe(1);
  });

  it('reports completion once it is seen, and only once', async () => {
    expect(fixture.componentInstance.done).toBe(0);

    await enterViewport();
    await enterViewport();
    expect(fixture.componentInstance.done).toBe(1);
  });

  /**
   * The effect that re-arms the animation on a `text` change sets
   * `hasAnimated = false` first, so `startObserver`'s own guard never blocks
   * it — every change used to build ANOTHER `IntersectionObserver`, plus
   * another `destroyRef.onDestroy` to disconnect it. An element that is
   * off-screen (the only case where the observer does not disconnect itself on
   * the first callback) accumulated one of each per change.
   */
  it('keeps a single observer across text changes while off-screen', async () => {
    expect(live).toBe(1);

    for (const next of ['one', 'two', 'three']) {
      fixture.componentInstance.text.set(next);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    expect(live, 'one observer leaked per off-screen text change').toBe(1);
  });

  it('disconnects the observer when the component goes away', async () => {
    fixture.componentInstance.text.set('later');
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.destroy();

    expect(live).toBe(0);
  });

  /**
   * The sibling case of the test above, one tick earlier: destroyed before it
   * has painted — an `@if` that flips on and off inside one tick, or a list
   * replaced before render. The destroy hook runs first and disconnects
   * whatever exists at that moment, and the effect's microtask lands after it;
   * a continuation that does not check for the teardown builds a FRESH
   * observer, which nothing is left to disconnect.
   */
  it('leaves no observer connected when it is destroyed in the task that created it', async () => {
    fixture.destroy();
    expect(live).toBe(0);

    const cycled = TestBed.createComponent(Host);
    cycled.detectChanges();
    cycled.destroy();
    await Promise.resolve();

    expect(live, 'one observer leaked per mount destroyed before its first render').toBe(0);
  });

  it('renders the text plainly on the server', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(readable()).toBe('Hi there');
    expect(pieces()).toEqual(['Hi', 'there']);
    expect(observed).toEqual([]);
  });

  /**
   * jsdom has no Web Animations API, so `animate` is stubbed and each tween's
   * `onfinish` is fired by hand — which is what reaches the ordering that matters:
   * a tween still in flight when the component goes away. The second spec is here
   * so the first cannot pass on a stub that never finishes anything.
   */
  describe('with motion', () => {
    let animateBefore: PropertyDescriptor | undefined;
    let tweens: Animation[];

    const finishAll = (): void => {
      for (const tween of tweens) tween.onfinish?.call(tween, new Event('finish') as AnimationPlaybackEvent);
    };

    beforeEach(async () => {
      fixture.destroy();
      tweens = [];
      animateBefore = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
      Element.prototype.animate = function () {
        const tween = { cancel: () => undefined, onfinish: null } as unknown as Animation;
        tweens.push(tween);
        return tween;
      };
      await mount([
        { provide: WrPlatform, useValue: { ...reducedMotion, prefersReducedMotion: signal(false).asReadonly() } },
      ]);
      await enterViewport();
    });

    afterEach(() => {
      if (animateBefore) Object.defineProperty(Element.prototype, 'animate', animateBefore);
      else delete (Element.prototype as Partial<Element>).animate;
    });

    it('reports completion once the last piece lands', () => {
      expect(tweens.length).toBe(pieces().length);
      expect(fixture.componentInstance.done).toBe(0);

      finishAll();
      expect(fixture.componentInstance.done).toBe(1);
    });

    it('stays silent when the last piece lands after it has been destroyed', () => {
      // `console.warn`, which is the channel Angular reports NG0953 on.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      fixture.destroy();

      finishAll();
      expect(warn.mock.calls.map(args => args.map(String).join(' ')).filter(m => m.includes('NG0953'))).toEqual([]);
    });
  });
});
