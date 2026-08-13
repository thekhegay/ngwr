import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, type Provider, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrBlurText } from 'ngwr/blur-text';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrBlurTextHarness } from './wr-blur-text-harness';

@Component({
  imports: [WrBlurText],
  template: ` <wr-blur-text [text]="text()" [animateBy]="animateBy()" (animationComplete)="done = done + 1" />`,
})
class Host {
  readonly text = signal('Hi there');
  readonly animateBy = signal<'chars' | 'words'>('words');
  done = 0;
}

/** Two reveals on one page — the only setup in which the filters mean anything. */
@Component({
  imports: [WrBlurText],
  template: `
    <wr-blur-text text="Ship it" />
    <wr-blur-text text="Later" animateBy="chars" />
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
 * the component starts an observer from `afterNextRender` and another from its own
 * effect.
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
 * public classes the harness documents. The two exceptions are marked where they happen
 * — the component writes `aria-hidden` on every piece from one template, so only a
 * tampered DOM can ask whether the harness really wants all of them.
 */
describe('WrBlurTextHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let fires: (() => void)[];

  const blurText = (): Promise<WrBlurTextHarness> => loader.getHarness(WrBlurTextHarness);

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

  afterEach(() => {
    fixture.destroy();
    Reflect.deleteProperty(Element.prototype, 'animate');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('carries the whole string once, where a screen reader can reach it', async () => {
    expect(await (await blurText()).getAccessibleText()).toBe('Hi there');

    fixture.componentInstance.text.set('Welcome to ngwr');
    await fixture.whenStable();

    expect(await (await blurText()).getAccessibleText()).toBe('Welcome to ngwr');
  });

  it('splits by word by default, and by character when asked', async () => {
    const text = await blurText();
    expect(await text.getPieces()).toEqual(['Hi', 'there']);

    fixture.componentInstance.animateBy.set('chars');
    await fixture.whenStable();

    expect(await text.getPieces()).toEqual(['H', 'i', 't', 'h', 'e', 'r', 'e']);
  });

  it('keeps a surrogate pair in one piece', async () => {
    fixture.componentInstance.text.set('a🚀');
    fixture.componentInstance.animateBy.set('chars');
    await fixture.whenStable();

    // Two pieces, not three: a naive index-by-index split halves the pair and draws two
    // replacement glyphs, which the accessible copy would go on reporting correctly.
    expect(await (await blurText()).getPieces()).toEqual(['a', '🚀']);
  });

  it('counts the pieces and the whitespace apart', async () => {
    const text = await blurText();
    expect([await text.getPieceCount(), await text.getSpaceCount()]).toEqual([2, 1]);

    fixture.componentInstance.animateBy.set('chars');
    await fixture.whenStable();

    // Same one space, seven pieces now — whitespace is never staggered, whichever
    // granularity the rest of the string is split at.
    expect([await text.getPieceCount(), await text.getSpaceCount()]).toEqual([7, 1]);
  });

  it('puts the split back together exactly, whitespace and all', async () => {
    const text = await blurText();
    expect(await text.getRenderedText()).toBe(await text.getAccessibleText());

    fixture.componentInstance.text.set('  two  spaces  ');
    fixture.componentInstance.animateBy.set('chars');
    await fixture.whenStable();

    // The round trip is the point: leading, doubled and trailing whitespace all have to
    // survive the split, and a trimmed read on either side would forgive losing them.
    expect(await text.getRenderedText()).toBe('  two  spaces  ');
    expect(await text.getRenderedText()).toBe(await text.getAccessibleText());
  });

  it('keeps every drawn piece out of the accessibility tree', async () => {
    expect(await (await blurText()).isTextHidden()).toBe(true);

    fixture.componentInstance.animateBy.set('chars');
    await fixture.whenStable();

    expect(await (await blurText()).isTextHidden()).toBe(true);
  });

  it('stops calling the text hidden as soon as one piece is readable', async () => {
    const text = await blurText();
    const piece = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-blur-text__piece')!;

    piece.removeAttribute('aria-hidden');

    // Every piece comes from one template branch, so only a tampered DOM can ask whether
    // this is all-or-nothing. It has to be: one readable span is enough for a screen
    // reader to start spelling the word out beside the copy it already read.
    expect(await text.isTextHidden()).toBe(false);
  });

  it('refuses to call an empty reveal hidden', async () => {
    fixture.componentInstance.text.set('');
    await fixture.whenStable();

    const text = await blurText();
    expect([await text.getPieceCount(), await text.getRenderedText()]).toEqual([0, '']);

    // "Every piece is hidden" is true of no pieces at all, which is exactly what a
    // component that stopped splitting its text would report.
    await expect(text.isTextHidden()).rejects.toThrow(/drew no pieces/);
  });

  it('leaves the pieces alone for a reader who asked for less motion', async () => {
    const text = await blurText();
    expect(await text.hasStagedMotion()).toBe(false);

    await enterViewport();

    // The whole reduced-motion promise: the component reports completion and returns
    // WITHOUT staging anything, so the text cannot be left parked at `opacity: 0` by a
    // tween that never runs.
    expect(await text.hasStagedMotion()).toBe(false);
    expect(fixture.componentInstance.done).toBe(1);
  });

  it('takes the pieces over once it is seen, and stays taken over', async () => {
    stubAnimate();
    await mount([]);

    const text = await blurText();
    expect(await text.hasStagedMotion()).toBe(false);

    await enterViewport();

    // `true` says the reveal owns the pieces' inline styles — not that anything is in
    // flight. It stays true after the tween commits its end state to the same
    // properties, which is why this is not spelled `isAnimating()`.
    expect(await text.hasStagedMotion()).toBe(true);
  });

  it('reports a half-staged stagger rather than passing it off as untouched', async () => {
    // No `animate` stub: jsdom throws on the first `el.animate(...)`, after that piece's
    // inline styles were already written. One invisible glyph and the rest of the string
    // in place is a real failure mode, and an all-pieces reading would call it clean.
    await mount([]);
    const text = await blurText();

    expect(() => fires.forEach(fire => fire())).toThrow();

    expect(await text.hasStagedMotion()).toBe(true);
  });
});

describe('WrBlurTextHarness filters', () => {
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

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('matches on the string the reveal announces', async () => {
    const shipping = await loader.getHarness(WrBlurTextHarness.with({ text: 'Ship it' }));
    expect(await shipping.getPieces()).toEqual(['Ship', 'it']);

    expect(await loader.getHarnessOrNull(WrBlurTextHarness.with({ text: /^Later$/ }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrBlurTextHarness.with({ text: 'Ship' }))).toBeNull();
  });

  it('matches on the piece count', async () => {
    // 'Ship it' is two words; 'Later' is five characters. The count is what tells two
    // reveals of the same string apart when only the granularity differs.
    expect(await (await loader.getHarness(WrBlurTextHarness.with({ pieceCount: 2 }))).getAccessibleText()).toBe(
      'Ship it'
    );
    expect(await (await loader.getHarness(WrBlurTextHarness.with({ pieceCount: 5 }))).getAccessibleText()).toBe(
      'Later'
    );
    expect(await loader.getHarnessOrNull(WrBlurTextHarness.with({ pieceCount: 3 }))).toBeNull();
  });
});
