import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrAffix } from './affix';

@Component({
  imports: [WrAffix],
  template: `
    <section class="scroller">
      <p>content above</p>
      <div wrAffix [wrAffixOffsetTop]="offset()" (wrAffixChange)="events.push($event)">Header</div>
      <p>content below</p>
    </section>
  `,
})
class Host {
  readonly offset = signal<unknown>(0);
  readonly events: boolean[] = [];
}

/** One observer the directive created, with the levers a test needs. */
interface Recorded {
  readonly options: IntersectionObserverInit | undefined;
  readonly targets: Element[];
  disconnected: boolean;
  /** Deliver an entry the way the browser would, synchronously. */
  report(isIntersecting: boolean): void;
}

/**
 * `[wrAffix]` is CSS `position: sticky` plus an `IntersectionObserver` sentinel, and
 * jsdom has neither: nothing is laid out (every rect is zeros) and `IntersectionObserver`
 * does not exist at all. So this file does NOT try to prove the element is pinned at the
 * right pixel — it cannot, and stubbing a scroll offset into existence would only prove
 * the stub. What it pins is the two halves the directive actually owns:
 *
 *   - what it asks the browser for — the inline sticky styling, where the sentinel goes,
 *     and the `rootMargin` that places the trigger line;
 *   - what it does with the answer — the `wr-affix--active` class and the
 *     `(wrAffixChange)` emissions, driven by entries this file hands it.
 *
 * The stub below is the repo's existing idiom (see `split-text.spec.ts`), extended to
 * record the constructor options, because the offset only reaches the browser through
 * them. NOT covered here, and not fakeable: the geometry itself — that a zero-height
 * sentinel at that place in the DOM really does leave the viewport exactly when the host
 * becomes stuck, and that the sentinel does not disturb its parent's layout (in a flex
 * or grid parent it is a real child with a real gap). That needs a browser.
 *
 * One asymmetry is deliberately left untested rather than pinned as correct: the sticky
 * `top` follows `wrAffixOffsetTop` on every change, while `rootMargin` is read once when
 * the observer is built and `IntersectionObserver` has no way to update it. A consumer
 * who animates the offset therefore moves the pinning line without moving the trigger
 * line. Making the two agree means rebuilding the observer when the input changes, which
 * is a change to the directive rather than to this file.
 */
