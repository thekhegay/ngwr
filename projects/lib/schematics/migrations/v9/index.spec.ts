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

  /**
   * The hole the first fix opened. Its fallback was `[^>]`, which matches a quote
   * too, so the engine could open a single-quoted span at the apostrophe inside
   * `label="Today's"` and run past `/>` into the next element — and on any other
   * control `value` IS the form model, so the rename broke a binding that was right.
   */
  it('keeps the rename inside the checkbox it started in', () => {
    const source = `<wr-checkbox label="Today's" [checked]="on" />\n<wr-select [placeholder]="'Pick'" [value]="picked" />`;
    const tree = run({ '/src/app/e.html': source });

    expect(read(tree, '/src/app/e.html')).toBe(source);
  });

  it('answers at once on a checkbox with many quoted attributes and nothing to rename', () => {
    // The same overlap made a miss exponential: every quoted value could be read
    // as a pair or as loose characters, and a tag with nothing to rename was tried
    // every way before the rule gave up. Pairs-only has one reading per value.
    // Eighteen attributes, not more, because a catastrophic regex is synchronous
    // and no test timeout can stop it: on that form this tag took 1.1 s, and every
    // two more attributes multiply it by about seven. A regression has to fail
    // this budget, not freeze the suite.
    const tag = `<wr-checkbox ${Array.from({ length: 18 }, (_, i) => `data-a${i}="v"`).join(' ')} />`;
    const started = performance.now();
    const tree = run({ '/src/app/f.html': tag });
    const elapsed = performance.now() - started;

    expect(read(tree, '/src/app/f.html')).toBe(tag);
    expect(elapsed).toBeLessThan(100);
  });

  /**
   * The other shape the ambiguous form could not survive, and the ordinary one:
   * a checkbox with no `value`, followed by more markup. A pairing that starts at
   * a CLOSING quote jumps over `/>` into later elements, so the search spreads
   * over the rest of the file with exponentially many parses in the number of
   * quotes after the checkbox. That form shipped here from v14.2.0 and in
   * `migration-v14` from v14.0.0.
   *
   * Four lines, on purpose. A catastrophic regex is SYNCHRONOUS, so vitest's
   * per-test timeout cannot interrupt it, and a regression has to FAIL the budget
   * in bounded time rather than freeze the suite. Each button line multiplies the
   * old form's time by about twenty-five: measured on it, three lines took 0.11 s,
   * four took 2.6 s and five did not finish in 15 s.
   */
  it('answers at once on a checkbox with no value, followed by ordinary markup', () => {
    const source = [
      '<div class="wrap">',
      `  <wr-checkbox [checked]="on()" (checkedChange)="set($event)" [label]="'x.y' | wrT" />`,
      ...Array.from(
        { length: 4 },
        (_, i) =>
          `  <button wr-btn size="sm" type="button" [title]="'row.${i}' | wrT" (click)="pick(${i})"><wr-icon name="x" /></button>`
      ),
      '</div>',
      '',
    ].join('\n');
    const started = performance.now();
    const tree = run({ '/src/app/g.html': source });
    const elapsed = performance.now() - started;

    expect(read(tree, '/src/app/g.html')).toBe(source);
    expect(elapsed).toBeLessThan(100);
  });
});
