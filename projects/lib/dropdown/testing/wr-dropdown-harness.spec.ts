import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrDropdown, WrDropdownItem, WrDropdownMenu } from 'ngwr/dropdown';
import { provideWrIcons, svgIcon } from 'ngwr/icon';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrDropdownHarness } from './wr-dropdown-harness';

/**
 * The `<title>` earns its place: `WrIcon` writes a registered icon in with
 * `innerHTML`, so that text becomes part of the item host's `textContent`. It is
 * what makes `getText()` reading the `__label` span rather than the host observable
 * — an item whose icon carries a title would otherwise answer "Copy icon Copy".
 */
const COPY_SVG = '<svg viewBox="0 0 24 24"><title>Copy icon</title><rect x="9" y="9" width="12" height="12" /></svg>';

@Component({
  imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
  template: `
    <button type="button" id="account-actions" [wrDropdown]="menu">Actions</button>
    <wr-dropdown-menu #menu>
      <wr-dropdown-item icon="copy" (click)="picked.push('copy')">Copy</wr-dropdown-item>
      <wr-dropdown-item [disabled]="true" (click)="picked.push('delete')">Delete</wr-dropdown-item>
      <wr-dropdown-item (click)="picked.push('rename')">Rename</wr-dropdown-item>
    </wr-dropdown-menu>
  `,
})
class Host {
  readonly picked: string[] = [];
}

/** The same menu, opened by the pointer resting on the trigger instead of a click. */
@Component({
  imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
  template: `
    <button type="button" trigger="hover" [wrDropdown]="menu">Filters</button>
    <wr-dropdown-menu #menu>
      <wr-dropdown-item>Newest</wr-dropdown-item>
      <wr-dropdown-item>Oldest</wr-dropdown-item>
    </wr-dropdown-menu>
  `,
})
class HoverHost {}

/** Two dropdowns, two menus, one shared overlay container. */
@Component({
  imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
  template: `
    <button type="button" [wrDropdown]="fruit">Fruit</button>
    <wr-dropdown-menu #fruit>
      <wr-dropdown-item>Apple</wr-dropdown-item>
    </wr-dropdown-menu>

    <button type="button" [wrDropdown]="veg">Veg</button>
    <wr-dropdown-menu #veg>
      <wr-dropdown-item>Carrot</wr-dropdown-item>
    </wr-dropdown-menu>
  `,
})
class TwoHost {}

/**
 * A submenu, the only way this component has one: a second `[wrDropdown]` whose
 * trigger lives inside the first one's menu.
 */
@Component({
  imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
  template: `
    <button type="button" [wrDropdown]="file">File</button>
    <wr-dropdown-menu #file>
      <wr-dropdown-item>New</wr-dropdown-item>
      <button type="button" [wrDropdown]="share">Share</button>
    </wr-dropdown-menu>
    <wr-dropdown-menu #share>
      <wr-dropdown-item>Copy link</wr-dropdown-item>
      <wr-dropdown-item>Invite</wr-dropdown-item>
    </wr-dropdown-menu>
  `,
})
class NestedHost {}

/**
 * The menu is a template portal in the overlay container, so nothing this spec
 * asserts about items is reachable from the fixture — which is the whole reason the
 * harness scopes its item queries by the id the trigger publishes as
 * `aria-controls`. `provideWrOverlay()` keeps this file's container out of the next
 * one's.
 */
