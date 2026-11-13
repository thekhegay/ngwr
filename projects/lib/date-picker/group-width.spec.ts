import { describe, expect, it } from 'vitest';

import { compileSass } from '../spec-sass';

/**
 * A form field stretches the picker's host, and the box the user sees is the
 * group inside it: left at its content width it stopped short of a `wrInput` in
 * the next field. Held against the COMPILED sheet, since jsdom lays nothing out.
 * `sass` is resolved through `@angular/build`, as `theme/sass-entry.spec.ts` does.
 */
describe('date picker group width', () => {
  const css = compileSass(`@use 'date-picker/styles';`);
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)${selector.replace(/[.>()[\]]/g, m => `\\${m}`)}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';

  const expectFilled = (host: string): void => {
    expect(rule(`${host} > .wr-input-group`)).toMatch(/width: 100%;/);
    // The host still shrink-wraps on its own, where 100% is the content width again.
    expect(rule(host)).toMatch(/display: inline-block;/);
  };

  it('fills the host of a single picker', () => expectFilled('.wr-date-picker'));

  it('fills the host of a range picker', () => expectFilled('.wr-date-range-picker'));

  it.each(['sm', 'lg'])('hands the group and the trigger the %s control tokens', size => {
    // Each host reads its size by class and, for a static `size="…"`, by attribute.
    const hosts = ['wr-date-picker', 'wr-date-range-picker'].flatMap(block => [
      `.${block}--${size}`,
      `.${block}:where([size=${size}])`,
    ]);
    const group = rule(hosts.map(host => `${host} > .wr-input-group`).join(',\n'));
    expect(group).toContain(`--wr-input-group-radius: var(--wr-control-radius-${size});`);
    expect(group).toContain(`--wr-input-group-padding-x: var(--wr-control-padding-x-${size});`);

    const trigger = rule(hosts.map(host => `${host} .wr-date-picker__trigger`).join(',\n'));
    expect(trigger).toContain(`--wr-date-picker-trigger-icon-size: var(--wr-control-font-size-${size});`);
  });
});
