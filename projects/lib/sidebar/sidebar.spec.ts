import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrJa } from 'ngwr/i18n/ja';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrIcons, svgIcon } from 'ngwr/icon';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WrSidebarActiveOptions, WrSidebarEntry } from './public-api';
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

/** Three levels, every kind of row: icon, count, subtitle, both badge tones. */
const NESTED: readonly WrSidebarEntry[] = [
  { title: 'Home', url: ['/'], activeOptions: { exact: true } },
  {
    title: 'Components',
    icon: 'folder',
    count: 12,
    countLabel: '12 pages',
    children: [
      {
        title: 'Form',
        subtitle: 'Signal Forms controls',
        count: '99+',
        children: [
          { title: 'Input', url: ['/input'], badge: { text: 'New', tone: 'primary' } },
          { title: 'Editor', url: ['/editor'], badge: { text: 'Optional' }, subtitle: 'ProseMirror peer' },
          { title: 'Signature', url: [], disabled: true, badge: { text: 'Soon' } },
        ],
      },
      { title: 'Graph', url: ['/graph'], badge: { text: 'Deprecated', tone: 'danger' } },
    ],
  },
];

@Component({
  imports: [WrSidebar],
  template: `<wr-sidebar
    [entries]="entries()"
    [autoExpand]="autoExpand()"
    [autoCollapse]="autoCollapse()"
    [ariaLabel]="ariaLabel()"
    [defaultGroupIcon]="defaultGroupIcon()"
    [defaultItemIcon]="defaultItemIcon()"
  />`,
})
class Host {
  readonly entries = signal<readonly WrSidebarEntry[]>(ENTRIES);
  readonly autoExpand = signal(true);
  readonly autoCollapse = signal(false);
  readonly ariaLabel = signal<string | null>(null);
  readonly defaultGroupIcon = signal<string | null>(null);
  readonly defaultItemIcon = signal<string | null>(null);
}

/**
 * The text a screen reader builds a row's name from: its text nodes, with every
 * `aria-hidden` subtree left out and a space at every element boundary, the way
 * a browser spaces block-level pieces. A small model of the accessible-name
 * walk, so the visible count (hidden when it has a spoken form) and the subtitle
 * (the description, not the name) drop out exactly as they do for assistive tech.
 * A space before a comma is folded away here; whether the real name has one is
 * asserted on the markup, in the naming spec.
 */
function spoken(el: Element): string {
  let out = '';
  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) out += node.textContent;
    else if (node instanceof Element && node.getAttribute('aria-hidden') !== 'true') {
      out += ' ';
      node.childNodes.forEach(walk);
      out += ' ';
    }
  };
  el.childNodes.forEach(walk);
  return out.replace(/\s+/g, ' ').replace(/ ,/g, ',').trim();
}

/**
 * A real `Router` is provided rather than stubbed, because what drives the
 * current row and the auto-expand is `NavigationEnd`, and the URL matching is
 * where the bugs were. Icons are registered so `<wr-icon>` has something to draw.
 */
