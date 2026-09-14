/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { HostTree, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import ngUpdateV7 from './index';

/**
 * `ng update ngwr@7` over the two ways a component carries a template.
 *
 * The case worth pinning is the inline one. This migration rewrites the import
 * and the symbol in the component's own `.ts`, so running the tag rewrites only
 * over `.html` did not leave that component unmigrated — it left it broken:
 * `imports: [WrSelect]` beside a template that still says `<wr-autocomplete>`,
 * which matches no directive and fails the build with NG8001, reported as
 * "rewrote 0 .html, 1 .ts".
 */

/** Runs the rule and returns the tree it wrote into. */
function run(files: Readonly<Record<string, string>>): Tree {
  const tree = new HostTree();
  for (const [path, content] of Object.entries(files)) tree.create(path, content);

  const context = { logger: { info: () => undefined, warn: () => undefined } } as unknown as SchematicContext;
  const rule = ngUpdateV7() as (target: Tree, ctx: SchematicContext) => Tree;
  rule(tree, context);

  return tree;
}

describe('ng update ngwr@7', () => {
  it('rewrites an inline template alongside the imports in the same file', () => {
    const tree = run({
      '/src/app/search.ts': `import { Component } from '@angular/core';
import { WrAutocomplete } from 'ngwr/autocomplete';

@Component({
  selector: 'app-search',
  imports: [WrAutocomplete],
  template: '<wr-autocomplete [options]="options" />',
})
export class Search {}
`,
    });

    const source = tree.readText('/src/app/search.ts');
    expect(source).toContain("import { WrSelect } from 'ngwr/select';");
    expect(source).toContain('imports: [WrSelect]');
    // The half that used to be skipped.
    expect(source).toContain('<wr-select mode="search" [options]="options" />');
    expect(source).not.toContain('wr-autocomplete');
  });

  it('still migrates a component split across .ts and .html', () => {
    const tree = run({
      '/src/app/search.ts': `import { WrTimePicker } from 'ngwr/time-picker';

@Component({ imports: [WrTimePicker], templateUrl: './search.html' })
export class Search {}
`,
      '/src/app/search.html': '<wr-time-picker [value]="at" />\n',
    });

    expect(tree.readText('/src/app/search.ts')).toContain("import { WrDatePicker } from 'ngwr/date-picker';");
    expect(tree.readText('/src/app/search.html')).toBe('<wr-date-picker mode="time" [value]="at" />\n');
  });

  it('leaves TypeScript that holds no markup alone', () => {
    // Every tag pattern is anchored on `<wr-…`, so a service naming the same
    // words in prose or in an identifier must come out byte-identical.
    const service = `/** Chooses between the autocomplete and the tooltip. */
export class WrAutocompleteHelper {
  readonly wrTooltipEnabled = true;
}
`;
    const tree = run({ '/src/app/helper.service.ts': service });

    expect(tree.readText('/src/app/helper.service.ts')).toBe(service);
  });

  /**
   * A `>` inside a binding is not the end of the tag. The plain `[^>]*?` these
   * rules used to be stopped there, so an attribute AFTER such a binding was left
   * behind while the same attributes in the other order moved — and a bare
   * `multi` left behind is silent: an unknown attribute on a select that quietly
   * stays single.
   */
  it('reaches a `[multi]` alias sitting after a `>` inside a binding, in either order', () => {
    const tree = run({
      '/src/app/a.html': [
        `<wr-select [placeholder]="n > 0 ? 'a' : 'b'" multi></wr-select>`,
        `<wr-select multi [placeholder]="n > 0 ? 'a' : 'b'"></wr-select>`,
        '<wr-select [disabled]="n > 0" [multi]="true" />',
        '<wr-select [multi]="true" [disabled]="n > 0" />',
        '<wr-select [disabled]="n > 0" [multi]="false" />',
      ].join('\n'),
    });

    expect(tree.readText('/src/app/a.html')).toBe(
      [
        `<wr-select [placeholder]="n > 0 ? 'a' : 'b'" mode="multi"></wr-select>`,
        `<wr-select mode="multi" [placeholder]="n > 0 ? 'a' : 'b'"></wr-select>`,
        '<wr-select [disabled]="n > 0" mode="multi" />',
        '<wr-select mode="multi" [disabled]="n > 0" />',
        '<wr-select [disabled]="n > 0" />',
      ].join('\n')
    );
  });

  it('rewrites an empty wr-animated-text whose binding holds a `>`, in either order', () => {
    const tree = run({
      '/src/app/b.html': [
        `<wr-animated-text [text]="n > 1 ? 'many' : 'one'" mode="split" />`,
        `<wr-animated-text mode="scramble" [text]="n > 1 ? 'many' : 'one'"></wr-animated-text>`,
      ].join('\n'),
    });

    expect(tree.readText('/src/app/b.html')).toBe(
      [`<wr-split-text [text]="n > 1 ? 'many' : 'one'" />`, `<wr-decrypt-text [text]="n > 1 ? 'many' : 'one'" />`].join(
        '\n'
      )
    );
  });

  /**
   * The other half of stepping over quoted values: a LONE quote is never
   * consumed. A pattern that let one through could open a single-quoted span at
   * the apostrophe inside `title="Today's picks"` and run past the tag into the
   * next element — renaming `multi` on someone else's component, or swallowing
   * projected content into an animated-text rewrite.
   */
  it('keeps every rule inside the element it started in', () => {
    const source = [
      `<wr-select title="Today's picks"></wr-select>`,
      `<app-chips [label]="'x'" multi />`,
      `<wr-animated-text title="it's">Hi</wr-animated-text>`,
      `<app-note [label]="'y'" />`,
    ].join('\n');
    const tree = run({ '/src/app/c.html': source });

    expect(tree.readText('/src/app/c.html')).toBe(source);
  });

  /**
   * The span these rules share with `migration-v9` and `migration-v14`, where
   * its ambiguous form — a `[^>]` fallback that also consumes a quote — froze
   * `ng update` on ordinary templates: a pairing that starts at a CLOSING quote
   * jumps over `/>` into later elements, so on a select with no `multi` the search
   * spread over the rest of the file with exponentially many parses. This
   * migration never shipped that form (its rules were a plain `[^>]*?` until the
   * span arrived), so the spec guards the span rather than a release.
   *
   * Four lines, on purpose. A catastrophic regex is SYNCHRONOUS, so vitest's
   * per-test timeout cannot interrupt it, and a regression has to FAIL the budget
   * in bounded time rather than freeze the suite: measured with the ambiguous
   * fallback, four lines took 0.8 s and five did not finish in 15 s.
   */
  it('answers at once on a select with no multi, followed by ordinary markup', () => {
    const source = [
      '<div class="wrap">',
      `  <wr-select [placeholder]="'pick' | wrT" [items]="items()" />`,
      ...Array.from(
        { length: 4 },
        (_, i) =>
          `  <button wr-btn size="sm" type="button" [title]="'row.${i}' | wrT" (click)="pick(${i})"><wr-icon name="x" /></button>`
      ),
      '</div>',
      '',
    ].join('\n');
    const started = performance.now();
    const tree = run({ '/src/app/d.html': source });
    const elapsed = performance.now() - started;

    expect(tree.readText('/src/app/d.html')).toBe(source);
    expect(elapsed).toBeLessThan(100);
  });
});
