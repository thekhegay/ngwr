import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrAccordion, WrCollapse, WrCollapseGroup } from 'ngwr/collapse';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCollapseGroupHarness } from './wr-collapse-group-harness';
import { WrCollapseHarness } from './wr-collapse-harness';

@Component({
  imports: [WrCollapse],
  template: `
    <wr-collapse [title]="title()" [(open)]="open" [disabled]="disabled()">Tracking number 1Z999</wr-collapse>
  `,
})
class Host {
  readonly title = signal('Shipping');
  readonly open = signal(false);
  readonly disabled = signal(false);
}

/** The always-accordion shape, with one panel nobody is allowed to open. */
@Component({
  imports: [WrAccordion, WrCollapse],
  template: `
    <wr-accordion>
      <wr-collapse title="Profile">Name and avatar</wr-collapse>
      <wr-collapse title="Security">Password and two-factor</wr-collapse>
      <wr-collapse title="Billing" [disabled]="true">Cards and invoices</wr-collapse>
    </wr-accordion>
  `,
})
class AccordionHost {}

/** The same behaviour reached the other way — an input the template can turn off. */
@Component({
  imports: [WrCollapse, WrCollapseGroup],
  template: `
    <wr-collapse-group [accordion]="accordion()">
      <wr-collapse title="One">First</wr-collapse>
      <wr-collapse title="Two">Second</wr-collapse>
      <wr-collapse title="Three">Third</wr-collapse>
    </wr-collapse-group>
  `,
})
class GroupHost {
  readonly accordion = signal(false);
}

/** Two containers on one page, one of each shape — the setup that catches a group answering for its neighbour. */
@Component({
  imports: [WrAccordion, WrCollapse, WrCollapseGroup],
  template: `
    <wr-accordion>
      <wr-collapse title="Shipping">Ships Monday</wr-collapse>
      <wr-collapse title="Returns">Thirty days</wr-collapse>
    </wr-accordion>

    <wr-collapse-group>
      <wr-collapse title="Warranty">Two years</wr-collapse>
    </wr-collapse-group>
  `,
})
class TwoGroupsHost {}

/**
 * Used exactly as a consumer would: through the loader, with nothing reached into and no
 * knowledge of the template past the public selectors and classes the harness documents.
 *
 * Every open/closed assertion here goes through the header's `aria-expanded`. That is the
 * whole point for this component — the panel opens by animating `grid-template-rows`, so
 * the only other evidence is a box, and a unit test has no layout to measure one in.
 */
