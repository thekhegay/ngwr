import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrContextMenu, WrContextMenuDivider, WrContextMenuItem, WrContextMenuPanel } from 'ngwr/context-menu';
import { provideWrIcons, svgIcon } from 'ngwr/icon';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrContextMenuHarness } from './wr-context-menu-harness';
import type { WrContextMenuItemHarness } from './wr-context-menu-item-harness';

/**
 * The `<title>` earns its place: `WrIcon` writes a registered icon in with
 * `innerHTML`, so that text becomes part of the item host's `textContent`. It is
 * what makes `getText()` reading the `__label` span rather than the host
 * observable — an item whose icon carries a title would otherwise answer
 * "Copy iconCut".
 */
const COPY_SVG = '<svg viewBox="0 0 24 24"><title>Copy icon</title><rect x="9" y="9" width="12" height="12" /></svg>';

@Component({
  imports: [WrContextMenu, WrContextMenuPanel, WrContextMenuItem, WrContextMenuDivider],
  template: `
    <div [wrContextMenu]="menu">Right-click me</div>

    <wr-context-menu #menu>
      <wr-context-menu-item icon="copy" (click)="picked.push('cut')">Cut</wr-context-menu-item>
      <wr-context-menu-item [disabled]="true" (click)="picked.push('copy')">Copy</wr-context-menu-item>
      <wr-context-menu-divider />
      <wr-context-menu-item [submenu]="more">More</wr-context-menu-item>
    </wr-context-menu>

    <wr-context-menu #more>
      <wr-context-menu-item (click)="picked.push('duplicate')">Duplicate</wr-context-menu-item>
      <wr-context-menu-item [submenu]="deeper">Send to</wr-context-menu-item>
    </wr-context-menu>

    <wr-context-menu #deeper>
      <wr-context-menu-item (click)="picked.push('desktop')">Desktop</wr-context-menu-item>
    </wr-context-menu>
  `,
})
class Host {
  readonly picked: string[] = [];
}

/**
 * Two targets, two menus, one shared overlay container — and content that tells
 * them apart on every query path the harness has: the menu element itself, the
 * elements inside it, and the item harnesses.
 */
@Component({
  imports: [WrContextMenu, WrContextMenuPanel, WrContextMenuItem, WrContextMenuDivider],
  template: `
    <div [wrContextMenu]="fruit">Fruit</div>
    <wr-context-menu #fruit>
      <p>Pick one</p>
      <wr-context-menu-item>Apple</wr-context-menu-item>
      <wr-context-menu-divider />
      <wr-context-menu-item>Banana</wr-context-menu-item>
    </wr-context-menu>

    <div [wrContextMenu]="veg">Veg</div>
    <wr-context-menu #veg>
      <wr-context-menu-item>Carrot</wr-context-menu-item>
    </wr-context-menu>
  `,
})
class TwoHost {}

/**
 * A separator the consumer wrote by hand, alongside the component one. Both end a
 * group as far as a screen reader is concerned, which is why the count is by role.
 */
@Component({
  imports: [WrContextMenu, WrContextMenuPanel, WrContextMenuItem, WrContextMenuDivider],
  template: `
    <div [wrContextMenu]="menu">Right-click me</div>
    <wr-context-menu #menu>
      <wr-context-menu-item>Apple</wr-context-menu-item>
      <wr-context-menu-divider />
      <wr-context-menu-item>Banana</wr-context-menu-item>
      <div role="separator"></div>
      <wr-context-menu-item>Cherry</wr-context-menu-item>
    </wr-context-menu>
  `,
})
class SeparatorHost {}

/**
 * Every menu is a template portal in the overlay container, so nothing this spec
 * asserts about a menu is reachable from the fixture — which is the whole reason
 * the harness scopes its queries by the id the target publishes as
 * `aria-controls`. `provideWrOverlay()` keeps this file's container out of the
 * next one's.
 *
 * Real timers throughout, deliberately: the long-press hold, the submenu hover,
 * the outside-press guard and the exit animation are all real `setTimeout`s in
 * the directive, and under zoneless change detection nothing flushes them for us.
 * Waiting them out is what the harness's waiters are for; delay SEMANTICS are
 * `context-menu.spec.ts`'s job, with a fake clock.
 */
