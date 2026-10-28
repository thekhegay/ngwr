import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { WrSidebarEntry } from 'ngwr/sidebar';
import { NGWR_VERSION } from 'ngwr/version';
import { describe, expect, it } from 'vitest';

import * as SIDEBARS from '../../_layout/sidebar/configs';
import { sidebarEntries } from '../../_layout/sidebar/entries';
import { SINCE, UPDATED } from '../generated/since';

import { isNewIn, isNewLink, linkMark, markVersion, releaseLabel, routeKey, sinceOf, updatedOf } from './since';

import type { SidebarGroup } from '#types';

describe('the docs "new" rule', () => {
  it('marks a version on the current minor line', () => {
    expect(isNewIn('14.4.0', '14.4.0')).toBe(true);
  });

  it('marks a version declared ahead of the release that carries it', () => {
    expect(isNewIn('14.5.0', '14.4.0')).toBe(true);
  });

  it('drops the mark once the next minor ships', () => {
    expect(isNewIn('14.5.0', '14.6.0')).toBe(false);
  });

  it('keeps the mark across a patch release', () => {
    expect(isNewIn('14.5.0', '14.5.3')).toBe(true);
  });

  it('does not mark an older line', () => {
    expect(isNewIn('13.2.0', '14.4.0')).toBe(false);
  });

  it('refuses to guess at a version it cannot parse', () => {
    expect(isNewIn('v14.5', '14.4.0')).toBe(false);
    expect(isNewIn('14.5', '14.4.0')).toBe(false);
  });

  // `release:prepare --bump=rc` writes `14.5.0-rc.0` into NGWR_VERSION, and a
  // rule that cannot read it drops every mark on the site for the length of the
  // candidate line — a total failure that names no page and no gate reports.
  it('keeps marking through a release-candidate line', () => {
    expect(isNewIn('14.5.0', '14.5.0-rc.1')).toBe(true);
    expect(isNewIn('14.5.0', '14.4.1-rc.0')).toBe(true);
    expect(isNewIn('14.5.0', '14.6.0-rc.0')).toBe(false);
    expect(isNewIn('15.0.0', '15.0.0-rc.0')).toBe(true);
  });

  // The live constant, not a literal: this is the only assertion that fails if
  // `release:prepare` ever writes a shape the rule cannot read.
  it('reads the version the library actually ships', () => {
    expect(isNewIn(NGWR_VERSION, NGWR_VERSION)).toBe(true);
  });

  it('shortens a zero patch and keeps a real one', () => {
    expect(releaseLabel('14.5.0')).toBe('v14.5');
    expect(releaseLabel('15.0.0')).toBe('v15');
    expect(releaseLabel('15.0.2')).toBe('v15.0.2');
    expect(releaseLabel('14.4.2')).toBe('v14.4.2');
  });

  it('keys a nav link by its route', () => {
    expect(routeKey('/reference/components/graph')).toBe('reference/components/graph');
  });

  it('answers nothing for a page that declares nothing', () => {
    expect(sinceOf('reference/components/button')).toBeNull();
  });

  it('reads the declared version out of the generated map', () => {
    expect(sinceOf('reference/components/graph')).toBe('14.5.0');
  });

  it('marks the graph link and not its neighbours', () => {
    expect(isNewLink('/reference/components/graph', '14.4.0')).toBe(true);
    expect(isNewLink('/reference/components/button', '14.4.0')).toBe(false);
    expect(isNewLink(undefined, '14.4.0')).toBe(false);
  });
});

describe('the docs "updated" mark', () => {
  it('reads it out of the generated map', () => {
    expect(updatedOf('docs/configuration')).toBe('15.0.0');
    expect(updatedOf('reference/components/alert')).toBeNull();
  });

  // `updated` rides the same expiring rule as `since`: a reader's question is
  // what changed in THIS feature release, so the mark leaves with the next one.
  it('marks an update on its own line and drops it when the next minor ships', () => {
    expect(linkMark('/docs/configuration', '15.0.0')).toBe('updated');
    expect(linkMark('/docs/configuration', '15.0.0-rc.1')).toBe('updated');
    expect(linkMark('/docs/configuration', '15.1.0')).toBeNull();
  });

  it('gives a page one mark, and "new" wins over "updated"', () => {
    // The editor declares since 14.9.0 and updated 15.0.0.
    expect(linkMark('/reference/components/editor', '14.9.0')).toBe('new');
    expect(linkMark('/reference/components/editor', '15.0.0')).toBe('updated');
    expect(linkMark('/reference/components/alert', '15.0.0')).toBeNull();
    expect(linkMark(undefined, '15.0.0')).toBeNull();
  });
});