describe('WrCollapseHarness', () => {
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

  it('reads the header text', async () => {
    const panel = await loader.getHarness(WrCollapseHarness);
    expect(await panel.getTitle()).toBe('Shipping');

    fixture.componentInstance.title.set('Delivery');
    await fixture.whenStable();

    expect(await panel.getTitle()).toBe('Delivery');
  });

  it('opens and closes through the header, and writes it back to the host', async () => {
    const panel = await loader.getHarness(WrCollapseHarness);
    expect(await panel.isOpen()).toBe(false);

    await panel.open();
    expect([await panel.isOpen(), fixture.componentInstance.open()]).toEqual([true, true]);

    await panel.close();
    expect([await panel.isOpen(), fixture.componentInstance.open()]).toEqual([false, false]);
  });

  it('toggles either way, and a disabled panel not at all', async () => {
    const panel = await loader.getHarness(WrCollapseHarness);

    await panel.toggle();
    expect(await panel.isOpen()).toBe(true);
    await panel.toggle();
    expect(await panel.isOpen()).toBe(false);

    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    await panel.toggle();

    expect(await panel.isOpen()).toBe(false);
  });

  it('leaves a panel that is already in the asked-for state alone', async () => {
    const panel = await loader.getHarness(WrCollapseHarness);

    await panel.open();
    await panel.open();
    expect(await panel.isOpen()).toBe(true);

    await panel.close();
    await panel.close();
    expect(await panel.isOpen()).toBe(false);
  });

  it('follows a state the host writes from outside', async () => {
    const panel = await loader.getHarness(WrCollapseHarness);

    fixture.componentInstance.open.set(true);
    await fixture.whenStable();

    expect(await panel.isOpen()).toBe(true);
  });

  it('keeps a closed region out of reach of the screen reader and of Tab', async () => {
    const panel = await loader.getHarness(WrCollapseHarness);

    // The body is never removed from the DOM — it has to stay for the height to
    // animate — so `aria-hidden` and `inert` are the only thing hiding it.
    expect(await panel.isContentHidden()).toBe(true);

    await panel.open();
    expect(await panel.isContentHidden()).toBe(false);
  });

  it('believes the header over the host class when the two disagree', async () => {
    const panel = await loader.getHarness(WrCollapseHarness);
    await panel.open();

    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-collapse')!;
    host.querySelector<HTMLElement>('button.wr-collapse__header')!.setAttribute('aria-expanded', 'false');

    // `wr-collapse--open` and `aria-expanded` are written from the same signal today, so
    // nothing a template can do tells them apart — this is the one way to pin WHICH of
    // them the harness reads. The class agrees with the animation; the attribute is what
    // a screen reader is told, and a panel that slid open while announcing `false` is
    // exactly the regression a size-blind harness has to catch.
    expect(host.classList.contains('wr-collapse--open')).toBe(true);
    expect(await panel.isOpen()).toBe(false);
  });

  it('stops calling a region hidden once it loses `inert`, aria-hidden or not', async () => {
    const panel = await loader.getHarness(WrCollapseHarness);
    const body = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-collapse__body')!;

    body.removeAttribute('inert');

    // The component flips both attributes together, so only a tampered DOM can ask
    // whether `isContentHidden()` really wants both. It has to: `aria-hidden` alone
    // keeps a screen reader out and lets Tab walk straight into a panel nobody can see.
    expect(body.getAttribute('aria-hidden')).toBe('true');
    expect(await panel.isContentHidden()).toBe(false);
  });

  it('refuses to read a closed panel, and reads it once open', async () => {
    const panel = await loader.getHarness(WrCollapseHarness);

    // The text is right there in the DOM: an unguarded read would pass while the panel
    // stayed shut, which is precisely the failure a content assertion is meant to catch.
    await expect(panel.getContentText()).rejects.toThrow(/"Shipping" is closed/);

    await panel.open();
    expect(await panel.getContentText()).toBe('Tracking number 1Z999');
  });

  it('points the header at its own region, and at nothing else on the page', async () => {
    const panel = await loader.getHarness(WrCollapseHarness);

    expect(await panel.getRegionId()).toBeTruthy();
    expect(await panel.isRegionBound()).toBe(true);
  });

  it('reports a disabled panel and refuses to open it', async () => {
    const panel = await loader.getHarness(WrCollapseHarness);
    expect(await panel.isDisabled()).toBe(false);

    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(await panel.isDisabled()).toBe(true);
    await expect(panel.open()).rejects.toThrow(/"Shipping" did not open/);
  });

  it('cannot close a disabled panel that was opened from outside', async () => {
    const panel = await loader.getHarness(WrCollapseHarness);

    // `[open]` does not care about `disabled`, but the page offers no way back: the
    // header is a real `<button disabled>` and the toggle refuses either direction.
    fixture.componentInstance.open.set(true);
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(await panel.isOpen()).toBe(true);
    await expect(panel.close()).rejects.toThrow(/cannot be closed from the page/);
  });

  it('moves focus to the header and reports it', async () => {
    const panel = await loader.getHarness(WrCollapseHarness);
    expect(await panel.isFocused()).toBe(false);

    await panel.focus();

    expect(await panel.isFocused()).toBe(true);
  });
});