describe('WrContextMenuHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const get = (): Promise<WrContextMenuHarness> => loader.getHarness(WrContextMenuHarness);
  const picked = (): string[] => fixture.componentInstance.picked;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideWrOverlay(), provideWrIcons([svgIcon('copy', COPY_SVG)])],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  // Destroying the fixture takes the overlay container with it, panes and all —
  // the directive's exit-animation timer has nothing left to dispose.
  afterEach(() => fixture.destroy());

  it('finds the target and reports it closed', async () => {
    const menu = await get();

    expect(await menu.getTargetText()).toBe('Right-click me');
    expect(await menu.isOpen()).toBe(false);
  });

  it('refuses to read a menu that is not open', async () => {
    const menu = await get();

    // A silent empty array reads like a menu that rendered nothing, and fails
    // three lines later with a message about the wrong thing.
    await expect(menu.getItems()).rejects.toThrow(/no menu is open/);
    await expect(menu.getMenuRole()).rejects.toThrow(/no menu is open/);
    await expect(menu.getMenuText()).rejects.toThrow(/no menu is open/);
    await expect(menu.getDividerCount()).rejects.toThrow(/no menu is open/);
  });

  it('opens on a right-click, and Escape takes the pane with it', async () => {
    const menu = await get();

    await menu.open();
    expect(await menu.isOpen()).toBe(true);
    expect(await menu.getMenuRole()).toBe('menu');

    await menu.close();

    expect(await menu.isOpen()).toBe(false);
    // close() waits out the exit animation, so nothing is left behind to be found
    // by the next query.
    expect(document.querySelectorAll('.wr-context-menu')).toHaveLength(0);
  });

  it('opens on a touch long-press, with no click of any kind', async () => {
    const menu = await get();

    await menu.openByLongPress();

    expect(await menu.isOpen()).toBe(true);
    expect(await menu.getItemTexts()).toEqual(['Cut', 'Copy', 'More']);
  });

  it('reads the items out of the overlay, and a divider is not one', async () => {
    const menu = await get();
    await menu.open();

    const items = await menu.getItems();

    expect(await menu.getItemTexts()).toEqual(['Cut', 'Copy', 'More']);
    expect(await items[0].getRole()).toBe('menuitem');
    // Counted as an item the divider becomes "4 of 5" in every announcement; it
    // announces `role="separator"` instead, and this is where it shows up.
    expect(await menu.getDividerCount()).toBe(1);
  });

  it('narrows items by label, by state and by submenu ownership', async () => {
    const menu = await get();
    await menu.open();

    const byPattern = await menu.getItems({ text: /^C/ });
    const disabled = await menu.getItems({ disabled: true });
    const parents = await menu.getItems({ hasSubmenu: true });
    const leaves = await menu.getItems({ hasSubmenu: false });

    expect(await Promise.all(byPattern.map(item => item.getText()))).toEqual(['Cut', 'Copy']);
    expect(await Promise.all(disabled.map(item => item.getText()))).toEqual(['Copy']);
    expect(await Promise.all(parents.map(item => item.getText()))).toEqual(['More']);
    expect(await Promise.all(leaves.map(item => item.getText()))).toEqual(['Cut', 'Copy']);
  });

  it('clicks an item by its label, and the menu goes with it', async () => {
    const menu = await get();

    await menu.clickItem({ text: 'Cut' });

    expect(picked()).toEqual(['cut']);
    // The opposite of a dropdown, which stays open on select: activating a leaf
    // dismisses the whole chain here, and the target lets go of it at once even
    // though the pane is still playing its exit animation.
    expect(await menu.isOpen()).toBe(false);
  });

  it('says what the menu does offer when nothing matched', async () => {
    const menu = await get();

    await expect(menu.clickItem({ text: 'Archive' })).rejects.toThrow(/Cut, Copy, More/);
  });

  it('refuses to click a disabled item, but sends the key it really guards', async () => {
    // The trap this pins: what stops a pointer on a disabled item is
    // `pointer-events: none` in the stylesheet, which jsdom never loads. The
    // component's own handler refuses the click, but the consumer's `(click)` on the
    // same host is a separate listener — so a harness that dispatched it would
    // report an activation a browser cannot produce.
    const menu = await get();
    await menu.open();

    const [copy] = await menu.getItems({ disabled: true });
    expect(await copy.isDisabled()).toBe(true);

    await expect(copy.click()).rejects.toThrow(/disabled/);
    await expect(menu.clickItem({ text: 'Copy' })).rejects.toThrow(/disabled/);

    // Enter is sent for real, because the component itself refuses it — so the
    // spec gets to watch it being refused.
    await copy.activateByKeyboard();

    expect(picked()).toEqual([]);
    expect(await menu.isOpen()).toBe(true);
  });

  it('activates an item from the keyboard', async () => {
    const menu = await get();
    await menu.open();

    const [cut] = await menu.getItems({ text: 'Cut' });
    await cut.activateByKeyboard();

    expect(picked()).toEqual(['cut']);
    expect(await menu.isOpen()).toBe(false);
  });

  it("reports an item's leading icon by name", async () => {
    const menu = await get();
    await menu.open();

    const [cut, copy] = await menu.getItems();

    expect(await cut.hasIcon()).toBe(true);
    expect(await cut.getIconName()).toBe('copy');
    expect(await copy.hasIcon()).toBe(false);
    expect(await copy.getIconName()).toBeNull();
  });

  it('takes the keyboard on open and roves it with the arrows', async () => {
    const menu = await get();
    await menu.open();

    // Every open here is deliberate (there is no hover trigger), so the cursor
    // goes in unconditionally — otherwise the pane paints a `role="menu"` a
    // keyboard user can see and never enter, since the rows are `tabindex="-1"`.
    expect(await menu.getFocusedItemText()).toBe('Cut');
    const focused = await Promise.all((await menu.getItems()).map(item => item.isFocused()));
    expect(focused).toEqual([true, false, false]);
  });

  it('reads the fresh menu when a right-click re-opens it over the dying one', async () => {
    const menu = await get();
    await menu.open();

    await menu.rightClick();

    // Both panes are in the container until the first one's exit animation ends —
    // and the dying one comes FIRST, so a harness scoped by `.wr-context-menu`
    // rather than by the per-open id would read the menu that is on its way out.
    expect(document.querySelectorAll('.wr-context-menu')).toHaveLength(2);
    expect(await menu.isOpen()).toBe(true);
    expect(await menu.getItemTexts()).toEqual(['Cut', 'Copy', 'More']);
    expect(await menu.getDividerCount()).toBe(1);
  });

  it('dismisses on a press outside the pane', async () => {
    const menu = await get();
    await menu.open();

    await menu.closeByOutsidePress();

    expect(await menu.isOpen()).toBe(false);
    expect(document.querySelectorAll('.wr-context-menu')).toHaveLength(0);
  });

  it('narrows the target itself by text and by open state', async () => {
    expect(await loader.getHarnessOrNull(WrContextMenuHarness.with({ open: true }))).toBeNull();

    const byText = await loader.getHarness(WrContextMenuHarness.with({ text: 'Right-click me' }));
    await byText.open();

    const open = await loader.getHarness(WrContextMenuHarness.with({ open: true }));
    expect(await open.getTargetText()).toBe('Right-click me');
    expect(await loader.getHarnessOrNull(WrContextMenuHarness.with({ open: false }))).toBeNull();
  });
});

