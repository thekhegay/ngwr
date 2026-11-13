import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrInput, WrInputGroup } from 'ngwr/input';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrInputGroupHarness } from './wr-input-group-harness';

@Component({
  imports: [WrInput, WrInputGroup],
  template: `
    <wr-input-group clearable [loading]="loading()">
      <input wrInput placeholder="Search" [value]="query()" (input)="onQuery($event)" />
    </wr-input-group>
  `,
})
class Host {
  readonly query = signal('');
  readonly loading = signal(false);

  onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
}

describe('WrInputGroupHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('hands back the field it wraps', async () => {
    const group = await loader.getHarness(WrInputGroupHarness);

    expect(await (await group.getInput()).getPlaceholder()).toBe('Search');
  });

  it('clears through the button, once there is something to clear', async () => {
    const group = await loader.getHarness(WrInputGroupHarness);
    expect(await group.hasClearButton()).toBe(false);

    await (await group.getInput()).setValue('ada');
    expect(await group.hasClearButton()).toBe(true);

    await group.clear();
    expect(fixture.componentInstance.query()).toBe('');
    expect(await group.hasClearButton()).toBe(false);
  });

  it('refuses to click a clear button that is not there', async () => {
    const group = await loader.getHarness(WrInputGroupHarness);

    await expect(group.clear()).rejects.toThrow(/no clear button/);
  });

  it('reports the spinner', async () => {
    const group = await loader.getHarness(WrInputGroupHarness);
    expect(await group.isLoading()).toBe(false);

    fixture.componentInstance.loading.set(true);
    expect(await group.isLoading()).toBe(true);
  });
});
