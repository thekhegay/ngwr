import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrHaptics } from 'ngwr/platform';
import { WrPullToRefresh } from 'ngwr/pull-to-refresh';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrPullToRefreshHarness } from './wr-pull-to-refresh-harness';

@Component({
  imports: [WrPullToRefresh],
  template: `
    <wr-pull-to-refresh
      [refreshing]="refreshing()"
      [disabled]="disabled()"
      [threshold]="threshold()"
      (refresh)="onRefresh()"
    >
      <div class="row">Inbox</div>
    </wr-pull-to-refresh>
  `,
})
class Host {
  readonly refreshing = signal(false);
  readonly disabled = signal(false);
  readonly threshold = signal(64);
  /** Whether the handler raises the flag, the way a real one does. */
  controlled = false;
  refreshes = 0;

  onRefresh(): void {
    this.refreshes++;
    if (this.controlled) this.refreshing.set(true);
  }
}

/**
 * The same plain events the component's own spec sends, through the harness:
 * jsdom has no `TouchEvent`, and the component reads one field off it.
 */
describe('WrPullToRefreshHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let list: WrPullToRefreshHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: WrHaptics, useValue: { impact: vi.fn() } }] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    list = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrPullToRefreshHarness);
  });

  afterEach(() => fixture.destroy());

  it('starts closed, with the content in place', async () => {
    expect([
      await list.isRefreshing(),
      await list.isPulling(),
      await list.isArmed(),
      await list.getPullDistance(),
      await list.getContentText(),
    ]).toEqual([false, false, false, 0, 'Inbox']);
  });

  it('pulls until armed and fires one refresh', async () => {
    await list.pull();

    expect(fixture.componentInstance.refreshes).toBe(1);
    // Nobody raised `refreshing`, so the indicator closed again.
    expect([await list.isRefreshing(), await list.getPullDistance()]).toEqual([false, 0]);
  });

  it('reports a refresh the handler holds open, until it lets go', async () => {
    fixture.componentInstance.controlled = true;

    await list.pull();
    expect([await list.isRefreshing(), await list.getPullDistance()]).toEqual([true, 64]);

    fixture.componentInstance.refreshing.set(false);
    await fixture.whenStable();
    expect(await list.isRefreshing()).toBe(false);
  });

  it('arms at whatever threshold the host sets', async () => {
    fixture.componentInstance.threshold.set(900);
    await fixture.whenStable();

    await list.pull();

    expect(fixture.componentInstance.refreshes).toBe(1);
  });

  it('shows a pull under way, half the travel, and arms at the threshold', async () => {
    await list.pullBy(60);
    expect([await list.isPulling(), await list.getPullDistance(), await list.isArmed()]).toEqual([true, 30, false]);
    // A finger is still down: that is not a refresh in flight.
    expect(await list.isRefreshing()).toBe(false);

    await list.release();
    expect([fixture.componentInstance.refreshes, await list.isPulling()]).toEqual([0, false]);

    await list.pullBy(128);
    expect(await list.isArmed()).toBe(true);
    await list.release();
    expect(fixture.componentInstance.refreshes).toBe(1);
  });

  it('abandons a cancelled pull without refreshing', async () => {
    await list.pullBy(200);
    await list.cancel();

    expect([fixture.componentInstance.refreshes, await list.isPulling(), await list.getPullDistance()]).toEqual([
      0,
      false,
      0,
    ]);
  });

  it('says so when the pull never arms: disabled', async () => {
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    await expect(list.pull()).rejects.toThrow(/never armed/);
    expect(fixture.componentInstance.refreshes).toBe(0);
  });

  it('says so when the pull never arms: already refreshing', async () => {
    fixture.componentInstance.refreshing.set(true);
    await fixture.whenStable();
    expect(await list.isRefreshing()).toBe(true);

    // The spinner sits at full opacity while refreshing, which is the reading
    // `isArmed()` uses during a pull: it must not pass for an armed pull here.
    expect(await list.isArmed()).toBe(false);
    await expect(list.pull()).rejects.toThrow(/never armed/);
    expect(fixture.componentInstance.refreshes).toBe(0);
  });

  it('says so when the pull never arms: scrolled away from the top', async () => {
    const host = (fixture.nativeElement as HTMLElement).querySelector('wr-pull-to-refresh')!;
    Object.defineProperty(host, 'scrollTop', { value: 120, configurable: true });

    await expect(list.pull()).rejects.toThrow(/never armed/);
  });

  it('narrows by refreshing', async () => {
    const loader = TestbedHarnessEnvironment.loader(fixture);
    expect(await loader.getAllHarnesses(WrPullToRefreshHarness.with({ refreshing: true }))).toEqual([]);

    fixture.componentInstance.refreshing.set(true);
    await fixture.whenStable();

    expect((await loader.getAllHarnesses(WrPullToRefreshHarness.with({ refreshing: true }))).length).toBe(1);
  });
});