describe('WrSidebar', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let router: Router;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-sidebar')!;
  const rows = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-sidebar__row')];
  /** A row's visible title: the title's own text, without the hidden comma inside it. */
  const titleOf = (row: HTMLElement): string =>
    [...(row.querySelector('.wr-sidebar__title')?.childNodes ?? [])]
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent)
      .join('')
      .trim();
  /** Every row whose title is exactly `title`: `Tab` must not find `Tabs`. */
  const rowsFor = (title: string): HTMLElement[] => rows().filter(row => titleOf(row) === title);
  const rowFor = (title: string): HTMLElement => rowsFor(title)[0];
  /** A group's disclosure: the whole row, or the split arrow beside its link. */
  const toggleOf = (row: HTMLElement): HTMLButtonElement =>
    row.classList.contains('wr-sidebar__row') && row.tagName === 'BUTTON'
      ? (row as HTMLButtonElement)
      : row.parentElement!.querySelector<HTMLButtonElement>(':scope > .wr-sidebar__toggle')!;
  const toggleFor = (title: string): HTMLButtonElement => toggleOf(rowFor(title));
  const toggles = (): HTMLButtonElement[] => [...root().querySelectorAll<HTMLButtonElement>('button[aria-controls]')];
  const bodyFor = (title: string): HTMLElement =>
    root().querySelector<HTMLElement>(`#${toggleFor(title).getAttribute('aria-controls')!}`)!;
  const isOpen = (title: string): boolean => toggleFor(title).getAttribute('aria-expanded') === 'true';
  const isCurrent = (title: string): boolean => rowFor(title).getAttribute('aria-current') === 'page';

  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const mount = async (extra: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', pathMatch: 'full', component: Page },
          { path: 'tab', component: Page },
          { path: 'table', component: Page },
          { path: 'tabs', component: Page },
          { path: 'tabs/second', component: Page },
          { path: 'input', component: Page },
          { path: 'editor', component: Page },
          { path: 'graph', component: Page },
        ]),
        provideWrIcons([svgIcon('folder', ICON), svgIcon('caret-forward', ICON)]),
        ...(extra as never[]),
      ],
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Host);
    await settle();
  };

  const navigate = async (url: string): Promise<void> => {
    await router.navigateByUrl(url);
    await settle();
  };

  const show = async (entries: readonly WrSidebarEntry[]): Promise<void> => {
    fixture.componentInstance.entries.set(entries);
    await settle();
  };

  beforeEach(async () => mount());
  afterEach(() => fixture.destroy());

  describe('landmark', () => {
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

    it('draws the tree as nested lists', () => {
      expect(host().querySelector(':scope > ul.wr-sidebar__inner')).not.toBeNull();
      expect(root().querySelectorAll('ul.wr-sidebar__list').length).toBe(2);
      for (const row of rows()) expect(row.parentElement!.closest('li')).not.toBeNull();
    });
  });

  describe('rows', () => {
    it('renders pages as links and groups as buttons', () => {
      expect(root().querySelectorAll('a.wr-sidebar__row').length).toBe(4);
      expect(root().querySelectorAll('button.wr-sidebar__row').length).toBe(2);
      expect(rowFor('Data & charts').classList).toContain('wr-sidebar__row--group');
      expect(rowFor('Data & charts').getAttribute('type')).toBe('button');
    });

    it('renders a page with no route, and a disabled page, as plain text rather than a dead link', () => {
      // A live `<a [routerLink]>` wearing a `--disabled` class only paints:
      // `pointer-events: none` blocks a mouse, never the keyboard.
      for (const title of ['Soon', 'Archive']) {
        expect(rowFor(title).tagName).toBe('SPAN');
        expect(rowFor(title).classList).toContain('wr-sidebar__row--disabled');
      }
      expect(root().querySelector('a[href="/archive"]')).toBeNull();
    });

    it('marks every row with its level', async () => {
      await show(NESTED);
      toggleFor('Components').click();
      fixture.detectChanges();
      toggleFor('Form').click();
      fixture.detectChanges();

      expect(rowFor('Components').classList).toContain('wr-sidebar__row--level-1');
      expect(rowFor('Form').classList).toContain('wr-sidebar__row--level-2');
      expect(rowFor('Input').classList).toContain('wr-sidebar__row--level-3');
    });

    it('names a row by its title, then its badge, then its count, joined by commas', async () => {
      await show(NESTED);

      expect(spoken(rowFor('Components'))).toBe('Components, 12 pages');
      expect(spoken(rowFor('Form'))).toBe('Form, 99+');
      expect(spoken(rowFor('Input'))).toBe('Input, New');
      expect(spoken(rowFor('Editor'))).toBe('Editor, Optional');
      expect(spoken(rowFor('Graph'))).toBe('Graph, Deprecated');
    });

    it('ends each piece with its own hidden comma, so no block boundary lands before it', async () => {
      // A separate comma element after the title was read as "Components , 12
      // pages": a browser spaces every block boundary, and the title is one.
      await show(NESTED);
      const components = rowFor('Components');

      expect(components.querySelector('.wr-sidebar__title')!.textContent).toBe('Components,');
      expect(rowFor('Input').querySelector('.wr-sidebar__title')!.textContent).toBe('Input,');
      expect(rowFor('Input').querySelector('.wr-sidebar__badge')!.textContent).toBe('New');
      // Nothing follows a lone title, so nothing is appended to it.
      expect(rowFor('Home').querySelector('.wr-sidebar__title')!.textContent).toBe('Home');
    });

    it('shows the count as written and says its label instead', async () => {
      await show(NESTED);
      const count = rowFor('Components').querySelector('.wr-sidebar__count')!;

      expect(count.textContent.trim()).toBe('12');
      expect(count.getAttribute('aria-hidden')).toBe('true');
      // No label: the number IS what is said, so it is not hidden.
      expect(rowFor('Form').querySelector('.wr-sidebar__count')!.hasAttribute('aria-hidden')).toBe(false);
    });

    it('describes a row by its subtitle rather than naming it', async () => {
      await show(NESTED);
      const row = rowFor('Form');
      const subtitle = row.querySelector<HTMLElement>('.wr-sidebar__subtitle')!;

      expect(subtitle.textContent.trim()).toBe('Signal Forms controls');
      expect(subtitle.getAttribute('aria-hidden')).toBe('true');
      expect(row.getAttribute('aria-describedby')).toBe(subtitle.id);
      expect(root().querySelectorAll(`#${subtitle.id}`).length).toBe(1);
      expect(rowFor('Graph').hasAttribute('aria-describedby')).toBe(false);
    });

    it("reads a disabled row's subtitle as text, since a span carries no description", async () => {
      // A nameless generic's `aria-describedby` goes nowhere, and a hidden
      // subtitle left the text out of the accessibility tree altogether.
      await show([{ title: 'Signature pad', subtitle: 'Planned for the next minor release', url: [], disabled: true }]);
      const row = rowFor('Signature pad');

      expect(row.hasAttribute('aria-describedby')).toBe(false);
      expect(row.querySelector('.wr-sidebar__subtitle')!.hasAttribute('aria-hidden')).toBe(false);
      expect(spoken(row)).toBe('Signature pad Planned for the next minor release');
    });

    it('paints a badge in its tone, neutral when it names none', async () => {
      await show(NESTED);
      const badge = (title: string): Element => rowFor(title).querySelector('.wr-sidebar__badge')!;

      expect(badge('Input').classList).toContain('wr-sidebar__badge--primary');
      expect(badge('Editor').classList).toContain('wr-sidebar__badge--neutral');
      expect(badge('Graph').classList).toContain('wr-sidebar__badge--danger');
      expect(badge('Signature').textContent.trim()).toBe('Soon');
    });

    it('draws no icon unless an entry or a default names one', async () => {
      expect(root().querySelector('wr-icon')).toBeNull();

      fixture.componentInstance.defaultGroupIcon.set('folder');
      await settle();

      const icons = [...root().querySelectorAll('wr-icon.wr-sidebar__icon')];
      expect(icons.length).toBe(2);
      expect(icons.every(icon => icon.closest('.wr-sidebar__row')!.classList.contains('wr-sidebar__row--group'))).toBe(
        true
      );
    });

    it('draws the default page icon on pages only, disabled ones included', async () => {
      fixture.componentInstance.defaultItemIcon.set('caret-forward');
      await settle();

      const icons = [...root().querySelectorAll('wr-icon.wr-sidebar__icon')];
      expect(icons.length).toBe(6);
      expect(icons.some(icon => icon.closest('.wr-sidebar__row')!.classList.contains('wr-sidebar__row--group'))).toBe(
        false
      );
    });

    it('hangs the guide under the icon when the parent row has one', async () => {
      await show(NESTED);
      const listOf = (title: string): Element =>
        root().querySelector(`#${toggleFor(title).getAttribute('aria-controls')!} .wr-sidebar__list`)!;

      expect(listOf('Components').classList).toContain('wr-sidebar__list--under-icon');
      expect(listOf('Form').classList).not.toContain('wr-sidebar__list--under-icon');
    });

    it('puts a tooltip on a title or subtitle only when it is cut', async () => {
      // jsdom lays nothing out, so the cut is stubbed: anything longer than ten
      // characters reports more content than box.
      const scroll = vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) {
        return this.textContent.trim().length > 10 ? 200 : 0;
      });
      try {
        await show([
          { title: 'Short', url: ['/table'] },
          { title: 'A title far too long to fit', subtitle: 'And a long subtitle too', url: ['/tabs'] },
        ]);

        const long = rowFor('A title far too long to fit');
        expect(long.querySelector('.wr-sidebar__title')!.getAttribute('title')).toBe('A title far too long to fit');
        expect(long.querySelector('.wr-sidebar__subtitle')!.getAttribute('title')).toBe('And a long subtitle too');
        expect(rowFor('Short').querySelector('.wr-sidebar__title')!.hasAttribute('title')).toBe(false);
        // On the cut text, never on the row: a row's `title` would become its description.
        expect(long.hasAttribute('title')).toBe(false);
      } finally {
        scroll.mockRestore();
      }
    });

    it('warns in dev mode when an entry sits deeper than three levels, and still renders it', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        await show([
          {
            title: 'One',
            defaultOpen: true,
            children: [
              {
                title: 'Two',
                defaultOpen: true,
                children: [{ title: 'Three', defaultOpen: true, children: [{ title: 'Four', url: ['/table'] }] }],
              },
            ],
          },
        ]);

        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toContain('level 4');
        expect(rowFor('Four')).toBeDefined();
      } finally {
        warn.mockRestore();
      }
    });
  });

  describe('groups', () => {
    it('opens a group on click and closes it again', () => {
      expect(isOpen('Data & charts')).toBe(false);

      toggleFor('Data & charts').click();
      fixture.detectChanges();
      expect(isOpen('Data & charts')).toBe(true);
      expect(bodyFor('Data & charts').getAttribute('inert')).toBeNull();
      expect(rowFor('Data & charts').closest('li')!.classList).not.toContain('wr-sidebar__group--collapsed');

      toggleFor('Data & charts').click();
      fixture.detectChanges();
      expect(isOpen('Data & charts')).toBe(false);
    });

    it('keeps a collapsed group out of the tab order', () => {
      expect(bodyFor('Data & charts').getAttribute('inert')).toBe('');
      expect(rowFor('Data & charts').closest('li')!.classList).toContain('wr-sidebar__group--collapsed');
    });

    it('seeds a defaultOpen group', () => {
      expect(isOpen('Forms')).toBe(true);
    });

    it('does not re-open a defaultOpen group the user collapsed', () => {
      // Any later change to `entries` (a count, a filtered list) used to re-run
      // the seeding and undo the collapse.
      toggleFor('Forms').click();
      fixture.detectChanges();
      expect(isOpen('Forms')).toBe(false);

      fixture.componentInstance.entries.set([...ENTRIES]);
      fixture.detectChanges();
      expect(isOpen('Forms')).toBe(false);
    });

    it('keeps the open state of two groups with the same title apart', async () => {
      // Keyed by title alone, opening one "Overview" opened every "Overview".
      await show([
        {
          title: 'Guides',
          defaultOpen: true,
          children: [{ title: 'Overview', children: [{ title: 'A', url: ['/table'] }] }],
        },
        {
          title: 'Reference',
          defaultOpen: true,
          children: [{ title: 'Overview', children: [{ title: 'B', url: ['/tabs'] }] }],
        },
      ]);
      const [first, second] = rowsFor('Overview');

      toggleOf(first).click();
      fixture.detectChanges();

      expect(toggleOf(first).getAttribute('aria-expanded')).toBe('true');
      expect(toggleOf(second).getAttribute('aria-expanded')).toBe('false');
    });

    it('gives every group body an id its own toggle points at', async () => {
      await show(NESTED);
      for (const button of toggles()) {
        const id = button.getAttribute('aria-controls')!;
        // A trailing hyphen is what an empty slug used to leave behind.
        expect(id).toMatch(/^[a-z][a-z0-9-]*[a-z0-9]$/);
        expect(root().querySelector(`#${id}`)!.classList).toContain('wr-sidebar__group-wrap');
      }
    });

    it('keeps the ids apart for titles that slug to the same string', async () => {
      // Ids used to be slugged from the TITLE, so `Data & charts` and `Data /
      // charts` produced one string, and a title with no ASCII letters the EMPTY
      // one: a Russian sidebar gave every group the same id.
      const kids = [{ title: 'One', url: ['/input'] }];
      await show([
        { title: 'Компоненты', children: kids },
        { title: 'Настройки', children: kids },
        { title: '数据', children: kids },
        { title: 'Data & charts', children: kids },
        { title: 'Data / charts', children: kids },
      ]);

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
        readonly entries = NESTED;
      }

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideRouter([]), provideWrIcons([svgIcon('folder', ICON)])],
      });
      const two = TestBed.createComponent(TwoHost);
      two.detectChanges();

      const ids = [...(two.nativeElement as HTMLElement).querySelectorAll('[id]')].map(el => el.id);
      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(ids.length);

      two.destroy();
    });

    describe('a group that is also a page', () => {
      const SPLIT: readonly WrSidebarEntry[] = [
        { title: 'Tabs', url: ['/tabs'], children: [{ title: 'Second', url: ['/tabs', 'second'] }] },
      ];

      it('links its title and gives the arrow a button of its own', async () => {
        await show(SPLIT);
        const row = rowFor('Tabs');
        const toggle = toggleFor('Tabs');

        expect(row.tagName).toBe('A');
        expect(row.getAttribute('href')).toBe('/tabs');
        expect(row.hasAttribute('aria-expanded')).toBe(false);
        expect(toggle).not.toBe(row);
        expect(toggle.getAttribute('aria-label')).toBe('Sub-pages of Tabs');
        expect(toggle.getAttribute('aria-expanded')).toBe('false');

        toggle.click();
        fixture.detectChanges();
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(bodyFor('Tabs').hasAttribute('inert')).toBe(false);
      });

      it('is the current page on its own path only, since its children own the paths below', async () => {
        await show(SPLIT);

        await navigate('/tabs/second');
        expect(isOpen('Tabs')).toBe(true);
        expect(isCurrent('Second')).toBe(true);
        expect(isCurrent('Tabs')).toBe(false);

        await navigate('/tabs');
        expect(isCurrent('Tabs')).toBe(true);
        expect(isCurrent('Second')).toBe(false);
      });
    });
  });

  describe('the current page', () => {
    it('marks an entry current by path PREFIX when it says nothing, so `/` is current everywhere', async () => {
      // The router's own default, and the reason `activeOptions` exists.
      await navigate('/table');

      expect(isCurrent('Home')).toBe(true);
      expect(rowFor('Home').classList).toContain('wr-sidebar__row--active');
      expect(isCurrent('Table')).toBe(true);
      expect(isCurrent('Tabs')).toBe(false);
    });

    it("passes an entry's own activeOptions to the match, at level 1 and below", async () => {
      // Typed through the entry point, so the spec stops compiling if the type
      // is dropped from `public-api.ts` again.
      const exact: WrSidebarActiveOptions = { exact: true };
      await show([
        { title: 'Home', url: ['/'], activeOptions: exact },
        {
          title: 'Data & charts',
          defaultOpen: true,
          children: [{ title: 'Tab', url: ['/tab'], activeOptions: exact }],
        },
      ]);

      await navigate('/table');
      expect(isCurrent('Home')).toBe(false);
      expect(isCurrent('Tab')).toBe(false);

      await navigate('/');
      expect(isCurrent('Home')).toBe(true);

      await navigate('/tab');
      expect(isCurrent('Tab')).toBe(true);
    });

    it('keeps a prefix match for the entries that ask for nothing while a sibling asks for exact', async () => {
      await show([
        { title: 'Home', url: ['/'], activeOptions: { exact: true } },
        { title: 'Tabs', url: ['/tabs'] },
      ]);

      await navigate('/tabs/second');

      expect(isCurrent('Tabs')).toBe(true);
      expect(isCurrent('Home')).toBe(false);
    });

    it('never marks a disabled page current', async () => {
      await show([{ title: 'Table', url: ['/table'], disabled: true }]);
      await navigate('/table');

      expect(rowFor('Table').hasAttribute('aria-current')).toBe(false);
      expect(rowFor('Table').classList).not.toContain('wr-sidebar__row--active');
    });

    it('gives a collapsed group holding the current page a dot, and says so', async () => {
      fixture.componentInstance.autoExpand.set(false);
      await show(NESTED);
      await navigate('/input');
      const components = rowFor('Components');

      expect(isOpen('Components')).toBe(false);
      expect(components.classList).toContain('wr-sidebar__row--holds-active');
      expect(components.querySelector('.wr-sidebar__dot')!.getAttribute('aria-hidden')).toBe('true');
      expect(spoken(components)).toBe('Components, 12 pages, contains the current page');
      // Only the outermost collapsed group is visible, so only it carries the cue.
      expect(rowFor('Form').classList).not.toContain('wr-sidebar__row--holds-active');

      toggleFor('Components').click();
      fixture.detectChanges();

      expect(components.classList).toContain('wr-sidebar__row--ancestor');
      expect(components.querySelector('.wr-sidebar__dot')).toBeNull();
      expect(rowFor('Form').classList).toContain('wr-sidebar__row--holds-active');
    });

    it('marks every open group above the current page as its ancestor', async () => {
      await show(NESTED);
      await navigate('/input');

      expect(rowFor('Components').classList).toContain('wr-sidebar__row--ancestor');
      expect(rowFor('Form').classList).toContain('wr-sidebar__row--ancestor');
      expect(root().querySelector('.wr-sidebar__row--holds-active')).toBeNull();
      expect(root().querySelector('.wr-sidebar__dot')).toBeNull();
    });
  });

  describe('auto-expand', () => {
    it('expands the group that owns the current route', async () => {
      await navigate('/table');

      expect(isOpen('Data & charts')).toBe(true);
    });

    it('expands every group above a route three levels down', async () => {
      await show(NESTED);
      await navigate('/input');

      expect(isOpen('Components')).toBe(true);
      expect(isOpen('Form')).toBe(true);
      expect(bodyFor('Form').hasAttribute('inert')).toBe(false);
    });

    it('does not expand a group whose route is merely a prefix of this one', async () => {
      // `/tabs` starts with `/tab`, so a bare `startsWith` matched the SHORTER
      // sibling and the group that actually owns the route stayed shut.
      await show([
        { title: 'Tab group', children: [{ title: 'Tab', url: ['/tab'] }] },
        { title: 'Tabs group', children: [{ title: 'Tabs', url: ['/tabs'] }] },
      ]);
      await navigate('/tabs');

      expect(isOpen('Tabs group')).toBe(true);
      expect(isOpen('Tab group')).toBe(false);
    });

    it('matches a route with a query string or a fragment on it', async () => {
      await navigate('/table?page=2');

      expect(isOpen('Data & charts')).toBe(true);
    });

    it('leaves the groups alone when auto-expand is off', async () => {
      fixture.componentInstance.autoExpand.set(false);
      fixture.detectChanges();
      await navigate('/table');

      expect(isOpen('Data & charts')).toBe(false);
    });

    it('expands the group once entries that arrived after the navigation name one', async () => {
      // `[entries]` is routinely an HTTP result, so the first run matches
      // nothing, and it used to record the URL as handled before it knew that.
      await show([]);
      await navigate('/table');

      await show(ENTRIES);

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

    it('re-opens a group closed by hand when the route comes back by way of a page no group holds', async () => {
      // A URL no group holds used to leave the last URL recorded, so Back from a
      // level-1 page found the route "already handled" and left the group shut,
      // with the current link out of the tab order.
      await navigate('/table');
      toggleFor('Data & charts').click();
      fixture.detectChanges();

      await navigate('/');
      await navigate('/table');

      expect(isOpen('Data & charts')).toBe(true);
    });
  });

  describe('auto-collapse', () => {
    const TWO: readonly WrSidebarEntry[] = [
      { title: 'Data', children: [{ title: 'Table', url: ['/table'] }] },
      // Not `Forms`: the default entries seed that key open before these replace them.
      { title: 'Controls', children: [{ title: 'Input', url: ['/input'] }] },
    ];

    beforeEach(async () => {
      fixture.componentInstance.autoCollapse.set(true);
      await show(TWO);
    });

    it('closes the group the last navigation opened when the next one leaves it', async () => {
      await navigate('/table');
      expect(isOpen('Data')).toBe(true);

      await navigate('/input');
      expect(isOpen('Controls')).toBe(true);
      expect(isOpen('Data')).toBe(false);

      // A page no group holds closes it too.
      await navigate('/');
      expect(isOpen('Controls')).toBe(false);
    });

    it('never closes a group the user opened by hand', async () => {
      toggleFor('Controls').click();
      fixture.detectChanges();

      await navigate('/input');
      await navigate('/table');

      expect(isOpen('Controls')).toBe(true);
      expect(isOpen('Data')).toBe(true);
    });

    it('closes only the groups the next route leaves, at any depth', async () => {
      await show(NESTED);
      await navigate('/input');
      await navigate('/graph');

      expect(isOpen('Components')).toBe(true);
      expect(isOpen('Form')).toBe(false);
    });

    it('keeps every visited group open when it is off', async () => {
      fixture.componentInstance.autoCollapse.set(false);
      await settle();
      await navigate('/table');
      await navigate('/input');

      expect(isOpen('Data')).toBe(true);
      expect(isOpen('Controls')).toBe(true);
    });
  });
});