describe('WrContextMenuHarness — submenus', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const get = (): Promise<WrContextMenuHarness> => loader.getHarness(WrContextMenuHarness);
  /** The one item in the fixture that owns a submenu, with its menu already open. */
  /** The one item in the fixture that owns a submenu, read from an open menu. */
  const parent = async (): Promise<WrContextMenuItemHarness> => {
    const menu = await get();
    await menu.open();
    const [more] = await menu.getItems({ hasSubmenu: true });
    return more;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideWrOverlay(), provideWrIcons([svgIcon('copy', COPY_SVG)])],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  // Destroying the fixture takes the overlay container with it, panes and all —
  // the directive's exit-animation timer has nothing left to dispose.
  afterEach(() => fixture.destroy());

  it('advertises a submenu on the item that owns one, and on no other', async () => {
    const menu = await get();
    await menu.open();
    const [cut, , more] = await menu.getItems();

    expect(await more.hasSubmenu()).toBe(true);
    expect(await more.isSubmenuOpen()).toBe(false);
    expect(await cut.hasSubmenu()).toBe(false);

    await expect(cut.openSubmenu()).rejects.toThrow(/owns no submenu/);
    await expect(cut.getSubmenuItems()).rejects.toThrow(/no submenu showing/);
  });

  it('opens the submenu on the right arrow and reads its items', async () => {
    const menu = await get();
    await menu.open();
    const [more] = await menu.getItems({ hasSubmenu: true });

    await more.openSubmenu();

    expect(await more.isSubmenuOpen()).toBe(true);
    // A keyboard open walks INTO the submenu, so the cursor has left the row that
    // owns it — the submenu's own pane holds it now.
    expect(await more.isFocused()).toBe(false);
    expect(await menu.getFocusedItemText()).toBeNull();
    expect(await more.getSubmenuItemTexts()).toEqual(['Duplicate', 'Send to']);
    // The submenu is its own pane, so its items are NOT part of the root menu's
    // list — that is what scoping by the published id buys.
    expect(await menu.getItemTexts()).toEqual(['Cut', 'Copy', 'More']);

    await more.closeSubmenu();
    expect(await more.isSubmenuOpen()).toBe(false);
  });

  it('opens the submenu on hover too, once the delay is out', async () => {
    const more = await parent();

    await more.openSubmenuByHover();

    expect(await more.isSubmenuOpen()).toBe(true);
    expect(await more.getSubmenuItemTexts()).toEqual(['Duplicate', 'Send to']);
  });

  it('walks a nested submenu with the same harness', async () => {
    const more = await parent();
    await more.openSubmenu();

    const [sendTo] = await more.getSubmenuItems({ hasSubmenu: true });
    await sendTo.openSubmenu();

    expect(await sendTo.getSubmenuItemTexts()).toEqual(['Desktop']);
    // Each level is its own pane in the same container: three are up here, and
    // every one of them answers only for itself.
    expect(await more.getSubmenuItemTexts()).toEqual(['Duplicate', 'Send to']);
  });

  it('clicks an item inside the submenu, and the whole chain closes', async () => {
    const menu = await get();
    await menu.open();
    const [more] = await menu.getItems({ hasSubmenu: true });

    await more.clickSubmenuItem({ text: 'Duplicate' });

    expect(fixture.componentInstance.picked).toEqual(['duplicate']);
    expect(await menu.isOpen()).toBe(false);
  });

  it('says what the submenu does offer when nothing matched', async () => {
    const more = await parent();

    await expect(more.clickSubmenuItem({ text: 'Archive' })).rejects.toThrow(/Duplicate, Send to/);
  });
});

