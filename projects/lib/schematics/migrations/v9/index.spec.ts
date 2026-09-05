/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { HostTree, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import ngUpdateV9 from './index';

/**
 * `ng update ngwr@9` renames `<wr-checkbox>`'s group identity from `value` to
 * `checkboxValue`, and a MISS here is the worst kind: a static `value="x"` that
 * matches no input is an ordinary DOM attribute, so nothing errors, nothing
 * warns, and every checkbox in the group keeps the default identity `null` —
 * they all toggle together. The migration exists to prevent exactly that, which
 * is why the cases below are about what it must not skip.
 */

/** Runs the rule and returns the tree it wrote into. */
function run(files: Readonly<Record<string, string>>): Tree {
  const tree = new HostTree();
  for (const [path, content] of Object.entries(files)) tree.create(path, content);

  const context = { logger: { info: () => undefined, warn: () => undefined } } as unknown as SchematicContext;
  const rule = ngUpdateV9() as (target: Tree, ctx: SchematicContext) => Tree;
  rule(tree, context);

  return tree;
}

const read = (tree: Tree, path: string): string => tree.read(path)!.toString();

describe('ng update ngwr@9', () => {
  it('renames the static, bracketed and banana forms', () => {
    const tree = run({
      '/src/app/a.html': [
        '<wr-checkbox value="one">One</wr-checkbox>',
        '<wr-checkbox [value]="two">Two</wr-checkbox>',
        '<wr-checkbox [(value)]="three">Three</wr-checkbox>',
      ].join('\n'),
    });

    expect(read(tree, '/src/app/a.html')).toBe(
      [
        '<wr-checkbox checkboxValue="one">One</wr-checkbox>',
        '<wr-checkbox [checkboxValue]="two">Two</wr-checkbox>',
        '<wr-checkbox [(checkboxValue)]="three">Three</wr-checkbox>',
      ].join('\n')
    );
  });

  /**
   * The hole this migration shipped with for two majors. `[^>]*?` cannot cross a
   * `>`, so a comparison inside an earlier binding expression looked like the end
   * of the tag and the rename stopped there — while the SAME attributes in the
   * other order moved, which is what made it so hard to notice. `migration-v14`
   * fixed the identical anchoring; this is that fix, ported back.
   */
  it('steps over a `>` inside a binding expression instead of stopping at it', () => {
    const tree = run({
      '/src/app/b.html': [
        '<wr-checkbox [disabled]="count > 0" value="late">Late</wr-checkbox>',
        '<wr-checkbox value="early" [disabled]="count > 0">Early</wr-checkbox>',
        `<wr-checkbox [label]="a > b ? 'x' : 'y'" [value]="bound">Quoted</wr-checkbox>`,
      ].join('\n'),
    });

    const out = read(tree, '/src/app/b.html');
    expect(out).toContain('checkboxValue="late"');
    expect(out).toContain('checkboxValue="early"');
    expect(out).toContain('[checkboxValue]="bound"');
    expect(out).not.toMatch(/\svalue=/);
  });

  it('leaves `<wr-checkbox-group>` alone — its `value` IS the form model', () => {
    const source = '<wr-checkbox-group [value]="picked"><wr-checkbox value="a" /></wr-checkbox-group>';
    const tree = run({ '/src/app/c.html': source });

    const out = read(tree, '/src/app/c.html');
    expect(out).toContain('<wr-checkbox-group [value]="picked">');
    expect(out).toContain('<wr-checkbox checkboxValue="a" />');
  });

  it('does not touch `value` on anything else', () => {
    const source = '<input [value]="x" /><wr-select [value]="y" />';
    const tree = run({ '/src/app/d.html': source });

    expect(read(tree, '/src/app/d.html')).toBe(source);
  });
});
