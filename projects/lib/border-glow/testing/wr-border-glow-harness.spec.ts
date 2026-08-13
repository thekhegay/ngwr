import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrBorderGlow } from 'ngwr/border-glow';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrBorderGlowHarness } from './wr-border-glow-harness';

@Component({
  imports: [WrBorderGlow],
  template: `
    <wr-border-glow
      [borderRadius]="borderRadius()"
      [glowRadius]="glowRadius()"
      [coneSpread]="coneSpread()"
      [edgeSensitivity]="edgeSensitivity()"
      [fillOpacity]="fillOpacity()"
      [backgroundColor]="backgroundColor()"
      [glowColor]="glowColor()"
      [glowIntensity]="glowIntensity()"
      [colors]="colors()"
      [animated]="animated()"
    >
      <span>Hover me</span>
    </wr-border-glow>
  `,
})
class Host {
  readonly borderRadius = signal<number | string>(28);
  readonly glowRadius = signal(40);
  readonly coneSpread = signal(25);
  readonly edgeSensitivity = signal(30);
  readonly fillOpacity = signal(0.5);
  readonly backgroundColor = signal<string | null>(null);
  readonly glowColor = signal<string | null>(null);
  readonly glowIntensity = signal(1);
  readonly colors = signal<readonly string[] | null>(null);
  readonly animated = signal(false);
}

@Component({
  imports: [WrBorderGlow],
  template: `
    <wr-border-glow><span>First</span></wr-border-glow>
    <wr-border-glow [animated]="true"><span>Second</span></wr-border-glow>
  `,
})
class TwoCards {}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * The card writes everything it knows onto its own host as custom properties, so the
 * assertions here are arithmetic rather than paint: the alpha ramp the intensity
 * derives, the palette mapping and its clamp, and the two pointer numbers. The pointer
 * half needs a box — a 0×0 card has its centre in the top-left corner and saturates
 * every proximity — which is why the harness refuses instead of answering, and why the
 * one test that moves a pointer stubs the rect first.
 */
