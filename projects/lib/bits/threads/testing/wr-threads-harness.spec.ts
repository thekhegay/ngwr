import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrThreads } from 'ngwr/bits/threads';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrThreadsHarness } from './wr-threads-harness';

@Component({
  imports: [WrThreads],
  template: `<wr-threads [lineCount]="lineCount()" [lineWidth]="lineWidth()" />`,
})
class Host {
  readonly lineCount = signal(18);
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
 * Everything this component draws is canvas strokes, so the assertions are about what
 * it says out loud instead: the geometry it publishes for the CSS stand-in, and whether
 * it has handed over to the canvas. Plain jsdom refuses the 2D context, which makes "not
 * painted" the correct answer there rather than a limitation — a background that claimed
 * to have painted over a blank box would be the bug. One spec stubs a context to show
 * the other answer is reachable.
 */
describe('WrThreadsHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const threads = (): Promise<WrThreadsHarness> => loader.getHarness(WrThreadsHarness);

  const mount = async (providers: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  beforeEach(async () => mount());

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('puts a surface up and keeps it out of the accessibility tree', async () => {
    const harness = await threads();

    expect(await harness.hasCanvas()).toBe(true);
    expect(await harness.isDecorative()).toBe(true);
  });

  it('leaves the stand-in up while it has painted nothing', async () => {
    expect(await (await threads()).isPainted()).toBe(false);
  });

  it('publishes the count and width the stand-in draws at', async () => {
    const harness = await threads();
    expect([await harness.getLineCount(), await harness.getLineWidthPx()]).toEqual([18, 1]);

    fixture.componentInstance.lineCount.set(32);
    fixture.componentInstance.lineWidth.set(2.5);
    await fixture.whenStable();

    expect([await harness.getLineCount(), await harness.getLineWidthPx()]).toEqual([32, 2.5]);
  });

  it('reports what the canvas draws, not what was bound', async () => {
    fixture.componentInstance.lineCount.set(0);
    fixture.componentInstance.lineWidth.set(-3);
    await fixture.whenStable();

    const harness = await threads();
    expect([await harness.getLineCount(), await harness.getLineWidthPx()]).toEqual([1, 0.25]);
  });

  it('refuses to invent a count once the host has stopped publishing one', async () => {
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-threads')!;
    host.style.removeProperty('--wr-threads-count');
    host.style.removeProperty('--wr-threads-line-width');

    const harness = await threads();
    await expect(harness.getLineCount()).rejects.toThrow(/--wr-threads-count/);
    await expect(harness.getLineWidthPx()).rejects.toThrow(/--wr-threads-line-width/);
  });

  it('says exactly the same thing for someone who asked for less motion', async () => {
    // The still frame goes through the same draw and sets the same flag, so nothing in
    // the DOM tells the two paths apart — which is why the harness offers no
    // `isReducedMotion()` to get wrong.
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    const harness = await threads();
    expect(await harness.hasCanvas()).toBe(true);
    expect(await harness.isPainted()).toBe(false);
    expect(await harness.getLineCount()).toBe(18);
  });

  it('matches on whether the canvas has taken over', async () => {
    expect(await loader.getHarnessOrNull(WrThreadsHarness.with({ painted: false }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrThreadsHarness.with({ painted: true }))).toBeNull();
  });

  it('reports the handover once a 2d context exists and a frame is drawn', async () => {
    // Every call a frame makes, answered with nothing; reduced motion draws that
    // frame at once, with no animation frame to wait for.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      new Proxy({}, { get: () => (): void => undefined }) as never
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {
          /* jsdom lays nothing out */
        }
        disconnect(): void {
          /* as above */
        }
      }
    );
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    expect(await (await threads()).isPainted()).toBe(true);
    expect(await loader.getHarnessOrNull(WrThreadsHarness.with({ painted: true }))).not.toBeNull();
  });
});
