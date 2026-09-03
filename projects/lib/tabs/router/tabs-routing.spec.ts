/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter, withHashLocation } from '@angular/router';

import { WrTab, WrTabs } from 'ngwr/tabs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTabsRouting } from './tabs-routing';

@Component({ template: 'Routed page' })
class Page {}

/**
 * A router strip after the opt-in: `WrTabsRouting` in `imports` and
 * `wrTabsRouting` on the element. Everything else is the markup a consumer had
 * before it existed.
 */
@Component({
  imports: [RouterOutlet, WrTabs, WrTab, WrTabsRouting],
  template: `
    <wr-tabs wrTabsRouting>
      <wr-tab title="One" key="one" routerLink="/one" />
      <wr-tab title="Two" key="two" routerLink="/two" />
      <wr-tab title="Locked" key="locked" routerLink="/two" [disabled]="true" />
    </wr-tabs>
    <router-outlet />
  `,
})
class RoutedHost {}

/**
 * A strip nested under `/parent`, whose tabs use RELATIVE links. This is the
 * case that decides the SHAPE of the opt-in: a relative link resolves against
 * the `ActivatedRoute` of the component that declares the strip, so an
 * environment-level provider would have resolved every one of them against the
 * root and built `/one` where `/parent/one` was meant.
 */
@Component({
  imports: [WrTabs, WrTab, WrTabsRouting],
  template: `
    <wr-tabs wrTabsRouting>
      <wr-tab title="One" key="one" routerLink="one" />
      <wr-tab title="Two" key="two" routerLink="two" />
    </wr-tabs>
  `,
})
class RelativeHost {}

/** Nothing but an outlet, so the only tabs on the page are the routed ones. */
@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Shell {}

describe('WrTabsRouting', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<RoutedHost>>;
  let router: Router;

  const headers = (): HTMLAnchorElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('[role="tab"]'),
  ];

  const navigate = async (url: string): Promise<void> => {
    await router.navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const clickWith = (el: HTMLElement, init: MouseEventInit = {}): MouseEvent => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
    el.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'one', component: Page },
          { path: 'two', component: Page },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(RoutedHost);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('renders each router tab as an anchor with a real href', () => {
    // The strip no longer carries `RouterLink`, so the href is the adapter's
    // output rather than a directive's. A tab that renders no href is not a
    // link: it drops out of "open in a new tab", out of the status bar, and out
    // of every crawler.
    expect(headers().map(a => a.getAttribute('href'))).toEqual(['/one', '/two', null]);
  });

  it('leaves a disabled tab without an href, so it navigates nowhere', () => {
    const locked = headers()[2];

    expect(locked.getAttribute('href')).toBeNull();
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    expect(locked.getAttribute('tabindex')).toBe('-1');

    clickWith(locked);
    expect(router.url).toBe('/');
  });

  it('announces the tab the route selected, and paints the same one', async () => {
    await navigate('/two');

    // Both readings come off one `routerActive()`, so the announced selection
    // and the painted one cannot drift apart — the property the exported
    // `routerLinkActive` reference used to carry.
    expect(headers()[1].classList.contains('wr-tabs__tab--active')).toBe(true);
    expect(headers()[1].getAttribute('aria-selected')).toBe('true');
    expect(headers()[0].getAttribute('aria-selected')).toBe('false');

    await navigate('/one');

    expect(headers()[0].getAttribute('aria-selected')).toBe('true');
    expect(headers()[1].getAttribute('aria-selected')).toBe('false');
  });

  it('selects a tab whose path is a PREFIX of the current URL', async () => {
    // `routerLinkActive` without `[routerLinkActiveOptions]` matches a path
    // subset, so a `/two` tab stays selected on `/two/details`. Matching exactly
    // instead would unselect every tab the moment a child route opened.
    await navigate('/two?q=1#frag');

    expect(headers()[1].getAttribute('aria-selected')).toBe('true');
  });

  it('navigates on a plain left click, and swallows the anchor default', async () => {
    const event = clickWith(headers()[1]);
    await fixture.whenStable();

    expect(router.url).toBe('/two');
    // Without `preventDefault` the browser would do a full page load to the
    // same href, throwing away the SPA it just navigated.
    expect(event.defaultPrevented).toBe(true);
  });

  // The two tests below deliberately let the anchor's default action stand, so
  // jsdom logs "Not implemented: navigation to another Document" twice. That
  // line IS the assertion passing: it means the click reached the browser.
  it('leaves a modified click to the browser', async () => {
    const event = clickWith(headers()[1], { metaKey: true });
    await fixture.whenStable();

    // Cmd-click means "open in a new tab". Routing it in place would make a tab
    // header the one link on the page that cannot be opened in a new window.
    expect(event.defaultPrevented).toBe(false);
    expect(router.url).toBe('/');
  });

  it('leaves a middle click to the browser', async () => {
    const event = clickWith(headers()[1], { button: 1 });
    await fixture.whenStable();

    expect(event.defaultPrevented).toBe(false);
    expect(router.url).toBe('/');
  });
});

describe('WrTabsRouting with relative links', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Shell>>;
  let router: Router;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'parent',
            component: RelativeHost,
            children: [
              { path: 'one', component: Page },
              { path: 'two', component: Page },
            ],
          },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Shell);
    await router.navigateByUrl('/parent');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('resolves a relative routerLink against the route that declares the strip', () => {
    const hrefs = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('[role="tab"]')].map(
      a => a.getAttribute('href')
    );

    // The reason the opt-in is a directive on the element and not a provider
    // function: resolved from the root injector these would read `/one` and
    // `/two`, which are not routes at all here.
    expect(hrefs).toEqual(['/parent/one', '/parent/two']);
  });

  it('recomputes a relative href when the route it resolves against moves', async () => {
    // `WR_TABS_ROUTING`'s own docblock promises this — "`href` and `isActive`
    // are read from computeds and must both be reactive to navigation" — and
    // only `isActive` did it. A strip inside `/parent` navigating in place kept
    // rendering the href it had computed the first time. The click still routed,
    // because `navigate()` rebuilds the tree from the live route, so nothing
    // looked broken; the visible link just pointed somewhere else.
    const hrefs = (): (string | null)[] =>
      [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('[role="tab"]')].map(a =>
        a.getAttribute('href')
      );

    expect(hrefs()).toEqual(['/parent/one', '/parent/two']);

    // The strip is declared by `RelativeHost` at `parent`, so navigating within
    // it re-resolves the same relative commands against the new active route.
    await router.navigateByUrl('/parent/one');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(hrefs()).toEqual(['/parent/one', '/parent/two']);
  });
});

describe('WrTabsRouting under a hash location', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<RoutedHost>>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'one', component: Page },
            { path: 'two', component: Page },
          ],
          withHashLocation()
        ),
      ],
    });
    fixture = TestBed.createComponent(RoutedHost);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/one');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('writes the href the location strategy would, not a bare serialized url', () => {
    // The adapter serialized the tree and stopped there, so a hash-routed app
    // rendered `/one` — a path it does not serve. A plain click still worked:
    // `navigateByUrl` ignores the strategy and `preventDefault` swallows the bad
    // href. What broke is everything the href exists FOR — cmd-click, middle
    // click, "open link in new tab", "copy link address" — because those hand
    // the attribute to the browser untouched. `RouterLink` runs the same value
    // through `prepareExternalUrl`; this now does too.
    const hrefs = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('[role="tab"]')].map(
      a => a.getAttribute('href')
    );

    expect(hrefs).toEqual(['#/one', '#/two', null]);
  });
});
