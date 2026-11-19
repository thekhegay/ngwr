/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter, withHashLocation } from '@angular/router';

import { WrTable, type WrTableColumns, type WrTableRowClick, type WrTableRowLink } from 'ngwr/table';
import { afterEach, describe, expect, it } from 'vitest';

import { WrTableRouting } from './table-routing';

interface User {
  id: number;
  name: string;
}

const ROWS: User[] = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Linus' },
];

@Component({ template: 'Routed page' })
class Page {}

@Component({
  imports: [WrTable, WrTableRouting],
  template: `
    <wr-table
      wrTableRouting
      [columns]="columns"
      [items]="rows"
      [rowLink]="rowLink()"
      (rowClick)="clicks.push($event)"
    />
  `,
})
class TableHost {
  protected readonly columns: WrTableColumns<User> = { name: { title: 'Name' } };
  protected readonly rows = ROWS;
  readonly rowLink = signal<WrTableRowLink<User>>(user => ['/users', user.id]);
  readonly clicks: WrTableRowClick<User>[] = [];
}

/** The table under `/team`, where a relative link has something to resolve against. */
@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Shell {}

describe('WrTableRouting', () => {
  let router: Router;

  async function setup(hash = false): Promise<HTMLElement> {
    TestBed.resetTestingModule();
    const routes = [
      { path: 'team', component: TableHost },
      { path: 'team/:id', component: Page },
      { path: 'users/:id', component: Page },
    ];
    TestBed.configureTestingModule({
      providers: [hash ? provideRouter(routes, withHashLocation()) : provideRouter(routes)],
    });
    router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(Shell);
    await router.navigateByUrl('/team');
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const links = (root: HTMLElement): HTMLAnchorElement[] => [
    ...root.querySelectorAll<HTMLAnchorElement>('.wr-table__row-link'),
  ];
  const click = (el: Element, init: MouseEventInit = {}): MouseEvent => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
    el.dispatchEvent(event);
    return event;
  };

  afterEach(() => TestBed.resetTestingModule());

  it('renders router commands as a real href', async () => {
    const root = await setup();

    expect(links(root).map(a => a.getAttribute('href'))).toEqual(['/users/1', '/users/2']);
  });

  it('writes the href the browser can open under a hash location', async () => {
    const root = await setup(true);

    expect(links(root)[0].getAttribute('href')).toBe('#/users/1');
  });

  it('navigates in the app on a plain click, and swallows the anchor default', async () => {
    const root = await setup();
    const event = click(links(root)[1]);
    await new Promise(resolve => setTimeout(resolve));

    expect(event.defaultPrevented).toBe(true);
    expect(router.url).toBe('/users/2');
  });

  it('leaves a modified or a middle click to the browser', async () => {
    const root = await setup();
    // jsdom cannot open a tab: stop the default after the adapter has had its say.
    root.addEventListener('click', event => event.preventDefault());
    const [link] = links(root);
    let prevented: boolean | null = null;
    // Read on the table, past the body listener that hands the click to the adapter.
    root.querySelector('wr-table')!.addEventListener('click', event => (prevented = event.defaultPrevented));

    click(link, { metaKey: true });
    expect(prevented).toBe(false);
    click(link, { button: 1 });
    expect(prevented).toBe(false);
    expect(router.url).toBe('/team');
  });

  it('resolves a relative link against the route of the declaring component', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'team', component: TableHost },
          { path: 'team/:id', component: Page },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(Shell);
    await router.navigateByUrl('/team');
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.debugElement.query(el => el.componentInstance instanceof TableHost);
    (host.componentInstance as TableHost).rowLink.set(user => String(user.id));
    fixture.detectChanges();

    expect(links(fixture.nativeElement as HTMLElement).map(a => a.getAttribute('href'))).toEqual([
      '/team/1',
      '/team/2',
    ]);

    // A relative string keeps its query and fragment instead of encoding them into the path.
    (host.componentInstance as TableHost).rowLink.set(user => `${user.id}?tab=history#latest%20one`);
    fixture.detectChanges();
    expect(links(fixture.nativeElement as HTMLElement)[0].getAttribute('href')).toBe(
      '/team/1?tab=history#latest%20one'
    );
  });

  it('leaves a URL with a scheme of its own a plain link', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(TableHost);
    fixture.componentInstance.rowLink.set(user =>
      user.id === 1 ? 'https://example.com/a?b=1' : '/users/2?tab=log#top'
    );
    fixture.detectChanges();
    const [external, internal] = links(fixture.nativeElement as HTMLElement);

    expect(external.getAttribute('href')).toBe('https://example.com/a?b=1');
    // A URL string keeps its query and fragment: as one command the `?` would be encoded.
    expect(internal.getAttribute('href')).toBe('/users/2?tab=log#top');

    (fixture.nativeElement as HTMLElement).addEventListener('click', event => event.preventDefault());
    let prevented: boolean | null = null;
    (fixture.nativeElement as HTMLElement)
      .querySelector('wr-table')!
      .addEventListener('click', event => (prevented = event.defaultPrevented));
    click(external);
    expect(prevented).toBe(false);
  });
});
