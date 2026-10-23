import { createRequire } from 'node:module';
import { join } from 'node:path';

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

@Component({
  imports: [WrAffix],
  template: `
    <div class="scroller" style="overflow-y: auto; height: 100px">
      <div wrAffix>Header</div>
    </div>
  `,
})
class ScrollerHost {}

@Component({
  imports: [WrAffix],
  template: `
    <div class="layout" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
      <p class="before">first</p>
      <div wrAffix>Header</div>
      <p class="after">last</p>
    </div>
  `,
})
class GridHost {}

@Component({
  imports: [WrAffix],
  template: `
    <div class="layout" style="display: inline-flex; flex-direction: column; gap: 16px">
      <p class="before">first</p>
      <div wrAffix>Header</div>
      <p class="after">last</p>
    </div>
  `,
})
class FlexHost {}

@Component({
  imports: [WrAffix],
  template: `
    <div class="layout" style="display: flex; position: absolute">
      <div wrAffix>Header</div>
    </div>
  `,
})
class PositionedFlexHost {}

/** Sticky group headers in one list, the first of which a filter can remove. */
@Component({
  imports: [WrAffix],
  template: `
    <div class="layout" style="display: flex; flex-direction: column">
      @if (first()) {
        <div wrAffix class="first">Group A</div>
      }
      <p class="row">row</p>
      <div wrAffix class="second">Group B</div>
    </div>
  `,
})
class GroupsHost {
  readonly first = signal(true);
}

/**
 * The CSS `ngwr/affix` ships, compiled rather than restated, so the class the
 * directive tags a parent with is held to the rule that styles it. `sass` comes
 * through `@angular/build`, as in `theme/sass-entry.spec.ts`.
 */
const affixCss = (): string =>
  (
    createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as {
      compileString(source: string, options: { loadPaths: string[] }): { css: string };
    }
  ).compileString("@use 'affix/styles';", { loadPaths: [join(process.cwd(), 'projects/lib')] }).css;

/** One observer the directive created, with the levers a test needs. */
interface Recorded {
  readonly options: IntersectionObserverInit | undefined;
  readonly targets: Element[];
  disconnected: boolean;
  /**
   * Deliver an entry the way the browser would, synchronously.
   *
   * `where` is the sentinel's position relative to the offset line, and it is
   * not decoration: a sentinel is outside the root in TWO directions and only
   * `'above'` means the page has scrolled past. Defaults to `'above'`, which is
   * what every test written before this parameter meant.
   */
  report(isIntersecting: boolean, where?: 'above' | 'below'): void;
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
 * becomes stuck, and that the out-of-flow sentinel in a flex or grid parent adds no gap
 * and no track. That needs a browser; what this file holds for flex and grid is the
 * request — out of the flow, zero-sized, at the host's measured natural top.
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

