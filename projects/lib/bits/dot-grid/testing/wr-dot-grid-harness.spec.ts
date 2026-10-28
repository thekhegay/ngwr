import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrDotGrid } from 'ngwr/bits/dot-grid';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrDotGridHarness } from './wr-dot-grid-harness';

@Component({
  imports: [WrDotGrid],
  template: `<wr-dot-grid [gap]="gap()" [dotSize]="dotSize()" />`,
})
class Host {
  readonly gap = signal(24);
  readonly dotSize = signal(3);
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * Everything this component draws is canvas fills, so the assertions are about what it
 * says out loud instead: the pitch and size it publishes for the CSS stand-in grid,
 * and whether it has handed over to the real one. jsdom refuses the 2D context, which
 * makes "not painted" the correct answer here rather than a limitation.
 */
describe('WrDotGridHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const grid = (): Promise<WrDotGridHarness> => loader.getHarness(WrDotGridHarness);

  const mount = async (providers: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  beforeEach(async () => mount());

  afterEach(() => fixture.destroy());

  it('puts a surface up and keeps it out of the accessibility tree', async () => {
    const harness = await grid();

    expect(await harness.hasCanvas()).toBe(true);
    expect(await harness.isDecorative()).toBe(true);
  });

  it('leaves the stand-in grid up while it has painted nothing', async () => {
    expect(await (await grid()).isPainted()).toBe(false);
  });

  it('publishes the pitch and the size the stand-in grid draws at', async () => {
    const harness = await grid();
    expect(await harness.getGapPx()).toBe(24);
    expect(await harness.getDotSizePx()).toBe(3);

    fixture.componentInstance.gap.set(40);
    fixture.componentInstance.dotSize.set(6);
    await fixture.whenStable();

    expect(await harness.getGapPx()).toBe(40);
    expect(await harness.getDotSizePx()).toBe(6);
  });

  it('reports the floored pitch the canvas really lays out at', async () => {
    fixture.componentInstance.gap.set(1);
    await fixture.whenStable();

    expect(await (await grid()).getGapPx()).toBe(4);
  });

  it('refuses to invent a value once the host has stopped publishing one', async () => {
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-dot-grid')!;
    host.style.removeProperty('--wr-dot-grid-gap');
    host.style.removeProperty('--wr-dot-grid-dot-size');

    const harness = await grid();
    await expect(harness.getGapPx()).rejects.toThrow(/--wr-dot-grid-gap/);
    await expect(harness.getDotSizePx()).rejects.toThrow(/--wr-dot-grid-dot-size/);
  });

  it('says exactly the same thing for someone who asked for less motion', async () => {
    // The still grid goes through the same draw and sets the same flag, so nothing in
    // the DOM tells the two paths apart — which is why there is no `isReducedMotion()`.
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    const harness = await grid();
    expect(await harness.hasCanvas()).toBe(true);
    expect(await harness.isPainted()).toBe(false);
    expect(await harness.getGapPx()).toBe(24);
  });

  it('matches on whether the canvas has taken over', async () => {
    expect(await loader.getHarnessOrNull(WrDotGridHarness.with({ painted: false }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrDotGridHarness.with({ painted: true }))).toBeNull();
  });
});
