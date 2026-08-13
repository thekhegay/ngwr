import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, type Provider, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { WrSplitText, type WrSplitTextUnit } from 'ngwr/split-text';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrSplitTextHarness } from './wr-split-text-harness';

@Component({
  imports: [WrSplitText],
  template: `
    <wr-split-text
      [text]="text()"
      [splitType]="splitType()"
      [textAlign]="textAlign()"
      (animationComplete)="done = done + 1"
    />
  `,
})
class Host {
  readonly text = signal('Hi there');
  readonly splitType = signal<WrSplitTextUnit>('chars');
  readonly textAlign = signal<'left' | 'center' | 'right' | 'justify'>('center');
  done = 0;
}

/** Two reveals on one page — the only setup in which the filters mean anything. */
@Component({
  imports: [WrSplitText],
  template: `
    <wr-split-text text="Hello" textAlign="center" />
    <wr-split-text text="Hi there" splitType="words" textAlign="right" />
  `,
})
class TwoHost {}

/**
 * jsdom has no `matchMedia` at all, so `WrPlatform` reports `false` for everything and
 * the reduced-motion branch is unreachable through a media query. A value provider is
 * the only way in.
 */
const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: signal(false).asReadonly(),
  prefersReducedMotion: signal(true).asReadonly(),
};

/**
 * The house `IntersectionObserver` stub — jsdom has none, and the reveal is triggered by
 * one. Returns the fire callbacks; there are two of them after a first render, because
 * the component starts an observer from `afterNextRender` and another from its effect.
 */
function stubIntersectionObserver(): (() => void)[] {
  const fires: (() => void)[] = [];

  class StubObserver {
    constructor(private readonly cb: IntersectionObserverCallback) {}
    observe(): void {
      fires.push(() =>
        this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
      );
    }
    disconnect(): void {
      /* nothing to release in the stub */
    }
  }
  vi.stubGlobal('IntersectionObserver', StubObserver);

  return fires;
}

/**
 * jsdom implements no Web Animations API. Without this the stagger throws on the first
 * piece — AFTER staging its inline styles — and leaves the rest of the text untouched,
 * which is a half-animated DOM rather than a clean failure.
 */
function stubAnimate(): void {
  Reflect.set(Element.prototype, 'animate', () => ({ cancel: () => undefined, onfinish: null }));
}

/**
 * Used as a consumer would: through the loader, with nothing reached into past the
 * public classes the harness documents. The one exception is marked where it happens —
 * every piece gets its `aria-hidden` from one template branch, so only a tampered DOM
 * can ask whether the harness really wants all of them.
 *
 * Observation is queued off `document.fonts.ready`, which jsdom does not have, so it
 * lands a microtask late: every mount settles before it asserts, and so does every
 * teardown — an `observe()` arriving after `destroy()` registers a teardown on a dead
 * `DestroyRef` and throws NG0911 into whichever test runs next.
 */
