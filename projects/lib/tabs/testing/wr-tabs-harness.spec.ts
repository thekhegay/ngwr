import { type Direction, Directionality } from '@angular/cdk/bidi';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';

import { Subject } from 'rxjs';

import { WrButton } from 'ngwr/button';
import { WrButtonHarness } from 'ngwr/button/testing';
import { WrTab, WrTabs } from 'ngwr/tabs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTabHarness } from './wr-tab-harness';
import { WrTabsHarness } from './wr-tabs-harness';

/**
 * Content tabs, used the way a consumer would. The `<wr-btn>` in the first panel is
 * there for the content-container reach: a tab harness is scoped to the panel it
 * controls, and only the selected tab has one.
 */
@Component({
  imports: [WrButton, WrTab, WrTabs],
  template: `
    <wr-tabs [(active)]="active" [size]="size()">
      <wr-tab title="One" key="one">
        Panel one
        <button type="button" wr-btn (click)="saves.set(saves() + 1)">Save</button>
      </wr-tab>
      <wr-tab title="Two" key="two">Panel two</wr-tab>
      <wr-tab title="Three" key="three" [disabled]="true">Panel three</wr-tab>
      <wr-tab title="Four" key="four">Panel four</wr-tab>
    </wr-tabs>
  `,
})
class Host {
  readonly active = signal<string | null>(null);
  readonly size = signal<'sm' | 'md' | 'lg'>('md');
  readonly saves = signal(0);
}

@Component({ template: 'Routed page' })
class Page {}

/**
 * The other mode: one `routerLink` turns the whole strip into links, drops the
 * panel, and hands the selection to the router.
 */
@Component({
  imports: [RouterOutlet, WrTab, WrTabs],
  template: `
    <wr-tabs>
      <wr-tab key="overview" title="Overview" routerLink="/overview" />
      <wr-tab key="details" title="Details" routerLink="/details" />
      <wr-tab key="locked" title="Locked" routerLink="/locked" [disabled]="true" />
    </wr-tabs>
    <router-outlet />
  `,
})
class RouterHost {}

/** A strip inside a strip — the shape that catches a harness answering for a nested one. */
@Component({
  imports: [WrTab, WrTabs],
  template: `
    <wr-tabs>
      <wr-tab key="outer-one" title="Outer one">
        <wr-tabs>
          <wr-tab key="inner-one" title="Inner one">Inner panel one</wr-tab>
          <wr-tab key="inner-two" title="Inner two">Inner panel two</wr-tab>
        </wr-tabs>
      </wr-tab>
      <wr-tab key="outer-two" title="Outer two">Outer panel two</wr-tab>
    </wr-tabs>
  `,
})
class NestedHost {}

@Component({ imports: [WrTabs], template: '<wr-tabs />' })
class EmptyHost {}

