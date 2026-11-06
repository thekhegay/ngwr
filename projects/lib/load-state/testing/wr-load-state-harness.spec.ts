import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrLoadState, WrLoadStateContent, WrLoadStateError, type WrLoadStateStatus } from 'ngwr/load-state';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrLoadStateHarness } from './wr-load-state-harness';

@Component({
  imports: [WrLoadState, WrLoadStateContent],
  template: `
    <wr-load-state [status]="status()" (retry)="retries.set(retries() + 1)">
      <ng-template wrLoadStateContent><p>Loaded</p></ng-template>
    </wr-load-state>
  `,
})
class Host {
  readonly status = signal<WrLoadStateStatus>('loading');
  readonly retries = signal(0);
}

/** Two wrappers in two states, and one whose failure is the consumer's own. */
@Component({
  imports: [WrLoadState, WrLoadStateContent, WrLoadStateError],
  template: `
    <wr-load-state status="ready"
      ><ng-template wrLoadStateContent><p>Orders</p></ng-template></wr-load-state
    >
    <wr-load-state status="error"
      ><ng-template wrLoadStateContent><p>Invoices</p></ng-template></wr-load-state
    >
    <wr-load-state status="error">
      <ng-template wrLoadStateError let-retry="retry"
        ><button type="button" (click)="retry()">Mine</button></ng-template
      >
      <ng-template wrLoadStateContent><p>Customers</p></ng-template>
    </wr-load-state>
  `,
})
class ManyHost {}

describe('WrLoadStateHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let harness: WrLoadStateHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    harness = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrLoadStateHarness);
  });

  afterEach(() => fixture.destroy());

  it('reports the state and whether a load is in flight', async () => {
    expect(await harness.getState()).toBe('loading');
    expect(await harness.isBusy()).toBe(true);

    fixture.componentInstance.status.set('ready');
    expect(await harness.getState()).toBe('ready');
    expect(await harness.isBusy()).toBe(false);

    fixture.componentInstance.status.set('empty');
    expect(await harness.getState()).toBe('empty');
  });

  it('refuses a retry button outside the error state', async () => {
    await expect(harness.getRetryButton()).rejects.toThrow(/"loading" state/);
    await expect(harness.retry()).rejects.toThrow();
  });

  it('presses the default retry once, and reads it as in flight afterwards', async () => {
    fixture.componentInstance.status.set('error');

    expect(await harness.isRetrying()).toBe(false);
    await harness.retry();
    await harness.retry();

    expect(fixture.componentInstance.retries()).toBe(1);
    expect(await harness.isRetrying()).toBe(true);
    expect(await (await harness.getRetryButton()).getText()).toBe('Try again');
  });
});

describe('WrLoadStateHarness among several wrappers', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ManyHost>>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(ManyHost);
  });

  afterEach(() => fixture.destroy());

  it('narrows by state', async () => {
    const loader = TestbedHarnessEnvironment.loader(fixture);

    expect((await loader.getAllHarnesses(WrLoadStateHarness)).length).toBe(3);
    expect((await loader.getAllHarnesses(WrLoadStateHarness.with({ state: 'error' }))).length).toBe(2);
    expect((await loader.getAllHarnesses(WrLoadStateHarness.with({ state: 'ready' }))).length).toBe(1);
  });

  it('refuses a consumer-drawn failure as the default retry', async () => {
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const [withDefault, withOwn] = await loader.getAllHarnesses(WrLoadStateHarness.with({ state: 'error' }));

    expect(await (await withDefault.getRetryButton()).getText()).toBe('Try again');
    await expect(withOwn.getRetryButton()).rejects.toThrow(/wrLoadStateError/);
  });
});
