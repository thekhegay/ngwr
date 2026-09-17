import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
      // A trailing hyphen is what an empty slug used to leave behind, so the
      // shape has to end on a real character — see the collision test below.
      expect(id).toMatch(/^[a-z][a-z0-9-]*[a-z0-9]$/);
      expect(root().querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it('keeps the ids apart for titles that slug to the same string', async () => {
    // Ids used to be slugged from the TITLE, lowercased with every non-`[a-z0-9]`
    // run collapsed — so `Data & charts` and `Data / charts` produced one string,
    // and a title with no ASCII alphanumerics produced the EMPTY one. A Russian or
    // Chinese sidebar therefore gave every group the same id and every toggle
    // pointed at the first group's body.
    const kids = [{ title: 'One', url: ['/input'] }];
    fixture.componentInstance.entries.set([
      { title: 'Компоненты', children: kids },
      { title: 'Настройки', children: kids },
      { title: '数据', children: kids },
      { title: 'Data & charts', children: kids },
      { title: 'Data / charts', children: kids },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const bodies = [...root().querySelectorAll<HTMLElement>('.wr-sidebar__group-wrap')];
    const ids = bodies.map(el => el.id);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size, `duplicate ids: ${ids.join(', ')}`).toBe(ids.length);

    // Each toggle must resolve to its OWN body, not merely to some element.
    const controlled = toggles().map(button =>
      bodies.indexOf(root().querySelector<HTMLElement>(`#${button.getAttribute('aria-controls')}`)!)
    );
    expect(controlled).toEqual([0, 1, 2, 3, 4]);
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

  it('expands the group once entries that arrived after the navigation name one', async () => {
    // `[entries]` is routinely an HTTP result, so the first run of the effect
    // matches nothing — and it used to record the URL as handled before it knew
    // that, which suppressed the expansion permanently. On a deep link the group
    // holding the active route stayed shut, and `inert` kept that link out of the
    // tab order and the a11y tree until the user navigated away and back.
    await mount();
    fixture.componentInstance.entries.set([]);
    fixture.detectChanges();
    await navigate('/table');

    fixture.componentInstance.entries.set(ENTRIES);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(isOpen('Data & charts')).toBe(true);
    expect(bodyFor('Data & charts').hasAttribute('inert')).toBe(false);
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

/**
 * Row geometry lives in the stylesheet, and jsdom loads none — a spec that
 * measured a row would read 0x0 before the fix and after it. So these read the
 * declarations that decide the height, and the heights themselves were measured
 * in Chromium, in both themes: the group toggle went from 33px to the 36px of the
 * link above it, a nested item from 30px to 32px, and a badge stopped adding 2px
 * to its row (a top-level link carrying one measured 38px, a nested item 32px
 * beside 30px neighbours). The same goes for the outer inset: every row, nested
 * ones included, measured 0px from the frame around the nav, a bordered card or a
 * `wr-layout-sider`, and 8px after, in both themes and both directions.
 */
describe('the sidebar stylesheet', () => {
  /** A stylesheet with its line comments dropped. */
  const read = (path: string): string =>
    readFileSync(join(process.cwd(), path), 'utf8')
      .split('\n')
      .filter(line => !line.trim().startsWith('//'))
      .join('\n');

  const code = read('projects/lib/sidebar/styles/_index.scss');

  /** The block's OWN declarations — not those of the states nested inside it. */
  const declarations = (selector: string, indent: number, source = code): Record<string, string> => {
    const pad = ' '.repeat(indent);
    const body = new RegExp(`\\n${pad}${selector} \\{\\n([\\s\\S]*?)\\n${pad}\\}`).exec(source)?.[1];
    if (body === undefined) throw new Error(`No \`${selector}\` block at indent ${indent}`);
    const own = body
      .split('\n')
      .filter(line => /^\s*[\w-]+:/.test(line) && line.startsWith(`${pad}  `) && line[indent + 2] !== ' ');
    return Object.fromEntries(own.map(line => line.trim().replace(/;$/, '').split(/:\s*/) as [string, string]));
  };

  const rem = (value: string): number => {
    const match = /^([\d.]+)rem$/.exec(value);
    if (!match) throw new Error(`Expected a rem length, got \`${value}\``);
    return Number(match[1]);
  };

  /** `padding: <block> <inline>` → the block half. */
  const paddingBlock = (value: string): number => rem(value.split(/\s+/)[0]);

  const host = declarations('\\.wr-sidebar', 0);
  const entry = declarations('&__entry', 2);
  const toggle = declarations('&-toggle', 4);
  const item = declarations('&__item', 2);
  const badge = declarations('&__badge', 2);
  const dropdownItem = declarations('\\.wr-dropdown-item', 0, read('projects/lib/dropdown/styles/_index.scss'));

  it('insets every row from the edge of the host through its own padding hook', () => {
    expect(host['padding']).toBe('var(--wr-sidebar-padding)');
    expect(rem(host['--wr-sidebar-padding'])).toBeGreaterThan(0);
  });

  it('ends an open last group on that inset rather than on its gap to a next row', () => {
    const list = declarations('&__list', 2);
    const lastList = declarations('&__group:last-child &__list', 2);

    // The gap it cancels is real: `margin: <top> <inline> <bottom>`.
    expect(rem(list['margin'].split(/\s+/)[2])).toBeGreaterThan(0);
    expect(lastList['margin-block-end']).toBe('0');
  });

  it('rounds each row tint with the corner a dropdown item uses', () => {
    const corner = dropdownItem['--wr-dropdown-item-radius'];

    expect(corner).toBe('var(--wr-border-radius-sm)');
    for (const row of [entry, toggle, item]) expect(row['border-radius']).toBe(corner);
  });

  it('gives the group toggle the type of the link beside it, since a <button> inherits none', () => {
    expect(toggle['font']).toBe('inherit');
    expect(toggle['font-size']).toBe(entry['font-size']);
    expect(rem(toggle['line-height'])).toBe(rem(entry['line-height']));
    expect(paddingBlock(toggle['padding'])).toBe(paddingBlock(entry['padding']));
  });

  it('keeps a badge inside the line box of every row it can sit in', () => {
    const chip = rem(badge['line-height']) + 2 * paddingBlock(badge['padding']);

    expect(chip).toBeLessThanOrEqual(rem(entry['line-height']));
    expect(chip).toBeLessThanOrEqual(rem(item['line-height']));
  });

  it('insets a nested item by at least 6px around its line', () => {
    expect(paddingBlock(item['padding'])).toBeGreaterThanOrEqual(0.375);
  });
});