describe('WrTabsHarness', () => {
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

  it('reads the wiring that makes a row of buttons a tablist', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);

    // The role is on the strip, not on the host — and the orientation is what tells a
    // screen-reader user which arrow keys to press.
    expect(await tabs.getRole()).toBe('tablist');
    expect(await tabs.getOrientation()).toBe('horizontal');
  });

  it('reads the axis off the strip’s aria-orientation rather than from a fixed answer', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);
    const strip = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-tabs__strip')!;

    // The component hard-codes `horizontal`, so an assertion of `horizontal` passes
    // whatever the harness reads — including nothing. Changing the attribute in the
    // rendered DOM is what pins the read to that attribute.
    strip.setAttribute('aria-orientation', 'vertical');
    expect(await tabs.getOrientation()).toBe('vertical');

    // Absent, the answer is ARIA's own default for a tablist.
    strip.removeAttribute('aria-orientation');
    expect(await tabs.getOrientation()).toBe('horizontal');
  });

  it('reads the state a tab ANNOUNCES, not the class it is painted with', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);
    const [one, two, three] = await tabs.getTabs();
    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]');

    // The component binds `aria-selected` and `--active` to the same expression, so
    // nothing the component can render tells which one the harness believes. Forcing
    // them apart does, and the ARIA state has to win: it is what assistive tech acts
    // on, and a `--active` class outliving it is a strip that looks right and
    // announces the wrong tab.
    headers[0].setAttribute('aria-selected', 'false');
    headers[1].setAttribute('aria-selected', 'true');
    expect(headers[0].classList.contains('wr-tabs__tab--active')).toBe(true);
    expect(await one.isSelected()).toBe(false);
    expect(await two.isSelected()).toBe(true);
    expect(await tabs.getSelectedLabel()).toBe('Two');

    // Same split for disabled: `--disabled` is the paint, the native property is what
    // refuses the click.
    headers[2].disabled = false;
    expect(headers[2].classList.contains('wr-tabs__tab--disabled')).toBe(true);
    expect(await three.isDisabled()).toBe(false);
  });

  it('does not call a disabled tab a tab stop, even when it is the selected one', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);

    // `<wr-tabs>` hands the roving `tabindex="0"` to whatever `active` names without
    // checking `disabled`, so a host can render a selected, disabled, `tabindex="0"`
    // tab. A Tab press still skips it — a disabled button is unreachable — so the
    // strip has no stop at all. jsdom will happily focus that button, which is why
    // the assertion is about the stop rather than about where focus ended up.
    fixture.componentInstance.active.set('three');
    await fixture.whenStable();

    const [three] = await tabs.getTabs({ label: 'Three' });
    expect(await tabs.getSelectedLabel()).toBe('Three');
    expect(await three.isDisabled()).toBe(true);
    expect(await three.isTabStop()).toBe(false);
    expect(await tabs.getTabStopLabels()).toEqual([]);
    await expect(tabs.focusTabStop()).rejects.toThrow(/no tab stop/);
  });

  it('lists its tabs in order', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);

    expect(await tabs.getTabLabels()).toEqual(['One', 'Two', 'Three', 'Four']);
    expect(await tabs.isRouterMode()).toBe(false);
  });

  it('selects the first tab when nothing was bound', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);

    expect(await tabs.getSelectedLabel()).toBe('One');
    expect(fixture.componentInstance.active()).toBe('one');
  });

  it('keeps the strip to one tab stop, and moves it with the selection', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);

    // A tablist is ONE tab stop. Four reachable tabs would mean four.
    expect(await tabs.isRoving()).toBe(true);
    expect(await tabs.getTabStopLabels()).toEqual(['One']);

    await tabs.select({ label: 'Two' });

    expect(await tabs.getTabStopLabels()).toEqual(['Two']);
  });

  it('pairs the showing panel with the selected tab, both ways round', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);
    const [one, two] = await tabs.getTabs();

    // The failure this guards is invisible on screen: the right content under the
    // right header, announced with the wrong name. Both references have to hold —
    // the header's `aria-controls` down to the panel, the panel's `aria-labelledby`
    // back up to this header.
    expect(await one.isPanelBound()).toBe(true);
    expect(await tabs.getPanelText()).toContain('Panel one');

    await tabs.select({ label: 'Two' });

    expect(await two.isPanelBound()).toBe(true);
    expect(await tabs.getPanelText()).toContain('Panel two');
  });

  it('says no when the panel names some other tab', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);
    const [one] = await tabs.getTabs();

    const panel = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="tabpanel"]')!;
    panel.setAttribute('aria-labelledby', 'some-other-heading');

    // The point of the case: a pairing check that can only ever answer `true` reports
    // the wiring as intact on the day it breaks. The panel is still the one this tab
    // controls — the content reads fine — and it now announces the wrong name.
    expect(await one.isPanelBound()).toBe(false);
    expect(await one.getPanelText()).toContain('Panel one');
  });

  it('renders only the selected tab’s panel, and says so rather than answering empty', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);
    const [one, two, three, four] = await tabs.getTabs();

    expect(await Promise.all([one, two, three, four].map(tab => tab.hasPanel()))).toEqual([true, false, false, false]);
    // Every other tab's content waits in an unrendered `<ng-template>`: there is no
    // empty panel to read, so a `''` here would be a lie.
    await expect(two.getPanelText()).rejects.toThrow(/not rendered/);
    await expect(two.isPanelBound()).rejects.toThrow(/not rendered/);
  });

  it('reaches the consumer’s own components inside the panel that is showing', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);
    const [one, two] = await tabs.getTabs();

    await (await one.getHarness(WrButtonHarness.with({ text: 'Save' }))).click();
    expect(fixture.componentInstance.saves()).toBe(1);

    // An unselected tab has no panel to search, and saying that beats searching the
    // whole page and reporting whatever it finds.
    await expect(two.getHarness(WrButtonHarness)).rejects.toThrow(/not rendered/);
  });

  it('selects by label and by index, writing back through the two-way binding', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);

    await tabs.select({ label: 'Two' });
    expect(await tabs.getSelectedLabel()).toBe('Two');
    expect(fixture.componentInstance.active()).toBe('two');

    await tabs.selectByIndex(3);
    expect(await tabs.getSelectedLabel()).toBe('Four');
    expect(fixture.componentInstance.active()).toBe('four');
  });

  it('follows a selection the host writes from outside', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);

    fixture.componentInstance.active.set('four');
    await fixture.whenStable();

    expect(await tabs.getSelectedLabel()).toBe('Four');
    expect(await tabs.getTabStopLabels()).toEqual(['Four']);
    expect(await tabs.getPanelText()).toContain('Panel four');
  });

  it('refuses a disabled tab, and says why the click did nothing', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);

    expect(await Promise.all((await tabs.getTabs({ disabled: true })).map(tab => tab.getLabel()))).toEqual(['Three']);

    await expect(tabs.select({ label: 'Three' })).rejects.toThrow(/still unselected/);
    expect(await tabs.getSelectedLabel()).toBe('One');
    expect(fixture.componentInstance.active()).toBe('one');
    // A disabled tab is not in the tab order either, so Tab never lands on it.
    expect(await tabs.getTabStopLabels()).not.toContain('Three');
  });

  it('says which tabs exist when none of them matched, and refuses an index it does not have', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);

    await expect(tabs.select({ label: 'Five' })).rejects.toThrow(/One, Two, Three, Four/);
    await expect(tabs.selectByIndex(4)).rejects.toThrow(/4 tab\(s\), so index 4 is out of range/);
  });

  it('moves the arrows through the strip, taking the selection and focus with them', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);

    await tabs.focusTabStop();
    expect(await tabs.getFocusedLabel()).toBe('One');

    // Automatic activation: in content mode the arrow keys select what they land on,
    // so the selection, the tab stop and real focus stay on the same tab.
    await tabs.pressArrowRight();
    expect(await tabs.getSelectedLabel()).toBe('Two');
    expect(await tabs.getFocusedLabel()).toBe('Two');
    expect(await tabs.getTabStopLabels()).toEqual(['Two']);

    // Three is disabled — the arrows skip it rather than landing on it.
    await tabs.pressArrowRight();
    expect(await tabs.getSelectedLabel()).toBe('Four');

    await tabs.pressArrowRight();
    expect(await tabs.getSelectedLabel()).toBe('One');

    await tabs.pressArrowLeft();
    expect(await tabs.getSelectedLabel()).toBe('Four');
    expect(await tabs.getFocusedLabel()).toBe('Four');
  });

  it('jumps to the ends with Home and End', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);

    await tabs.pressEnd();
    expect(await tabs.getSelectedLabel()).toBe('Four');

    await tabs.pressHome();
    expect(await tabs.getSelectedLabel()).toBe('One');
  });

  it('reports the size the strip renders at, not the input that asked for it', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);

    // `md` paints no modifier class, so its absence is the answer.
    expect(await tabs.getSize()).toBe('md');

    fixture.componentInstance.size.set('lg');
    await fixture.whenStable();

    expect(await tabs.getSize()).toBe('lg');
  });

  it('narrows a strip by a tab it offers, by its selection, by size and by mode', async () => {
    fixture.componentInstance.size.set('sm');
    await fixture.whenStable();

    expect(await loader.getAllHarnesses(WrTabsHarness.with({ tabLabel: 'Three' }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrTabsHarness.with({ tabLabel: 'Nope' }))).toEqual([]);
    expect(await loader.getAllHarnesses(WrTabsHarness.with({ selectedLabel: /^On/ }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrTabsHarness.with({ selectedLabel: 'Two' }))).toEqual([]);
    expect(await loader.getAllHarnesses(WrTabsHarness.with({ size: 'sm' }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrTabsHarness.with({ size: 'md' }))).toEqual([]);
    expect(await loader.getAllHarnesses(WrTabsHarness.with({ router: false }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrTabsHarness.with({ router: true }))).toEqual([]);
  });

  it('narrows tabs by label and by selection', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);
    const labels = async (filters: Parameters<typeof tabs.getTabs>[0]): Promise<string[]> =>
      Promise.all((await tabs.getTabs(filters)).map(tab => tab.getLabel()));

    expect(await labels({ selected: true })).toEqual(['One']);
    expect(await labels({ selected: false })).toEqual(['Two', 'Three', 'Four']);
    expect(await labels({ label: /^T/ })).toEqual(['Two', 'Three']);
    expect(await labels({ disabled: false })).toEqual(['One', 'Two', 'Four']);
  });

  it('answers for one tab: its id, its panel, its shape and its focus', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);
    const [one, two, three] = await tabs.getTabs();

    // The id is what the panel names as its label, so it has to be there.
    expect(await one.getId()).toBeTruthy();
    expect(await one.getPanelId()).toBeTruthy();
    expect(await one.getPanelId()).not.toBe(await two.getPanelId());
    // A content tab is a `<button>`: it swaps a panel rather than navigating.
    expect(await one.isLink()).toBe(false);
    expect(await one.getHref()).toBeNull();
    expect(await one.isSelected()).toBe(true);
    expect(await two.isSelected()).toBe(false);
    expect(await three.isDisabled()).toBe(true);
    expect(await three.isTabStop()).toBe(false);

    await two.focus();
    expect(await two.isFocused()).toBe(true);
    expect(await tabs.getFocusedLabel()).toBe('Two');
    // Focus is not the selection: the cursor moved, the panel did not.
    expect(await tabs.getSelectedLabel()).toBe('One');

    await two.blur();
    expect(await two.isFocused()).toBe(false);
    expect(await tabs.getFocusedLabel()).toBeNull();

    await two.click();
    expect(await tabs.getSelectedLabel()).toBe('Two');

    // A tab is also addressable on its own, without going through the strip.
    const [direct] = await loader.getAllHarnesses(WrTabHarness.with({ label: 'Two' }));
    expect(await direct.getLabel()).toBe('Two');
    expect(await direct.isSelected()).toBe(true);
  });

  it('reports the edge fades from the strip’s scroll metrics', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);

    // jsdom lays nothing out, so a strip never overflows and never fades on its own.
    expect(await tabs.getFades()).toEqual({ start: false, end: false });

    // The strip's scroll metrics, declared — the component reads them on `scroll`.
    const strip = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-tabs__strip')!;
    Object.defineProperty(strip, 'scrollWidth', { value: 400, configurable: true });
    Object.defineProperty(strip, 'clientWidth', { value: 200, configurable: true });
    Object.defineProperty(strip, 'scrollLeft', { value: 200, configurable: true });
    strip.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();

    // Scrolled to the far end: 400 of tabs in a 200 viewport, so the tabs left behind
    // are the ones the fade cues.
    expect(await tabs.getFades()).toEqual({ start: true, end: false });
  });
});

