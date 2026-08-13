import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrShinyText } from 'ngwr/shiny-text';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrShinyTextHarness } from './wr-shiny-text-harness';

@Component({
  imports: [WrShinyText],
  template: `
    <wr-shiny-text
      [text]="text()"
      [speed]="speed()"
      [delay]="delay()"
      [spread]="spread()"
      [color]="color()"
      [shineColor]="shineColor()"
      [disabled]="disabled()"
      [yoyo]="yoyo()"
      [direction]="direction()"
      [pauseOnHover]="pauseOnHover()"
    />
  `,
})
class Host {
  readonly text = signal('Just released');
  readonly speed = signal(2);
  readonly delay = signal(0);
  readonly spread = signal(120);
  readonly color = signal<string | null>(null);
  readonly shineColor = signal<string | null>(null);
  readonly disabled = signal(false);
  readonly yoyo = signal(false);
  readonly direction = signal<'left' | 'right'>('left');
  readonly pauseOnHover = signal(false);
}

/**
 * The sweep itself is a stylesheet keyframe and is not asserted anywhere here. What is
 * asserted is the pair of inline declarations the component writes — the five-stop
 * stripe and the cycle duration, the second of which is the contract a reimplementation
 * gets wrong: the pause is folded into the duration rather than expressed as a delay.
 */
describe('WrShinyTextHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const shiny = (): Promise<WrShinyTextHarness> => loader.getHarness(WrShinyTextHarness);
  const hostElement = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-shiny-text')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('renders its text straight onto the host', async () => {
    expect(await (await shiny()).getText()).toBe('Just released');
  });

  it('falls through to the theme tokens rather than to hard-coded colours', async () => {
    const harness = await shiny();

    expect(await harness.getBaseColor()).toBe('var(--wr-shiny-text-base)');
    expect(await harness.getShineColor()).toBe('var(--wr-shiny-text-shine)');
    expect(await harness.getGradient()).toContain('50%');
  });

  it('puts the two colours in their own slots, and not in each other’s', async () => {
    fixture.componentInstance.color.set('#444');
    fixture.componentInstance.shineColor.set('#a0e0ff');
    await fixture.whenStable();

    // A hex literal comes back in the CSSOM's own serialisation, which is `rgb()`.
    const harness = await shiny();
    expect([await harness.getBaseColor(), await harness.getShineColor()]).toEqual([
      'rgb(68, 68, 68)',
      'rgb(160, 224, 255)',
    ]);
  });

  it('keeps a functional colour whole instead of splitting it at its own commas', async () => {
    fixture.componentInstance.color.set('rgb(1, 2, 3)');
    await fixture.whenStable();

    expect(await (await shiny()).getBaseColor()).toBe('rgb(1, 2, 3)');
  });

  it('turns the gradient by the spread angle', async () => {
    const harness = await shiny();
    expect(await harness.getSpreadDegrees()).toBe(120);

    fixture.componentInstance.spread.set(45);
    await fixture.whenStable();
    expect(await harness.getSpreadDegrees()).toBe(45);
  });

  it('folds the pause into the duration rather than adding a delay', async () => {
    const harness = await shiny();
    expect(await harness.getCycleDurationSeconds()).toBe(2);

    fixture.componentInstance.delay.set(3);
    await fixture.whenStable();

    // The keyframe finishes at 50% and holds, so the wait IS part of the cycle.
    expect(await harness.getCycleDurationSeconds()).toBe(5);
  });

  it('names each option it was given', async () => {
    const harness = await shiny();
    expect([
      await harness.isPaused(),
      await harness.pausesOnHover(),
      await harness.isYoyo(),
      await harness.getDirection(),
    ]).toEqual([false, false, false, 'left']);

    fixture.componentInstance.disabled.set(true);
    fixture.componentInstance.pauseOnHover.set(true);
    fixture.componentInstance.yoyo.set(true);
    fixture.componentInstance.direction.set('right');
    await fixture.whenStable();

    expect([
      await harness.isPaused(),
      await harness.pausesOnHover(),
      await harness.isYoyo(),
      await harness.getDirection(),
    ]).toEqual([true, true, true, 'right']);
  });

  it('refuses to answer for a declaration the component stopped writing', async () => {
    const harness = await shiny();
    hostElement().style.removeProperty('animation-duration');

    await expect(harness.getCycleDurationSeconds()).rejects.toThrow(/no inline `animation-duration`/);
  });

  it('refuses to read a stripe out of something that is not a gradient', async () => {
    const harness = await shiny();
    hostElement().style.setProperty('background-image', 'none');

    await expect(harness.getBaseColor()).rejects.toThrow(/not a linear-gradient/);
  });

  it('refuses to read a colour out of a differently shaped gradient', async () => {
    const harness = await shiny();
    hostElement().style.setProperty('background-image', 'linear-gradient(120deg, red, blue)');

    await expect(harness.getShineColor()).rejects.toThrow(/2 stops/);
  });

  it('refuses to report an angle the gradient does not start with', async () => {
    const harness = await shiny();
    hostElement().style.setProperty('background-image', 'linear-gradient(to right, red 0%, blue 100%)');

    await expect(harness.getSpreadDegrees()).rejects.toThrow(/not an angle in degrees/);
  });

  it('matches on the text, the pause state and the direction', async () => {
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(await loader.getHarnessOrNull(WrShinyTextHarness.with({ text: /released/ }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrShinyTextHarness.with({ text: 'Coming soon' }))).toBeNull();

    expect(await loader.getHarnessOrNull(WrShinyTextHarness.with({ paused: true }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrShinyTextHarness.with({ paused: false }))).toBeNull();

    expect(await loader.getHarnessOrNull(WrShinyTextHarness.with({ direction: 'left' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrShinyTextHarness.with({ direction: 'right' }))).toBeNull();
  });
});