/**
 * Which line counts as current: the later of `NGWR_VERSION`'s and the newest
 * one any page declares. On `next` the pages declare the release ahead while
 * the constant still names the patch `main` last shipped, and the nav is meant
 * to say what THAT release adds, not what the last two did.
 */
describe('the line the marks are judged against', () => {
  it('stays on the shipped line while nothing is declared ahead of it', () => {
    const current = markVersion('15.0.1', ['14.5.0', '15.0.0']);

    expect(current).toBe('15.0.1');
    expect(isNewIn('15.0.0', current)).toBe(true);
    expect(isNewIn('14.5.0', current)).toBe(false);
    expect(markVersion('15.0.1', [])).toBe('15.0.1');
  });

  it('hides the older line once a page declares the next one', () => {
    const current = markVersion('15.0.1', ['15.0.0', '15.1.0']);

    expect(current).toBe('15.1.0');
    expect(isNewIn('15.1.0', current)).toBe(true);
    expect(isNewIn('15.0.0', current)).toBe(false);
    expect(markVersion('15.3.2', ['15.3.0', '16.0.0'])).toBe('16.0.0');
  });

  it('changes nothing once that release ships, and lets it expire after', () => {
    expect(markVersion('15.1.0', ['15.0.0', '15.1.0'])).toBe('15.1.0');
    expect(markVersion('15.1.2', ['15.0.0', '15.1.0'])).toBe('15.1.2');
    expect(markVersion('15.1.0-rc.0', ['15.1.0'])).toBe('15.1.0-rc.0');
    expect(isNewIn('15.1.0', markVersion('15.1.0-rc.0', ['15.1.0']))).toBe(true);
    expect(isNewIn('15.1.0', markVersion('15.2.0', ['15.1.0']))).toBe(false);
  });

  // Fails closed on the constant, the way `isNewIn` always has: an unreadable
  // `NGWR_VERSION` takes every mark off rather than guessing at a line.
  it('passes an unreadable shipped version through and skips an unreadable declaration', () => {
    expect(markVersion('next', ['15.1.0'])).toBe('next');
    expect(markVersion('15.0.1', ['v99', '15.1'])).toBe('15.0.1');
  });

  it('runs the live constant and the live map through the rule', () => {
    const current = markVersion();

    expect(current).toBe(markVersion(NGWR_VERSION, [...Object.values(SINCE), ...Object.values(UPDATED)]));
    expect(isNewIn(current, current)).toBe(true);
    // Never behind the constant: the declarations can only move the line on.
    expect(isNewIn(current, NGWR_VERSION)).toBe(true);
  });

  // One declaration far ahead by mistake would move the line past every other
  // mark on the site, so a page may declare the next major at the latest.
  it('holds every declared version to the next major at the latest', () => {
    const major = Number(NGWR_VERSION.split('.')[0]);
    const declared = [...Object.values(SINCE), ...Object.values(UPDATED)] as string[];

    expect(declared.filter(version => Number(version.split('.')[0]) > major + 1)).toEqual([]);
  });

  it('marks the release ahead on the live map and steps the one behind back', () => {
    const ahead = markVersion('15.0.1', ['15.0.0', '15.1.0']);

    // `docs/configuration` was updated in 15.0, the popover in 15.1.
    expect(linkMark('/docs/configuration', '15.0.1')).toBe('updated');
    expect(linkMark('/docs/configuration', ahead)).toBeNull();
    expect(linkMark('/reference/components/popover', ahead)).toBe('updated');
  });
});

/**
 * Every row of every shipped sidebar config, groups with a `url` of their own
 * included, deduplicated by route — `configs/index.ts` re-exports
 * `REFERENCE_SIDEBAR` under seven cluster aliases, so a row reached through it
 * would otherwise be counted eight times.
 */
function navRows(): readonly { readonly title: string; readonly url?: string }[] {
  const rows = new Map<string, { title: string; url?: string }>();
  for (const config of Object.values(SIDEBARS as Record<string, readonly SidebarGroup[]>)) {
    for (const group of config) {
      if (group.url) rows.set(routeKey(group.url), { title: group.title, url: group.url });
      for (const link of group.children ?? []) {
        rows.set(link.url ? routeKey(link.url) : `${group.title}/${link.title}`, { title: link.title, url: link.url });
      }
    }
  }
  return [...rows.values()];
}