/**
 * Router mode, which answers "which tab is active" with three different tabs.
 *
 * The selection comes from the resolved route, the tab order holds EVERY enabled tab
 * rather than one, and the arrow keys move focus without selecting anything. A spec
 * that asserts the selection and means the focus passes straight through that.
 */
describe('WrTabsHarness — a router strip', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<RouterHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let router: Router;

  const navigate = async (url: string): Promise<void> => {
    await router.navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'overview', component: Page },
          { path: 'details', component: Page },
          { path: 'locked', component: Page },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(RouterHost);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('is a strip of links with no panel of its own', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);
    const [overview] = await tabs.getTabs();

    expect(await tabs.isRouterMode()).toBe(true);
    expect(await tabs.getTabLabels()).toEqual(['Overview', 'Details', 'Locked']);
    expect(await overview.isLink()).toBe(true);
    expect(await overview.getHref()).toBe('/overview');
    expect(await overview.getPanelId()).toBeNull();
    expect(await tabs.hasPanel()).toBe(false);
    // Nothing is selected until a route resolves, and that is a different failure
    // from a router strip having no panel at all — both are named.
    await expect(tabs.getPanelText()).rejects.toThrow(/no tab is selected/);
  });

  it('takes its selection from the resolved route, and announces it', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);

    expect(await tabs.getSelectedLabel()).toBeNull();

    await navigate('/details');

    expect(await tabs.getSelectedLabel()).toBe('Details');
    expect(await loader.getAllHarnesses(WrTabsHarness.with({ selectedLabel: 'Details' }))).toHaveLength(1);

    // What `isSelected()` read here: the router tab publishes `aria-selected` off the
    // same `routerLinkActive` that paints `--active`, so the announced selection and
    // the painted one are one reading. It used to paint the class and say nothing.
    const anchor = (fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]')[1];
    expect(anchor.getAttribute('aria-selected')).toBe('true');
    expect(anchor.classList.contains('wr-tabs__tab--active')).toBe(true);

    await expect(tabs.getPanelText()).rejects.toThrow(/controls no panel/);
  });

  it('stops being one tab stop — every enabled link is its own', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);

    // The difference that matters: a content strip roves ONE tabindex="0", a router
    // strip puts each link in the page tab order and leaves the disabled one out.
    expect(await tabs.isRoving()).toBe(false);
    expect(await tabs.getTabStopLabels()).toEqual(['Overview', 'Details']);
    expect(await (await tabs.getTabs({ label: 'Locked' }))[0].isDisabled()).toBe(true);
  });

  it('walks focus with the arrow keys without moving the selection', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);
    await navigate('/overview');

    expect(await tabs.getSelectedLabel()).toBe('Overview');

    await tabs.focusTabStop();
    expect(await tabs.getFocusedLabel()).toBe('Overview');

    await tabs.pressArrowRight();

    // The pin: focus moved, the selection did not. Only the router changes that here,
    // so a harness reporting one of these as the other would hide a dead tab strip.
    expect(await tabs.getFocusedLabel()).toBe('Details');
    expect(await tabs.getSelectedLabel()).toBe('Overview');
  });

  it('lets a click settle into a selection', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);
    await navigate('/overview');

    // A click on a link selects nothing by itself, but the harness stabilizes the
    // pending navigation before it re-reads the strip, so the route has landed and
    // `routerLinkActive` has painted it: `select()` resolves here rather than throwing.
    await tabs.select({ label: 'Details' });
    expect(router.url).toBe('/details');
    expect(await tabs.getSelectedLabel()).toBe('Details');
  });

  it('refuses a disabled link, which needs a guard of its own', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);
    await navigate('/overview');

    const locked = (await tabs.getTabs({ label: 'Locked' }))[0];
    expect(await locked.isDisabled()).toBe(true);

    // `disabled` is a native control's property and a router tab is an `<a>`, so the
    // attribute means nothing to it: `aria-disabled` and a negative tabindex keep it
    // off the keyboard path, and nothing at all used to stop a pointer. The component
    // now cancels the click, so the route does not move and `select()` throws because
    // the tab it was asked for never became the selected one.
    await expect(tabs.select({ label: 'Locked' })).rejects.toThrow();
    expect(router.url).toBe('/overview');
    expect(await tabs.getSelectedLabel()).toBe('Overview');
  });

  it('narrows a router strip by mode', async () => {
    expect(await loader.getAllHarnesses(WrTabsHarness.with({ router: true }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrTabsHarness.with({ router: false }))).toEqual([]);
  });
});

