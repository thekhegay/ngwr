import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, type Provider, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrDecryptTextAnimateOn, WrDecryptTextClickMode, WrDecryptTextRevealDirection } from 'ngwr/decrypt-text';
import { WrDecryptText } from 'ngwr/decrypt-text';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrDecryptTextHarness } from './wr-decrypt-text-harness';

@Component({
  imports: [WrDecryptText],
  template: `
    <wr-decrypt-text
      [text]="text()"
      [speed]="10"
      [sequential]="sequential()"
      [revealDirection]="revealDirection()"
      [animateOn]="animateOn()"
      [clickMode]="clickMode()"
      [useOriginalCharsOnly]="useOriginalCharsOnly()"
      [characters]="characters()"
    />
  `,
})
class Host {
  readonly text = signal('HELLO');
  readonly sequential = signal(false);
  readonly revealDirection = signal<WrDecryptTextRevealDirection>('start');
  readonly animateOn = signal<WrDecryptTextAnimateOn>('hover');
  readonly clickMode = signal<WrDecryptTextClickMode>('once');
  readonly useOriginalCharsOnly = signal(false);
  readonly characters = signal('XY');
}

/**
 * Three on one page: one resting plain, one resting scrambled, and one with nothing to
 * reveal — the only setup in which the filters mean anything.
 */
@Component({
  imports: [WrDecryptText],
  template: `
    <wr-decrypt-text text="Alpha" />
    <wr-decrypt-text text="Beta" animateOn="click" />
    <wr-decrypt-text text="" />
  `,
})
class ThreeHost {}

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
 * Used as a consumer would: through the loader, driven by the three triggers the
 * component actually has, with nothing reached into past the public classes the harness
 * documents. The two exceptions are marked where they happen — the `aria-hidden` wrapper
 * comes from one template line, so only a tampered DOM can ask what the harness reads
 * off it.
 *
 * `setInterval` and `clearInterval` are faked and nothing else: the reveal is an
 * interval, and faking the microtask plumbing would deadlock the stabilization that
 * every `await harness.*()` runs through. `Math.random` is pinned so a scramble is a
 * known string — the class-based reads need no such thing, which is the reason to prefer
 * them.
 */
