import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrCascader, type WrCascaderOption } from 'ngwr/cascader';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCascaderHarness } from './wr-cascader-harness';

const PLACES: readonly WrCascaderOption[] = [
  {
    value: 'eu',
    label: 'Europe',
    children: [
      {
        value: 'de',
        label: 'Germany',
        children: [
          { value: 'ber', label: 'Berlin' },
          { value: 'fra', label: 'Frankfurt' },
        ],
      },
      { value: 'fr', label: 'France', children: [{ value: 'par', label: 'Paris' }] },
    ],
  },
  {
    value: 'as',
    label: 'Asia',
    children: [
      { value: 'jp', label: 'Japan', disabled: true, children: [{ value: 'tky', label: 'Tokyo' }] },
      { value: 'kr', label: 'South Korea', children: [{ value: 'seo', label: 'Seoul' }] },
    ],
  },
  { value: 'an', label: 'Antarctica' },
];

const SIZES: readonly WrCascaderOption[] = [
  { value: 'sm', label: 'Small' },
  { value: 'lg', label: 'Large' },
];

@Component({
  imports: [WrCascader],
  template: `
    <wr-cascader
      ariaLabel="Place"
      placeholder="Pick a place"
      [options]="options"
      [(value)]="picked"
      [changeOnSelect]="changeOnSelect()"
      [clearable]="clearable()"
      [disabled]="disabled()"
      (touch)="touched.update(n => n + 1)"
    />
  `,
})
class Host {
  readonly options = PLACES;
  readonly picked = signal<unknown>([]);
  readonly changeOnSelect = signal(false);
  readonly clearable = signal(true);
  readonly disabled = signal(false);
  readonly touched = signal(0);
}

@Component({
  imports: [WrCascader],
  template: `
    <wr-cascader ariaLabel="Place" placeholder="Pick a place" [options]="places" />
    <wr-cascader ariaLabel="Size" placeholder="Pick a size" [options]="sizes" />
  `,
})
class TwoHost {
  readonly places = PLACES;
  readonly sizes = SIZES;
}

/**
 * The panel is a template portal in the overlay container, so none of the columns
 * this spec reads are reachable from the fixture — which is why the harness scopes
 * every panel read by the id the trigger publishes as `aria-controls`. The spec
 * provides `provideWrOverlay()` to keep its container out of the next file's.
 */
