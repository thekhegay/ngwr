import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrGradientText, type WrGradientTextDirection } from 'ngwr/gradient-text';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrGradientTextHarness } from './wr-gradient-text-harness';

@Component({
  imports: [WrGradientText],
  template: `
    <wr-gradient-text
      [colors]="colors()"
      [animationSpeed]="speed()"
      [direction]="direction()"
      [showBorder]="showBorder()"
      [yoyo]="yoyo()"
      [pauseOnHover]="pauseOnHover()"
    >
      Premium feature
    </wr-gradient-text>
  `,
})
class Host {
  readonly colors = signal<readonly string[]>(['#111111', '#222222']);
  readonly speed = signal(8);
  readonly direction = signal<WrGradientTextDirection>('horizontal');
  readonly showBorder = signal(false);
  readonly yoyo = signal(true);
  readonly pauseOnHover = signal(false);
}

/**
 * The sweep is a stylesheet keyframe and none of it is asserted here. What is asserted
 * is the string the component computes — stops, wrap stop and angle — plus the pair of
 * facts that have to agree for the effect to work at all: the direction modifier and
 * the axis the gradient was stretched along.
 */
describe('WrGradientTextHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const gradient = (): Promise<WrGradientTextHarness> => loader.getHarness(WrGradientTextHarness);
  const hostElement = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-gradient-text')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('projects its text into the span the gradient paints', async () => {
    expect(await (await gradient()).getText()).toBe('Premium feature');
  });

  it('repeats the first colour at the end so the sweep can loop', async () => {
    const harness = await gradient();

    expect(await harness.getColors()).toEqual(['#111111', '#222222', '#111111']);
    expect(await harness.getGradient()).toBe('linear-gradient(to right, #111111, #222222, #111111)');
  });

  it('falls back to the three built-in stops for an empty list', async () => {
    fixture.componentInstance.colors.set([]);
    await fixture.whenStable();

    // Three defaults plus the wrap stop.
    expect(await (await gradient()).getColors()).toHaveLength(4);
  });

  it('keeps a functional colour whole instead of splitting it at its own commas', async () => {
    fixture.componentInstance.colors.set(['rgb(82, 39, 255)', '#fff']);
    await fixture.whenStable();

    expect(await (await gradient()).getColors()).toEqual(['rgb(82, 39, 255)', '#fff', 'rgb(82, 39, 255)']);
  });

  it('turns the gradient and stretches it along the axis it travels', async () => {
    const harness = await gradient();
    expect([await harness.getDirection(), await harness.getBackgroundSize()]).toEqual(['horizontal', '300% 100%']);
    expect(await harness.getGradient()).toContain('to right');

    fixture.componentInstance.direction.set('vertical');
    await fixture.whenStable();
    expect([await harness.getDirection(), await harness.getBackgroundSize()]).toEqual(['vertical', '100% 300%']);
    expect(await harness.getGradient()).toContain('to bottom,');

    fixture.componentInstance.direction.set('diagonal');
    await fixture.whenStable();
    expect([await harness.getDirection(), await harness.getBackgroundSize()]).toEqual(['diagonal', '300% 300%']);
    expect(await harness.getGradient()).toContain('to bottom right');
  });

  it('publishes the sweep duration in seconds', async () => {
    const harness = await gradient();
    expect(await harness.getAnimationDurationSeconds()).toBe(8);

    fixture.componentInstance.speed.set(2.5);
    await fixture.whenStable();
    expect(await harness.getAnimationDurationSeconds()).toBe(2.5);
  });

  it('renders no ring until the pill is asked for, and hides it when it does', async () => {
    const harness = await gradient();
    expect([await harness.hasBorderRing(), await harness.isBorderDecorative()]).toEqual([false, null]);

    fixture.componentInstance.showBorder.set(true);
    await fixture.whenStable();

    expect([await harness.hasBorderRing(), await harness.isBorderDecorative()]).toEqual([true, true]);
    // The ring is a sibling of the text, so it must not leak into the projected content.
    expect(await harness.getText()).toBe('Premium feature');
  });

  it('bounces by default, and stops when told', async () => {
    const harness = await gradient();
    expect([await harness.isYoyo(), await harness.pausesOnHover()]).toEqual([true, false]);

    fixture.componentInstance.yoyo.set(false);
    fixture.componentInstance.pauseOnHover.set(true);
    await fixture.whenStable();

    expect([await harness.isYoyo(), await harness.pausesOnHover()]).toEqual([false, true]);
  });

  it('refuses to read stops out of something that is not a gradient', async () => {
    const harness = await gradient();
    hostElement().style.setProperty('--wr-gradient-text-image', 'none');

    await expect(harness.getColors()).rejects.toThrow(/not a linear-gradient/);
  });

  it('refuses to invent a duration the component did not write', async () => {
    const harness = await gradient();
    hostElement().style.setProperty('--wr-gradient-text-duration', 'slowly');

    await expect(harness.getAnimationDurationSeconds()).rejects.toThrow(/"slowly"/);
  });

  it('refuses to hand back the stylesheet default when the host binding is gone', async () => {
    // The three custom properties are read off the `style` attribute, not through
    // `getCssValue()`. `.wr-gradient-text` declares all three itself, spelling out the same
    // defaults the component computes — so a computed read answers with a healthy-looking
    // gradient, `300% 100%` and `8s` for a host that publishes nothing at all.
    const sheet = document.createElement('style');
    sheet.textContent = `.wr-gradient-text {
      --wr-gradient-text-image: linear-gradient(to right, #5227ff, #ff9ffc, #b497cf, #5227ff);
      --wr-gradient-text-size: 300% 100%;
      --wr-gradient-text-duration: 8s;
    }`;
    document.head.append(sheet);

    try {
      const harness = await gradient();
      hostElement().removeAttribute('style');

      await expect(harness.getColors()).rejects.toThrow(/publishes no `--wr-gradient-text-image`/);
      await expect(harness.getBackgroundSize()).rejects.toThrow(/publishes no `--wr-gradient-text-size`/);
      await expect(harness.getAnimationDurationSeconds()).rejects.toThrow(/publishes no `--wr-gradient-text-duration`/);
    } finally {
      sheet.remove();
    }
  });

  it('matches on the text, the direction and the pill', async () => {
    fixture.componentInstance.direction.set('diagonal');
    await fixture.whenStable();

    expect(await loader.getHarnessOrNull(WrGradientTextHarness.with({ text: /Premium/ }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrGradientTextHarness.with({ text: 'Free tier' }))).toBeNull();

    expect(await loader.getHarnessOrNull(WrGradientTextHarness.with({ direction: 'diagonal' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrGradientTextHarness.with({ direction: 'horizontal' }))).toBeNull();

    expect(await loader.getHarnessOrNull(WrGradientTextHarness.with({ border: false }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrGradientTextHarness.with({ border: true }))).toBeNull();
  });
});
