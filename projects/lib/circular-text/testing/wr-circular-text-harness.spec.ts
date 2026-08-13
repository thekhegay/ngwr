import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, type Provider, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrCircularTextHover } from 'ngwr/circular-text';
import { WrCircularText } from 'ngwr/circular-text';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrCircularTextHarness } from './wr-circular-text-harness';

@Component({
  imports: [WrCircularText],
  template: `<wr-circular-text [text]="text()" [spinDuration]="spinDuration()" [onHover]="onHover()" />`,
})
class Host {
  readonly text = signal('NGWR');
  readonly spinDuration = signal(20);
  readonly onHover = signal<WrCircularTextHover>('speedUp');
}

/** Two rings on one page — the only setup in which the filters mean anything. */
@Component({
  imports: [WrCircularText],
  template: `
    <wr-circular-text text="SHIP IT" />
    <wr-circular-text text="LATER" onHover="goBonkers" />
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
 * Most of this file runs under reduced motion, where the component never reaches for a
 * Web Animation — jsdom implements none, and the ring's markup is identical either way,
 * since `spinDuration` has no DOM footprint whatsoever. The last test mounts the animated
 * path against a stub to prove exactly that, so nothing here depends on the shortcut.
 *
 * Used as a consumer would: through the loader, with nothing reached into past the public
 * classes the harness documents. The three exceptions are marked where they happen — the
 * component writes every placement and its one `aria-hidden` from a single template, so
 * only a tampered DOM can ask what the harness does when they are missing.
 */
describe('WrCircularTextHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let animateBefore: PropertyDescriptor | undefined;

  const ring = (): Promise<WrCircularTextHarness> => loader.getHarness(WrCircularTextHarness);

  const mount = async (providers: Provider[] = [{ provide: WrPlatform, useValue: reducedMotion }]): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();

    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  /**
   * `Element.animate` does not exist in jsdom, so this is an assignment rather than a spy
   * — and it therefore has to be undone by hand, or it leaks into whichever file vitest
   * runs next.
   */
  const stubAnimate = (): void => {
    animateBefore = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
    Reflect.set(Element.prototype, 'animate', () => ({ cancel: () => undefined, currentTime: 0, effect: null }));
  };

  beforeEach(async () => mount());

  afterEach(() => {
    fixture.destroy();
    if (animateBefore) Object.defineProperty(Element.prototype, 'animate', animateBefore);
    else Reflect.deleteProperty(Element.prototype, 'animate');
    animateBefore = undefined;
    vi.restoreAllMocks();
  });

  it('carries the whole string once, where a screen reader can reach it', async () => {
    expect(await (await ring()).getAccessibleText()).toBe('NGWR');

    fixture.componentInstance.text.set('HELLO * NGWR * ');
    await fixture.whenStable();

    // Untrimmed: the trailing space of a separator-padded ring is a real character that
    // takes a slot on the circle, and trimming it here would hide a lost one.
    expect(await (await ring()).getAccessibleText()).toBe('HELLO * NGWR * ');
  });

  it('lays the string out one character per slot, losslessly', async () => {
    const text = await ring();

    expect(await text.getCharacters()).toEqual(['N', 'G', 'W', 'R']);
    expect(await text.getCharacterCount()).toBe(4);
    expect(await text.getText()).toBe(await text.getAccessibleText());
  });

  it('gives a space a slot of its own', async () => {
    fixture.componentInstance.text.set('A B');
    await fixture.whenStable();
    const text = await ring();

    // Three slots, not two: a space collapsed away shortens the ring and shifts every
    // angle after it, while the readable copy goes on being perfect.
    expect(await text.getCharacters()).toEqual(['A', ' ', 'B']);
    expect(await text.getText()).toBe('A B');
  });

  it('keeps a surrogate pair in one slot', async () => {
    fixture.componentInstance.text.set('a🚀');
    await fixture.whenStable();
    const text = await ring();

    // Two slots, not three: a split by code unit halves the pair into two replacement
    // glyphs and divides the circle by the wrong number.
    expect(await text.getCharacters()).toEqual(['a', '🚀']);
    expect(await text.getCharacterAngles()).toEqual([0, 180]);
  });

  it('spaces the characters evenly round the circle', async () => {
    const text = await ring();
    expect(await text.getCharacterAngles()).toEqual([0, 90, 180, 270]);

    fixture.componentInstance.text.set('ABC');
    await fixture.whenStable();

    // 360 / N, from zero, in DOM order — the difference between a ring and an arc.
    expect(await text.getCharacterAngles()).toEqual([0, 120, 240]);
  });

  it('pushes every character out by the same orbit radius', async () => {
    const offsets = await (await ring()).getOrbitOffsets();

    // One shared offset along one axis. A per-character or axis-mixed push leaves the
    // angles perfect and draws a diagonal line, which no other reading here would catch.
    expect(offsets).toEqual(Array<string>(4).fill('translateY(calc(-1 * var(--wr-circular-text-radius)))'));
  });

  it('draws nothing at all for an empty string', async () => {
    fixture.componentInstance.text.set('');
    await fixture.whenStable();
    const text = await ring();

    expect([await text.getCharacterCount(), await text.getText()]).toEqual([0, '']);
    expect([await text.getCharacterAngles(), await text.getOrbitOffsets()]).toEqual([[], []]);
    expect(await text.getAccessibleText()).toBe('');
  });

  it('refuses to answer for a character that was never placed', async () => {
    const text = await ring();
    const char = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-circular-text__char')!;

    // Every placement comes from one binding, so only a tampered DOM can ask this. The
    // answer has to be a throw: 0° is where a working first character sits too.
    char.removeAttribute('style');

    await expect(text.getCharacterAngles()).rejects.toThrow(/character 0 is not placed/);
    await expect(text.getOrbitOffsets()).rejects.toThrow(/carries no rotate\(<n>deg\)/);
  });

  it('reads the bonkers modifier off the input, not off the pointer', async () => {
    const text = await ring();
    expect(await text.isBonkers()).toBe(false);

    fixture.componentInstance.onHover.set('goBonkers');
    await fixture.whenStable();
    expect(await text.isBonkers()).toBe(true);

    fixture.componentInstance.onHover.set('speedUp');
    await fixture.whenStable();

    // Hovering swaps the animation's duration and touches no attribute, so the modifier
    // stays off — the class describes what was asked for, never what the pointer is doing.
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('wr-circular-text')!
      .dispatchEvent(new MouseEvent('mouseenter'));
    await fixture.whenStable();

    expect(await text.isBonkers()).toBe(false);
  });

  it('keeps the ring out of the accessibility tree, on one attribute', async () => {
    const text = await ring();
    expect(await text.areCharactersHiddenFromAssistiveTech()).toBe(true);

    // The letters themselves must NOT carry it — it sits on the wrapper so the rotation
    // never touches a node an assistive-tech contract depends on.
    const chars = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.wr-circular-text__char')];
    expect(chars.map(char => char.getAttribute('aria-hidden'))).toEqual([null, null, null, null]);
  });

  it('says so when the ring becomes readable', async () => {
    const text = await ring();
    const spin = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-circular-text__spin')!;

    // One attribute is the whole contract, and removing it is the whole regression: a
    // screen reader starts spelling `N. G. W. R.` beside the copy it already read.
    spin.removeAttribute('aria-hidden');

    expect(await text.areCharactersHiddenFromAssistiveTech()).toBe(false);
  });

  it('still answers an empty ring, where "everything is hidden" would be vacuous', async () => {
    fixture.componentInstance.text.set('');
    await fixture.whenStable();

    // The wrapper is rendered whether or not there is anything in it, so this is a real
    // reading rather than the empty-set pass a per-character check would give.
    expect(await (await ring()).areCharactersHiddenFromAssistiveTech()).toBe(true);
  });

  it('answers the same once the spin is actually running', async () => {
    stubAnimate();
    await mount([]);
    const text = await ring();

    // Nothing above depends on reduced motion: `spinDuration` reaches only the animation's
    // options, so the markup the harness reads is identical on the animated path.
    expect(await text.getCharacters()).toEqual(['N', 'G', 'W', 'R']);
    expect(await text.getCharacterAngles()).toEqual([0, 90, 180, 270]);
    expect(await text.areCharactersHiddenFromAssistiveTech()).toBe(true);
  });
});

describe('WrCircularTextHarness filters', () => {
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

  it('matches on the string the ring announces', async () => {
    const shipping = await loader.getHarness(WrCircularTextHarness.with({ text: 'SHIP IT' }));
    expect(await shipping.isBonkers()).toBe(false);

    expect(await loader.getHarnessOrNull(WrCircularTextHarness.with({ text: /^LATER$/ }))).not.toBeNull();

    // The host holds the readable copy AND a span per character, so its own text reads
    // back as 'SHIP ITSHIP IT'; matching a prefix of it would be an accident either way.
    expect(await loader.getHarnessOrNull(WrCircularTextHarness.with({ text: 'SHIP' }))).toBeNull();
  });

  it('matches on how many slots the circle was divided into', async () => {
    // 'SHIP IT' is seven characters counting the space; 'LATER' is five.
    const seven = await loader.getHarness(WrCircularTextHarness.with({ characterCount: 7 }));
    expect(await seven.getAccessibleText()).toBe('SHIP IT');

    const five = await loader.getHarness(WrCircularTextHarness.with({ characterCount: 5 }));
    expect([await five.getAccessibleText(), await five.isBonkers()]).toEqual(['LATER', true]);

    expect(await loader.getHarnessOrNull(WrCircularTextHarness.with({ characterCount: 3 }))).toBeNull();
  });
});
