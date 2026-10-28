import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrRippleGrid } from 'ngwr/bits/ripple-grid';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrRippleGridHarness } from './wr-ripple-grid-harness';

@Component({
  imports: [WrRippleGrid],
  template: `<wr-ripple-grid [cellSize]="cellSize()" [lineWidth]="lineWidth()" />`,
})
class Host {
  readonly cellSize = signal(40);
  readonly lineWidth = signal(1);
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * Everything this component draws is canvas strokes, so the assertions are about what it
 * says out loud instead: the cell and width it publishes for the CSS stand-in grid, and
 * whether it has handed over to the real one. jsdom refuses the 2D context, which makes
 * "not painted" the correct answer here rather than a limitation.
 */
describe('WrRippleGridHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const grid = (): Promise<WrRippleGridHarness> => loader.getHarness(WrRippleGridHarness);

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

  it('publishes the cell and the line width the stand-in grid draws at', async () => {
    const harness = await grid();
    expect(await harness.getCellSizePx()).toBe(40);
    expect(await harness.getLineWidthPx()).toBe(1);

    fixture.componentInstance.cellSize.set(64);
    fixture.componentInstance.lineWidth.set(2);
    await fixture.whenStable();

    expect(await harness.getCellSizePx()).toBe(64);
    expect(await harness.getLineWidthPx()).toBe(2);
  });

  it('reports the floored values the canvas really draws at', async () => {
    fixture.componentInstance.cellSize.set(2);
    fixture.componentInstance.lineWidth.set(0);
    await fixture.whenStable();

    const harness = await grid();
    expect(await harness.getCellSizePx()).toBe(12);
    expect(await harness.getLineWidthPx()).toBe(0.25);
  });

  it('refuses to invent a value once the host has stopped publishing one', async () => {
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-ripple-grid')!;
    host.style.removeProperty('--wr-ripple-grid-cell-size');
    host.style.removeProperty('--wr-ripple-grid-line-width');

    const harness = await grid();
    await expect(harness.getCellSizePx()).rejects.toThrow(/--wr-ripple-grid-cell-size/);
    await expect(harness.getLineWidthPx()).rejects.toThrow(/--wr-ripple-grid-line-width/);
  });

  it('says exactly the same thing for someone who asked for less motion', async () => {
    // The still grid goes through the same draw and sets the same flag, so nothing in
    // the DOM tells the two paths apart — which is why there is no `isReducedMotion()`.
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    const harness = await grid();
    expect(await harness.hasCanvas()).toBe(true);
    expect(await harness.isPainted()).toBe(false);
    expect(await harness.getCellSizePx()).toBe(40);
  });

  it('matches on whether the canvas has taken over', async () => {
    expect(await loader.getHarnessOrNull(WrRippleGridHarness.with({ painted: false }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrRippleGridHarness.with({ painted: true }))).toBeNull();
  });
});