describe('WrContextMenuHarness — two menus at once', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  // Destroying the fixture takes the overlay container with it, panes and all —
  // the directive's exit-animation timer has nothing left to dispose.
  afterEach(() => fixture.destroy());

  it('reads only its own menu while both are open', async () => {
    // Opened by long-press deliberately: a `contextmenu` event is an outside
    // pointer event for every other open menu, so right-clicking the second
    // target dismisses the first — and one menu in a shared container proves
    // nothing about scoping. A hold emits no click of any kind.
    const [fruit, veg] = await loader.getAllHarnesses(WrContextMenuHarness);
    await fruit.openByLongPress();
    await veg.openByLongPress();

    expect(await fruit.isOpen()).toBe(true);
    expect(await veg.isOpen()).toBe(true);

    // Both panes carry `.wr-context-menu`, and both menus own `[role="menuitem"]`
    // children in the same container — so a class-scoped harness answers with
    // whichever opened first on every one of these three query paths: the menu
    // element itself, the elements inside it, and the item harnesses.
    // Run together because Angular strips the whitespace between elements — it is
    // the menu's raw text, and it differs per instance, which is the point here.
    expect(await fruit.getMenuText()).toBe('Pick oneAppleBanana');
    expect(await veg.getMenuText()).toBe('Carrot');
    expect(await fruit.getDividerCount()).toBe(1);
    expect(await veg.getDividerCount()).toBe(0);
    expect(await fruit.getItemTexts()).toEqual(['Apple', 'Banana']);
    expect(await veg.getItemTexts()).toEqual(['Carrot']);
  });

  it('reads content the item list cannot see', async () => {
    const [fruit] = await loader.getAllHarnesses(WrContextMenuHarness);
    await fruit.open();

    // `<wr-context-menu>` projects whatever it is given: the heading is part of
    // what the menu shows and part of no item.
    expect(await fruit.getMenuText()).toContain('Pick one');
    expect(await fruit.getItemTexts()).toEqual(['Apple', 'Banana']);
  });
});

describe('WrContextMenuHarness — a separator the consumer wrote', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SeparatorHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(SeparatorHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('counts every separator by role, not by the divider class', async () => {
    const menu = await loader.getHarness(WrContextMenuHarness);
    await menu.open();

    // Two groups end in this menu — one `<wr-context-menu-divider>` and one plain
    // element the consumer gave `role="separator"`. Counting
    // `.wr-context-menu-divider` instead would report one and miss the announcement
    // a screen reader actually acts on. Neither is an item.
    expect(await menu.getDividerCount()).toBe(2);
    expect(await menu.getItemTexts()).toEqual(['Apple', 'Banana', 'Cherry']);
  });
});
