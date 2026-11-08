import { Component, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WORD_ROTATOR_HOLD, WrWordRotator } from './word-rotator';

@Component({
  imports: [WrWordRotator],
  template: `<p>
    Zoneless,
    <wr-word-rotator
      [words]="words()"
      [hold]="hold()"
      [delay]="delay()"
      [loop]="loop()"
      [conjunctionLabel]="conjunction()"
    />
    — with no accessor layer.
  </p>`,
})
class Host {
  readonly words = signal<readonly string[]>(['tree-shakable', 'accessible', 'RTL-ready', 'themeable']);
  readonly hold = signal(WORD_ROTATOR_HOLD);
  readonly delay = signal(0);
  readonly loop = signal(false);
  readonly conjunction = signal<string | null>(null);
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

interface PlatformStub {
  readonly prefersReducedMotion: WritableSignal<boolean>;
  readonly pageVisible: WritableSignal<boolean>;
}

const stub = (reduced = false): PlatformStub => ({ prefersReducedMotion: signal(reduced), pageVisible: signal(true) });

const platform = (value: PlatformStub): unknown => ({ provide: WrPlatform, useValue: value });

const SLOT = '.wr-word-rotator__slot';
const SR = '.wr-word-rotator__sr';
const OUT = '.wr-word-rotator__letter--out';
const IN = '.wr-word-rotator__letter--in';
const PHRASE = 'tree-shakable, accessible, RTL-ready and themeable';

/** Each word is as wide as it is long, in px, so a measured width is readable in a spec. */
const PX_PER_LETTER = 10;

/** A `getBoundingClientRect` that answers `perLetter` px per character of the element's text. */
const rects = (perLetter: number) =>
  function (this: Element): DOMRect {
    const width = (this.textContent?.length ?? 0) * perLetter;
    return { width, height: 20, top: 0, left: 0, right: width, bottom: 20, x: 0, y: 0, toJSON: () => ({}) };
  };

describe('WrWordRotator', () => {
  let rect: ReturnType<typeof vi.fn<() => DOMRect>>;

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
    fixture.nativeElement.querySelector<HTMLElement>('wr-word-rotator')!;

  const slot = (el: HTMLElement): HTMLElement => el.querySelector<HTMLElement>(SLOT)!;

  const swapping = (el: HTMLElement): boolean => el.classList.contains('wr-word-rotator--swap');

  const texts = (el: HTMLElement, selector: string): string[] =>
    Array.from(el.querySelectorAll<HTMLElement>(selector)).map(letter => letter.textContent ?? '');

  const view = (fixture: { detectChanges(): void }, intersecting: boolean): void => {
    StubIntersectionObserver.instances[0].fire(intersecting);
    fixture.detectChanges();
  };

  /** The clock runs `ms`, then the DOM catches up. */
  const tick = (fixture: { detectChanges(): void }, ms: number): void => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };

  /** The last letter arriving lands, as the browser would report it. */
  const land = (fixture: { detectChanges(): void }, el: HTMLElement): void => {
    const letters = el.querySelectorAll<HTMLElement>(IN);
    letters[letters.length - 1].dispatchEvent(new Event('animationend', { bubbles: true }));
    fixture.detectChanges();
  };

  /** One whole swap: the hold runs out and the new word lands. */
  const next = (fixture: { detectChanges(): void }, el: HTMLElement): void => {
    tick(fixture, WORD_ROTATOR_HOLD);
    land(fixture, el);
  };

  beforeEach(() => {
    StubIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
    rect = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(rects(PX_PER_LETTER));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('shows the first word as plain text in a hidden slot, and every word once for a screen reader', async () => {
    const fixture = await render();
    const el = target(fixture);

    expect(slot(el).getAttribute('aria-hidden')).toBe('true');
    expect(slot(el).textContent).toBe('tree-shakable');
    expect(el.querySelectorAll(OUT)).toHaveLength(0);
    expect(el.querySelectorAll(IN)).toHaveLength(0);
    expect(swapping(el)).toBe(false);
    const sr = el.querySelector<HTMLElement>(SR)!;
    expect(sr.textContent).toBe(PHRASE);
    expect(sr.getAttribute('aria-hidden')).toBeNull();
    // What is left for a reader once the hidden slot is out: the sentence with the phrase in it.
    const sentence = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('p')!
      .cloneNode(true) as HTMLElement;
    sentence.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove());
    expect(sentence.textContent?.replace(/\s+/g, ' ').trim()).toBe(`Zoneless, ${PHRASE} — with no accessor layer.`);
  });

  it('joins the phrase with the conjunction it is given', async () => {
    const fixture = await render(undefined, host => host.conjunction.set('or'));

    expect(target(fixture).querySelector(SR)?.textContent).toBe('tree-shakable, accessible, RTL-ready or themeable');
  });

  it('takes the conjunction from the i18n catalog when no input overrides it', async () => {
    const fixture = await render([
      platform(stub()),
      provideWrI18n({ defaultLocale: 'xx', availableLocales: ['xx'] }),
      provideWrI18nStaticLoader({ xx: { wordRotator: { conjunction: 'und' } } }),
    ]);
    // The static loader resolves through a promise even for a catalog already in memory.
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(target(fixture).querySelector(SR)?.textContent).toBe('tree-shakable, accessible, RTL-ready und themeable');

    fixture.componentInstance.conjunction.set('or');
    fixture.detectChanges();
    expect(target(fixture).querySelector(SR)?.textContent).toBe('tree-shakable, accessible, RTL-ready or themeable');
  });

  it('renders the same first word on the server and watches nothing', async () => {
    const fixture = await render([{ provide: PLATFORM_ID, useValue: 'server' }]);
    const el = target(fixture);

    expect(slot(el).textContent).toBe('tree-shakable');
    expect(el.querySelector(SR)?.textContent).toBe(PHRASE);
    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(slot(el).style.width).toBe('');
  });

  it('watches for most of the host to be in view and holds the first word until then', async () => {
    const fixture = await render();
    const el = target(fixture);
    const observer = StubIntersectionObserver.instances[0];

    expect(observer.options?.threshold).toBeGreaterThanOrEqual(0.5);
    expect(observer.observe).toHaveBeenCalledWith(el);

    tick(fixture, WORD_ROTATOR_HOLD * 3);
    expect(slot(el).textContent).toBe('tree-shakable');
    expect(swapping(el)).toBe(false);
  });

  it('swaps letter by letter after the hold, and holds the plain word again once the last letter lands', async () => {
    const fixture = await render();
    const el = target(fixture);
    view(fixture, true);

    tick(fixture, WORD_ROTATOR_HOLD - 1);
    expect(swapping(el)).toBe(false);

    tick(fixture, 1);
    expect(swapping(el)).toBe(true);
    expect(texts(el, OUT)).toEqual([...'tree-shakable']);
    expect(texts(el, IN)).toEqual([...'accessible']);
    expect(
      Array.from(el.querySelectorAll<HTMLElement>(IN)).map(l => l.style.getPropertyValue('--wr-word-rotator-i'))
    ).toEqual([...'accessible'].map((_, i) => String(i)));
    expect(slot(el).style.getPropertyValue('--wr-word-rotator-count')).toBe('13');
    expect(slot(el).textContent).toBe('tree-shakableaccessible');

    // A letter leaving, or one arriving that is not the last, ends nothing.
    el.querySelectorAll<HTMLElement>(OUT)[12].dispatchEvent(new Event('animationend', { bubbles: true }));
    el.querySelectorAll<HTMLElement>(IN)[0].dispatchEvent(new Event('animationend', { bubbles: true }));
    fixture.detectChanges();
    expect(swapping(el)).toBe(true);

    land(fixture, el);
    expect(swapping(el)).toBe(false);
    expect(slot(el).textContent).toBe('accessible');
    expect(el.querySelectorAll(IN)).toHaveLength(0);
    expect(el.querySelector(SR)?.textContent).toBe(PHRASE);
  });

  it('splits by grapheme, so an accent or an emoji never parts', async () => {
    const fixture = await render(undefined, host => host.words.set(['Héllo', '👋🏽 wörld']));
    const el = target(fixture);
    view(fixture, true);
    tick(fixture, WORD_ROTATOR_HOLD);

    expect(texts(el, OUT)).toEqual(['H', 'é', 'l', 'l', 'o']);
    expect(texts(el, IN)).toEqual(['👋🏽', ' ', 'w', 'ö', 'r', 'l', 'd']);
    expect(slot(el).style.getPropertyValue('--wr-word-rotator-count')).toBe('7');
  });

  it('comes back to the first word after one pass and stays', async () => {
    const fixture = await render();
    const el = target(fixture);
    view(fixture, true);

    next(fixture, el);
    expect(slot(el).textContent).toBe('accessible');
    next(fixture, el);
    expect(slot(el).textContent).toBe('RTL-ready');
    next(fixture, el);
    expect(slot(el).textContent).toBe('themeable');
    next(fixture, el);
    expect(slot(el).textContent).toBe('tree-shakable');

    tick(fixture, WORD_ROTATOR_HOLD * 5);
    expect(swapping(el)).toBe(false);
    expect(slot(el).textContent).toBe('tree-shakable');

    // Nor does leaving and coming back start it over.
    view(fixture, false);
    view(fixture, true);
    tick(fixture, WORD_ROTATOR_HOLD * 2);
    expect(slot(el).textContent).toBe('tree-shakable');
    expect(swapping(el)).toBe(false);
  });

  it('keeps cycling with `loop`', async () => {
    const fixture = await render(undefined, host => host.loop.set(true));
    const el = target(fixture);
    view(fixture, true);

    for (const word of ['accessible', 'RTL-ready', 'themeable', 'tree-shakable', 'accessible', 'RTL-ready']) {
      next(fixture, el);
      expect(slot(el).textContent).toBe(word);
    }
  });

  it('spends the delay once, before the first hold', async () => {
    const fixture = await render(undefined, host => host.delay.set(1700));
    const el = target(fixture);
    view(fixture, true);

    tick(fixture, WORD_ROTATOR_HOLD + 1699);
    expect(swapping(el)).toBe(false);
    tick(fixture, 1);
    expect(swapping(el)).toBe(true);
    land(fixture, el);

    tick(fixture, WORD_ROTATOR_HOLD);
    expect(swapping(el)).toBe(true);
    expect(texts(el, IN)).toEqual([...'RTL-ready']);
  });

  it('takes its own hold', async () => {
    const fixture = await render(undefined, host => host.hold.set(500));
    const el = target(fixture);
    view(fixture, true);

    tick(fixture, 499);
    expect(swapping(el)).toBe(false);
    tick(fixture, 1);
    expect(swapping(el)).toBe(true);
  });

  it('pauses the hold while the pointer is over the sentence, or focus is in it, and resumes after', async () => {
    const fixture = await render();
    const el = target(fixture);
    const sentence = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('p')!;
    view(fixture, true);
    tick(fixture, WORD_ROTATOR_HOLD / 2);

    sentence.dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();
    tick(fixture, WORD_ROTATOR_HOLD * 3);
    expect(swapping(el)).toBe(false);
    expect(slot(el).textContent).toBe('tree-shakable');

    sentence.dispatchEvent(new Event('pointerleave'));
    fixture.detectChanges();
    tick(fixture, WORD_ROTATOR_HOLD);
    expect(swapping(el)).toBe(true);
    land(fixture, el);
    expect(slot(el).textContent).toBe('accessible');

    sentence.dispatchEvent(new Event('focusin', { bubbles: true }));
    fixture.detectChanges();
    tick(fixture, WORD_ROTATOR_HOLD * 3);
    expect(slot(el).textContent).toBe('accessible');

    sentence.dispatchEvent(new Event('focusout', { bubbles: true }));
    fixture.detectChanges();
    tick(fixture, WORD_ROTATOR_HOLD);
    expect(texts(el, IN)).toEqual([...'RTL-ready']);
  });

  it('lets a swap in flight finish under the pointer and holds the new word until the pointer leaves', async () => {
    const fixture = await render();
    const el = target(fixture);
    const sentence = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('p')!;
    view(fixture, true);
    tick(fixture, WORD_ROTATOR_HOLD);
    expect(swapping(el)).toBe(true);

    sentence.dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();
    land(fixture, el);
    expect(slot(el).textContent).toBe('accessible');
    tick(fixture, WORD_ROTATOR_HOLD * 3);
    expect(swapping(el)).toBe(false);

    sentence.dispatchEvent(new Event('pointerleave'));
    fixture.detectChanges();
    tick(fixture, WORD_ROTATOR_HOLD);
    expect(swapping(el)).toBe(true);
  });

  it('pauses off screen and while the document is hidden, and resumes when both are back', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    const el = target(fixture);
    view(fixture, true);
    tick(fixture, WORD_ROTATOR_HOLD / 2);

    view(fixture, false);
    tick(fixture, WORD_ROTATOR_HOLD * 3);
    expect(swapping(el)).toBe(false);

    view(fixture, true);
    page.pageVisible.set(false);
    fixture.detectChanges();
    tick(fixture, WORD_ROTATOR_HOLD * 3);
    expect(swapping(el)).toBe(false);

    page.pageVisible.set(true);
    fixture.detectChanges();
    tick(fixture, WORD_ROTATOR_HOLD);
    expect(swapping(el)).toBe(true);
    expect(texts(el, IN)).toEqual([...'accessible']);
  });

  it('never swaps under reduced motion, and stops when motion is reduced while it runs', async () => {
    const reduced = await render([platform(stub(true))]);
    expect(StubIntersectionObserver.instances).toHaveLength(0);
    tick(reduced, WORD_ROTATOR_HOLD * 3);
    expect(slot(target(reduced)).textContent).toBe('tree-shakable');
    expect(swapping(target(reduced))).toBe(false);
    TestBed.resetTestingModule();
    vi.useRealTimers();

    const page = stub();
    const fixture = await render([platform(page)]);
    const el = target(fixture);
    view(fixture, true);
    next(fixture, el);
    expect(slot(el).textContent).toBe('accessible');

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();
    tick(fixture, WORD_ROTATOR_HOLD * 3);
    expect(slot(el).textContent).toBe('accessible');
    expect(swapping(el)).toBe(false);
  });

  it('puts the plain word back when the animation is cancelled', async () => {
    const fixture = await render();
    const el = target(fixture);
    view(fixture, true);
    tick(fixture, WORD_ROTATOR_HOLD);
    expect(swapping(el)).toBe(true);

    el.querySelectorAll<HTMLElement>(IN)[2].dispatchEvent(new Event('animationcancel', { bubbles: true }));
    fixture.detectChanges();

    expect(swapping(el)).toBe(false);
    expect(slot(el).textContent).toBe('accessible');
  });

  it('does nothing without IntersectionObserver, or with one word', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const bare = await render();
    tick(bare, WORD_ROTATOR_HOLD * 3);
    expect(slot(target(bare)).textContent).toBe('tree-shakable');
    expect(swapping(target(bare))).toBe(false);
    TestBed.resetTestingModule();
    vi.useRealTimers();

    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
    const single = await render(undefined, host => host.words.set(['only']));
    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(slot(target(single)).textContent).toBe('only');
    expect(target(single).querySelector(SR)?.textContent).toBe('only');
  });