describe('WrCascaderHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const picked = (): unknown => fixture.componentInstance.picked();

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('presents a combobox that promises the menu it controls', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);

    expect(await cascader.getAccessibleName()).toBe('Place');
    expect(await cascader.getPopupRole()).toBe('menu');
    expect(await cascader.isOpen()).toBe(false);
    expect(await cascader.isDisabled()).toBe(false);
    expect(await cascader.getValueText()).toBe('');
    expect(await cascader.getPlaceholder()).toBe('Pick a place');

    // `aria-controls` is published open or closed, so while closed it points at an
    // id that is in no document. Pinned rather than glossed over: it is the reason
    // the harness gates every panel read on `aria-expanded` instead of on the id.
    const panelId = await cascader.getPanelId();
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId!)).toBeNull();

    await cascader.open();

    expect(document.getElementById(panelId!)).not.toBeNull();
    expect(await cascader.isPanelWiredToTrigger()).toBe(true);
    expect(await cascader.getPanelRole()).toBe('menu');
  });

  it('opens and closes the panel', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);

    await cascader.open();
    expect(await cascader.isOpen()).toBe(true);

    await cascader.close();
    expect(await cascader.isOpen()).toBe(false);
  });

  it('toggles the panel from the trigger, which is how it closes without Escape', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);

    // `open()` / `close()` are idempotent and Escape-based; `clickTrigger()` is the
    // raw gesture, and a second click on the trigger is the OTHER way a user closes
    // the panel — the component toggles `open` rather than only setting it.
    await cascader.clickTrigger();
    expect(await cascader.isOpen()).toBe(true);

    await cascader.clickTrigger();
    expect(await cascader.isOpen()).toBe(false);
  });

  it('refuses every panel read while the panel is closed', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);

    // A silent `[]` or `null` here would surface as a confusing failure further
    // down the spec instead of naming the cause.
    await expect(cascader.getColumns()).rejects.toThrow(/panel is closed/);
    await expect(cascader.getColumn(0)).rejects.toThrow(/panel is closed/);
    await expect(cascader.getPanelRole()).rejects.toThrow(/panel is closed/);
    await expect(cascader.getActiveTrail()).rejects.toThrow(/panel is closed/);
  });

  it('opens with the roots in a single column', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);
    await cascader.open();

    expect(await cascader.getColumnCount()).toBe(1);
    expect(await cascader.getColumnLabels()).toEqual([['Europe', 'Asia', 'Antarctica']]);
    expect(await (await cascader.getColumn(0)).getRole()).toBe('menu');
  });

  it('adds a column per level as branches are expanded', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);

    await cascader.selectPath(['Europe']);
    expect(await cascader.getColumnCount()).toBe(2);
    expect(await (await cascader.getColumn(1)).getOptionLabels()).toEqual(['Germany', 'France']);

    await cascader.selectPath(['Europe', 'Germany']);
    expect(await cascader.getColumnCount()).toBe(3);
    expect(await (await cascader.getColumn(2)).getOptionLabels()).toEqual(['Berlin', 'Frankfurt']);
  });

  it('prunes the deeper columns when a sibling branch is expanded instead', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);
    await cascader.selectPath(['Europe', 'Germany']);

    await (await (await cascader.getColumn(1)).getOption({ text: 'France' })).click();

    // Switching branch has to drop what was under the old one, or the panel shows
    // a level that no longer belongs to the trail.
    expect(await cascader.getColumnCount()).toBe(3);
    expect(await (await cascader.getColumn(2)).getOptionLabels()).toEqual(['Paris']);
  });

  it('reports the expanded trail and the active option of each level', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);
    await cascader.selectPath(['Europe', 'Germany']);

    expect(await cascader.getActiveTrail()).toEqual(['Europe', 'Germany']);
    expect(await (await cascader.getColumn(0)).getActiveOptionText()).toBe('Europe');
    // The deepest column is what was opened, so nothing in it is expanded yet.
    expect(await (await cascader.getColumn(2)).getActiveOption()).toBeNull();

    const notActive = await (await cascader.getColumn(0)).getOptions({ active: false });
    expect(await Promise.all(notActive.map(option => option.getText()))).toEqual(['Asia', 'Antarctica']);

    // Address a level by what it offers rather than by counting columns.
    const [germanyLevel] = await cascader.getColumns({ optionText: 'Germany' });
    expect(await germanyLevel.getOptionLabels()).toEqual(['Germany', 'France']);
  });

  it('commits the whole PATH when a leaf is picked, and closes', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);

    await cascader.selectPath(['Europe', 'Germany', 'Berlin']);

    // The path, not the leaf: 'ber' alone would not say which country.
    expect(picked()).toEqual(['eu', 'de', 'ber']);
    expect(await cascader.getValueText()).toBe('Europe / Germany / Berlin');
    expect(await cascader.getPlaceholder()).toBeNull();
    expect(await cascader.isOpen()).toBe(false);
  });

  it('commits nothing on the way down, and stays open', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);

    await cascader.selectPath(['Europe', 'Germany']);

    // A branch is navigation, not a choice — committing here would fire a bound
    // form field once per level on the way to the answer.
    expect(picked()).toEqual([]);
    expect(await cascader.getValueText()).toBe('');
    expect(await cascader.isOpen()).toBe(true);
  });

  it('commits at every level when changeOnSelect is on, and stays open', async () => {
    fixture.componentInstance.changeOnSelect.set(true);
    const cascader = await loader.getHarness(WrCascaderHarness);

    await cascader.selectPath(['Europe']);
    expect(picked()).toEqual(['eu']);
    expect(await cascader.isOpen()).toBe(true);

    await cascader.selectPath(['Europe', 'Germany']);
    expect(picked()).toEqual(['eu', 'de']);
    expect(await cascader.getValueText()).toBe('Europe / Germany');
  });

  it('commits a childless root as a one-segment path', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);

    await cascader.selectPath(['Antarctica']);

    expect(picked()).toEqual(['an']);
    expect(await cascader.isOpen()).toBe(false);
  });

  it('reopens on the committed path, columns and all', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);
    await cascader.selectPath(['Europe', 'Germany', 'Berlin']);

    await cascader.open();

    // Reopening rebuilds every level of the selection rather than starting at the
    // roots — which is the whole reason the columns are worth asserting on.
    expect(await cascader.getColumnCount()).toBe(3);
    expect(await cascader.getActiveTrail()).toEqual(['Europe', 'Germany', 'Berlin']);
  });

  it('mirrors a value written from outside into the trigger and the columns', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);

    fixture.componentInstance.picked.set(['eu', 'fr', 'par']);

    expect(await cascader.getValueText()).toBe('Europe / France / Paris');

    await cascader.open();
    expect(await cascader.getActiveTrail()).toEqual(['Europe', 'France', 'Paris']);
  });

  it('refuses a path through a disabled option, and leaves that option inert', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);

    await expect(cascader.selectPath(['Asia', 'Japan'])).rejects.toThrow(/"Japan" is disabled/);

    const japan = await cascader.getOption({ text: 'Japan' });
    expect(await japan.getRole()).toBe('menuitem');
    expect(await japan.isDisabled()).toBe(true);
    expect(await japan.getTabIndex()).toBe(-1);

    const disabledInLevel = await (await cascader.getColumn(1)).getOptions({ disabled: true });
    expect(await Promise.all(disabledInLevel.map(option => option.getText()))).toEqual(['Japan']);

    // Clicking it is honest here: the component refuses the click in its own
    // handler, not through `pointer-events`, so jsdom behaves like a browser.
    await japan.click();

    expect(picked()).toEqual([]);
    expect(await cascader.getColumnCount()).toBe(2);
  });

  it('refuses to walk past a leaf', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);

    await expect(cascader.selectPath(['Antarctica', 'Nowhere'])).rejects.toThrow(/"Antarctica" is a leaf/);
  });

  it('refuses an empty path', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);

    await expect(cascader.selectPath([])).rejects.toThrow(/path is empty/);
  });

  it('names what a level offers when the label is not in it', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);

    await expect(cascader.selectPath(['Europe', 'Spain'])).rejects.toThrow(/offers: Germany, France/);
    await expect(cascader.getOption({ text: 'Spain' })).rejects.toThrow(/no option matched/);
  });

  it('refuses a level that is not showing', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);
    await cascader.open();

    await expect(cascader.getColumn(3)).rejects.toThrow(/no column at level 3 — the panel is showing 1/);
  });

  it('gives every option its own tab stop, and commits from the keyboard', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);
    await cascader.selectPath(['Asia']);

    // Not a roving cursor: there is no container-owned arrow-nav model here, which
    // is the documented reason virtual scrolling is deferred for this component.
    // A keyboard user Tabs to the option they want and presses Enter, so that is
    // the keyboard path the harness offers.
    for (const column of await cascader.getColumns()) {
      for (const option of await column.getOptions({ disabled: false })) {
        expect(await option.getTabIndex()).toBe(0);
      }
    }

    const antarctica = await cascader.getOption({ text: 'Antarctica' });
    await antarctica.focus();
    expect(await antarctica.isFocused()).toBe(true);

    await antarctica.selectByKeyboard();

    expect(picked()).toEqual(['an']);
  });

  it('does not expand a branch on hover', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);
    await cascader.open();

    await (await cascader.getOption({ text: 'Europe' })).hover();

    // Clicking is this cascader's only way down — it binds no pointer-enter
    // handler at all. If hover-to-expand is ever added, this is the case to
    // rewrite, and `selectPath` should keep clicking regardless: jsdom has no
    // layout, so a hover-driven drill-down could not be driven from a spec.
    expect(await cascader.getColumnCount()).toBe(1);
  });

  it('tells branches from leaves', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);
    await cascader.open();

    const roots = await cascader.getColumn(0);
    const leaves = await roots.getOptions({ hasChildren: false });
    const branches = await roots.getOptions({ hasChildren: true });

    expect(await Promise.all(leaves.map(option => option.getText()))).toEqual(['Antarctica']);
    expect(await Promise.all(branches.map(option => option.getText()))).toEqual(['Europe', 'Asia']);
  });

  it('clears the selection back to the placeholder', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);
    await cascader.selectPath(['Europe', 'France', 'Paris']);

    await cascader.clear();

    expect(picked()).toEqual([]);
    expect(await cascader.getValueText()).toBe('');
    expect(await cascader.getPlaceholder()).toBe('Pick a place');
  });

  it('says why there is no clear control to click', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);

    // Nothing selected yet: the control is not rendered.
    await expect(cascader.clear()).rejects.toThrow(/no clear control/);

    await cascader.selectPath(['Antarctica']);
    fixture.componentInstance.clearable.set(false);

    await expect(cascader.clear()).rejects.toThrow(/no clear control/);
    expect(picked()).toEqual(['an']);
  });

  it('marks the field touched when the trigger loses focus', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);
    const before = fixture.componentInstance.touched();

    await cascader.focus();
    expect(await cascader.isFocused()).toBe(true);

    await cascader.blur();

    expect(fixture.componentInstance.touched()).toBeGreaterThan(before);
  });

  it('will not open while disabled, and closes if it is disabled while open', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);
    fixture.componentInstance.disabled.set(true);

    expect(await cascader.isDisabled()).toBe(true);
    await expect(cascader.open()).rejects.toThrow(/did not open/);
    expect(await loader.getHarness(WrCascaderHarness.with({ disabled: true }))).toBeTruthy();

    fixture.componentInstance.disabled.set(false);
    await cascader.open();
    fixture.componentInstance.disabled.set(true);

    expect(await cascader.isOpen()).toBe(false);
  });

  it('narrows by the value the trigger displays', async () => {
    const cascader = await loader.getHarness(WrCascaderHarness);
    await cascader.selectPath(['Europe', 'France', 'Paris']);

    const found = await loader.getHarness(WrCascaderHarness.with({ text: /France/ }));
    expect(await found.getValueText()).toBe('Europe / France / Paris');
  });
});