describe('WrAffix', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let observers: Recorded[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const affixed = (): HTMLElement => root().querySelector<HTMLElement>('[wrAffix]')!;
  const sentinel = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-affix__sentinel');
  const events = (): boolean[] => fixture.componentInstance.events;
  const isActive = (): boolean => affixed().classList.contains('wr-affix--active');

  const mount = async (offset: unknown = 0, providers: unknown[] = []): Promise<void> => {
    observers = [];

    class StubObserver {
      readonly targets: Element[] = [];
      disconnected = false;

      constructor(
        private readonly callback: IntersectionObserverCallback,
        public readonly options?: IntersectionObserverInit
      ) {
        observers.push(this as unknown as Recorded);
      }

      observe(target: Element): void {
        this.targets.push(target);
      }

      disconnect(): void {
        this.disconnected = true;
      }

      report(isIntersecting: boolean): void {
        this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
    }
    vi.stubGlobal('IntersectionObserver', StubObserver);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    // The sentinel and the observer are set up in `afterNextRender`, which under
    // zoneless CD runs in a macrotask — a synchronous `detectChanges()` alone leaves
    // the directive half-built and every assertion below meaningless.
    fixture.componentInstance.offset.set(offset);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  /** Hand the directive one observer entry and let it settle. */
  const report = async (isIntersecting: boolean): Promise<void> => {
    observers.forEach(o => o.report(isIntersecting));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => mount());

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sticks the element itself, at the offset it was given', () => {
    // The styling is a host binding rather than a stylesheet rule, so it is the one
    // part of "pinned" that IS observable without layout.
    expect(affixed().classList.contains('wr-affix')).toBe(true);
    expect(affixed().style.position).toBe('sticky');
    expect(affixed().style.top).toBe('0px');

    fixture.componentInstance.offset.set(64);
    fixture.detectChanges();
    expect(affixed().style.top).toBe('64px');
  });

  it('coerces the offset, so a bad one is zero rather than nothing', async () => {
    // `[wrAffixOffsetTop]="header.height"` is how this gets bound in practice, and an
    // undefined or string value is a matter of when the binding runs. Without the
    // coercion the host renders `top: NaNpx`, which the browser drops entirely — the
    // element then sticks to the top of the viewport UNDER a fixed header.
    await mount('24');
    expect(affixed().style.top).toBe('24px');

    await mount('nonsense');
    expect(affixed().style.top).toBe('0px');
  });

  it('watches a sentinel placed just above the element, not the element', () => {
    // The whole trick. A `position: sticky` element never leaves the viewport, so an
    // observer pointed at the host would report "intersecting" forever and the state
    // would never flip. The sentinel is what scrolls away.
    const marker = sentinel()!;

    expect(marker).toBeTruthy();
    expect(affixed().previousElementSibling).toBe(marker);
    expect(marker.parentElement).toBe(affixed().parentElement);
    expect(observers).toHaveLength(1);
    expect(observers[0].targets).toEqual([marker]);
  });

  it('keeps the sentinel out of the accessible tree and out of the layout', () => {
    // It is an empty `<div>` in the middle of the consumer's markup: announced, or
    // given a height, it would be a phantom row in their page.
    const marker = sentinel()!;

    expect(marker.getAttribute('aria-hidden')).toBe('true');
    expect(marker.style.height).toBe('0px');
    expect(marker.style.margin).toBe('0px');
    expect(marker.style.padding).toBe('0px');
    expect(marker.style.pointerEvents).toBe('none');
  });

  it('puts the trigger line at the offset, on the top edge only', async () => {
    // The margin SHRINKS the root's top edge down to the line the element sticks at,
    // so the sentinel counts as gone exactly when the host reaches it. A dropped minus
    // sign grows the root instead and the state flips a whole offset too late; a margin
    // on another edge moves the line sideways.
    expect(observers[0].options?.rootMargin).toBe('-0px 0px 0px 0px');

    await mount(64);
    expect(observers[0].options?.rootMargin).toBe('-64px 0px 0px 0px');
  });

  it('marks the element affixed when the sentinel scrolls away, and tells the host', async () => {
    await report(false);

    expect(isActive()).toBe(true);
    expect(events()).toEqual([true]);
  });

  it('unmarks it when the sentinel comes back', async () => {
    await report(false);
    await report(true);

    expect(isActive()).toBe(false);
    expect(events()).toEqual([true, false]);
  });

  it('stays quiet on the first report, which says the element is still in view', async () => {
    // A real `IntersectionObserver` delivers an entry for every target as soon as it is
    // observed — before anything has scrolled. Read as a transition that first entry
    // announces an unstick that never happened, on every affixed element on the page,
    // on load. `false` is the state the host already believes it is in.
    await report(true);

    expect(events()).toEqual([]);
    expect(isActive()).toBe(false);
  });

  it('reports a change once, however often the browser repeats itself', async () => {
    // Entries are not deduplicated by the observer — a resize, a root change or a
    // second threshold crossing can re-deliver the state the host is already in, and a
    // consumer animating the shadow would replay it each time.
    await report(false);
    await report(false);
    await report(true);
    await report(true);

    expect(events()).toEqual([true, false]);
  });

  it('lets go of the sentinel and the observer when it is destroyed', () => {
    const marker = sentinel()!;

    fixture.destroy();

    // The sentinel is inserted by hand, so Angular does not own it — only this cleanup
    // removes it, and a directive inside an `@if` would otherwise leave one behind on
    // every toggle.
    expect(marker.parentNode).toBeNull();
    expect(observers[0].disconnected).toBe(true);
  });

  it('renders the sticky element on the server, without touching the DOM', async () => {
    // SSR contract: the prerendered HTML already carries the sticky styling, so the
    // header does not jump on hydration — while the sentinel and the observer, which
    // need a document and a browser API, are browser-only.
    await mount(32, [{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(affixed().style.position).toBe('sticky');
    expect(affixed().style.top).toBe('32px');
    expect(sentinel()).toBeNull();
    expect(observers).toEqual([]);
  });

  it('takes its state from the observer alone, not from scrolling', async () => {
    // There is deliberately no scroll listener here — the state comes from the sentinel
    // and the pinning from CSS. This case is the guard on that: an implementation that
    // measured scroll offsets instead would need layout, which is exactly what this
    // environment (and a `position: sticky` element inside an arbitrary scroll
    // container) cannot give it.
    window.dispatchEvent(new Event('scroll'));
    root()
      .querySelector('.scroller')!
      .dispatchEvent(new Event('scroll', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(isActive()).toBe(false);
    expect(events()).toEqual([]);
  });
});
