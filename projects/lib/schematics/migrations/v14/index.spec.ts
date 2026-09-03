/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { HostTree, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import ngUpdateV14 from './index';

/**
 * `ng update ngwr@14`, which REPORTS rather than rewrites.
 *
 * That makes a spec more important here, not less: a migration whose entire
 * output is warnings fails by staying quiet, and quiet is indistinguishable from
 * "nothing to do". Six detectors carry negative lookaheads and none of them was
 * exercised before this file — one of the six was reporting the idiomatic
 * `provideWrDateAdapter({ locale })` as having no locale, which is the shape the
 * audit stand itself writes.
 *
 * Each case below therefore comes in a pair: the input that must warn, and the
 * neighbouring input that must NOT.
 */

interface Run {
  readonly logs: readonly string[];
}

function run(files: Readonly<Record<string, string>>): Run {
  const tree = new HostTree();
  for (const [path, content] of Object.entries(files)) tree.create(path, content);

  const logs: string[] = [];
  const context = {
    logger: { info: (message: string) => logs.push(message), warn: (message: string) => logs.push(message) },
  } as unknown as SchematicContext;
  const rule = ngUpdateV14() as (target: Tree, ctx: SchematicContext) => Tree;
  rule(tree, context);

  return { logs };
}

const said = (logs: readonly string[], fragment: string): boolean => logs.some(line => line.includes(fragment));

describe('ng update ngwr@14', () => {
  it('says nothing to do on a project that uses none of it', () => {
    const { logs } = run({ '/src/app/app.html': '<wr-button>Save</wr-button>' });

    expect(said(logs, 'nothing to do')).toBe(true);
  });

  it('names the loading bar, which breaks silently', () => {
    const { logs } = run({ '/src/app/shell.html': '<wr-loading-bar />\n<router-outlet />' });

    expect(said(logs, 'provideWrLoadingBarRouter')).toBe(true);
    expect(said(logs, '/src/app/shell.html')).toBe(true);
  });

  it('names a router tab, and leaves a plain tab alone', () => {
    expect(said(run({ '/a.html': '<wr-tab title="One" routerLink="one" />' }).logs, 'wrTabsRouting')).toBe(true);
    expect(said(run({ '/b.html': '<wr-tab title="One" key="one" />' }).logs, 'wrTabsRouting')).toBe(false);
  });

  it('accepts every spelling of a date locale, including the shorthand', () => {
    // The regression that motivated this file. All four of these HAVE a locale.
    const withLocale = [
      "provideWrDateAdapter({ locale: 'ru-RU' })",
      'provideWrDateAdapter({ locale })',
      "provideWrDateAdapter({ adapter: makeAdapter(), locale: 'ru-RU' })",
      "provideWrDateAdapter({\n  locale: 'ru-RU',\n})",
    ];
    for (const source of withLocale) {
      expect(said(run({ '/c.ts': source }).logs, 'provideWrDateAdapter'), source).toBe(false);
    }

    // And these do not.
    for (const source of ['provideWrDateAdapter()', 'provideWrDateAdapter({ adapter: makeAdapter() })']) {
      expect(said(run({ '/d.ts': source }).logs, 'provideWrDateAdapter'), source).toBe(true);
    }
  });

  it('names a catalog that still translates the removed pagination key', () => {
    const stale = "export const de = { pagination: { of: 'von', next: 'Weiter' } };";
    expect(said(run({ '/i18n/de.ts': stale }).logs, 'pagination.of')).toBe(true);

    // `common.of` is still shipped and still unread — a catalog translating it is
    // not stale, and dragging every catalog into the warning would train people
    // to ignore it.
    const fine = "export const de = { common: { of: 'von' }, pagination: { range: '{{from}}–{{to}}' } };";
    expect(said(run({ '/i18n/de2.ts': fine }).logs, 'pagination.of')).toBe(false);
  });

  it('names an ofLabel binding, which is the half markup can see', () => {
    expect(said(run({ '/e.html': '<wr-pagination [ofLabel]="x" />' }).logs, 'ofLabel')).toBe(true);
    expect(said(run({ '/f.html': '<wr-pagination [total]="x" />' }).logs, 'ofLabel')).toBe(false);
  });
});