  const mount = async (offset: unknown = 0, providers: unknown[] = [], host: unknown = Host): Promise<void> => {
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

      report(isIntersecting: boolean, where: 'above' | 'below' = 'above'): void {
        // The offset line, as `rootMargin` places it. jsdom lays nothing out, so
        // the geometry the directive reads has to be supplied here — and it is
        // the whole difference between "scrolled past" and "further down the
        // page", which is what the directive got wrong.
        const rootTop = 0;
        const entry = {
          isIntersecting,
          rootBounds: { top: rootTop } as DOMRectReadOnly,
          boundingClientRect: { top: where === 'above' ? rootTop - 10 : rootTop + 500 } as DOMRectReadOnly,
        } as IntersectionObserverEntry;
        this.callback([entry], this as unknown as IntersectionObserver);
      }
    }
    vi.stubGlobal('IntersectionObserver', StubObserver);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(host as typeof Host);
    // The sentinel and the observer are set up in `afterNextRender`, which under
    // zoneless CD runs in a macrotask — a synchronous `detectChanges()` alone leaves
    // the directive half-built and every assertion below meaningless.
    // The scroller host has no `offset` signal — it exists to prove which
    // element the observer roots at, and takes the directive's default.
    fixture.componentInstance.offset?.set(offset);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  /** Hand the directive one observer entry and let it settle. */
  const report = async (isIntersecting: boolean, where: 'above' | 'below' = 'above'): Promise<void> => {
    observers.forEach(o => o.report(isIntersecting, where));
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
    expect(observers[0].options?.rootMargin).toBe('0px 0px 0px 0px');

    await mount(64);
    expect(observers[0].options?.rootMargin).toBe('-64px 0px 0px 0px');
  });

  it('takes a negative offset, which grows the root above its edge instead', async () => {
    // A negative sticky `top` is valid CSS — the host pins partly above the edge —
    // and the margin used to be built as `-${offset}px`, which made `-10` into
    // `--10px`. A real `IntersectionObserver` refuses that with a SyntaxError, so
    // the state class and `(wrAffixChange)` never fired at all.
    await mount(-10);

    expect(affixed().style.top).toBe('-10px');
    expect(observers[0].options?.rootMargin).toBe('10px 0px 0px 0px');
  });

  it('measures against the element the host sticks to, not the viewport', async () => {
    // `position: sticky` pins against the nearest SCROLLING ancestor, and an
    // observer with no root measures against the viewport. Inside a nested
    // scroller those are different lines, so the state never flipped:
    // `rootBounds.top` read 0 while the host pinned at the container's own
    // top, the one crossing the observer ever delivered computed `false`, and
    // `isIntersecting` stays false afterwards so nothing came again.
    //
    // With no scrolling ancestor the root is `null`, which is the document
    // scroller and what the browser uses for a page-level sticky.
    expect(observers[0].options?.root ?? null).toBeNull();

    // jsdom lays nothing out, so the ancestor is recognised the way
    // `scrollParent` recognises it: a computed `overflow` that scrolls, and a
    // `scrollHeight` past its `clientHeight`. Both are stubbed here.
    // Stubbed BEFORE the mount, because `scrollParent` reads them while the
    // observer is being built.
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => 500 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 100 });
    try {
      await mount(0, [], ScrollerHost);
      const scroller = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.scroller')!;
      expect(observers[observers.length - 1].options?.root).toBe(scroller);
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollHeight');
      Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight');
    }
  });

  it('moves the trigger line with the offset, not only the pinning line', async () => {
    // `rootMargin` is fixed for an observer's lifetime, so following the input means
    // building a new observer and dropping the old one. A collapsing header that
    // animates its offset would otherwise pin at the new line and keep flipping state
    // at the old one — visible only while scrolling, which is why nothing caught it.
    expect(observers).toHaveLength(1);
    expect(observers[0].options?.rootMargin).toBe('0px 0px 0px 0px');

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
  /**
   * A sticky element that starts below the first screen. The observer's very
   * first callback reports `isIntersecting: false` — the sentinel is off-screen
   * DOWNWARD — and the directive used to read that as "affixed", so the class
   * appeared and a transition was emitted before anything scrolled.
   *
   * Not reachable by any gate: jsdom lays nothing out, so only a stub that
   * carries the geometry can tell the two directions apart, and there was none.
   */
  it('is not affixed merely because the host starts below the fold', async () => {
    await report(false, 'below');

    expect(isActive()).toBe(false);
    expect(fixture.componentInstance.events).toEqual([]);
  });

  it('becomes affixed once the sentinel has actually gone past the line', async () => {
    await report(false, 'below');
    await report(true);
    await report(false, 'above');

    expect(isActive()).toBe(true);
    expect(fixture.componentInstance.events).toEqual([true]);
  });

  /**
   * A flow sentinel is inert only in block layout. In a flex parent it is an item,
   * with a `gap` on each side; in a grid parent it takes a cell and shifts every item
   * after it. There it leaves the flow and is placed by measurement instead.
   *
   * jsdom computes `display` from the inline style but lays nothing out, so the host's
   * offsets are supplied: 120 / 40 where it sits in the flow, 300 / 90 wherever the
   * sticky shift has moved it — a sentinel placed from the second pair would mark the
   * stuck position rather than the line the host leaves its place at.
   */
  describe('in a flex or grid parent', () => {
    let resizeObservers: { targets: Element[]; fire: () => void; disconnected: boolean }[];
    const natural = { top: 120, left: 40 };

    const layout = (): HTMLElement => root().querySelector<HTMLElement>('.layout')!;

    const mountIn = async (host: unknown): Promise<void> => {
      resizeObservers = [];
      class StubResizeObserver {
        readonly targets: Element[] = [];
        disconnected = false;
        constructor(private readonly callback: ResizeObserverCallback) {
          resizeObservers.push(this);
        }
        observe(target: Element): void {
          this.targets.push(target);
          this.disconnected = false;
        }
        disconnect(): void {
          this.targets.length = 0;
          this.disconnected = true;
        }
        fire(): void {
          this.callback([], this as unknown as ResizeObserver);
        }
      }
      const offset = (flow: () => number, stuck: number) =>
        function (this: HTMLElement): number {
          if (!this.classList.contains('wr-affix')) return 0;
          return this.style.position === 'static' ? flow() : stuck;
        };
      Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
        configurable: true,
        get: offset(() => natural.top, 300),
      });
      Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
        configurable: true,
        get: offset(() => natural.left, 90),
      });
      // Stubbed before `mount`, not after: the sentinel is placed in the
      // `afterNextRender` the mount awaits.
      vi.stubGlobal('ResizeObserver', StubResizeObserver);
      await mount(0, [], host);
    };

    afterEach(() => {
      Reflect.deleteProperty(HTMLElement.prototype, 'offsetTop');
      Reflect.deleteProperty(HTMLElement.prototype, 'offsetLeft');
      natural.top = 120;
      natural.left = 40;
    });

    it('takes the sentinel out of the flow, at zero size, in either kind of parent', async () => {
      for (const host of [GridHost, FlexHost]) {
        await mountIn(host);
        const marker = sentinel()!;

        // Still the host's previous sibling, so everything above about which
        // element is observed holds — only its box is gone from the layout.
        expect(affixed().previousElementSibling, host.name).toBe(marker);
        expect(marker.style.position, host.name).toBe('absolute');
        expect([marker.style.width, marker.style.height], host.name).toEqual(['0px', '0px']);
        expect(observers[observers.length - 1].targets, host.name).toEqual([marker]);
      }
    });

    it('puts the sentinel on the host natural top edge, read with sticky switched off', async () => {
      await mountIn(GridHost);

      expect([sentinel()!.style.top, sentinel()!.style.left]).toEqual(['120px', '40px']);
      // The measurement borrows the host's position for one synchronous read.
      expect(affixed().style.position).toBe('sticky');
    });

    it('makes a static parent the containing block, and gives it back on destroy', async () => {
      // An absolute box scrolls with a scroller's content only when its containing
      // block is inside that scroller — otherwise it holds still while the host
      // scrolls away, and the state never flips. No stylesheet is loaded here, so
      // nothing positions the tagged parent and the inline fallback is what does it.
      await mountIn(GridHost);
      const parent = layout();
      expect(parent.classList).toContain('wr-affix__container');
      expect(parent.style.position).toBe('relative');

      fixture.destroy();
      expect(parent.style.position).toBe('');
      expect(parent.classList).not.toContain('wr-affix__container');
    });

    it('tags the parent rather than styling it when ngwr/affix is loaded, so an author position wins', async () => {
      // An inline `position` beats every stylesheet rule on the parent, so a
      // sidebar a media query makes `fixed` on phones stayed `relative`. The
      // library rule is `:where()`: zero specificity, so the author rule wins even
      // declared BEFORE it.
      const sheet = document.createElement('style');
      sheet.textContent = affixCss();
      document.head.append(sheet);
      try {
        await mountIn(GridHost);
        const parent = layout();
        expect(parent.style.position).toBe('');
        expect(parent.classList).toContain('wr-affix__container');
        expect(getComputedStyle(parent).position).toBe('relative');

        const author = document.createElement('style');
        author.textContent = '.layout { position: fixed; }';
        document.head.prepend(author);
        try {
          expect(getComputedStyle(parent).position).toBe('fixed');
        } finally {
          author.remove();
        }

        fixture.destroy();
        expect(parent.classList).not.toContain('wr-affix__container');
        expect(parent.style.position).toBe('');
      } finally {
        sheet.remove();
      }
    });

    it('keeps the parent the containing block until the last affix in it is gone', async () => {
      // Group headers in a filtered list: the first one to mount is not the last
      // one to leave. When it took the parent's `relative` with it, the survivor's
      // sentinel was laid out against a box outside the scroller and never flipped.
      await mountIn(GroupsHost);
      const parent = layout();
      const marker = root().querySelector('.second')!.previousElementSibling as HTMLElement;
      expect(marker.classList).toContain('wr-affix__sentinel');
      const placed = [marker.style.position, marker.style.top, marker.style.left];

      (fixture.componentInstance as unknown as GroupsHost).first.set(false);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(root().querySelector('.first')).toBeNull();
      expect(root().querySelectorAll('.wr-affix__sentinel')).toHaveLength(1);
      expect(parent.style.position).toBe('relative');
      expect(parent.classList).toContain('wr-affix__container');
      expect(marker.isConnected).toBe(true);
      expect([marker.style.position, marker.style.top, marker.style.left]).toEqual(placed);

      fixture.destroy();
      expect(parent.classList).not.toContain('wr-affix__container');
      expect(parent.style.position).toBe('');
    });

    it('leaves a parent that is already positioned alone', async () => {
      await mountIn(PositionedFlexHost);
      const parent = layout();
      expect(sentinel()!.style.position).toBe('absolute');
      expect(parent.style.position).toBe('absolute');

      fixture.destroy();
      expect(parent.style.position).toBe('absolute');
    });

    it('follows the layout: re-measured when the parent or anything before the host resizes', async () => {
      await mountIn(FlexHost);
      const [resize] = resizeObservers;
      const before = root().querySelector('.before')!;
      const after = root().querySelector('.after')!;

      expect(resize.targets).toEqual(expect.arrayContaining([layout(), affixed(), before]));
      // Nothing after the host moves its top.
      expect(resize.targets).not.toContain(after);
      expect(resize.targets).not.toContain(sentinel());

      natural.top = 200;
      resize.fire();
      expect(sentinel()!.style.top).toBe('200px');

      fixture.destroy();
      expect(resize.disconnected).toBe(true);
    });

    it('re-measures when an element is inserted before the host, and watches it', async () => {
      // A notice appearing above a section header in a fixed-height scroll panel
      // moves the host without resizing anything already watched, and the class
      // flipped early by the notice's height.
      await mountIn(FlexHost);
      const [resize] = resizeObservers;
      const notice = document.createElement('p');
      layout().insertBefore(notice, root().querySelector('.before'));
      natural.top = 220;
      // A MutationObserver delivers in a microtask.
      await Promise.resolve();

      expect(sentinel()!.style.top).toBe('220px');
      expect(resize.targets).toContain(notice);

      const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
      fixture.destroy();
      expect(disconnect).toHaveBeenCalled();
    });

    it('keeps the block-layout sentinel exactly as it was', async () => {
      await mountIn(Host);
      const marker = sentinel()!;

      expect(marker.style.position).toBe('');
      expect(marker.style.width).toBe('100%');
      expect(marker.style.top).toBe('');
      expect(root().querySelector<HTMLElement>('.scroller')!.style.position).toBe('');
      expect(resizeObservers).toEqual([]);
    });
  });
});
