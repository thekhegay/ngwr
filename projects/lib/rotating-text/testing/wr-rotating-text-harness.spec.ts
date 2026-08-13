import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, type Provider, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { WrPlatform } from 'ngwr/platform';
import type { WrRotatingTextSplit } from 'ngwr/rotating-text';
import { WrRotatingText } from 'ngwr/rotating-text';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrRotatingTextHarness } from './wr-rotating-text-harness';

@Component({
  imports: [WrRotatingText],
  template: `
    <wr-rotating-text
      [texts]="texts()"
      [splitBy]="splitBy()"
      [auto]="auto()"
      [rotationInterval]="100"
      (nextChange)="seen.push($event)"
    />
  `,
})
class Host {
  readonly texts = signal<readonly string[]>(['one', 'two', 'three']);
  readonly splitBy = signal<WrRotatingTextSplit>('characters');
  readonly auto = signal(false);
  readonly seen: number[] = [];
}

/** Two rotators on one page — the only setup in which the filters mean anything. */
@Component({
  imports: [WrRotatingText],
  template: `
    <wr-rotating-text [texts]="['ship it']" [auto]="false" />
    <wr-rotating-text [texts]="['later']" [auto]="false" />
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
 * Most of this file runs under reduced motion, and that is not a shortcut: jsdom has no
 * Web Animations API, so the animated path throws on the first `el.animate` before any
 * assertion runs — and reduced motion is a path real users get, where each swap is
 * instant and therefore a single step to assert on. One test mounts the animated path
 * against a stub, because a swap that stages its pieces and never lands is exactly what
 * `isSettled()` exists to report.
 *
 * Used as a consumer would: through the loader, with nothing reached into past the public
 * classes the harness documents. The exceptions are marked where they happen — the
 * component renders no controls at all, so rotating it means calling the instance, and
 * its two a11y attributes come from one template, so only a tampered DOM can ask what the
 * harness does without them.
 */
describe('WrRotatingTextHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let animateBefore: PropertyDescriptor | undefined;

  const rotator = (): Promise<WrRotatingTextHarness> => loader.getHarness(WrRotatingTextHarness);

  /** The component itself — the harness offers no `next()`, and says why. */
  const instance = (): WrRotatingText =>
    fixture.debugElement.query(By.directive(WrRotatingText)).componentInstance as WrRotatingText;

  const mount = async (providers: Provider[] = [{ provide: WrPlatform, useValue: reducedMotion }]): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();

    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  /** Drive one rotation and let the render that follows it settle. */
  const rotate = async (move: () => void): Promise<void> => {
    move();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  /**
   * `Element.animate` does not exist in jsdom, so this is an assignment rather than a spy
   * — and it therefore has to be undone by hand, or it leaks into whichever file vitest
   * runs next.
   */
  const stubAnimate = (): void => {
    animateBefore = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
    Reflect.set(Element.prototype, 'animate', () => ({ cancel: () => undefined, onfinish: null }));
  };

  beforeEach(async () => mount());

  afterEach(() => {
    fixture.destroy();
    if (animateBefore) Object.defineProperty(Element.prototype, 'animate', animateBefore);
    else Reflect.deleteProperty(Element.prototype, 'animate');
    animateBefore = undefined;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('carries the string showing now, where a screen reader can reach it', async () => {
    const text = await rotator();
    expect(await text.getAccessibleText()).toBe('one');

    await rotate(() => instance().next());

    // The announced copy tracks the current word — that is the whole of what it promises.
    // It is deliberately not a live region: `auto` advances every two seconds, and the
    // APG's answer for self-advancing content is silence rather than a timed announcement.
    expect(await text.getAccessibleText()).toBe('two');
    expect(fixture.componentInstance.seen).toEqual([1]);
  });

  it('splits into one piece per character by default, keeping the word grouping', async () => {
    const text = await rotator();

    expect(await text.getPieces()).toEqual(['o', 'n', 'e']);
    expect(await text.getWordCount()).toBe(1);
  });

  it('splits by word and by line when asked, and the grouping survives either way', async () => {
    fixture.componentInstance.texts.set(['hello there']);
    fixture.componentInstance.splitBy.set('words');
    await fixture.whenStable();
    const text = await rotator();

    expect(await text.getPieces()).toEqual(['hello', 'there']);
    expect(await text.getWordCount()).toBe(2);

    fixture.componentInstance.splitBy.set('characters');
    await fixture.whenStable();

    // Ten pieces now and still two groups: the boundaries are what keep the line wrapping
    // sane, and a splitter that flattened them would leave the pieces looking right.
    expect((await text.getPieces()).length).toBe(10);
    expect(await text.getWordCount()).toBe(2);
  });

  it('keeps a grapheme cluster in one piece', async () => {
    fixture.componentInstance.texts.set(['a🚀b']);
    await fixture.whenStable();

    // Three pieces, not four: splitting by code unit puts half a surrogate in a span of
    // its own and draws two replacement glyphs the readable copy never mentions.
    expect(await (await rotator()).getPieces()).toEqual(['a', '🚀', 'b']);
  });

  it('puts what it drew back together, spacer and all', async () => {
    fixture.componentInstance.texts.set(['hello there']);
    await fixture.whenStable();
    const text = await rotator();

    // The spacer between words is a non-breaking space; normalizing it is what makes this
    // round trip assertable at all. A split that dropped it renders 'hellothere' while the
    // readable copy stays perfect, and nothing else in the DOM says so.
    expect(await text.getRenderedText()).toBe('hello there');
    expect(await text.getRenderedText()).toBe(await text.getAccessibleText());
  });

  it('does not pretend a line split round-trips', async () => {
    fixture.componentInstance.texts.set(['top\nbottom']);
    fixture.componentInstance.splitBy.set('lines');
    await fixture.whenStable();
    const text = await rotator();

    // The newline the readable copy carries is drawn as the same spacer every other split
    // uses, so the two differ by design — worth pinning so nobody "fixes" it later.
    expect(await text.getRenderedText()).toBe('top bottom');
    expect(await text.getAccessibleText()).toBe('top\nbottom');
  });

  it('keeps the animated layer out of the accessibility tree, on one attribute', async () => {
    const text = await rotator();
    expect(await text.isAnimatedLayerHidden()).toBe(true);

    // The pieces must NOT carry it themselves — it sits on the wrapper, off the nodes the
    // tween writes to.
    const pieces = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.wr-rotating-text__char')];
    expect(pieces.map(piece => piece.getAttribute('aria-hidden'))).toEqual([null, null, null]);
  });

  it('says so when the animated layer becomes readable', async () => {
    const text = await rotator();
    const inner = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-rotating-text__inner')!;

    // One attribute is the whole contract: without it every rotation is spelled out letter
    // by letter beside the copy that was already read, and nothing changes on screen.
    inner.removeAttribute('aria-hidden');

    expect(await text.isAnimatedLayerHidden()).toBe(false);
  });

  it('refuses to invent an accessible string when the readable copy is gone', async () => {
    const text = await rotator();
    expect(await text.hasAccessibleCopy()).toBe(true);

    (fixture.nativeElement as HTMLElement).querySelector('.wr-rotating-text__sr-only')!.remove();

    // Hidden pieces AND no readable copy is a control with no accessible text whatsoever,
    // and `isAnimatedLayerHidden()` goes on answering `true` throughout — which is why the
    // presence question is asked separately, and why reading the pieces here would lie.
    expect([await text.hasAccessibleCopy(), await text.isAnimatedLayerHidden()]).toEqual([false, true]);
    await expect(text.getAccessibleText()).rejects.toThrow(/no accessible text at all/);
  });

  it('reports the new word as taken over once the swap lands', async () => {
    const text = await rotator();
    expect(await text.isSettled()).toBe(true);

    await rotate(() => instance().jumpTo(2));

    // 'three' is longer than 'one', so the two spans it adds exist only after the swap
    // re-rendered. All five settled is the proof the enter step reached the NEW pieces
    // rather than animating the ones it was looking at when the swap began.
    expect([await text.getPieces(), await text.isSettled()]).toEqual([['t', 'h', 'r', 'e', 'e'], true]);
  });

  it('calls a staged swap unsettled rather than finished', async () => {
    stubAnimate();
    await mount([]);

    // The animated path stages every piece at `opacity: 0` and hands the rest to a tween.
    // A stub never fires `onfinish`, so nothing is ever committed — which is an honest
    // report of a swap that never landed, not a limitation of the environment.
    expect(await (await rotator()).isSettled()).toBe(false);
  });

  it('answers an empty list without pretending anything settled', async () => {
    fixture.componentInstance.texts.set([]);
    await fixture.whenStable();
    const text = await rotator();

    expect([await text.getPieces(), await text.getWordCount()]).toEqual([[], 0]);
    expect([await text.getAccessibleText(), await text.getRenderedText()]).toEqual(['', '']);
    expect(await text.hasAccessibleCopy()).toBe(true);

    // "Every piece is settled" is true of no pieces at all — the same answer a rotator
    // that stopped rendering its text would give.
    await expect(text.isSettled()).rejects.toThrow(/drew no pieces/);
  });

  it('follows the word round while the rotator advances on its own', async () => {
    // Only the interval is faked: `whenStable` still needs real microtasks, and the swap
    // itself awaits a real render.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    fixture.componentInstance.auto.set(true);
    fixture.detectChanges();
    const text = await rotator();

    vi.advanceTimersByTime(100);
    await fixture.whenStable();
    fixture.detectChanges();

    expect([await text.getAccessibleText(), await text.getPieces()]).toEqual(['two', ['t', 'w', 'o']]);

    fixture.componentInstance.auto.set(false);
    fixture.detectChanges();
    vi.advanceTimersByTime(1000);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(await text.getAccessibleText()).toBe('two');
  });
});

describe('WrRotatingTextHarness filters', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: WrPlatform, useValue: reducedMotion }] });
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    await fixture.whenStable();

    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('matches on the string a rotator is showing right now', async () => {
    const shipping = await loader.getHarness(WrRotatingTextHarness.with({ text: 'ship it' }));
    expect(await shipping.getWordCount()).toBe(2);

    expect(await loader.getHarnessOrNull(WrRotatingTextHarness.with({ text: /^later$/ }))).not.toBeNull();

    // The host carries the readable copy AND a span per character, so its own text reads
    // back as 'ship itship it' — matching a prefix of that would be an accident.
    expect(await loader.getHarnessOrNull(WrRotatingTextHarness.with({ text: 'ship' }))).toBeNull();
  });

  it('matches on how many word groups the split produced', async () => {
    const two = await loader.getHarness(WrRotatingTextHarness.with({ wordCount: 2 }));
    expect(await two.getAccessibleText()).toBe('ship it');

    const one = await loader.getHarness(WrRotatingTextHarness.with({ wordCount: 1 }));
    expect(await one.getAccessibleText()).toBe('later');

    expect(await loader.getHarnessOrNull(WrRotatingTextHarness.with({ wordCount: 5 }))).toBeNull();
  });
});
