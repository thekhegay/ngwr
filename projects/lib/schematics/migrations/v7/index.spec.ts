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
});