describe('WrTabsHarness — a strip inside a strip', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<NestedHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(NestedHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('answers with its own tabs only', async () => {
    const [outer, inner] = await loader.getAllHarnesses(WrTabsHarness);

    // The inner strip lives in the outer PANEL, so it is a descendant of the outer
    // host: a host-wide query would hand back all four tabs as one flat list, and
    // every count, index and selection here would be wrong by two.
    expect(await outer.getTabLabels()).toEqual(['Outer one', 'Outer two']);
    expect(await inner.getTabLabels()).toEqual(['Inner one', 'Inner two']);
    expect(await outer.getTabStopLabels()).toEqual(['Outer one']);
    expect(await outer.getSelectedLabel()).toBe('Outer one');
    expect(await inner.getSelectedLabel()).toBe('Inner one');
  });

  it('keeps one strip’s keyboard and selection out of the other’s', async () => {
    const [outer, inner] = await loader.getAllHarnesses(WrTabsHarness);

    await inner.select({ label: 'Inner two' });

    expect(await inner.getPanelText()).toContain('Inner panel two');
    expect(await outer.getSelectedLabel()).toBe('Outer one');
    // The outer panel contains the whole inner strip, so its text is everything in it.
    expect(await outer.getPanelText()).toContain('Inner panel two');

    await outer.select({ label: 'Outer two' });

    // Switching the outer tab destroys the panel the inner strip was living in.
    expect(await outer.getPanelText()).toContain('Outer panel two');
    expect(await loader.getAllHarnesses(WrTabsHarness)).toHaveLength(1);
  });
});