describe('WrSplitTextHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let fires: (() => void)[];

  const splitText = (): Promise<WrSplitTextHarness> => loader.getHarness(WrSplitTextHarness);

  const mount = async (providers: Provider[] = [{ provide: WrPlatform, useValue: reducedMotion }]): Promise<void> => {
    fires = stubIntersectionObserver();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();

    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  /** Scroll it into view, the way the observer would — the harness offers no such thing. */
  const enterViewport = async (): Promise<void> => {
    fires.forEach(fire => fire());
    await fixture.whenStable();
  };

  beforeEach(async () => mount());

  afterEach(async () => {
    await fixture.whenStable();
    fixture.destroy();
    Reflect.deleteProperty(Element.prototype, 'animate');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('carries the whole string once, where a screen reader can reach it', async () => {
    expect(await (await splitText()).getAccessibleText()).toBe('Hi there');

    fixture.componentInstance.text.set('Hello, ngwr!');
    await fixture.whenStable();

    expect(await (await splitText()).getAccessibleText()).toBe('Hello, ngwr!');
  });

  it('splits by character by default, and by word when asked', async () => {
    const text = await splitText();
    expect(await text.getPieces()).toEqual(['H', 'i', 't', 'h', 'e', 'r', 'e']);

    fixture.componentInstance.splitType.set('words');
    await fixture.whenStable();

    expect(await text.getPieces()).toEqual(['Hi', 'there']);
  });

  it('keeps a surrogate pair in one piece', async () => {
    fixture.componentInstance.text.set('a🚀');
    await fixture.whenStable();

    // Two pieces, not three: an index-by-index split halves the pair into two broken
    // glyphs, and the accessible copy would go on reporting the string correctly.
    expect(await (await splitText()).getPieces()).toEqual(['a', '🚀']);
  });

  it('counts the pieces and the whitespace apart', async () => {
    const text = await splitText();
    expect([await text.getPieceCount(), await text.getSpaceCount()]).toEqual([7, 1]);

    fixture.componentInstance.splitType.set('words');
    await fixture.whenStable();

    // Two pieces now, and the same single space — whitespace is never staggered,
    // whichever granularity the rest of the string is split at.
    expect([await text.getPieceCount(), await text.getSpaceCount()]).toEqual([2, 1]);
  });

  it('puts the split back together exactly, whitespace and all', async () => {
    const text = await splitText();
    expect(await text.getRenderedText()).toBe(await text.getAccessibleText());

    fixture.componentInstance.text.set('  two  spaces  ');
    await fixture.whenStable();

    // The round trip is the point: leading, doubled and trailing whitespace all have to
    // survive the split, and a trimmed read on either side would forgive losing them.
    expect(await text.getRenderedText()).toBe('  two  spaces  ');
    expect(await text.getRenderedText()).toBe(await text.getAccessibleText());
  });

  it('keeps every drawn piece out of the accessibility tree', async () => {
    expect(await (await splitText()).isTextHidden()).toBe(true);

    fixture.componentInstance.splitType.set('words');
    await fixture.whenStable();

    expect(await (await splitText()).isTextHidden()).toBe(true);
  });

  it('stops calling the text hidden as soon as one piece is readable', async () => {
    const text = await splitText();
    const piece = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-split-text__piece')!;

    piece.removeAttribute('aria-hidden');

    // Every piece gets the attribute from one template branch, so only a tampered DOM
    // can ask whether this is all-or-nothing. It has to be: one readable span is enough
    // for a screen reader to start spelling the word out beside the copy it just read.
    expect(await text.isTextHidden()).toBe(false);
  });

  it('refuses to call an empty reveal hidden', async () => {
    fixture.componentInstance.text.set('');
    await fixture.whenStable();

    const text = await splitText();
    expect([await text.getPieceCount(), await text.getRenderedText()]).toEqual([0, '']);

    // "Every piece is hidden" is true of no pieces at all, which is exactly what a
    // component that stopped splitting its text would report.
    await expect(text.isTextHidden()).rejects.toThrow(/drew no pieces/);
  });

  it('reflects the alignment it was given, and keeps reflecting it', async () => {
    const text = await splitText();
    expect(await text.getTextAlign()).toBe('center');

    fixture.componentInstance.textAlign.set('right');
    await fixture.whenStable();

    // The one input this component puts back into the DOM. Read off the attribute, so a
    // host that stopped writing it answers `null` instead of the inherited default.
    expect(await text.getTextAlign()).toBe('right');
  });

  it('leaves the pieces alone for a reader who asked for less motion', async () => {
    const text = await splitText();
    expect(await text.hasStagedMotion()).toBe(false);

    await enterViewport();

    // The whole reduced-motion promise: completion is reported and nothing is staged, so
    // the text cannot be left parked at `from.opacity: 0` by a tween that never runs.
    expect(await text.hasStagedMotion()).toBe(false);
    expect(fixture.componentInstance.done).toBe(1);

    // The alignment is written by a host binding rather than by the tween, so it is
    // there either way — the two are unrelated, and worth showing as such.
    expect(await text.getTextAlign()).toBe('center');
  });

  it('takes the pieces over once it is seen, and stays taken over', async () => {
    stubAnimate();
    await mount([]);

    const text = await splitText();
    expect(await text.hasStagedMotion()).toBe(false);

    await enterViewport();

    // `true` says the reveal owns the pieces' inline styles — not that anything is in
    // flight. It stays true after the tween commits its end state to the same
    // properties, which is why this is not spelled `isAnimating()`.
    expect(await text.hasStagedMotion()).toBe(true);
  });

  it('reports a half-staged stagger rather than passing it off as untouched', async () => {
    // No `animate` stub: jsdom throws on the first `el.animate(...)`, after that piece's
    // inline styles were already written. One invisible glyph with the rest of the string
    // in place is a real failure mode, and an all-pieces reading would call it clean.
    await mount([]);
    const text = await splitText();

    expect(() => fires.forEach(fire => fire())).toThrow();

    expect(await text.hasStagedMotion()).toBe(true);
  });
});

describe('WrSplitTextHarness filters', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(async () => {
    stubIntersectionObserver();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: WrPlatform, useValue: reducedMotion }] });
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    await fixture.whenStable();

    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(async () => {
    await fixture.whenStable();
    fixture.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('matches on the string the reveal announces', async () => {
    const hello = await loader.getHarness(WrSplitTextHarness.with({ text: 'Hello' }));
    expect(await hello.getPieceCount()).toBe(5);

    expect(await loader.getHarnessOrNull(WrSplitTextHarness.with({ text: /there$/ }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrSplitTextHarness.with({ text: 'Hell' }))).toBeNull();
  });

  it('matches on the piece count', async () => {
    // 'Hello' is five characters; 'Hi there' is two words. The count is what tells two
    // reveals apart when the same string is split at different granularities.
    expect(await (await loader.getHarness(WrSplitTextHarness.with({ pieceCount: 2 }))).getAccessibleText()).toBe(
      'Hi there'
    );
    expect(await loader.getHarnessOrNull(WrSplitTextHarness.with({ pieceCount: 3 }))).toBeNull();
  });

  it('matches on the alignment', async () => {
    // The useful one on a real page: two reveals rarely share an alignment, and it is
    // the one property a spec can name without hard-coding the copy.
    expect(await (await loader.getHarness(WrSplitTextHarness.with({ textAlign: 'right' }))).getAccessibleText()).toBe(
      'Hi there'
    );
    expect(await (await loader.getHarness(WrSplitTextHarness.with({ textAlign: 'center' }))).getAccessibleText()).toBe(
      'Hello'
    );
    expect(await loader.getHarnessOrNull(WrSplitTextHarness.with({ textAlign: 'justify' }))).toBeNull();
  });
});
