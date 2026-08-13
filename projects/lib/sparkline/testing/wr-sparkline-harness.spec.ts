import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrSparkline } from 'ngwr/sparkline';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSparklineHarness } from './wr-sparkline-harness';

@Component({
  imports: [WrSparkline],
  template: `
    <wr-sparkline
      [data]="data()"
      [ariaLabel]="ariaLabel()"
      [showArea]="showArea()"
      [showTip]="showTip()"
      [color]="color()"
    />
  `,
})
class Host {
  readonly data = signal<readonly number[]>([3, 7, 4, 9, 6]);
  readonly ariaLabel = signal<string | null>(null);
  readonly showArea = signal(false);
  readonly showTip = signal(true);
  readonly color = signal('var(--wr-color-primary)');
}

/**
 * The path's `d` is deliberately not asserted — it moves with the viewBox and the
 * value range. What is worth pinning is the ARIA pair: a named sparkline announces
 * itself as an image, an unnamed one hides, and getting that backwards leaves a
 * screen reader stopping on a graphic with nothing to say.
 */
describe('WrSparklineHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const sparkline = (): Promise<WrSparklineHarness> => loader.getHarness(WrSparklineHarness);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('hides itself while it has no name', async () => {
    const harness = await sparkline();

    expect([await harness.getAccessibleName(), await harness.getRole()]).toEqual([null, null]);
    expect(await harness.isDecorative()).toBe(true);
  });

  it('announces itself as an image once it has one', async () => {
    fixture.componentInstance.ariaLabel.set('Sales, last 7 days');
    await fixture.whenStable();

    const harness = await sparkline();
    expect([await harness.getAccessibleName(), await harness.getRole()]).toEqual(['Sales, last 7 days', 'img']);
    expect(await harness.isDecorative()).toBe(false);
  });

  it('draws the line, and the parts it was asked for', async () => {
    const harness = await sparkline();

    expect([await harness.hasLine(), await harness.hasTip(), await harness.hasArea()]).toEqual([true, true, false]);

    fixture.componentInstance.showArea.set(true);
    fixture.componentInstance.showTip.set(false);
    await fixture.whenStable();

    expect([await harness.hasArea(), await harness.hasTip()]).toEqual([true, false]);
  });

  it('passes the colour through to the stroke', async () => {
    expect(await (await sparkline()).getColor()).toBe('var(--wr-color-primary)');
  });

  it('draws no line at all for an empty dataset', async () => {
    fixture.componentInstance.data.set([]);
    await fixture.whenStable();

    const harness = await sparkline();
    expect([await harness.hasLine(), await harness.getColor()]).toEqual([false, null]);
  });

  it('matches on the accessible name', async () => {
    fixture.componentInstance.ariaLabel.set('Sales');
    await fixture.whenStable();

    expect(await loader.getHarnessOrNull(WrSparklineHarness.with({ ariaLabel: 'Sales' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrSparklineHarness.with({ ariaLabel: 'Costs' }))).toBeNull();
  });
});
