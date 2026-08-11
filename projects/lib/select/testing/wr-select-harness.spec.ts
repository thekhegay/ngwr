import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { WrOption, WrSelect } from 'ngwr/select';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSelectHarness } from './wr-select-harness';

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select placeholder="Pick a size" ariaLabel="Size" [(value)]="size">
      <wr-option value="sm">Small</wr-option>
      <wr-option value="md">Medium</wr-option>
      <wr-option value="lg" [disabled]="true">Large</wr-option>
    </wr-select>
  `,
})
class Host {
  readonly size = signal<unknown>(null);
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select mode="multi" clearable placeholder="Pick sizes" ariaLabel="Sizes" [(value)]="sizes">
      <wr-option value="sm">Small</wr-option>
      <wr-option value="md">Medium</wr-option>
      <wr-option value="lg">Large</wr-option>
    </wr-select>
  `,
})
class MultiHost {
  readonly sizes = signal<unknown>([]);
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select mode="search" placeholder="Find a size" ariaLabel="Size" [(value)]="size">
      <wr-option value="sm">Small</wr-option>
      <wr-option value="md">Medium</wr-option>
      <wr-option value="lg">Large</wr-option>
    </wr-select>
  `,
})
class SearchHost {
  readonly size = signal<unknown>(null);
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select ariaLabel="Fruit" placeholder="Fruit"><wr-option value="apple">Apple</wr-option></wr-select>
    <wr-select ariaLabel="Veg" placeholder="Veg"><wr-option value="carrot">Carrot</wr-option></wr-select>
  `,
})
class TwoHost {}

/**
 * The panel is a template portal in the overlay container, so nothing this spec
 * asserts about options is reachable from the fixture — which is the whole reason
 * the harness scopes its option queries by the trigger's `aria-controls` id. The
 * spec provides `provideWrOverlay()` to keep its container out of the next file's.
 */
describe('WrSelectHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('opens and closes the panel', async () => {
    const select = await loader.getHarness(WrSelectHarness);
    expect(await select.isOpen()).toBe(false);

    await select.open();
    expect(await select.isOpen()).toBe(true);

    await select.close();
    expect(await select.isOpen()).toBe(false);
  });

  it('reads the options out of the overlay', async () => {
    const select = await loader.getHarness(WrSelectHarness);
    await select.open();

    expect(await select.getOptionLabels()).toEqual(['Small', 'Medium', 'Large']);
  });

  it('refuses to read options while the panel is closed', async () => {
    const select = await loader.getHarness(WrSelectHarness);

    // A silent empty array would turn into a confusing failure three lines later.
    await expect(select.getOptions()).rejects.toThrow(/panel is closed/);
  });

  it('selects an option and reports the new value', async () => {
    const select = await loader.getHarness(WrSelectHarness);

    expect(await select.getValueText()).toBe('');
    expect(await select.getPlaceholder()).toBe('Pick a size');

    await select.selectOption({ text: 'Medium' });

    expect(fixture.componentInstance.size()).toBe('md');
    expect(await select.getValueText()).toBe('Medium');
    expect(await select.isOpen()).toBe(false);
  });

  it('narrows options by state', async () => {
    const select = await loader.getHarness(WrSelectHarness);
    await select.selectOption({ text: 'Small' });
    await select.open();

    const selected = await select.getOptions({ selected: true });
    const disabled = await select.getOptions({ disabled: true });

    expect(await Promise.all(selected.map(o => o.getText()))).toEqual(['Small']);
    expect(await Promise.all(disabled.map(o => o.getText()))).toEqual(['Large']);
  });

  it('narrows the select itself by its trigger text', async () => {
    const select = await loader.getHarness(WrSelectHarness);
    await select.selectOption({ text: 'Small' });

    const found = await loader.getHarness(WrSelectHarness.with({ text: 'Small' }));
    expect(await found.getValueText()).toBe('Small');
  });

  it('reports a select that is not multiple as such', async () => {
    const select = await loader.getHarness(WrSelectHarness);

    expect(await select.isMultiple()).toBe(false);
    expect(await select.isDisabled()).toBe(false);
  });
});

describe('WrSelectHarness — multi', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<MultiHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(MultiHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('accumulates chips and reads them back in order', async () => {
    const select = await loader.getHarness(WrSelectHarness);
    expect(await select.isMultiple()).toBe(true);

    await select.selectOption({ text: 'Small' });
    await select.selectOption({ text: 'Large' });

    expect(await select.getChipLabels()).toEqual(['Small', 'Large']);
    expect(await select.getValueText()).toBe('Small, Large');
  });

  it('removes one chip by label, leaving the rest', async () => {
    const select = await loader.getHarness(WrSelectHarness);
    await select.selectOption({ text: 'Small' });
    await select.selectOption({ text: 'Medium' });
    await select.selectOption({ text: 'Large' });

    await select.removeChip('Medium');

    // The middle one: an off-by-one in the label/remove pairing would take
    // a neighbour instead.
    expect(await select.getChipLabels()).toEqual(['Small', 'Large']);
  });

  it('says which chip it could not find', async () => {
    const select = await loader.getHarness(WrSelectHarness);
    await select.selectOption({ text: 'Small' });

    await expect(select.removeChip('Huge')).rejects.toThrow(/no chip labelled "Huge"/);
  });

  it('clears every selection at once', async () => {
    const select = await loader.getHarness(WrSelectHarness);
    await select.selectOption({ text: 'Small' });
    await select.selectOption({ text: 'Medium' });

    await select.clear();

    expect(await select.getChipLabels()).toEqual([]);
    expect(fixture.componentInstance.sizes()).toEqual([]);
  });
});

describe('WrSelectHarness — search', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SearchHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(SearchHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('filters the offered options as it types', async () => {
    const select = await loader.getHarness(WrSelectHarness);
    await select.open();

    await select.typeSearch('la');

    // `Large` matches; the other two are still in the DOM and must not be counted.
    expect(await select.getOptionLabels()).toEqual(['Large']);
  });

  it('surfaces the empty state when nothing matches', async () => {
    const select = await loader.getHarness(WrSelectHarness);
    await select.open();

    await select.typeSearch('zzz');

    expect(await select.getOptionLabels()).toEqual([]);
    expect(await select.getNoResultsText()).toBeTruthy();
  });

  it('reads the display text out of the input, where search mode keeps it', async () => {
    const select = await loader.getHarness(WrSelectHarness);
    await select.open();

    await select.selectOption({ text: 'Medium' });

    expect(await select.getValueText()).toBe('Medium');
  });

  it('reports the placeholder from the input', async () => {
    const select = await loader.getHarness(WrSelectHarness);

    expect(await select.getPlaceholder()).toBe('Find a size');
  });
});

describe('WrSelectHarness — two on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads only its own options while both panels are open', async () => {
    // Opened from the keyboard deliberately: clicking the second trigger is an
    // outside pointer event for the first, which closes it — and one panel in a
    // shared overlay container proves nothing about scoping.
    const root = fixture.nativeElement as HTMLElement;
    const triggers = Array.from(root.querySelectorAll<HTMLElement>('.wr-select__trigger'));
    for (const trigger of triggers) {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    }
    await fixture.whenStable();

    const [fruit, veg] = await loader.getAllHarnesses(WrSelectHarness);

    expect(await fruit.isOpen()).toBe(true);
    expect(await veg.isOpen()).toBe(true);
    expect(await fruit.getOptionLabels()).toEqual(['Apple']);
    expect(await veg.getOptionLabels()).toEqual(['Carrot']);
  });
});