describe('WrBorderGlowHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const glow = (): Promise<WrBorderGlowHarness> => loader.getHarness(WrBorderGlowHarness);

  const mount = async (providers: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  /** Give the card the 200×100 box the component's own spec uses, so the maths has a centre. */
  const stubBox = (): void => {
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-border-glow')!;
    host.getBoundingClientRect = (): DOMRect => ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;
  };

  beforeEach(async () => mount());

  afterEach(() => fixture.destroy());

  it('publishes the geometry the stylesheet reads', async () => {
    const harness = await glow();

    expect([
      await harness.getBorderRadius(),
      await harness.getGlowRadius(),
      await harness.getConeSpread(),
      await harness.getEdgeSensitivity(),
      await harness.getFillOpacity(),
    ]).toEqual([28, 40, 25, 30, 0.5]);

    fixture.componentInstance.borderRadius.set(4);
    fixture.componentInstance.glowRadius.set(12);
    fixture.componentInstance.coneSpread.set(60);
    await fixture.whenStable();

    expect([await harness.getBorderRadius(), await harness.getGlowRadius(), await harness.getConeSpread()]).toEqual([
      4, 12, 60,
    ]);
  });

  it('falls back to the default rather than writing nonsense into the sheet', async () => {
    fixture.componentInstance.borderRadius.set('oops');
    await fixture.whenStable();

    expect(await (await glow()).getBorderRadius()).toBe(28);
  });

  it('leaves every colour to the theme until it is told one', async () => {
    const harness = await glow();

    expect(await harness.getBackgroundColor()).toBeNull();
    expect(await harness.getGlowColor()).toBeNull();
    expect(await harness.getGlowAlphaRamp()).toBeNull();
    expect(await harness.getGradientColors()).toBeNull();
    expect(await harness.getBaseGradientColor()).toBeNull();
  });

  it('writes the fill the author asked for', async () => {
    fixture.componentInstance.backgroundColor.set('#101828');
    await fixture.whenStable();

    expect(await (await glow()).getBackgroundColor()).toBe('#101828');
  });

  it('assembles the halo colour from the bare HSL parts', async () => {
    fixture.componentInstance.glowColor.set('210 90 60');
    await fixture.whenStable();

    expect(await (await glow()).getGlowColor()).toBe('hsl(210deg 90% 60% / 100%)');
  });

  it('scales the seven halo steps by the intensity, saturating at full', async () => {
    fixture.componentInstance.glowColor.set('40 80 80');
    await fixture.whenStable();

    const harness = await glow();
    expect(await harness.getGlowAlphaRamp()).toEqual([100, 60, 50, 40, 30, 20, 10]);

    fixture.componentInstance.glowIntensity.set(0.5);
    await fixture.whenStable();
    expect(await harness.getGlowAlphaRamp()).toEqual([50, 30, 25, 20, 15, 10, 5]);

    fixture.componentInstance.glowIntensity.set(2);
    await fixture.whenStable();
    expect(await harness.getGlowAlphaRamp()).toEqual([100, 100, 100, 80, 60, 40, 20]);
  });

  it('maps the palette across the seven slots', async () => {
    fixture.componentInstance.colors.set(['#c084fc', '#f472b6', '#38bdf8']);
    await fixture.whenStable();

    const harness = await glow();
    expect(await harness.getGradientColors()).toEqual([
      '#c084fc',
      '#f472b6',
      '#38bdf8',
      '#c084fc',
      '#f472b6',
      '#38bdf8',
      '#f472b6',
    ]);
    expect(await harness.getBaseGradientColor()).toBe('#c084fc');
  });

  it('repeats the last colour rather than running off the end of a short palette', async () => {
    fixture.componentInstance.colors.set(['#c084fc', '#f472b6']);
    await fixture.whenStable();

    const harness = await glow();
    expect(await harness.getGradientColors()).toEqual([
      '#c084fc',
      '#f472b6',
      '#f472b6',
      '#c084fc',
      '#f472b6',
      '#f472b6',
      '#f472b6',
    ]);
    expect(await harness.getBaseGradientColor()).toBe('#c084fc');
  });

  it('reports no pointer at all until something points at it', async () => {
    const harness = await glow();

    expect(await harness.getPointerAngle()).toBeNull();
    expect(await harness.getEdgeProximity()).toBeNull();
  });

  it('refuses to point at a card that has no box', async () => {
    await expect((await glow()).movePointerTo(120, 40)).rejects.toThrow(/measures 0×0/);
  });

  it('measures the angle from the top, clockwise', async () => {
    stubBox();
    const harness = await glow();

    await harness.movePointerTo(100, 0);
    expect(await harness.getPointerAngle()).toBeCloseTo(0, 1);

    await harness.movePointerTo(200, 50);
    expect(await harness.getPointerAngle()).toBeCloseTo(90, 1);

    await harness.movePointerTo(100, 100);
    expect(await harness.getPointerAngle()).toBeCloseTo(180, 1);

    await harness.movePointerTo(0, 50);
    expect(await harness.getPointerAngle()).toBeCloseTo(270, 1);
  });

  it('takes the nearer edge on a diagonal, and reports nothing at dead centre', async () => {
    stubBox();
    const harness = await glow();

    await harness.movePointerTo(150, 50);
    expect(await harness.getEdgeProximity()).toBeCloseTo(50, 1);

    // Level with the bottom edge but half way along it: the vertical axis runs out
    // first, and the value follows THAT one rather than averaging the two.
    await harness.movePointerTo(150, 100);
    expect(await harness.getEdgeProximity()).toBeCloseTo(100, 1);

    await harness.movePointerTo(100, 50);
    expect(await harness.getEdgeProximity()).toBe(0);
    expect(await harness.getPointerAngle()).toBe(0);
  });

  it('sweeps on mount only when it is asked to', async () => {
    const harness = await glow();
    expect(await harness.isSweeping()).toBe(false);

    fixture.componentInstance.animated.set(true);
    await fixture.whenStable();

    expect(await harness.isSweeping()).toBe(true);
    expect(await harness.getPointerAngle()).not.toBeNull();
  });

  it('holds the sweep back for someone who asked for less motion', async () => {
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    fixture.componentInstance.animated.set(true);
    await fixture.whenStable();

    const harness = await glow();
    expect(await harness.isSweeping()).toBe(false);
    expect(await harness.getPointerAngle()).toBeNull();
  });

  it('keeps its decoration out of the accessibility tree', async () => {
    const harness = await glow();

    expect(await harness.hasHaloLayer()).toBe(true);
    expect(await harness.isDecorationHiddenFromAssistiveTech()).toBe(true);
  });

  it('projects its content into the inner wrapper', async () => {
    expect(await (await glow()).getContentText()).toBe('Hover me');
  });

  it('addresses one card among several', async () => {
    const cards = TestBed.createComponent(TwoCards);
    cards.detectChanges();
    await cards.whenStable();
    const cardsLoader = TestbedHarnessEnvironment.loader(cards);

    const second = await cardsLoader.getHarness(WrBorderGlowHarness.with({ text: 'Second' }));
    expect(await second.getContentText()).toBe('Second');
    expect(await cardsLoader.getHarnessOrNull(WrBorderGlowHarness.with({ text: 'Third' }))).toBeNull();

    const sweeping = await cardsLoader.getAllHarnesses(WrBorderGlowHarness.with({ sweeping: true }));
    expect(await Promise.all(sweeping.map(card => card.getContentText()))).toEqual(['Second']);

    cards.destroy();
  });
});