describe('WrCollapseGroupHarness in an accordion', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<AccordionHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(AccordionHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('lists its panels in DOM order', async () => {
    const group = await loader.getHarness(WrCollapseGroupHarness);

    expect(await group.getPanelTitles()).toEqual(['Profile', 'Security', 'Billing']);
  });

  it('narrows panels by title, by state and by disabled', async () => {
    const group = await loader.getHarness(WrCollapseGroupHarness);
    await group.openPanel({ title: 'Security' });

    const byPattern = await loader.getAllHarnesses(WrCollapseHarness.with({ title: /^B/ }));

    expect(await Promise.all(byPattern.map(panel => panel.getTitle()))).toEqual(['Billing']);
    expect(await Promise.all((await group.getPanels({ open: true })).map(p => p.getTitle()))).toEqual(['Security']);
    expect(await Promise.all((await group.getPanels({ open: false })).map(p => p.getTitle()))).toEqual([
      'Profile',
      'Billing',
    ]);
    expect(await Promise.all((await group.getPanels({ disabled: true })).map(p => p.getTitle()))).toEqual(['Billing']);
  });

  it('keeps one panel open, and the one it closed says so on its header', async () => {
    const group = await loader.getHarness(WrCollapseGroupHarness);
    const profile = await group.getPanel({ title: 'Profile' });

    await group.openPanel({ title: 'Profile' });
    expect(await group.getOpenTitles()).toEqual(['Profile']);

    await group.openPanel({ title: 'Security' });

    // The interesting half of an accordion is not that the second panel opened — it is
    // that the first one CLOSED, and said so where a screen reader can hear it. A panel
    // left announcing `aria-expanded="true"` while collapsed is worse than no attribute,
    // and the animated height it collapses by is invisible to a test either way.
    expect(await group.getOpenTitles()).toEqual(['Security']);
    expect(await profile.isOpen()).toBe(false);
    // And the region went back out of reach, rather than merely losing its height.
    expect(await profile.isContentHidden()).toBe(true);
  });

  it('gives every header its own region', async () => {
    const group = await loader.getHarness(WrCollapseGroupHarness);
    const panels = await group.getPanels();

    const ids = await Promise.all(panels.map(panel => panel.getRegionId()));
    const bound = await Promise.all(panels.map(panel => panel.isRegionBound()));

    // Three headers sharing one `aria-controls` would look perfectly wired from any one
    // panel — every header would resolve to a region, just not to its own.
    expect(new Set(ids).size).toBe(3);
    expect(bound).toEqual([true, true, true]);
  });

  it('says no when a header names a sibling panel’s region', async () => {
    const group = await loader.getHarness(WrCollapseGroupHarness);
    const [profile, security] = await group.getPanels();

    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('button.wr-collapse__header');
    headers[0].setAttribute('aria-controls', (await security.getRegionId())!);

    // A sibling's body resolves perfectly well from the document, so a check that only
    // asks "does this id exist" reports the wiring intact on the day it breaks. Profile's
    // header now opens Profile and points a screen reader at Security's content.
    expect(await profile.isRegionBound()).toBe(false);
    expect(await security.isRegionBound()).toBe(true);
  });

  it('says no when a second element answers to the same region id', async () => {
    const group = await loader.getHarness(WrCollapseGroupHarness);
    const profile = await group.getPanelAt(0);

    const impostor = document.createElement('div');
    impostor.id = (await profile.getRegionId())!;
    (fixture.nativeElement as HTMLElement).append(impostor);

    // Two elements answering to one id hand every reference to whichever comes first, so
    // the panel further down the document becomes unreachable to anything following
    // `aria-controls` — and its own header still looks correctly wired from inside.
    expect(await profile.isRegionBound()).toBe(false);
  });

  it('closes the panel it is asked to close', async () => {
    const group = await loader.getHarness(WrCollapseGroupHarness);

    await group.openPanel({ title: 'Profile' });
    await group.closePanel({ title: 'Profile' });

    expect(await group.getOpenTitles()).toEqual([]);
    expect(await group.getOpenPanels()).toEqual([]);
  });

  it('closes everything that is open', async () => {
    const group = await loader.getHarness(WrCollapseGroupHarness);
    await group.openPanel({ title: 'Security' });

    await group.closeAll();

    expect(await group.getOpenTitles()).toEqual([]);
  });

  it('addresses a panel by index as well as by text', async () => {
    const group = await loader.getHarness(WrCollapseGroupHarness);
    const second = await group.getPanelAt(1);

    await second.open();

    expect(await second.getTitle()).toBe('Security');
    expect(await group.getOpenTitles()).toEqual(['Security']);
    expect(await second.getContentText()).toBe('Password and two-factor');
  });

  it('says what it holds when an index or a title matched nothing', async () => {
    const group = await loader.getHarness(WrCollapseGroupHarness);

    await expect(group.getPanelAt(3)).rejects.toThrow(/index 3 is out of range/);
    await expect(group.getPanel({ title: 'Invoices' })).rejects.toThrow(/Profile, Security, Billing/);
  });

  it('refuses to open a disabled panel', async () => {
    const group = await loader.getHarness(WrCollapseGroupHarness);

    await expect(group.openPanel({ title: 'Billing' })).rejects.toThrow(/"Billing" did not open/);
    expect(await group.getOpenTitles()).toEqual([]);
  });

  it('reports which header holds focus', async () => {
    const group = await loader.getHarness(WrCollapseGroupHarness);
    expect(await group.getFocusedTitle()).toBeNull();

    // Each header is its own tab stop — the group roves nothing, so focus is wherever it
    // was put and there is no separate "active" panel to disagree with.
    await (await group.getPanelAt(1)).focus();
    expect(await group.getFocusedTitle()).toBe('Security');

    // A disabled header is not a tab stop at all: it refuses focus rather than taking it
    // and ignoring the keys, so focus stays where it already was.
    await (await group.getPanel({ title: 'Billing' })).focus();

    expect(await group.getFocusedTitle()).toBe('Security');
  });
});