describe('WrDropdownHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideWrOverlay(), provideWrIcons([svgIcon('copy', COPY_SVG)])],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('finds the trigger and reports it closed', async () => {
    const dropdown = await loader.getHarness(WrDropdownHarness);

    expect(await dropdown.getTriggerText()).toBe('Actions');
    expect(await dropdown.isOpen()).toBe(false);
  });

  it('refuses to read a closed menu', async () => {
    const dropdown = await loader.getHarness(WrDropdownHarness);

    // A silent empty array would read like a menu that rendered nothing, and fail
    // three lines later with a message about the wrong thing.
    await expect(dropdown.getItems()).rejects.toThrow(/menu is closed/);
    await expect(dropdown.getMenuRole()).rejects.toThrow(/menu is closed/);
  });

  it('opens and closes the menu', async () => {
    const dropdown = await loader.getHarness(WrDropdownHarness);

    await dropdown.open();
    expect(await dropdown.isOpen()).toBe(true);
    expect(await dropdown.getMenuRole()).toBe('menu');

    await dropdown.close();
    expect(await dropdown.isOpen()).toBe(false);
  });

  it('toggles on a bare click, the way the default trigger does', async () => {
    const dropdown = await loader.getHarness(WrDropdownHarness);

    await dropdown.clickTrigger();
    expect(await dropdown.isOpen()).toBe(true);

    await dropdown.clickTrigger();
    expect(await dropdown.isOpen()).toBe(false);
  });

  it('opens from the keyboard, as a menu button should', async () => {
    const dropdown = await loader.getHarness(WrDropdownHarness);

    await dropdown.openByKeyboard();

    expect(await dropdown.isOpen()).toBe(true);
    expect(await dropdown.getItemTexts()).toEqual(['Copy', 'Delete', 'Rename']);
  });

  it('names the menu after the trigger the consumer named themselves', async () => {
    const dropdown = await loader.getHarness(WrDropdownHarness);
    await dropdown.open();

    // The menu has no label of its own, so this reference is its accessible name.
    expect(await dropdown.isMenuLabelledByTrigger()).toBe(true);
  });

  it('reads the items out of the overlay', async () => {
    const dropdown = await loader.getHarness(WrDropdownHarness);
    await dropdown.open();

    const items = await dropdown.getItems();

    expect(await dropdown.getItemTexts()).toEqual(['Copy', 'Delete', 'Rename']);
    expect(await items[0].getRole()).toBe('menuitem');
  });

  it('narrows items by label and by state', async () => {
    const dropdown = await loader.getHarness(WrDropdownHarness);
    await dropdown.open();

    const byPattern = await dropdown.getItems({ text: /^R/ });
    const disabled = await dropdown.getItems({ disabled: true });

    expect(await Promise.all(byPattern.map(item => item.getText()))).toEqual(['Rename']);
    expect(await Promise.all(disabled.map(item => item.getText()))).toEqual(['Delete']);
  });

  it('clicks an item by its label and leaves the menu open', async () => {
    const dropdown = await loader.getHarness(WrDropdownHarness);

    await dropdown.clickItem({ text: 'Rename' });

    expect(fixture.componentInstance.picked).toEqual(['rename']);
    // Picking does not close the menu: there is no close-on-select anywhere in the
    // item or the menu, so a consumer who wants one calls close() themselves.
    expect(await dropdown.isOpen()).toBe(true);
  });

  it('refuses to click a disabled item, either way in', async () => {
    // The trap this pins: `disabled` on the item guards the KEYBOARD path only, and
    // the pointer is stopped by `pointer-events: none` in the stylesheet — which
    // jsdom never loads. A harness that dispatched the click would run the
    // consumer's `(click)` and report an activation a browser cannot produce.
    const dropdown = await loader.getHarness(WrDropdownHarness);
    await dropdown.open();

    const [remove] = await dropdown.getItems({ disabled: true });
    expect(await remove.isDisabled()).toBe(true);

    await expect(remove.click()).rejects.toThrow(/disabled/);
    await expect(dropdown.clickItem({ text: 'Delete' })).rejects.toThrow(/disabled/);
    expect(fixture.componentInstance.picked).toEqual([]);
  });

  it('says what the menu does offer when nothing matched', async () => {
    const dropdown = await loader.getHarness(WrDropdownHarness);

    await expect(dropdown.clickItem({ text: 'Archive' })).rejects.toThrow(/Copy, Delete, Rename/);
  });

  it("reports an item's leading icon by name", async () => {
    const dropdown = await loader.getHarness(WrDropdownHarness);
    await dropdown.open();

    const [copy, remove] = await dropdown.getItems();

    expect(await copy.hasIcon()).toBe(true);
    expect(await copy.getIconName()).toBe('copy');
    expect(await remove.hasIcon()).toBe(false);
    expect(await remove.getIconName()).toBeNull();
  });

  it('follows the roving focus the menu moves for the keyboard', async () => {
    const dropdown = await loader.getHarness(WrDropdownHarness);
    await dropdown.open();

    const [copy, remove] = await dropdown.getItems();

    // Focus lands on the first item as the menu renders — every arrow key measures
    // its next target from there.
    expect(await dropdown.getFocusedItemText()).toBe('Copy');
    expect(await copy.isFocused()).toBe(true);
    expect(await remove.isFocused()).toBe(false);
  });

  it('answers where the focus actually is, not where it started', async () => {
    const dropdown = await loader.getHarness(WrDropdownHarness);
    await dropdown.open();

    // The harness offers no arrow-key method on purpose — menu keydown is delivered
    // by the CDK's keyboard dispatcher to the TOP-MOST overlay, so a per-instance one
    // would drive a different menu whenever two are open. Dispatched the way a
    // browser would, from the item that holds focus.
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await fixture.whenStable();

    // Rename, not Delete: the roving focus steps over disabled items.
    expect(await dropdown.getFocusedItemText()).toBe('Rename');

    // And nothing is focused inside the menu once the trigger takes it back — the
    // menu keeps no cursor of its own to fall back on.
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('#account-actions')?.focus();
    expect(await dropdown.getFocusedItemText()).toBeNull();
  });

  it('narrows the dropdown itself by trigger text and by open state', async () => {
    expect(await loader.getHarnessOrNull(WrDropdownHarness.with({ open: true }))).toBeNull();

    const byText = await loader.getHarness(WrDropdownHarness.with({ text: 'Actions' }));
    await byText.open();

    const open = await loader.getHarness(WrDropdownHarness.with({ open: true }));
    expect(await open.getTriggerText()).toBe('Actions');
    expect(await loader.getHarnessOrNull(WrDropdownHarness.with({ open: false }))).toBeNull();
  });
});

