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
 * The two halves of the offset used to disagree: the sticky `top` is a live binding and
 * followed every change, while `rootMargin` was read once when the observer was built and
 * `IntersectionObserver` cannot be reconfigured — so a consumer animating the offset moved
 * the pinning line without moving the trigger line. The directive now rebuilds the observer
 * when the input changes, and the case below is what holds it to that.
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

  it('moves the trigger line with the offset, not only the pinning line', async () => {
    // `rootMargin` is fixed for an observer's lifetime, so following the input means
    // building a new observer and dropping the old one. A collapsing header that
    // animates its offset would otherwise pin at the new line and keep flipping state
    // at the old one — visible only while scrolling, which is why nothing caught it.
    expect(observers).toHaveLength(1);
    expect(observers[0].options?.rootMargin).toBe('-0px 0px 0px 0px');

    fixture.componentInstance.offset.set(64);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(observers).toHaveLength(2);
    expect(observers[1].options?.rootMargin).toBe('-64px 0px 0px 0px');
    // The old one is let go rather than left watching in parallel, or both would
    // report and the last to fire would win.
    expect(observers[0].disconnected).toBe(true);
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

  it('lets go of the sentinel, the observer and the state class when it is destroyed', async () => {
    const marker = sentinel()!;
    const el = affixed();
    await report(false);
    expect(isActive()).toBe(true);

    fixture.destroy();

    // The sentinel is inserted by hand, so Angular does not own it — only this cleanup
    // removes it, and a directive inside an `@if` would otherwise leave one behind on
    // every toggle.
    expect(marker.parentNode).toBeNull();
    expect(observers[0].disconnected).toBe(true);
    // The class is written imperatively too, so it outlives the directive on any host
    // element the consumer keeps a handle on (a detached CDK portal, an element moved
    // between views) — and a stuck-looking shadow with no observer behind it never clears.
    expect(el.classList.contains('wr-affix--active')).toBe(false);
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