  it('measures every word once, in the slot, and sets the slot to the width of the word on show', async () => {
    const fixture = await render();
    const el = target(fixture);

    // Measured at render, since jsdom has no `document.fonts`: the first word's width from the start.
    expect(slot(el).style.width).toBe(`${'tree-shakable'.length * PX_PER_LETTER}px`);
    expect(el.querySelector('.wr-word-rotator__probe')).toBeNull();
    const reads = rect.mock.calls.length;
    expect(reads).toBe(4);

    view(fixture, true);
    tick(fixture, WORD_ROTATOR_HOLD);
    expect(slot(el).style.width).toBe(`${'accessible'.length * PX_PER_LETTER}px`);
    land(fixture, el);
    tick(fixture, WORD_ROTATOR_HOLD);
    expect(slot(el).style.width).toBe(`${'RTL-ready'.length * PX_PER_LETTER}px`);
    // No layout read per swap.
    expect(rect.mock.calls.length).toBe(reads);
  });

  it('measures again on resize', async () => {
    const fixture = await render();
    const el = target(fixture);
    rect.mockImplementation(rects(PX_PER_LETTER * 2));

    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();

    expect(slot(el).style.width).toBe(`${'tree-shakable'.length * PX_PER_LETTER * 2}px`);
  });

  it('stops observing, drops its listeners and its timer on destroy', async () => {
    const fixture = await render();
    const el = target(fixture);
    const sentence = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('p')!;
    const observer = StubIntersectionObserver.instances[0];
    view(fixture, true);
    tick(fixture, WORD_ROTATOR_HOLD / 2);

    fixture.destroy();

    expect(observer.disconnect).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(() => {
      sentence.dispatchEvent(new Event('pointerenter'));
      sentence.dispatchEvent(new Event('pointerleave'));
      window.dispatchEvent(new Event('resize'));
      vi.advanceTimersByTime(WORD_ROTATOR_HOLD * 3);
    }).not.toThrow();
    expect(swapping(el)).toBe(false);
  });
});
