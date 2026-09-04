/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { HostTree, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import ngUpdateV13 from './index';

/**
 * `ng update ngwr@13`, which reports and rewrites nothing.
 *
 * A report-only migration fails by staying quiet, and quiet is what "nothing to
 * do" looks like too — so every case here comes in a pair: the input that must
 * warn, and the neighbour that must NOT. The neighbour matters more than usual
 * on this one, because `<wr-checkbox-group>` and `<wr-radio-group>` DID keep
 * their host id, and warning about them would be a false alarm on code that
 * still works.
 */

interface Run {
  readonly logs: readonly string[];
  /** The tree after the rule, read back by path. */
  readonly read: (path: string) => string;
}

function run(files: Readonly<Record<string, string>>): Run {
  const tree = new HostTree();
  for (const [path, content] of Object.entries(files)) tree.create(path, content);

  const logs: string[] = [];
  const context = {
    logger: { info: (message: string) => logs.push(message), warn: (message: string) => logs.push(message) },
  } as unknown as SchematicContext;
  const rule = ngUpdateV13() as (target: Tree, ctx: SchematicContext) => Tree;
  const next = rule(tree, context);

  return { logs, read: (path: string) => next.readText(path) };
}

const said = (logs: readonly string[], fragment: string): boolean => logs.some(line => line.includes(fragment));

/**
 * The WARNING, not any line mentioning the subject. The clean-run info line
 * says "no host-id selector on a checkbox, radio or switch", so an assertion
 * keyed on "host-id selector" answers true for a run that found nothing — which
 * is how the first version of the two negative cases below failed while the
 * rule was behaving correctly.
 */
const warned = (logs: readonly string[]): boolean => said(logs, 'no longer lands on the host');

describe('migration-v13', () => {
  it('names a stylesheet whose host-id selector stopped matching', () => {
    const { logs } = run({ '/src/app.scss': '::ng-deep wr-checkbox#agree { margin: 0; }' });

    expect(warned(logs)).toBe(true);
    expect(said(logs, '/src/app.scss — wr-checkbox#agree')).toBe(true);
  });

  it('covers all three controls, in every language the selector is written in', () => {
    const files = {
      '/a.css': 'wr-radio#first { color: red; }',
      '/b.ts': "document.querySelector('wr-switch#dark-mode')",
      '/c.html': '<style>wr-checkbox#agree { display: block; }</style>',
    };

    for (const [path, source] of Object.entries(files)) {
      expect(said(run({ [path]: source }).logs, path), source).toBe(true);
    }
  });

  it('leaves the groups alone — they still carry their host id', () => {
    // `wr-checkbox` is a prefix of `wr-checkbox-group`, the trap every migration
    // in this folder documents. Here the `#` does the anchoring: the character
    // after the tag is a hyphen, so the pattern cannot reach across it.
    const groups = {
      '/g1.scss': 'wr-checkbox-group#filters { gap: 8px; }',
      '/g2.scss': 'wr-radio-group#shipping { gap: 8px; }',
    };

    const { logs } = run(groups);
    expect(warned(logs)).toBe(false);
    expect(said(logs, 'nothing to do')).toBe(true);
  });

  it('says nothing about a label, which the change FIXED', () => {
    // `for` used to resolve to the unlabelable host; it finds the real input
    // now. Reporting an improvement trains people to skip the warnings that
    // matter.
    const { logs } = run({ '/l.html': '<label for="agree">I agree</label><wr-checkbox id="agree" />' });
    expect(warned(logs)).toBe(false);
  });

  it('rewrites nothing — the fix depends on which box the author meant', () => {
    const source = '::ng-deep wr-checkbox#agree { margin: 0; }';
    expect(run({ '/src/app.scss': source }).read('/src/app.scss')).toBe(source);
  });

  it('reports each file once, however many selectors it holds', () => {
    const { logs } = run({
      '/many.scss': 'wr-checkbox#a { } wr-checkbox#a { } wr-radio#b { }',
    });

    expect(said(logs, 'found in 1 file(s)')).toBe(true);
    expect(said(logs, '/many.scss — wr-checkbox#a, wr-radio#b')).toBe(true);
  });
});
