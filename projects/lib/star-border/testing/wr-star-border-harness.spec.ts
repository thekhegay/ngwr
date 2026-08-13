import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrStarBorder, type WrStarBorderMode, type WrStarBorderRays } from 'ngwr/star-border';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrStarBorderHarness } from './wr-star-border-harness';

@Component({
  imports: [WrStarBorder],
  template: `
    <wr-star-border [color]="color()" [speed]="speed()" [thickness]="thickness()" [mode]="mode()" [rays]="rays()">
      <span class="label">Upgrade</span>
    </wr-star-border>
    <button type="button" wr-star-border class="cta" [mode]="mode()" [rays]="rays()">Buy</button>
  `,
})
class Host {
  readonly color = signal<string | null>(null);
  readonly speed = signal(6);
  readonly thickness = signal(1);
  readonly mode = signal<WrStarBorderMode>('infinite');
  readonly rays = signal<WrStarBorderRays>('mirror');
}

/**
 * Every ray, every sweep and the hover gate live in a stylesheet no unit test loads, so
 * what is asserted here is the handful of things the component writes itself: two
 * modifier classes, three inline values, and the `aria-hidden` that keeps the decoration
 * out of the accessible tree. The ray COUNT is deliberately absent — see the harness.
 */
describe('WrStarBorderHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const element = (): Promise<WrStarBorderHarness> => loader.getHarness(WrStarBorderHarness.with({ text: 'Upgrade' }));
  const button = (): Promise<WrStarBorderHarness> => loader.getHarness(WrStarBorderHarness.with({ text: 'Buy' }));
  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-star-border')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('carries the defaults, and leaves the colour to the theme', async () => {
    const harness = await element();

    expect(await harness.getText()).toBe('Upgrade');
    expect(await harness.getSpeedSeconds()).toBe(6);
    expect(await harness.getThickness()).toBe(1);
    // No `[color]`: the theme picks primary on light and white on dark.
    expect(await harness.getRayColor()).toBeNull();
    expect([await harness.isHoverOnly(), await harness.isSingleRay()]).toEqual([false, false]);
  });

  it('passes a colour through as it was written', async () => {
    fixture.componentInstance.color.set('var(--wr-color-success)');
    await fixture.whenStable();

    expect(await (await element()).getRayColor()).toBe('var(--wr-color-success)');
  });

  it('names the hover mode and the bottom-only variant', async () => {
    const harness = await element();

    fixture.componentInstance.mode.set('hover');
    fixture.componentInstance.rays.set('single');
    await fixture.whenStable();

    expect([await harness.isHoverOnly(), await harness.isSingleRay()]).toEqual([true, true]);
  });

  it('keeps both rays in the DOM for the bottom-only variant', async () => {
    // The reason there is no getRayCount(): `single` hides the top ray in CSS, so the
    // markup is identical and a count would report the opposite of what was asked for.
    fixture.componentInstance.rays.set('single');
    await fixture.whenStable();

    expect(await (await element()).areRaysDecorative()).toBe(true);
  });

  it('follows the thickness and the speed it was given', async () => {
    fixture.componentInstance.thickness.set(4);
    fixture.componentInstance.speed.set(2.5);
    await fixture.whenStable();

    const harness = await element();
    expect(await harness.getThickness()).toBe(4);
    expect(await harness.getSpeedSeconds()).toBe(2.5);
  });

  it('refuses a sweep time that lost its unit', async () => {
    // What a dropped `+ "s"` on the host binding would leave: a bare number, which is an
    // invalid animation-duration the stylesheet quietly replaces with its own default.
    host().style.setProperty('--wr-star-border-speed', '6');

    await expect((await element()).getSpeedSeconds()).rejects.toThrow(/rather than a value in seconds/);
  });

  it('refuses a padding that is not the shorthand it writes', async () => {
    host().style.setProperty('padding', '4px 8px');

    await expect((await element()).getThickness()).rejects.toThrow(/rather than the/);
  });

  it('keeps the rays out of the accessible tree, and says so for all of them', async () => {
    const harness = await element();
    expect(await harness.areRaysDecorative()).toBe(true);

    // One ray losing the attribute is enough — the question is about every one of them.
    host().querySelector('.wr-star-border__ray--top')!.removeAttribute('aria-hidden');
    expect(await harness.areRaysDecorative()).toBe(false);
  });

  it('works the same on the attribute form, whose classes are merged rather than replaced', async () => {
    const harness = await button();

    expect(await harness.getText()).toBe('Buy');
    expect([await harness.getSpeedSeconds(), await harness.getThickness()]).toEqual([6, 1]);

    fixture.componentInstance.mode.set('hover');
    await fixture.whenStable();

    // The button keeps its own `cta` class, so the modifier can only be read by
    // membership — a whole-className comparison passes here only by accident.
    expect(await harness.isHoverOnly()).toBe(true);
  });

  it('finds both forms, and matches on the projected text', async () => {
    expect(await loader.getAllHarnesses(WrStarBorderHarness)).toHaveLength(2);
    expect(await loader.getHarnessOrNull(WrStarBorderHarness.with({ text: /Upgr/ }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrStarBorderHarness.with({ text: 'Downgrade' }))).toBeNull();
  });
});
