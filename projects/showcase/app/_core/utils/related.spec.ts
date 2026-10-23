import { describe, expect, it } from 'vitest';

import { pageOfRoute } from './deps';
import { RELATED } from './related';

/**
 * `relatedOf()` drops a candidate the site serves no page for, silently, so a
 * curated See also link to a route outside `DOC_ROUTES` renders as nothing and
 * no build says so. One shipped that way: the Feather adapter tombstone named
 * `icons/feather`, which is the shared svg-only gallery and has no page entry.
 */
describe('the curated See also map', () => {
  it('keys every entry by a page the site serves', () => {
    expect(Object.keys(RELATED).filter(route => pageOfRoute(route) === null)).toEqual([]);
  });

  it('points every link at a page the site serves', () => {
    const dead = Object.entries(RELATED).flatMap(([route, links]) =>
      links.filter(link => pageOfRoute(link) === null).map(link => `${route} -> ${link}`)
    );

    expect(dead).toEqual([]);
  });
});