/**
 * The three surfaces that DRAW the rule above, and the generator that feeds it.
 *
 * The block above is the rule in isolation, and every one of its cases passes
 * with the feature deleted: strip the `@if` out of `doc-page.html` or
 * `doc-index.html`, or the badge out of the sidebar's `entries.ts`, and nothing
 * renders, while `pnpm lint`, `pnpm test` and `pnpm check:api-docs` all stay
 * green. Same for the generator — delete `scanSince()` and the committed map
 * simply stops being re-derived, which is the one failure `check:api-docs` was
 * extended to catch.
 *
 * **The two page surfaces are read as TEXT, and that is a constraint rather
 * than a preference.** The suite builds through `lib:build:development`, the
 * library target, which carries no `projects` Sass include path, so importing
 * any showcase component pulls in a `styleUrl` that opens `@use
 * 'lib/styles/breakpoints'` and the build fails before a single spec runs
 * (measured — the error names `doc-page.scss` and `doc-playground.scss`). So
 * these assertions cannot see a broken binding; what they can see, and what the
 * findings were about, is a hunk that is no longer there at all.
 *
 * The nav half is real behaviour, though: the sidebar's marks are decided in
 * `sidebarEntries()`, plain data with no component around it, so the shipped
 * configs run through the very function that hands `<wr-sidebar>` its badges.
 */
