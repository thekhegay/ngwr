import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { WrSidebar, type WrSidebarEntry } from 'ngwr/sidebar';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSidebarGroupHarness } from './wr-sidebar-group-harness';
import { WrSidebarHarness } from './wr-sidebar-harness';
import { WrSidebarItemHarness } from './wr-sidebar-item-harness';

@Component({ template: 'page' })
class Page {}

const ENTRIES: readonly WrSidebarEntry[] = [
  { title: 'Home', url: ['/'], activeOptions: { exact: true } },
  { title: 'Archive', url: ['/archive'], disabled: true, badge: { text: 'Soon' } },
  {
    title: 'Guides',
    subtitle: 'Start here',
    count: 2,
    children: [
      { title: 'Forms', url: ['/forms'], badge: { text: 'New', tone: 'primary' }, count: '99+' },
      { title: 'Testing', url: ['/testing'] },
    ],
  },
  {
    title: 'Settings',
    url: ['/settings'],
    defaultOpen: true,
    children: [
      { title: 'Profile', url: ['/settings', 'profile'] },
      { title: 'Advanced', children: [{ title: 'Tokens', url: ['/settings', 'tokens'] }] },
    ],
  },
];

@Component({
  imports: [WrSidebar],
  template: `<wr-sidebar [entries]="entries()" [ariaLabel]="label()" />`,
})
class Host {
  readonly entries = signal(ENTRIES);
  readonly label = signal<string | null>(null);
}

