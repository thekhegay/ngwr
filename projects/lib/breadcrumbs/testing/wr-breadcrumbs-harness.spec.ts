import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { WrBreadcrumbs, WrBreadcrumbsItem } from 'ngwr/breadcrumbs';
import { provideWrIcons, wrSvgIcon } from 'ngwr/icon';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrBreadcrumbsHarness } from './wr-breadcrumbs-harness';
import { WrBreadcrumbsItemHarness } from './wr-breadcrumbs-item-harness';

@Component({ template: 'page' })
class Page {}

@Component({
  imports: [WrBreadcrumbs, WrBreadcrumbsItem],
  template: `
    <wr-breadcrumbs [separator]="separator()">
      <wr-breadcrumbs-item icon="home" routerLink="/">Home</wr-breadcrumbs-item>
      <wr-breadcrumbs-item routerLink="/docs">Docs</wr-breadcrumbs-item>
      <wr-breadcrumbs-item href="https://ngwr.dev" [external]="true">Site</wr-breadcrumbs-item>
      <wr-breadcrumbs-item>Testing</wr-breadcrumbs-item>
    </wr-breadcrumbs>

    <wr-breadcrumbs ariaLabel="Folder path">
      <wr-breadcrumbs-item routerLink="/docs">Files</wr-breadcrumbs-item>
    </wr-breadcrumbs>
  `,
})
class Host {
  readonly separator = signal('/');
}

describe('WrBreadcrumbsHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', pathMatch: 'full', component: Page },
          { path: 'docs', component: Page },
        ]),
        provideWrIcons([wrSvgIcon('home', '<svg viewBox="0 0 24 24"><path d="M1 1" /></svg>')]),
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('lists the crumbs in order and names the current page', async () => {
    const trail = await loader.getHarness(WrBreadcrumbsHarness);

    expect(await trail.getItems()).toEqual(['Home', 'Docs', 'Site', 'Testing']);
    expect(await trail.getCurrent()).toBe('Testing');
    expect(await trail.getLabel()).toBe('Breadcrumbs');
  });

  it('answers null for a trail with no current page', async () => {
    const path = await loader.getHarness(WrBreadcrumbsHarness.with({ label: 'Folder path' }));

    expect(await path.getItems()).toEqual(['Files']);
    expect(await path.getCurrent()).toBeNull();
  });

  it('refuses to pick one of two current pages', async () => {
    const trail = await loader.getHarness(WrBreadcrumbsHarness);
    (fixture.nativeElement as HTMLElement)
      .querySelector('a.wr-breadcrumbs__link')!
      .setAttribute('aria-current', 'page');

    await expect(trail.getCurrent()).rejects.toThrow(/2 crumbs are marked current: Home, Testing/);
  });

  it('navigates through a router crumb', async () => {
    const trail = await loader.getHarness(WrBreadcrumbsHarness);

    await trail.clickItem('Docs');
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/docs');
  });

  it('refuses to click the current page, or a crumb that is not there', async () => {
    const trail = await loader.getHarness(WrBreadcrumbsHarness);

    await expect(trail.clickItem('Testing')).rejects.toThrow(/"Testing" is the current page/);
    await expect(trail.clickItem('Guides')).rejects.toThrow(/Home, Docs, Site, Testing/);
  });

  it('reads what each crumb is', async () => {
    const trail = await loader.getHarness(WrBreadcrumbsHarness);
    const [home, , site, current] = await trail.getItemHarnesses();

    expect([await home.isLink(), await home.isCurrent(), await home.hasIcon(), await home.isExternal()]).toEqual([
      true,
      false,
      true,
      false,
    ]);
    expect([await site.getHref(), await site.isExternal(), await site.hasIcon()]).toEqual([
      'https://ngwr.dev',
      true,
      false,
    ]);
    expect([await current.isLink(), await current.isCurrent(), await current.getHref()]).toEqual([false, true, null]);
  });

  it('narrows crumbs by text and by current', async () => {
    const trail = await loader.getHarness(WrBreadcrumbsHarness);
    const texts = async (items: WrBreadcrumbsItemHarness[]): Promise<string[]> =>
      Promise.all(items.map(item => item.getText()));

    expect(await texts(await trail.getItemHarnesses({ text: /^[DS]/ }))).toEqual(['Docs', 'Site']);
    expect(await texts(await trail.getItemHarnesses({ current: false }))).toEqual(['Home', 'Docs', 'Site']);
    expect(await texts(await loader.getAllHarnesses(WrBreadcrumbsItemHarness.with({ current: true })))).toEqual([
      'Testing',
    ]);
  });

  it('reads the separator the component asked for, escapes undone', async () => {
    const trail = await loader.getHarness(WrBreadcrumbsHarness);
    expect(await trail.getSeparator()).toBe('/');

    fixture.componentInstance.separator.set('›');
    await fixture.whenStable();
    expect(await trail.getSeparator()).toBe('›');

    // The component escapes a quote so it cannot close its own CSS string.
    fixture.componentInstance.separator.set('"');
    await fixture.whenStable();
    expect(await trail.getSeparator()).toBe('"');
  });
});
