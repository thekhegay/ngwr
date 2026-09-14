/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { HostTree, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import ngUpdateV8 from './index';

/**
 * `ng update ngwr@8` over an inline template.
 *
 * Unlike v7 this migration makes no compensating edit to the TypeScript, so
 * skipping the inline template was a failure to fix rather than an active break
 * — but the file is left uncompilable either way: `WrDensityDirective.wrDensity`
 * is `input.required<WrDensityValue>()` over `'sm' | 'md' | 'lg' | 'touch'`, and
 * a surviving `wrDensity="compact"` fails strictTemplates.
 */

interface Run {
  readonly tree: Tree;
  readonly logs: readonly string[];
}

function run(files: Readonly<Record<string, string>>): Run {
  const tree = new HostTree();
  for (const [path, content] of Object.entries(files)) tree.create(path, content);

  const logs: string[] = [];
  const context = {
    logger: { info: (message: string) => logs.push(message), warn: (message: string) => logs.push(message) },
  } as unknown as SchematicContext;
  const rule = ngUpdateV8() as (target: Tree, ctx: SchematicContext) => Tree;
  rule(tree, context);

  return { tree, logs };
}

describe('ng update ngwr@8', () => {
  it('renames density values inside an inline template', () => {
    const { tree } = run({
      '/src/app/panel.ts': `@Component({
  template: \`
    <div wrDensity="compact">
      <wr-pagination size="xs" [total]="total" />
    </div>
  \`,
})
export class Panel {}
`,
    });

    const source = tree.readText('/src/app/panel.ts');
    expect(source).toContain('wrDensity="sm"');
    expect(source).toContain('<wr-pagination size="sm"');
    expect(source).not.toContain('compact');
  });

  it('renames the provider option and the inline template in one pass', () => {
    const { tree } = run({
      '/src/main.ts': `bootstrapApplication(App, {
  providers: [provideWrDensity({ defaultDensity: 'comfortable' })],
});
`,
      // A backtick template, which is what an inline template with quoted
      // attribute values has to be: inside a single-quoted TS string the `'sm'`
      // would be backslash-escaped and no attribute pattern could see it.
      '/src/app/row.ts': `@Component({ template: \`<span [wrDensity]="'comfortable'"></span>\` })
export class Row {}
`,
    });

    expect(tree.readText('/src/main.ts')).toContain("defaultDensity: 'lg'");
    expect(tree.readText('/src/app/row.ts')).toContain('[wrDensity]="\'lg\'"');
  });

  it('still flags a removed API it cannot rewrite', () => {
    // The warning is read off the ORIGINAL text, so widening which files get the
    // attribute rewrites must not disturb it.
    const { logs } = run({ '/src/app/hero.html': '<div wrReveal [once]="true">hi</div>\n' });

    expect(logs.join('\n')).toContain('WrReveal directive removed');
  });

  it('reaches the pagination size after a `>` inside a binding, in either order', () => {
    // The plain `[^>]*?` this rule used to be read the comparison as the end of
    // the tag. `size="xs"` is not in `WrPaginationSize` after v8, so the leftover
    // fails strictTemplates — but only after the migration said it was done.
    const { tree } = run({
      '/src/app/a.html': [
        '<wr-pagination [disabled]="n > 0" size="xs" />',
        '<wr-pagination size="xl" [disabled]="n > 0" />',
      ].join('\n'),
    });

    expect(tree.readText('/src/app/a.html')).toBe(
      ['<wr-pagination [disabled]="n > 0" size="sm" />', '<wr-pagination size="lg" [disabled]="n > 0" />'].join('\n')
    );
  });

  it('keeps the size rule inside the pagination it started in', () => {
    // An apostrophe inside a double-quoted value opens nothing. A pattern that
    // consumed a lone quote could start a span there and reach `size="xs"` on the
    // NEXT element, which is not a pager and whose scale is its own business.
    const source = `<wr-pagination aria-label="Today's page" [total]="n" />\n<app-chip [label]="'x'" size="xs" />`;
    const { tree } = run({ '/src/app/b.html': source });

    expect(tree.readText('/src/app/b.html')).toBe(source);
  });

  /**
   * The span this rule shares with `migration-v9` and `migration-v14`, where its
   * ambiguous form — a `[^>]` fallback that also consumes a quote — froze
   * `ng update` on ordinary templates: a pairing that starts at a CLOSING quote
   * jumps over `/>` into later elements, so on a pager with no `xs` / `xl` the
   * search spread over the rest of the file with exponentially many parses. This
   * migration never shipped that form (the rule was a plain `[^>]*?` until the
   * span arrived), so the spec guards the span rather than a release.
   *
   * Four lines, on purpose. A catastrophic regex is SYNCHRONOUS, so vitest's
   * per-test timeout cannot interrupt it, and a regression has to FAIL the budget
   * in bounded time rather than freeze the suite: measured with the ambiguous
   * fallback, four lines took 0.9 s and five did not finish in 15 s.
   */
  it('answers at once on a pager with no size to move, followed by ordinary markup', () => {
    const source = [
      '<div class="wrap">',
      '  <wr-pagination [total]="total()" [pageSize]="50" (pageChange)="go($event)" />',
      ...Array.from(
        { length: 4 },
        (_, i) =>
          `  <button wr-btn size="sm" type="button" [title]="'row.${i}' | wrT" (click)="pick(${i})"><wr-icon name="x" /></button>`
      ),
      '</div>',
      '',
    ].join('\n');
    const started = performance.now();
    const { tree } = run({ '/src/app/c.html': source });
    const elapsed = performance.now() - started;

    expect(tree.readText('/src/app/c.html')).toBe(source);
    expect(elapsed).toBeLessThan(100);
  });
});