/** A real router: what marks the current row is a navigation, and a link is clicked to cause one. */
describe('WrSidebarHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let router: Router;
  let nav: WrSidebarHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          ['', 'forms', 'testing', 'settings', 'settings/profile', 'settings/tokens'].map(path => ({
            path,
            pathMatch: 'full' as const,
            component: Page,
          }))
        ),
      ],
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    nav = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrSidebarHarness);
  });

  afterEach(() => fixture.destroy());

  it('names the landmark', async () => {
    expect(await nav.getLabel()).toBe('Sidebar');

    fixture.componentInstance.label.set('Docs sections');
    await fixture.whenStable();

    expect(await nav.getLabel()).toBe('Docs sections');
    expect(
      await TestbedHarnessEnvironment.loader(fixture).getHarness(WrSidebarHarness.with({ label: /^Docs/ }))
    ).toBeTruthy();
  });

  it('lists the rows a user can reach, and leaves a closed group out', async () => {
    // `Guides` and `Advanced` are closed: their rows are in the DOM and out of reach.
    expect(await nav.getItemTitles()).toEqual(['Home', 'Archive', 'Guides', 'Settings', 'Profile', 'Advanced']);

    await nav.openGroup('Guides');

    expect(await nav.getItemTitles()).toEqual([
      'Home',
      'Archive',
      'Guides',
      'Forms',
      'Testing',
      'Settings',
      'Profile',
      'Advanced',
    ]);
  });

  it('hides a group nested in a closed one', async () => {
    const titles = async (): Promise<string[]> => Promise.all((await nav.getGroups()).map(group => group.getTitle()));
    expect(await titles()).toEqual(['Guides', 'Settings', 'Advanced']);

    await nav.closeGroup('Settings');

    expect(await titles()).toEqual(['Guides', 'Settings']);
    await expect(nav.getGroup('Advanced')).rejects.toThrow(/Reachable now: Guides, Settings/);
  });

  it('refuses to click a row inside a closed group, and names what is reachable', async () => {
    await expect(nav.clickItem('Forms')).rejects.toThrow(/open the group first.*Home, Archive, Guides/);
    expect(router.url).toBe('/');
  });

  it('navigates through a link and marks it current', async () => {
    expect(await nav.getCurrentTitles()).toEqual(['Home']);

    await nav.openGroup('Guides');
    await nav.clickItem('Testing');
    await fixture.whenStable();

    expect(router.url).toBe('/testing');
    expect(await nav.getCurrentTitles()).toEqual(['Testing']);
    expect(await (await nav.getItem('Testing')).isCurrent()).toBe(true);
  });

  it('finds the current page inside a group that was closed over it', async () => {
    await nav.openGroup('Guides');
    await nav.clickItem('Forms');
    await fixture.whenStable();
    await nav.closeGroup('Guides');

    const guides = await nav.getGroup('Guides');
    expect(await nav.getCurrentTitles()).toEqual(['Forms']);
    expect(await nav.getItems({ current: true })).toEqual([]);
    expect([await guides.holdsCurrent(), await guides.isContentHidden()]).toEqual([true, true]);
  });

  it('refuses to click a disabled page', async () => {
    const archive = await nav.getItem('Archive');

    expect(await archive.isDisabled()).toBe(true);
    await expect(nav.clickItem('Archive')).rejects.toThrow(/"Archive" is disabled/);
  });

  it('reads every piece of a row without the hidden separator', async () => {
    await nav.openGroup('Guides');
    const guides = await nav.getItem('Guides');
    const forms = await nav.getItem('Forms');

    expect([
      await guides.getTitle(),
      await guides.getSubtitle(),
      await guides.getCount(),
      await guides.getBadge(),
      await guides.isGroup(),
      await guides.getLevel(),
    ]).toEqual(['Guides', 'Start here', '2', null, true, 1]);
    expect([
      await forms.getTitle(),
      await forms.getBadge(),
      await forms.getCount(),
      await forms.isGroup(),
      await forms.getLevel(),
    ]).toEqual(['Forms', 'New', '99+', false, 2]);
  });

  it('opens and closes a group whose whole row is the toggle', async () => {
    const guides = await nav.getGroup('Guides');
    expect([await guides.isOpen(), await guides.isLink(), await guides.isContentHidden()]).toEqual([
      false,
      false,
      true,
    ]);

    await guides.open();
    await guides.open();
    expect([await nav.isGroupOpen('Guides'), await guides.isContentHidden()]).toEqual([true, false]);
    expect(await guides.getItemTitles()).toEqual(['Forms', 'Testing']);

    // Clicking the row is the same press.
    await nav.clickItem('Guides');
    expect(await guides.isOpen()).toBe(false);
  });

  it('opens and closes a group that is a page as well, through its arrow', async () => {
    const settings = await nav.getGroup('Settings');
    expect([await settings.isOpen(), await settings.isLink(), await settings.getToggleLabel()]).toEqual([
      true,
      true,
      'Sub-pages of Settings',
    ]);
    // Nested rows included, and the nested group's toggle is not mistaken for this one's.
    expect(await settings.getItemTitles()).toEqual(['Profile', 'Advanced', 'Tokens']);

    await settings.close();
    expect([await settings.isOpen(), router.url]).toEqual([false, '/']);

    // The title is a link: clicking the row navigates and toggles nothing.
    await nav.clickItem('Settings');
    await fixture.whenStable();
    expect(router.url).toBe('/settings');
  });

  it('reaches a nested group, and reads its own state, not its parent’s', async () => {
    const advanced = await nav.getGroup('Advanced');
    expect(await advanced.isOpen()).toBe(false);

    await advanced.toggle();

    expect([await advanced.isOpen(), await advanced.getItemTitles()]).toEqual([true, ['Tokens']]);
    expect(await (await advanced.getRow()).getLevel()).toBe(2);
  });

  it('narrows rows and groups from the page', async () => {
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const rows = await loader.getAllHarnesses(WrSidebarItemHarness.with({ disabled: true }));
    const open = await loader.getAllHarnesses(WrSidebarGroupHarness.with({ open: true }));

    expect(await Promise.all(rows.map(row => row.getTitle()))).toEqual(['Archive']);
    expect(await Promise.all(open.map(group => group.getTitle()))).toEqual(['Settings']);
    expect((await loader.getAllHarnesses(WrSidebarItemHarness.with({ title: /^T/ }))).length).toBe(2);
  });
});
