import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrButton } from 'ngwr/button';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrButtonHarness } from './wr-button-harness';

@Component({
  imports: [WrButton],
  template: `
    <button type="button" wr-btn color="primary" (click)="clicks.set(clicks() + 1)">Save</button>
    <button type="button" wr-btn [disabled]="true">Cancel</button>
    <wr-btn [loading]="loading()">Sync</wr-btn>
  `,
})
class Host {
  readonly clicks = signal(0);
  readonly loading = signal(true);
}

/**
 * A harness is only worth shipping if it works from the outside, so this spec uses
 * it exactly as a CONSUMER would: through `TestbedHarnessEnvironment`, with no
 * reach into the component's internals and no knowledge of its template beyond the
 * public selectors and classes the harness itself documents.
 */
describe('WrButtonHarness', () => {
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

  it('finds every shape the button ships in', async () => {
    // Two attribute forms and the element form — a harness that only matched
    // `wr-btn` would silently skip most real usage.
    const all = await loader.getAllHarnesses(WrButtonHarness);

    expect(all.length).toBe(3);
    expect(await Promise.all(all.map(b => b.getText()))).toEqual(['Save', 'Cancel', 'Sync']);
  });

  it('narrows by label', async () => {
    const save = await loader.getHarness(WrButtonHarness.with({ text: 'Save' }));

    expect(await save.getText()).toBe('Save');
  });

  it('narrows by a pattern as well as an exact label', async () => {
    const found = await loader.getAllHarnesses(WrButtonHarness.with({ text: /^S/ }));

    expect(await Promise.all(found.map(b => b.getText()))).toEqual(['Save', 'Sync']);
  });

  it('clicks the button it was given', async () => {
    const save = await loader.getHarness(WrButtonHarness.with({ text: 'Save' }));
    await save.click();

    expect(fixture.componentInstance.clicks()).toBe(1);
  });

  it('reads the disabled state whichever way the shape expresses it', async () => {
    // A native `<button>` carries `disabled`; the element form carries that AND
    // `aria-disabled`, because the attribute alone is inert on a custom element.
    const cancel = await loader.getHarness(WrButtonHarness.with({ text: 'Cancel' }));
    const save = await loader.getHarness(WrButtonHarness.with({ text: 'Save' }));

    expect(await cancel.isDisabled()).toBe(true);
    expect(await save.isDisabled()).toBe(false);
  });

  it('counts a loading button as disabled, because it refuses clicks', async () => {
    // Not a quirk of the harness: `disabledWhenLoading` defaults to on, so the
    // button really is inert while it spins.
    const sync = await loader.getHarness(WrButtonHarness.with({ text: 'Sync' }));
    expect(await sync.isDisabled()).toBe(true);

    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    expect(await sync.isDisabled()).toBe(false);
  });

  it('narrows by disabled state', async () => {
    const disabled = await loader.getAllHarnesses(WrButtonHarness.with({ disabled: true }));

    // `Cancel` is disabled outright and `Sync` is mid-load.
    expect(await Promise.all(disabled.map(b => b.getText()))).toEqual(['Cancel', 'Sync']);
  });

  it('sees the loading spinner come and go', async () => {
    const sync = await loader.getHarness(WrButtonHarness.with({ text: 'Sync' }));
    expect(await sync.isLoading()).toBe(true);

    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    expect(await sync.isLoading()).toBe(false);
  });

  it('reports the intent, and nothing when there is none', async () => {
    const save = await loader.getHarness(WrButtonHarness.with({ text: 'Save' }));
    const sync = await loader.getHarness(WrButtonHarness.with({ text: 'Sync' }));

    // Matched against the intent list, not "the first modifier": `Sync` carries
    // `wr-btn--loading` and `wr-btn--icon-start` and neither is a colour.
    expect(await save.getColor()).toBe('primary');
    expect(await sync.getColor()).toBeNull();
  });

  it('moves focus and reports it', async () => {
    const save = await loader.getHarness(WrButtonHarness.with({ text: 'Save' }));
    await save.focus();

    expect(await save.isFocused()).toBe(true);
  });
});
