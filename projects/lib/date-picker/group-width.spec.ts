import { createRequire } from 'node:module';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * A form field stretches the picker's host, and the box the user sees is the
 * group inside it: left at its content width it stopped short of a `wrInput` in
 * the next field. Held against the COMPILED sheet, since jsdom lays nothing out.
 * `sass` is resolved through `@angular/build`, as `theme/sass-entry.spec.ts` does.
 */
describe('date picker group width', () => {
  const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as {
    compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
  };
  const css = sass.compileString(`@use 'date-picker/styles';`, {
    loadPaths: [join(process.cwd(), 'projects/lib')],
    style: 'expanded',
  }).css;
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)${selector.replace(/[.>]/g, m => `\\${m}`)}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';

  const expectFilled = (host: string): void => {
    expect(rule(`${host} > .wr-input-group`)).toMatch(/width: 100%;/);
    // The host still shrink-wraps on its own, where 100% is the content width again.
    expect(rule(host)).toMatch(/display: inline-block;/);
  };

  it('fills the host of a single picker', () => expectFilled('.wr-date-picker'));

  it('fills the host of a range picker', () => expectFilled('.wr-date-range-picker'));
});