describe('WrCascaderHarness — two on one page', () => {
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

  /**
   * The scoping trap: two panels in the shared overlay container at once, where a
   * harness that queried `.wr-cascader-panel` / `.wr-cascader__col` by class would
   * answer with whichever panel is first in the DOM for BOTH cascaders. Both
   * scoped reads are exercised — the single-element one
   * (`isPanelWiredToTrigger`, which compares the resolved panel's id with the one
   * the trigger publishes) and the list one (`getColumns`).
   *
   * The two triggers are clicked in ONE change-detection turn on purpose, which is
   * the only way to get here: `harness.open()` stabilises after its click, so by
   * the time the second trigger is clicked the first panel is a live overlay and
   * the click is an outside pointer event that closes it (the next case pins that).
   * Dispatched before change detection runs, neither overlay — and so neither
   * outside-click watcher — exists yet, and both effects open in the same pass.
   */
  it('reads only its own columns while both panels are open', async () => {
    const triggers = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-cascader__trigger')
    );
    for (const trigger of triggers) {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
    await fixture.whenStable();

    const [places, sizes] = await loader.getAllHarnesses(WrCascaderHarness);

    // Asserted rather than assumed: one panel open would prove nothing about scoping.
    expect(await places.isOpen()).toBe(true);
    expect(await sizes.isOpen()).toBe(true);
    expect(await places.getPanelId()).not.toBe(await sizes.getPanelId());

    expect(await places.isPanelWiredToTrigger()).toBe(true);
    expect(await sizes.isPanelWiredToTrigger()).toBe(true);
    expect(await places.getColumnLabels()).toEqual([['Europe', 'Asia', 'Antarctica']]);
    expect(await sizes.getColumnLabels()).toEqual([['Small', 'Large']]);
  });

  it('closes the first panel when the second cascader is opened', async () => {
    const [places, sizes] = await loader.getAllHarnesses(WrCascaderHarness);

    await places.open();
    await sizes.open();

    // Not a quirk of the harness: the click that opens `sizes` lands outside
    // `places`'s pane, and an outside press closes a panel. There is no keyboard
    // route in to dodge it with — the trigger is a plain `<button>` whose only
    // handler is `(click)` — so a user cannot hold two of these open either.
    expect(await places.isOpen()).toBe(false);
    expect(await sizes.isOpen()).toBe(true);
    await expect(places.getColumns()).rejects.toThrow(/panel is closed/);
  });

  it('narrows by placeholder and by open state', async () => {
    const sizes = await loader.getHarness(WrCascaderHarness.with({ placeholder: 'Pick a size' }));
    await sizes.open();

    const open = await loader.getHarness(WrCascaderHarness.with({ open: true }));
    expect(await open.getPlaceholder()).toBe('Pick a size');

    const closed = await loader.getAllHarnesses(WrCascaderHarness.with({ open: false }));
    expect(await Promise.all(closed.map(cascader => cascader.getPlaceholder()))).toEqual(['Pick a place']);
  });
});
