import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { WrWaves } from 'ngwr/waves';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrWavesHarness } from './wr-waves-harness';

@Component({
  imports: [WrWaves],
  template: `<wr-waves [xGap]="xGap()" [backgroundColor]="backgroundColor()" />`,
})
class Host {
  readonly xGap = signal(10);
  readonly backgroundColor = signal('transparent');
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * Everything this component draws is canvas strokes, so the assertions are about the
 * two things it says out loud instead: the pitch it publishes for the CSS stand-in
 * grid, and whether it has handed over to the real one. jsdom refuses the 2D context,
 * which makes "not painted" the correct answer here rather than a limitation — a field
 * that claimed to have painted over a blank box would be the bug.
 */
describe('WrWavesHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const waves = (): Promise<WrWavesHarness> => loader.getHarness(WrWavesHarness);

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
    const harness = await waves();

    expect(await harness.hasCanvas()).toBe(true);
    expect(await harness.isDecorative()).toBe(true);
  });

  it('leaves the stand-in grid up while it has painted nothing', async () => {
    expect(await (await waves()).isPainted()).toBe(false);
  });

  it('publishes the pitch the stand-in grid draws at', async () => {
    const harness = await waves();
    expect(await harness.getLineGapPx()).toBe(10);

    fixture.componentInstance.xGap.set(40);
    await fixture.whenStable();

    expect(await harness.getLineGapPx()).toBe(40);
  });

  it('refuses to invent a pitch once the host has stopped publishing one', async () => {
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-waves')!;
    host.style.removeProperty('--wr-waves-x-gap');

    await expect((await waves()).getLineGapPx()).rejects.toThrow(/--wr-waves-x-gap/);
  });

  it('reports the background as a resolved colour', async () => {
    const harness = await waves();
    expect(await harness.getBackgroundColor()).toBe('rgba(0, 0, 0, 0)');

    fixture.componentInstance.backgroundColor.set('#5227ff');
    await fixture.whenStable();

    expect(await harness.getBackgroundColor()).toBe('rgb(82, 39, 255)');
  });

  it('says exactly the same thing for someone who asked for less motion', async () => {
    // The static, undisturbed grid goes through the same draw and sets the same flag,
    // so there is nothing in the DOM that tells the two paths apart — which is why the
    // harness offers no `isReducedMotion()` to get wrong.
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    const harness = await waves();
    expect(await harness.hasCanvas()).toBe(true);
    expect(await harness.isPainted()).toBe(false);
    expect(await harness.getLineGapPx()).toBe(10);
  });

  it('matches on whether the canvas has taken over', async () => {
    expect(await loader.getHarnessOrNull(WrWavesHarness.with({ painted: false }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrWavesHarness.with({ painted: true }))).toBeNull();
  });
});