describe('WrDecryptTextHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const secret = (): Promise<WrDecryptTextHarness> => loader.getHarness(WrDecryptTextHarness);

  const hostElement = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector('wr-decrypt-text')!;

  const mount = async (providers: Provider[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();

    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    // Always the first glyph in the pool, so a scramble is a known string.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await mount();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('announces the real string while the screen shows gibberish', async () => {
    const text = await secret();
    expect([await text.getAccessibleText(), await text.getRenderedText()]).toEqual(['HELLO', 'HELLO']);

    await text.hover();
    vi.advanceTimersByTime(10);

    // The two layers disagreeing IS the component: the scramble is out of the
    // accessibility tree, and the readable copy is untouched by any frame of it.
    expect(await text.getRenderedText()).toBe('XXXXX');
    expect(await text.getAccessibleText()).toBe('HELLO');
    expect([await text.getEncryptedCount(), await text.isAnimatedLayerHidden()]).toEqual([5, true]);
  });

  it('rests plain until something triggers it', async () => {
    const text = await secret();

    expect([await text.getEncryptedCount(), await text.isFullyRevealed()]).toEqual([0, true]);
    expect(await text.getRenderedText()).toBe(await text.getAccessibleText());
    expect(await text.getRevealedIndices()).toEqual([0, 1, 2, 3, 4]);
  });

  it('puts the real text back the moment the pointer leaves', async () => {
    const text = await secret();
    await text.hover();
    vi.advanceTimersByTime(10);
    expect(await text.getEncryptedCount()).toBe(5);

    await text.mouseAway();

    // Immediately, not by letting the reveal play out — the reader took the effect away.
    expect([await text.getRenderedText(), await text.getEncryptedCount()]).toEqual(['HELLO', 0]);
    expect(await text.isFullyRevealed()).toBe(true);
  });

  it('reveals one index per tick, from the start', async () => {
    fixture.componentInstance.sequential.set(true);
    await fixture.whenStable();
    const text = await secret();
    await text.hover();

    vi.advanceTimersByTime(10);
    expect(await text.getRevealedIndices()).toEqual([0]);

    vi.advanceTimersByTime(10);
    expect(await text.getRevealedIndices()).toEqual([0, 1]);

    vi.advanceTimersByTime(30);
    expect([await text.getRevealedIndices(), await text.isFullyRevealed()]).toEqual([[0, 1, 2, 3, 4], true]);
  });

  it('reveals from the end when asked', async () => {
    fixture.componentInstance.sequential.set(true);
    fixture.componentInstance.revealDirection.set('end');
    await fixture.whenStable();
    const text = await secret();
    await text.hover();

    vi.advanceTimersByTime(10);
    expect(await text.getRevealedIndices()).toEqual([4]);

    vi.advanceTimersByTime(10);
    expect(await text.getRevealedIndices()).toEqual([3, 4]);
  });

  it('reveals outwards from the middle when asked', async () => {
    fixture.componentInstance.sequential.set(true);
    fixture.componentInstance.revealDirection.set('center');
    await fixture.whenStable();
    const text = await secret();
    await text.hover();

    vi.advanceTimersByTime(10);
    expect(await text.getRevealedIndices()).toEqual([2]);

    // Ascending by POSITION, not in the order the reveal visited them — index 1 landed
    // second and sorts first, which is what the DOM records and all it records.
    vi.advanceTimersByTime(10);
    expect(await text.getRevealedIndices()).toEqual([1, 2]);

    vi.advanceTimersByTime(10);
    expect(await text.getRevealedIndices()).toEqual([1, 2, 3]);
  });

  it('counts characters by code point, so an emoji is one of them', async () => {
    fixture.componentInstance.text.set('a🚀b');
    fixture.componentInstance.sequential.set(true);
    fixture.componentInstance.useOriginalCharsOnly.set(true);
    await fixture.whenStable();
    const text = await secret();
    expect(await text.getCharCount()).toBe(3);

    await text.hover();
    vi.advanceTimersByTime(20);

    // Index 1 is the rocket, which `text[1]` in plain JS is not — it is half a surrogate
    // pair, and mixing the two index spaces revealed every later character as the wrong
    // one.
    expect(await text.getRevealedIndices()).toEqual([0, 1]);
    expect([...(await text.getRenderedText())][1]).toBe('🚀');
  });

  it('scrambles the whole string and then settles onto it', async () => {
    const text = await secret();
    await text.hover();

    vi.advanceTimersByTime(10);
    expect([await text.getRenderedText(), await text.getEncryptedCount()]).toEqual(['XXXXX', 5]);
    expect(await text.isFullyRevealed()).toBe(false);

    // Non-sequential mode reveals nothing per tick — it scrambles for `maxIterations`
    // and snaps, so the progress model goes from all-encrypted to none in one step.
    vi.advanceTimersByTime(90);

    expect(await text.isFullyRevealed()).toBe(true);
    expect(await text.getRenderedText()).toBe(await text.getAccessibleText());
  });

  it('scrambles with the glyphs of the text itself when asked', async () => {
    fixture.componentInstance.useOriginalCharsOnly.set(true);
    await fixture.whenStable();
    const text = await secret();

    await text.hover();
    vi.advanceTimersByTime(10);

    // `every(glyph => 'HELO'.includes(glyph))` is what this used to assert, and it
    // is vacuously true of the finished word: HELLO is spelled out of exactly
    // those letters, so the check passed whether the pool was honoured or
    // ignored. Assert the state that only the pool produces instead.
    expect([await text.getRenderedText(), await text.getEncryptedCount()]).toEqual(['HHHHH', 5]);
  });

  it('rests scrambled in click mode, and reveals once', async () => {
    fixture.componentInstance.animateOn.set('click');
    await fixture.whenStable();
    const text = await secret();

    // At rest and perfectly still — which is why there is no isAnimating() derived from
    // "something is encrypted".
    expect([await text.getEncryptedCount(), await text.isFullyRevealed()]).toEqual([5, false]);

    await text.click();
    vi.advanceTimersByTime(200);
    expect(await text.isFullyRevealed()).toBe(true);

    await text.click();
    vi.advanceTimersByTime(200);
    expect(await text.getRenderedText()).toBe('HELLO');
  });

  it('flips back and forth in toggle mode', async () => {
    fixture.componentInstance.animateOn.set('click');
    fixture.componentInstance.clickMode.set('toggle');
    await fixture.whenStable();
    const text = await secret();

    await text.click();
    vi.advanceTimersByTime(200);
    expect(await text.isFullyRevealed()).toBe(true);

    await text.click();
    vi.advanceTimersByTime(10);

    expect(await text.isFullyRevealed()).toBe(false);
  });

  it('ignores the trigger the mode does not use', async () => {
    fixture.componentInstance.animateOn.set('click');
    await fixture.whenStable();
    const text = await secret();

    await text.hover();
    vi.advanceTimersByTime(50);
    expect(await text.isFullyRevealed()).toBe(false);

    fixture.componentInstance.animateOn.set('hover');
    await fixture.whenStable();
    await text.click();
    vi.advanceTimersByTime(50);

    expect(await text.isFullyRevealed()).toBe(true);
  });

  it('refuses to call an empty instance revealed', async () => {
    fixture.componentInstance.text.set('');
    await fixture.whenStable();
    const text = await secret();

    expect([await text.getCharCount(), await text.getRenderedText()]).toEqual([0, '']);

    // "No character is encrypted" is true of no characters — the same answer a component
    // that stopped rendering its text would give.
    await expect(text.isFullyRevealed()).rejects.toThrow(/rendered no characters/);
  });

  it('stops calling the scramble layer hidden as soon as the attribute goes', async () => {
    const text = await secret();
    hostElement().querySelector('.wr-decrypt-text__sr-only')!.nextElementSibling!.removeAttribute('aria-hidden');

    // One template line writes this, so only a tampered DOM can ask whether the harness
    // reads it. It has to: without it a screen reader spells the gibberish out beside the
    // real string it already read.
    expect(await text.isAnimatedLayerHidden()).toBe(false);
  });

  it('says so when the unclassed wrapper can no longer be addressed', async () => {
    const text = await secret();
    hostElement().querySelector('.wr-decrypt-text__sr-only')!.remove();

    // The wrapper has no BEM class, so it is reachable only as the readable span's next
    // sibling — and a missing layer is not the same failure as an announced one, so this
    // refuses rather than answering `false`.
    await expect(text.isAnimatedLayerHidden()).rejects.toThrow(/no scramble layer found/);
  });

  it('never scrambles for someone who asked for less motion', async () => {
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    const text = await secret();

    await text.hover();

    expect([await text.getRenderedText(), await text.getEncryptedCount()]).toEqual(['HELLO', 0]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rests on the plain text in click mode under reduced motion', async () => {
    // Click mode rests on the SCRAMBLE, and that path never reached the reduced-motion
    // short-circuit every trigger funnels through — so this used to be the one way to end
    // up permanently unreadable, with no pointer-free way back and no keyboard path
    // either.
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    fixture.componentInstance.animateOn.set('click');
    await fixture.whenStable();
    const text = await secret();

    expect([await text.getRenderedText(), await text.getEncryptedCount()]).toEqual(['HELLO', 0]);
    expect(await text.isFullyRevealed()).toBe(true);

    await text.click();
    vi.advanceTimersByTime(200);

    expect(await text.isFullyRevealed()).toBe(true);
  });
});