describe('WrCollapseGroupHarness on a plain group', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<GroupHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(GroupHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('lets several panels stand open while accordion is off', async () => {
    const group = await loader.getHarness(WrCollapseGroupHarness);

    await group.openPanel({ title: 'One' });
    await group.openPanel({ title: 'Two' });

    expect(await group.getOpenTitles()).toEqual(['One', 'Two']);
  });

  it('closes every open panel, not only the first', async () => {
    const group = await loader.getHarness(WrCollapseGroupHarness);
    await group.openPanel({ title: 'One' });
    await group.openPanel({ title: 'Two' });
    await group.openPanel({ title: 'Three' });
    expect(await group.getOpenTitles()).toEqual(['One', 'Two', 'Three']);

    await group.closeAll();

    // The accordion can only ever have one panel open, so this is the only host where
    // `closeAll()` has more than one click to make — and where dropping the loop would
    // leave two panels standing open and still be green.
    expect(await group.getOpenTitles()).toEqual([]);
  });

  it('closes the rest as soon as accordion is on', async () => {
    const group = await loader.getHarness(WrCollapseGroupHarness);
    await group.openPanel({ title: 'One' });
    await group.openPanel({ title: 'Two' });

    fixture.componentInstance.accordion.set(true);
    await fixture.whenStable();

    // Nothing on the group element says which mode it is in — a bound `[accordion]`
    // never reaches the DOM — so the behaviour is the only thing there is to assert.
    await group.openPanel({ title: 'Three' });

    expect(await group.getOpenTitles()).toEqual(['Three']);
  });
});

describe('WrCollapseGroupHarness with two containers on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoGroupsHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(TwoGroupsHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('matches both shapes the container ships in', async () => {
    const groups = await loader.getAllHarnesses(WrCollapseGroupHarness);

    // `<wr-accordion>` and `<wr-collapse-group>` are two elements for one job, and a
    // harness matching only the named group would skip every accordion on the page.
    expect(await Promise.all(groups.map(group => group.getPanelTitles()))).toEqual([
      ['Shipping', 'Returns'],
      ['Warranty'],
    ]);
  });

  it('narrows by a panel it holds', async () => {
    const group = await loader.getHarness(WrCollapseGroupHarness.with({ panelTitle: 'Warranty' }));

    expect(await group.getPanelTitles()).toEqual(['Warranty']);
  });

  it('narrows by the panel that is open', async () => {
    // Nothing is open, so nothing matches — the filter addresses a group by what it is
    // showing, not by what it could show.
    expect(await loader.getAllHarnesses(WrCollapseGroupHarness.with({ openPanelTitle: /./ }))).toEqual([]);

    const accordion = await loader.getHarness(WrCollapseGroupHarness.with({ panelTitle: 'Returns' }));
    await accordion.openPanel({ title: 'Returns' });

    const showing = await loader.getHarness(WrCollapseGroupHarness.with({ openPanelTitle: 'Returns' }));
    expect(await showing.getPanelTitles()).toEqual(['Shipping', 'Returns']);
    expect(await loader.getAllHarnesses(WrCollapseGroupHarness.with({ openPanelTitle: 'Warranty' }))).toEqual([]);
  });
});
