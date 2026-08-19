import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrIcons, svgIcon } from 'ngwr/icon';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrSidebarEntry } from './interfaces';
import { WrSidebar } from './sidebar';

/** Minimal valid SVG: the registry rejects markup with no root element. */
const ICON = '<svg viewBox="0 0 24 24"><path d="M1 1" /></svg>';

@Component({ template: 'page' })
class Page {}

const ENTRIES: readonly WrSidebarEntry[] = [
  { title: 'Home', url: ['/'] },
  { title: 'Archive', url: ['/archive'], disabled: true },
  {
    title: 'Data & charts',
    children: [
      { title: 'Table', url: ['/table'] },
      { title: 'Tabs', url: ['/tabs'] },
    ],
  },
  {
    title: 'Forms',
    defaultOpen: true,
    children: [
      { title: 'Input', url: ['/input'] },
      { title: 'Soon', url: [], disabled: true },
    ],
  },
];

@Component({
  imports: [WrSidebar],
  template: `<wr-sidebar [entries]="entries()" [autoExpand]="autoExpand()" [ariaLabel]="ariaLabel()" />`,
})
class Host {
  readonly entries = signal<readonly WrSidebarEntry[]>(ENTRIES);
  readonly autoExpand = signal(true);
  readonly ariaLabel = signal<string | null>(null);
}

/**
 * A real `Router` is provided rather than stubbed, because what drives the
 * auto-expand is `NavigationEnd` — and the URL matching is where the bug was.
 * Icons are registered so `<wr-icon>` has something to draw; an unregistered name
 * only logs, but a spec should not depend on that.
 */
