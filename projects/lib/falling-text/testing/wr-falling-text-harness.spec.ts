import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrFallingText, type WrFallingTextTrigger } from 'ngwr/falling-text';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrFallingTextHarness } from './wr-falling-text-harness';

@Component({
  imports: [WrFallingText],
  template: `
    <wr-falling-text
      [text]="text()"
      [highlightWords]="highlightWords()"
      [trigger]="trigger()"
      [fontSize]="fontSize()"
    />
  `,
})
class Host {
  readonly text = signal('gravity pulls every word down');
  readonly highlightWords = signal<readonly string[]>(['grav']);
  readonly trigger = signal<WrFallingTextTrigger>('click');
  readonly fontSize = signal('1rem');
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

const box = (width: number, height: number): DOMRect =>
  ({ width, height, left: 0, top: 0, right: width, bottom: height, x: 0, y: 0 }) as DOMRect;

/**
 * The physics is unreachable and deliberately unexposed; what the harness answers is
 * whether the sentence survived being cut into bodies, plus the one flag the simulator
 * writes when it takes over. That flag needs boxes, and a unit environment has none —
 * so every test that touches it stubs them first, and asserts a released control case
 * before trusting an unreleased one.
 */
describe('WrFallingTextHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const text = (): Promise<WrFallingTextHarness> => loader.getHarness(WrFallingTextHarness);

  /** `[trigger]` is read once, on the first render — a change of trigger needs a fresh mount. */
  const mount = async (trigger: WrFallingTextTrigger = 'click', providers: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.trigger.set(trigger);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  /** Give the host and every word a box, so the simulator's zero-size guard lets it start. */
  const giveEveryoneABox = (): void => {
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLElement>('wr-falling-text')!.getBoundingClientRect = (): DOMRect => box(300, 120);
    for (const word of root.querySelectorAll<HTMLElement>('.wr-falling-text__word')) {
      word.getBoundingClientRect = (): DOMRect => box(40, 20);
    }
  };

  beforeEach(async () => mount());

  afterEach(() => fixture.destroy());

  it('still reads as a sentence after being cut into words', async () => {
    const harness = await text();

    // The separators are U+00A0, so the raw textContent never matches the input.
    expect(await harness.getText()).toBe('gravity pulls every word down');
    expect(await harness.getWords()).toEqual(['gravity', 'pulls', 'every', 'word', 'down']);
  });

  it('highlights by prefix rather than by whole word', async () => {
    const harness = await text();

    expect(await harness.getHighlightedWords()).toEqual(['gravity']);
    expect(await harness.isHighlighted('gravity')).toBe(true);
    expect(await harness.isHighlighted('pulls')).toBe(false);
  });

  it('highlights nothing when no keywords are given', async () => {
    fixture.componentInstance.highlightWords.set([]);
    await fixture.whenStable();

    expect(await (await text()).getHighlightedWords()).toEqual([]);
  });

  it('refuses to answer for a word the sentence does not hold', async () => {
    await expect((await text()).isHighlighted('grav')).rejects.toThrow(/no word "grav"/);
  });

  it('reports the font size in the unit it was given', async () => {
    expect(await (await text()).getFontSize()).toBe('1rem');

    fixture.componentInstance.fontSize.set('2.5rem');
    await fixture.whenStable();
    expect(await (await text()).getFontSize()).toBe('2.5rem');
  });

  it('refuses to invent a font size when the binding wrote none', async () => {
    fixture.componentInstance.fontSize.set('');
    await fixture.whenStable();

    await expect((await text()).getFontSize()).rejects.toThrow(/no inline font-size/);
  });

  it('releases the words on a click, and keeps the sentence intact', async () => {
    const harness = await text();
    expect(await harness.hasReleased()).toBe(false);

    giveEveryoneABox();
    await harness.release();

    expect(await harness.hasReleased()).toBe(true);
    // The words are absolutely positioned now; DOM order, and so reading order, is not.
    expect(await harness.getText()).toBe('gravity pulls every word down');
  });

  it('releases the words on a hover when that is the trigger', async () => {
    await mount('hover');
    const harness = await text();

    giveEveryoneABox();
    await harness.release();

    expect(await harness.hasReleased()).toBe(true);
  });

  it('is safe to release twice', async () => {
    const harness = await text();

    giveEveryoneABox();
    await harness.release();
    await harness.release();

    expect(await harness.hasReleased()).toBe(true);
  });

  it('leaves the words standing for someone who asked for less motion', async () => {
    await mount('click', [{ provide: WrPlatform, useValue: reducedMotion }]);
    const harness = await text();

    // The boxes are stubbed, so this `false` is the component's decision rather than
    // the environment's — the test above proves the same setup does release.
    giveEveryoneABox();
    await harness.release();

    expect(await harness.hasReleased()).toBe(false);
    expect(await harness.getWords()).toHaveLength(5);
  });

  it('cannot release an `auto` instance after the fact', async () => {
    // `auto` spends its one start on the first render, where nothing has a box yet, and
    // the component marks itself started on the way past that guard.
    await mount('auto');
    const harness = await text();

    giveEveryoneABox();
    await harness.release();

    expect(await harness.hasReleased()).toBe(false);
  });

  it('refuses to answer whether empty text was released', async () => {
    fixture.componentInstance.text.set('');
    await fixture.whenStable();

    await expect((await text()).hasReleased()).rejects.toThrow(/there are no words/);
  });

  it('matches on the sentence', async () => {
    const sentence = 'gravity pulls every word down';

    expect(await loader.getHarnessOrNull(WrFallingTextHarness.with({ text: sentence }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrFallingTextHarness.with({ text: /pulls/ }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrFallingTextHarness.with({ text: 'nothing falls' }))).toBeNull();
  });
});