describe('WrDecryptTextHarness filters', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ThreeHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const announced = async (harnesses: WrDecryptTextHarness[]): Promise<string[]> =>
    Promise.all(harnesses.map(harness => harness.getAccessibleText()));

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(ThreeHost);
    fixture.detectChanges();
    await fixture.whenStable();

    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('matches on the string that is announced, not on the one that is drawn', async () => {
    const beta = await loader.getHarness(WrDecryptTextHarness.with({ text: 'Beta' }));

    // Matched while its visible layer is random gibberish — the whole reason the filter
    // reads the accessible copy.
    expect(await beta.isFullyRevealed()).toBe(false);
    expect(await loader.getHarnessOrNull(WrDecryptTextHarness.with({ text: /^Alpha$/ }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrDecryptTextHarness.with({ text: 'Alph' }))).toBeNull();
  });

  it('matches on whether it has settled, and skips the one with nothing to settle', async () => {
    expect(await announced(await loader.getAllHarnesses(WrDecryptTextHarness.with({ revealed: true })))).toEqual([
      'Alpha',
    ]);

    // The empty instance is in neither list. "Nothing is encrypted" is true of it, and a
    // query is the last place that vacuity should hand back a match.
    expect(await announced(await loader.getAllHarnesses(WrDecryptTextHarness.with({ revealed: false })))).toEqual([
      'Beta',
    ]);
  });
});
