import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

/**
 * The chart theme's table on `/charts/bar-chart` is written by hand, since
 * `ngwr/charts/core` has no page for `gen:css-vars` to hang a generated one on. This is
 * what keeps it honest: a token added, renamed or retuned in the sheet fails here until
 * the page says the same.
 */
describe('the chart theme on its docs page', { timeout: COMPILE_TIMEOUT }, () => {
  it('lists every token with the default the sheet declares', () => {
    const css = compileSass("@use 'charts/core/styles';").replace(/\/\*[\s\S]*?\*\//g, '');
    // Every `:root` block outside an at-rule: the theme's own, then the chart theme's.
    const declared = new Map<string, string>();
    for (const block of css.matchAll(/(?:^|\n):root\s*\{([^}]*)\}/g)) {
      for (const [, name, value] of block[1].matchAll(/(--wr-chart-[a-z0-9-]+):\s*([^;]+);/g)) {
        if (!declared.has(name)) declared.set(name, value.trim().replace(/\s+/g, ' '));
      }
    }

    const page = readFileSync(
      join(process.cwd(), 'projects/showcase/app/charts/comparison/bar-chart/bar-chart.html'),
      'utf8'
    );
    const section = /<ngwr-doc-section\s+title="Chart theme"[\s\S]*?<\/ngwr-doc-section>/.exec(page)?.[0] ?? '';
    const listed = new Map(
      [...section.matchAll(/<th scope="row"><code>(--wr-chart-[a-z0-9-]+)<\/code><\/th>[\s\S]*?<\/tr>/g)].map(
        row => [row[1], row[0]] as const
      )
    );

    expect(declared.size).toBeGreaterThan(30);
    expect([...listed.keys()].sort()).toEqual([...declared.keys()].sort());
    for (const [name, value] of declared) expect(listed.get(name), name).toContain(`<code>${value}</code>`);
  });
});