describe('the surfaces that draw it', () => {
  const read = (path: string): string => readFileSync(join(process.cwd(), path), 'utf8');
  const squashed = (path: string): string => read(path).replace(/\s+/g, ' ');

  // The join the whole feature rests on: the generator writes a ROUTE and both
  // readers look up the route a nav row carries. Keyed by the page's directory
  // instead, `reference/components/qr` (route `/reference/components/qrcode`)
  // writes an entry nothing ever reads, with both halves reporting success.
  // If a page ever declares a version and belongs in NO nav, its own line still
  // prints and this assertion is the thing to widen — deliberately.
  it('keys the map by something a nav row can look up', () => {
    const linked = new Set(navRows().flatMap(row => (row.url ? [routeKey(row.url)] : [])));

    for (const map of [SINCE, UPDATED]) {
      const declared = Object.keys(map);
      expect(declared.length).toBeGreaterThan(0);
      expect(declared.filter(route => !linked.has(route))).toEqual([]);
    }
  });

  it('marks the rows the map declares for the current line, and no others', () => {
    const marked = navRows()
      .filter(row => isNewLink(row.url, '14.4.0'))
      .map(row => row.title);

    // Sidebar order: the bits first, then the charts group by group (comparison,
    // trend, part to whole, distribution, single value, building blocks),
    // alphabetical inside one.
    expect(marked).toEqual([
      'Dot Grid',
      'Threads',
      'Funnel Chart',
      'Radar Chart',
      'Waterfall Chart',
      'Candlestick Chart',
      'Treemap Chart',
      'Box Plot',
      'Heatmap Chart',
      'Scatter Chart',
      'Bullet Chart',
      'Chart Legend',
      'Graph',
      'Editor',
      'resolveCssColor',
      'toClassList',
    ]);
  });

  // Both shapes a sidebar row comes in: a child row inside a group, and a
  // top-level group that carries a `url` instead of `children` (the shape every
  // /icons row has). The second had no mark at all once, while the index pages
  // list exactly those groups as ordinary links and marked them — the one way
  // the two surfaces could disagree about what is new.
  it('gives the sidebar the same marks, in both row shapes', () => {
    const titles = new Map<string, string>();
    const visit = (entries: readonly WrSidebarEntry[]): void => {
      for (const entry of entries) {
        if ('children' in entry) visit(entry.children);
        else if (entry.badge?.text === 'New') titles.set(entry.url.join('/'), entry.title);
      }
    };
    for (const config of Object.values(SIDEBARS as Record<string, readonly SidebarGroup[]>)) {
      visit(sidebarEntries(config, '14.4.0'));
    }
    const expected = navRows()
      .filter(row => isNewLink(row.url, '14.4.0'))
      .map(row => row.title);

    expect([...titles.values()].sort()).toEqual([...expected].sort());
    expect(sidebarEntries([{ title: 'Graph', url: '/reference/components/graph' }], '14.4.0')).toEqual([
      { title: 'Graph', url: ['/reference/components/graph'], badge: { text: 'New', tone: 'primary' } },
    ]);
  });

  it('gives the sidebar every "updated" mark the rule gives a row', () => {
    const badges = new Map<string, string>();
    const visit = (entries: readonly WrSidebarEntry[]): void => {
      for (const entry of entries) {
        if ('children' in entry) visit(entry.children);
        else if (entry.badge && entry.url.length > 0) badges.set(routeKey(String(entry.url[0])), entry.badge.text);
      }
    };
    for (const config of Object.values(SIDEBARS as Record<string, readonly SidebarGroup[]>)) {
      visit(sidebarEntries(config, '15.0.0'));
    }
    const expected = navRows()
      .filter(row => linkMark(row.url, '15.0.0') === 'updated')
      .map(row => routeKey(row.url ?? ''))
      .sort();
    const drawn = [...badges]
      .filter(([, badge]) => badge === 'Updated')
      .map(([route]) => route)
      .sort();

    expect(drawn).toEqual(expected);
    expect(drawn.length).toBeGreaterThan(0);
  });

  // With no line pinned, every surface judges against `markVersion()`: the
  // newest declared line or the shipped one, whichever is later. So no row of
  // an older line is marked while a page declares a newer one — the state `next`
  // is in for as long as its release has not shipped.
  it('marks only the newest declared line when nothing pins one', () => {
    const declared = [...Object.values(SINCE), ...Object.values(UPDATED)] as string[];
    const newestDeclared = markVersion('0.0.0', declared);
    const marked = navRows().filter(row => linkMark(row.url) !== null);

    for (const row of marked) {
      const route = routeKey(row.url ?? '');
      const version = linkMark(row.url) === 'new' ? sinceOf(route) : updatedOf(route);
      expect(isNewIn(version ?? '', newestDeclared)).toBe(true);
      expect(linkMark(row.url)).toBe(linkMark(row.url, markVersion()));
    }

    const badges: string[] = [];
    const visit = (entries: readonly WrSidebarEntry[]): void => {
      for (const entry of entries) {
        if ('children' in entry) visit(entry.children);
        else if (entry.badge?.text === 'New' || entry.badge?.text === 'Updated') badges.push(String(entry.url[0]));
      }
    };
    for (const config of Object.values(SIDEBARS as Record<string, readonly SidebarGroup[]>))
      visit(sidebarEntries(config));

    expect([...new Set(badges)].sort()).toEqual(marked.map(row => row.url ?? '').sort());
  });

  it('draws the same marks on the cluster index pages', () => {
    const html = squashed('projects/showcase/app/_core/components/doc-index/doc-index.html');

    expect(html).toMatch(/@let linkMark = mark\(link\);/);
    expect(html).toMatch(/@if \(linkMark\) \{ <span class="index__sep">,&nbsp;<\/span> <small class="index__badge"/);
    for (const mark of ['new', 'updated']) {
      expect(html).toContain(`[class.index__badge--${mark}]="linkMark === '${mark}'"`);
    }
    expect(html).not.toContain('removed');
  });

  // The two marks share a box and must not share a tone. `new` is the one thing
  // on the page a reader scanning for this release should catch, so it is a
  // filled intent; `soon` is an aside about a page that is not there yet, and
  // giving it the same chip puts every planned row in front of the live ones.
  // The tone is a modifier precisely so the difference cannot be lost to a later
  // tidy-up of "two rules that look the same".
  it('leaves the `soon` chip quiet — only `new` wears the loud tone', () => {
    const [group] = sidebarEntries(
      [
        {
          title: 'Planned',
          children: [
            { title: 'Signature pad', disabled: true },
            { title: 'Graph', url: '/reference/components/graph' },
          ],
        },
      ],
      '14.4.0'
    );
    const [soon, fresh] = 'children' in group ? group.children : [];

    expect(soon).toEqual({ title: 'Signature pad', url: [], disabled: true, badge: { text: 'Soon', tone: 'neutral' } });
    expect(fresh).toMatchObject({ badge: { text: 'New', tone: 'primary' } });
  });

  it('prints the version on the page, beside the title rather than inside it', () => {
    const html = squashed('projects/showcase/app/_core/components/doc-page/doc-page.html');

    expect(html).toMatch(/@if \(addedIn\(\); as added\) \{ <wr-badge class="since"[^>]*>\{\{ added \}\}<\/wr-badge>/);
    expect(html).toMatch(
      /@if \(updatedIn\(\); as updated\) \{ <wr-badge class="since"[^>]*>\{\{ updated \}\}<\/wr-badge>/
    );
    expect(html).toMatch(/<h1 [^>]*class="title">\{\{ title\(\) \}\}<\/h1>/);
  });

  // One rule, not a copy per surface — the property `linkMark()` exists for.
  it('runs both nav surfaces off the shared rule', () => {
    for (const file of [
      'projects/showcase/app/_layout/sidebar/entries.ts',
      'projects/showcase/app/_core/components/doc-index/doc-index.ts',
    ]) {
      expect(read(file)).toMatch(/import \{[^}]*\blinkMark\b[^}]*\} from '#core\/utils';/);
    }
  });

  // Nothing gated the gate: `check:api-docs` re-derives the map, and with
  // `scanMarks()` / `staleMarks()` deleted the committed file would sit there
  // unread and every gate would stay green.
  it('re-derives the map from the pages on every check', () => {
    const generator = read('scripts/gen/api-docs.ts');

    expect(generator.match(/\bscanMarks\(pageRoutes\)/g)).toHaveLength(2);
    expect(generator).toMatch(/\bstaleMarks\(marks\.marks\)/);
    expect(generator).toMatch(/file: SINCE_FILE,\s*content: serializeMarks\(marks\.marks\)/);
    expect(generator).toMatch(/const MARKS = \['since', 'updated'\] as const;/);
  });
});
