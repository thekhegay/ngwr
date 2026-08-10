import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { WrScroll } from 'ngwr/scroll';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrAnchor } from './anchor';
import type { WrAnchorLink } from './interfaces';

const LINKS: readonly WrAnchorLink[] = [
  { id: 'intro', label: 'Introduction' },
  {
    id: 'usage',
    label: 'Usage',
    children: [
      { id: 'basic', label: 'Basic' },
      { id: 'advanced', label: 'Advanced' },
    ],
  },
];

/**
 * The targets sit AFTER the anchor in the template, which is how a page is
 * actually laid out — and is what broke the first scroll-spy pass.
 */
@Component({
  imports: [WrAnchor],
  template: `
    <wr-anchor [links]="links()" [offset]="offset()" [hitArea]="hitArea()" [ariaLabel]="ariaLabel()" />
    <h2 id="intro">Introduction</h2>
    <h2 id="usage">Usage</h2>
    <h3 id="basic">Basic</h3>
    <h3 id="advanced">Advanced</h3>
  `,
})
class Host {
  readonly links = signal<readonly WrAnchorLink[]>(LINKS);
  readonly offset = signal(0);
  readonly hitArea = signal(80);
  readonly ariaLabel = signal<string | null>(null);
}

/**
 * jsdom has no layout at all: every `getBoundingClientRect()` is zeroes, so the
 * spy's geometry has to be handed to it explicitly. Each target's rect is stubbed
 * per test — which is honest about what is being tested (the comparison against
 * the cursor line, not the browser's measuring).
 */
describe('WrAnchor', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let scroll: { to: ReturnType<typeof vi.fn>; toTop: ReturnType<typeof vi.fn> };

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-anchor')!;
  const links = (): HTMLAnchorElement[] => [...root().querySelectorAll<HTMLAnchorElement>('.wr-anchor__link')];
  const linkFor = (id: string): HTMLAnchorElement => links().find(a => a.getAttribute('href') === `#${id}`)!;
  const activeIds = (): string[] =>
    links()
      .filter(a => a.classList.contains('wr-anchor__link--active'))
      .map(a => a.getAttribute('href')!.slice(1));

  /** Give each id a top edge, then let the spy read them. */
  const placeTargets = (tops: Record<string, number>): void => {
    for (const [id, top] of Object.entries(tops)) {
      const el = document.getElementById(id)!;
      el.getBoundingClientRect = (): DOMRect => ({ top, bottom: top + 20, height: 20 }) as DOMRect;
    }
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
  };

  const mount = async (providers: unknown[] = []): Promise<void> => {
    scroll = { to: vi.fn(), toTop: vi.fn() };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: WrScroll, useValue: scroll }, ...(providers as never[])],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => mount());

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('is a named navigation landmark', () => {
    expect(host().getAttribute('role')).toBe('navigation');
    expect(host().getAttribute('aria-label')).toBe('Table of contents');
  });

  it('takes its name from the consumer', () => {
    // It used to be a static English attribute on the host, which no consumer
    // could override and no catalog could translate.
    fixture.componentInstance.ariaLabel.set('On this page');
    fixture.detectChanges();

    expect(host().getAttribute('aria-label')).toBe('On this page');
  });

  it('renders a link per entry, with children in a nested list', () => {
    expect(links().map(a => a.textContent.trim())).toEqual(['Introduction', 'Usage', 'Basic', 'Advanced']);
    expect(linkFor('basic').closest('.wr-anchor__list--nested')).not.toBeNull();
    expect(linkFor('usage').closest('.wr-anchor__list--nested')).toBeNull();
  });

  it('links to the ids as fragments, so it still works with scripting off', () => {
    expect(links().map(a => a.getAttribute('href'))).toEqual(['#intro', '#usage', '#basic', '#advanced']);
  });

  it('highlights something on first paint, without waiting for a scroll', () => {
    // The first pass used to run in the constructor, before the targets existed:
    // `getElementById` found nothing and the page sat with no highlight until the
    // reader scrolled. Every rect is zeroes here, so the cursor line is below all
    // four targets and the LAST one legitimately wins.
    expect(activeIds()).toEqual(['advanced']);
  });

  it('highlights the last heading that has passed the cursor line', () => {
    placeTargets({ intro: -40, usage: 200, basic: 400, advanced: 600 });

    expect(activeIds()).toEqual(['intro']);
    expect(linkFor('intro').getAttribute('aria-current')).toBe('location');
    expect(linkFor('usage').getAttribute('aria-current')).toBeNull();
  });

  it('moves the highlight down as headings pass', () => {
    placeTargets({ intro: -400, usage: -100, basic: -20, advanced: 300 });

    expect(activeIds()).toEqual(['basic']);
  });

  it('counts a heading as passed while it is still within the hit area', () => {
    // Cursor = offset + hitArea, so a heading 60px below the top is already
    // active at the default 80px hit area.
    placeTargets({ intro: 60, usage: 500, basic: 600, advanced: 700 });
    expect(activeIds()).toEqual(['intro']);

    fixture.componentInstance.hitArea.set(20);
    fixture.detectChanges();
    placeTargets({ intro: 60, usage: 500, basic: 600, advanced: 700 });
    expect(activeIds()).toEqual([]);
  });

  it('adds the sticky-header offset to the cursor line', () => {
    fixture.componentInstance.offset.set(200);
    fixture.componentInstance.hitArea.set(0);
    fixture.detectChanges();
    placeTargets({ intro: 100, usage: 150, basic: 900, advanced: 950 });

    expect(activeIds()).toEqual(['usage']);
  });

  it('stops at the first heading below the line, taking the list as document order', () => {
    // Deliberate: a table of contents is in document order, and stopping is what
    // keeps a later-but-higher target from stealing the highlight.
    placeTargets({ intro: -100, usage: 500, basic: -50, advanced: -40 });

    expect(activeIds()).toEqual(['intro']);
  });

  it('highlights nothing when every heading is still below the line', () => {
    placeTargets({ intro: 500, usage: 600, basic: 700, advanced: 800 });

    expect(activeIds()).toEqual([]);
    expect(links().every(a => a.getAttribute('aria-current') === null)).toBe(true);
  });

  it('ignores an id that is not on the page', () => {
    fixture.componentInstance.links.set([{ id: 'nowhere', label: 'Nowhere' }, ...LINKS]);
    fixture.detectChanges();
    placeTargets({ intro: -10, usage: 500, basic: 600, advanced: 700 });

    expect(activeIds()).toEqual(['intro']);
  });

  it('scrolls to a clicked target instead of letting the browser jump', () => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    fixture.componentInstance.offset.set(80);
    fixture.detectChanges();
    linkFor('basic').dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(true);
    expect(scroll.to).toHaveBeenCalledWith('#basic', { offset: 80 });
    // Highlighted immediately, rather than after the smooth scroll settles.
    expect(activeIds()).toEqual(['basic']);
  });

  it('drops its listener when it goes away', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    fixture.destroy();

    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('renders the list without touching the page on the server', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(links().length).toBe(4);
    expect(add).not.toHaveBeenCalledWith('scroll', expect.anything(), expect.anything());
    expect(activeIds()).toEqual([]);
  });
});

describe('WrAnchor under a localized catalog', () => {
  it('names the landmark from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: WrScroll, useValue: { to: vi.fn() } },
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const host = (fixture.nativeElement as HTMLElement).querySelector('wr-anchor')!;
    expect(host.getAttribute('aria-label')).toBe('Содержание');

    fixture.destroy();
  });
});
