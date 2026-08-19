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
});
