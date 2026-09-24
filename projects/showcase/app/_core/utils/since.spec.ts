import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { NGWR_VERSION } from 'ngwr/version';
import { describe, expect, it } from 'vitest';

import * as SIDEBARS from '../../_layout/sidebar/configs';
import type { SidebarGroup } from '../../_layout/sidebar/sidebar.types';
import { SINCE } from '../generated/since';

import { isNewIn, isNewLink, releaseLabel, routeKey, sinceOf } from './since';

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
    expect(releaseLabel('14.4.2')).toBe('v14.4.2');
  });

  it('keys a nav link by its route', () => {
    expect(routeKey(['/reference/components', 'graph'])).toBe('reference/components/graph');
  });

  it('answers nothing for a page that declares nothing', () => {
    expect(sinceOf('reference/components/button')).toBeNull();
  });

  it('reads the declared version out of the generated map', () => {
    expect(sinceOf('reference/components/graph')).toBe('14.5.0');
  });

  it('marks the graph link and not its neighbours', () => {
    expect(isNewLink(['/reference/components', 'graph'], '14.4.0')).toBe(true);
    expect(isNewLink(['/reference/components', 'button'], '14.4.0')).toBe(false);
    expect(isNewLink(undefined, '14.4.0')).toBe(false);
  });
});

/**
 * Every row of every shipped sidebar config, groups with a `url` of their own
 * included, deduplicated by route — `configs/index.ts` re-exports
 * `REFERENCE_SIDEBAR` under seven cluster aliases, so a row reached through it
 * would otherwise be counted eight times.
 */
function navRows(): readonly { readonly title: string; readonly url?: readonly string[] }[] {
  const rows = new Map<string, { title: string; url?: readonly string[] }>();
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
 * with the feature deleted: strip the `@if` out of `doc-page.html`,
 * `sidebar.html` and `doc-index.html` and nothing renders, while `pnpm lint`,
 * `pnpm test` and `pnpm check:api-docs` all stay green. Same for the generator —
 * delete `scanSince()` and the committed map simply stops being re-derived,
 * which is the one failure `check:api-docs` was extended to catch.
 *
 * **These read the templates as TEXT, and that is a constraint rather than a
 * preference.** The suite builds through `lib:build:development`, which is
 * ng-packagr and carries no `projects` Sass include path, so importing any
 * showcase component pulls in a `styleUrl` that opens `@use
 * 'lib/styles/breakpoints'` and the build fails before a single spec runs
 * (measured — the error names `doc-page.scss` and `doc-playground.scss`). So
 * these assertions cannot see a broken binding; what they can see, and what the
 * findings were about, is a hunk that is no longer there at all.
 *
 * The nav half is real behaviour, though: it runs the shipped sidebar configs
 * through the same `isNewLink()` both components call, so the set of marked
 * rows is derived here exactly as it is on the site.
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
    const declared = Object.keys(SINCE);

    expect(declared.length).toBeGreaterThan(0);
    expect(declared.filter(route => !linked.has(route))).toEqual([]);
  });

  it('marks the rows the map declares for the current line, and no others', () => {
    const marked = navRows()
      .filter(row => isNewLink(row.url, '14.4.0'))
      .map(row => row.title);

    expect(marked).toEqual(['Graph', 'Editor', 'toClassList']);
  });

  // Both branches of the sidebar template: a child row inside a group, and a
  // top-level group that carries a `url` instead of `children` (Squircle's
  // shape). The second had no mark at all, while the cluster index pages list
  // exactly those groups as ordinary links and marked them — the one way the two
  // surfaces could disagree about what is new.
  it('draws the mark in both sidebar branches, comma and all', () => {
    const hunk =
      /@if \(isNew\([a-z]+\)\) \{ <span class="ngwr-sidebar__sep">,&nbsp;<\/span> <small class="ngwr-sidebar__badge ngwr-sidebar__badge--new">new<\/small> \}/g;

    expect(squashed('projects/showcase/app/_layout/sidebar/sidebar.html').match(hunk)).toHaveLength(2);
  });

  it('draws the same mark on the cluster index pages', () => {
    const hunk =
      /@if \(isNew\(link\)\) \{ <span class="index__sep">,&nbsp;<\/span> <small class="index__badge index__badge--new">new<\/small> \}/;

    expect(squashed('projects/showcase/app/_core/components/doc-index/doc-index.html')).toMatch(hunk);
  });

  // The two marks share a box and must not share a tone. `new` is the one thing
  // on the page a reader scanning for this release should catch, so it is a
  // filled intent; `soon` is an aside about a page that is not there yet, and
  // giving it the same chip puts every planned row in front of the live ones.
  // The tone is a modifier precisely so the difference cannot be lost to a later
  // tidy-up of "two rules that look the same".
  it('leaves the `soon` chip quiet — only `new` wears the loud tone', () => {
    const html = squashed('projects/showcase/app/_layout/sidebar/sidebar.html');

    expect(html).toMatch(/<small class="ngwr-sidebar__badge">soon<\/small>/);
    expect(html).not.toMatch(/ngwr-sidebar__badge--new">soon/);
  });

  it('prints the version on the page, beside the title rather than inside it', () => {
    const html = squashed('projects/showcase/app/_core/components/doc-page/doc-page.html');

    expect(html).toMatch(/@if \(addedIn\(\); as added\) \{ <wr-badge class="since"[^>]*>\{\{ added \}\}<\/wr-badge>/);
    expect(html).toMatch(/<h1 [^>]*class="title">\{\{ title\(\) \}\}<\/h1>/);
  });

  // One rule, not a copy per surface — the property `isNewLink()` exists for.
  it('runs both nav surfaces off the shared rule', () => {
    for (const file of [
      'projects/showcase/app/_layout/sidebar/sidebar.ts',
      'projects/showcase/app/_core/components/doc-index/doc-index.ts',
    ]) {
      expect(read(file)).toMatch(/import \{ isNewLink \} from '#core\/utils';/);
    }
  });

  // Nothing gated the gate: `check:api-docs` re-derives the map, and with
  // `scanSince()` / `staleSince()` deleted the committed file would sit there
  // unread and every gate would stay green.
  it('re-derives the map from the pages on every check', () => {
    const generator = read('scripts/gen-api-docs.ts');

    expect(generator.match(/\bscanSince\(pageRoutes\)/g)).toHaveLength(2);
    expect(generator).toMatch(/\bstaleSince\(since\.versions\)/);
    expect(generator).toMatch(/writeFileSync\(SINCE_FILE, serializeSince\(since\.versions\)\)/);
  });
});