describe('WrTabsHarness — a strip with no tabs', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<EmptyHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(EmptyHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reports an empty strip rather than pretending to have a selection', async () => {
    const tabs = await loader.getHarness(WrTabsHarness);

    // The tablist is still there — an empty one, which is what the component renders.
    expect(await tabs.getRole()).toBe('tablist');
    expect(await tabs.getTabLabels()).toEqual([]);
    expect(await tabs.getSelectedTab()).toBeNull();
    expect(await tabs.getSelectedLabel()).toBeNull();
    expect(await tabs.getFocusedLabel()).toBeNull();
    expect(await tabs.hasPanel()).toBe(false);
    expect(await tabs.getTabStopLabels()).toEqual([]);

    await expect(tabs.getPanelText()).rejects.toThrow(/no tab is selected/);
    await expect(tabs.select({ label: 'One' })).rejects.toThrow(/renders no tabs at all/);
    await expect(tabs.selectByIndex(0)).rejects.toThrow(/0 tab\(s\)/);
    await expect(tabs.focusTabStop()).rejects.toThrow(/no tab stop/);
  });
});

/**
 * Reading direction. `Directionality` resolves the document's direction when it is
 * constructed, so the honest way to test the other one is to provide a fake —
 * writing `document.dir` mid-file would leak into whatever runs after it.
 *
 * The harness names the PHYSICAL keys, which is what a keyboard has, and the strip
 * follows visual order: each case here states the outcome the other direction
 * contradicts, so neither can pass by always moving the same way.
 */