describe('WrSidebar', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let router: Router;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-sidebar')!;
  const toggles = (): HTMLButtonElement[] => [
    ...root().querySelectorAll<HTMLButtonElement>('.wr-sidebar__group-toggle'),
  ];
  const toggleFor = (title: string): HTMLButtonElement => toggles().find(button => button.textContent.includes(title))!;
  const bodyFor = (title: string): HTMLElement =>
    root().querySelector<HTMLElement>(`#${toggleFor(title).getAttribute('aria-controls')!}`)!;
  const isOpen = (title: string): boolean => toggleFor(title).getAttribute('aria-expanded') === 'true';

  const mount = async (extra: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'tab', component: Page },
          { path: 'table', component: Page },
          { path: 'tabs', component: Page },
          { path: 'input', component: Page },
        ]),
        provideWrIcons([svgIcon('folder', ICON), svgIcon('caret-forward', ICON)]),
        ...(extra as never[]),
      ],
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const navigate = async (url: string): Promise<void> => {
    await router.navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => mount());
  afterEach(() => fixture.destroy());

  it('is one named navigation landmark, not two nested ones', () => {
    // The host carries `role="navigation"`; the inner wrapper used to be a
    // `<nav>` as well, which announced the same list twice.
    expect(host().getAttribute('role')).toBe('navigation');
    expect(host().getAttribute('aria-label')).toBe('Sidebar');
    expect(host().querySelector('nav')).toBeNull();
  });

  it('takes a landmark name from the consumer', () => {
    fixture.componentInstance.ariaLabel.set('Docs sections');
    fixture.detectChanges();

    expect(host().getAttribute('aria-label')).toBe('Docs sections');
  });

  it('renders flat items as links and groups as toggles', () => {
    expect(root().querySelectorAll('.wr-sidebar__entry').length).toBe(2);
    expect(root().querySelectorAll('a.wr-sidebar__entry').length).toBe(1);
    expect(toggles().length).toBe(2);
    expect(root().querySelectorAll('.wr-sidebar__item').length).toBe(4);
  });

  it('renders a child with no route as plain text rather than a dead link', () => {
    const disabled = root().querySelector('.wr-sidebar__item--disabled')!;
    expect(disabled.tagName).toBe('SPAN');
    expect(disabled.textContent).toContain('Soon');
  });

  it('renders a disabled TOP-LEVEL entry as plain text too', () => {
    // It used to be a live `<a [routerLink]>` wearing the `--disabled` class, and
    // that class only paints: `pointer-events: none` blocks a mouse, never the
    // keyboard, so the entry was still a tab stop and Enter still navigated.
    const disabled = root().querySelector('.wr-sidebar__entry--disabled')!;
    expect(disabled.tagName).toBe('SPAN');
    expect(disabled.textContent).toContain('Archive');
    expect(root().querySelector('a[href="/archive"]')).toBeNull();
  });

  it('opens a group on click and closes it again', () => {
    expect(isOpen('Data & charts')).toBe(false);

    toggleFor('Data & charts').click();
    fixture.detectChanges();
    expect(isOpen('Data & charts')).toBe(true);
    expect(bodyFor('Data & charts').getAttribute('inert')).toBeNull();

    toggleFor('Data & charts').click();
    fixture.detectChanges();
    expect(isOpen('Data & charts')).toBe(false);
  });

  it('keeps a collapsed group out of the tab order', () => {
    expect(bodyFor('Data & charts').getAttribute('inert')).toBe('');
  });

  it('seeds a defaultOpen group', () => {
    expect(isOpen('Forms')).toBe(true);
  });

  it('does not re-open a defaultOpen group the user collapsed', () => {
    // Any later change to `entries` — a badge count, a filtered list — used to
    // re-run the seeding and undo the collapse.
    toggleFor('Forms').click();
    fixture.detectChanges();
    expect(isOpen('Forms')).toBe(false);

    fixture.componentInstance.entries.set([...ENTRIES]);
    fixture.detectChanges();
    expect(isOpen('Forms')).toBe(false);
  });

  it('gives every group body an id its own toggle points at', () => {
    for (const button of toggles()) {
      const id = button.getAttribute('aria-controls')!;
      expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(root().querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it('keeps the ids unique across two sidebars on one page', () => {
    @Component({
      imports: [WrSidebar],
      template: `<wr-sidebar [entries]="entries" /><wr-sidebar [entries]="entries" />`,
    })
    class TwoHost {
      readonly entries = ENTRIES;
    }

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideWrIcons([svgIcon('folder', ICON)])],
    });
    const two = TestBed.createComponent(TwoHost);
    two.detectChanges();

    const ids = [...(two.nativeElement as HTMLElement).querySelectorAll('.wr-sidebar__group-wrap')].map(el => el.id);
    expect(new Set(ids).size).toBe(ids.length);

    two.destroy();
  });

  it('expands the group that owns the current route', async () => {
    await navigate('/table');

    expect(isOpen('Data & charts')).toBe(true);
  });

  it('does not expand a group whose route is merely a prefix of this one', async () => {
    // `/tabs` starts with `/tab`, so a bare `startsWith` matched the SHORTER
    // sibling — and since the first match wins, the group that actually owns the
    // route stayed shut while an unrelated one opened.
    await mount();
    fixture.componentInstance.entries.set([
      { title: 'Tab group', children: [{ title: 'Tab', url: ['/tab'] }] },
      { title: 'Tabs group', children: [{ title: 'Tabs', url: ['/tabs'] }] },
    ]);
    fixture.detectChanges();
    await navigate('/tabs');

    expect(isOpen('Tabs group')).toBe(true);
    expect(isOpen('Tab group')).toBe(false);
  });

  it('matches a route with a query string or a fragment on it', async () => {
    await navigate('/table?page=2');

    expect(isOpen('Data & charts')).toBe(true);
  });

  it('leaves the groups alone when auto-expand is off', async () => {
    await mount();
    fixture.componentInstance.autoExpand.set(false);
    fixture.detectChanges();
    await navigate('/table');

    expect(isOpen('Data & charts')).toBe(false);
  });

  it('does not re-expand a group the user collapsed on the same route', async () => {
    await navigate('/table');
    toggleFor('Data & charts').click();
    fixture.detectChanges();
    expect(isOpen('Data & charts')).toBe(false);

    // Same URL again: the guard is what keeps the collapse from being undone.
    await navigate('/table');
    expect(isOpen('Data & charts')).toBe(false);
  });
});

describe('WrSidebar under a localized catalog', () => {
  it('names the landmark from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideWrIcons([svgIcon('folder', ICON)]),
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const host = (fixture.nativeElement as HTMLElement).querySelector('wr-sidebar')!;
    expect(host.getAttribute('aria-label')).toBe('Боковая панель');

    fixture.destroy();
  });
});