describe('WrDropdownHarness — hover trigger', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<HoverHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(HoverHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('opens when the pointer arrives and closes when it leaves', async () => {
    const dropdown = await loader.getHarness(WrDropdownHarness);

    await dropdown.hoverTrigger();
    expect(await dropdown.isOpen()).toBe(true);
    expect(await dropdown.getItemTexts()).toEqual(['Newest', 'Oldest']);

    await dropdown.mouseAwayFromTrigger();
    expect(await dropdown.isOpen()).toBe(false);
  });

  it('ignores a click, which would otherwise toggle it shut', async () => {
    const dropdown = await loader.getHarness(WrDropdownHarness);
    await dropdown.hoverTrigger();

    await dropdown.clickTrigger();

    expect(await dropdown.isOpen()).toBe(true);
  });

  it('opens and closes through the mode-agnostic calls', async () => {
    // `trigger` is not in the DOM, so a spec cannot be asked to know which gesture
    // this dropdown listens for — open()/close() try both.
    const dropdown = await loader.getHarness(WrDropdownHarness);

    await dropdown.open();
    expect(await dropdown.isOpen()).toBe(true);

    await dropdown.close();
    expect(await dropdown.isOpen()).toBe(false);
  });
});

describe('WrDropdownHarness — two on one page', () => {
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

  it('reads only its own items while both menus are open', async () => {
    // Opened from the keyboard deliberately: clicking the second trigger is an
    // outside pointer event for the first, which closes it — and one menu in a
    // shared overlay container proves nothing about scoping. A harness that queried
    // `.wr-dropdown-menu` by class would answer both of these with 'Apple'.
    const [fruit, veg] = await loader.getAllHarnesses(WrDropdownHarness);
    await fruit.openByKeyboard();
    await veg.openByKeyboard();

    expect(await fruit.isOpen()).toBe(true);
    expect(await veg.isOpen()).toBe(true);
    expect(await fruit.getItemTexts()).toEqual(['Apple']);
    expect(await veg.getItemTexts()).toEqual(['Carrot']);
    expect(await fruit.isMenuLabelledByTrigger()).toBe(true);
    expect(await veg.isMenuLabelledByTrigger()).toBe(true);
  });
});

describe('WrDropdownHarness — a dropdown inside a dropdown', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<NestedHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(NestedHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it("reaches the nested trigger through the outer menu's own loader", async () => {
    const file = await loader.getHarness(WrDropdownHarness);
    await file.open();

    // The nested trigger sits in the overlay, so the fixture loader cannot see it at
    // all — the outer dropdown's content loader is scoped to its own menu and can.
    expect(await loader.countHarnesses(WrDropdownHarness)).toBe(1);
    const share = await file.getHarness(WrDropdownHarness.with({ text: 'Share' }));
    await share.open();

    // Clicking inside the outer pane is not an outside press for it, so both stay up.
    expect(await file.isOpen()).toBe(true);
    expect(await file.getItemTexts()).toEqual(['New']);
    expect(await share.getItemTexts()).toEqual(['Copy link', 'Invite']);
  });
});