describe('WrTabsHarness — under a reading direction', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const mount = (dir: Direction): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Directionality,
          useValue: { value: dir, valueSignal: signal(dir), change: new Subject<Direction>() },
        },
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  afterEach(() => fixture.destroy());

  it('sends ArrowRight to the next tab — ltr', async () => {
    mount('ltr');
    const tabs = await loader.getHarness(WrTabsHarness);

    await tabs.pressArrowRight();
    expect(await tabs.getSelectedLabel()).toBe('Two');
  });

  it('sends ArrowRight to the previous tab — rtl', async () => {
    // The strip is mirrored, so the visual right is the PREVIOUS tab: from the first
    // one that wraps to the last rather than landing on Two.
    mount('rtl');
    const tabs = await loader.getHarness(WrTabsHarness);

    await tabs.pressArrowRight();
    expect(await tabs.getSelectedLabel()).toBe('Four');

    await tabs.pressArrowLeft();
    expect(await tabs.getSelectedLabel()).toBe('One');
  });

  it('leaves Home and End alone — they name a position, not an edge', async () => {
    for (const dir of ['ltr', 'rtl'] as const) {
      mount(dir);
      const tabs = await loader.getHarness(WrTabsHarness);

      await tabs.pressEnd();
      expect(await tabs.getSelectedLabel(), dir).toBe('Four');

      await tabs.pressHome();
      expect(await tabs.getSelectedLabel(), dir).toBe('One');
    }
  });
});