describe('WrSidebar under a localized catalog', () => {
  it('names the landmark, the split arrow and the collapsed holder from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'table', component: Page }]),
        provideWrIcons([svgIcon('folder', ICON)]),
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.autoExpand.set(false);
    fixture.componentInstance.entries.set([
      { title: 'Таблицы', url: ['/tables'], children: [{ title: 'Таблица', url: ['/table'] }] },
    ]);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/table');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('wr-sidebar')!.getAttribute('aria-label')).toBe('Боковая панель');
    expect(el.querySelector('.wr-sidebar__toggle')!.getAttribute('aria-label')).toBe('Подстраницы: Таблицы');
    expect(el.querySelector('.wr-sidebar__row--holds-active')!.textContent).toContain('содержит текущую страницу');

    fixture.destroy();
  });

  it("joins the pieces of a row's name with the catalog's separator", async () => {
    // Heard on every row, so it is not frozen as an ASCII comma: Japanese joins
    // with 、, the separator its catalog's other composed names use.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'input', component: Page }]),
        provideWrI18n({ defaultLocale: 'ja', availableLocales: ['ja'] }),
        provideWrI18nStaticLoader({ ja: wrJa }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.entries.set([
      { title: '入力', url: ['/input'], badge: { text: '新規', tone: 'primary' }, count: 3 },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.wr-sidebar__title')!.textContent).toBe('入力、');
    expect(el.querySelector('.wr-sidebar__badge')!.textContent).toBe('新規、');

    fixture.destroy();
  });
});
