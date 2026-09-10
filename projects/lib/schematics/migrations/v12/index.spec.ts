/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { HostTree, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import ngUpdateV12 from './index';

/**
 * `ng update ngwr@12` — the three date entry points moving under one namespace.
 *
 * The only migration in `migrations.json` that shipped without a spec, and the
 * one AGENTS.md holds up as the model for when a codemod is allowed to run: the
 * new form means what the old one meant, in the same place, so a path can move
 * without reading the code around it. That is also what makes it dangerous to
 * leave unchecked — a rewrite that fires one character too far produces a
 * specifier no resolver can find, and a rewrite that does not fire leaves an
 * import that no longer exists. Neither reads as a failure of the migration.
 *
 * The case that carries the file is the ANCHOR. `ngwr/date-adapter` is a PREFIX
 * of `ngwr/date-adapter-fns`, and `\b` matches between `r` and `-`, so a
 * word-boundary anchor rewrites the front of the longer path and leaves
 * `ngwr/date-fns`. The rule uses `(?![-\w])` instead, which is why the order of
 * the three patterns cannot decide the outcome.
 */

interface Run {
  readonly logs: readonly string[];
  readonly read: (path: string) => string;
}

function run(files: Readonly<Record<string, string>>): Run {
  const tree = new HostTree();
  for (const [path, content] of Object.entries(files)) tree.create(path, content);

  const logs: string[] = [];
  const context = {
    logger: { info: (message: string) => logs.push(message), warn: (message: string) => logs.push(message) },
  } as unknown as SchematicContext;
  const rule = ngUpdateV12() as (target: Tree, ctx: SchematicContext) => Tree;
  const next = rule(tree, context);

  return { logs, read: (path: string) => next.readText(path) };
}

describe('migration-v12', () => {
  it('moves all three date entry points', () => {
    const { read } = run({
      '/src/app.ts': [
        "import { provideWrDateAdapter } from 'ngwr/date-adapter';",
        "import { WrDateFnsAdapter } from 'ngwr/date-adapter-fns';",
        "import { WrLuxonAdapter } from 'ngwr/date-adapter-luxon';",
      ].join('\n'),
    });

    expect(read('/src/app.ts')).toBe(
      [
        "import { provideWrDateAdapter } from 'ngwr/date';",
        "import { WrDateFnsAdapter } from 'ngwr/date/adapters/fns';",
        "import { WrLuxonAdapter } from 'ngwr/date/adapters/luxon';",
      ].join('\n')
    );
  });

  it('keeps every symbol name — only the specifier moves', () => {
    // The whole reason this break was codemoddable. A rule that also touched
    // identifiers would have to know which `WrDateFnsAdapter` is ngwr's.
    const { read } = run({
      '/src/app.ts':
        "import { WrDateFnsAdapter } from 'ngwr/date-adapter-fns';\nconst a = new WrDateFnsAdapter(); // date-adapter-fns",
    });

    const out = read('/src/app.ts');
    expect(out).toContain('WrDateFnsAdapter');
    expect(out).toContain("from 'ngwr/date/adapters/fns'");
    // A bare mention that is not a `ngwr/`-prefixed specifier is not a path.
    expect(out).toContain('// date-adapter-fns');
  });

  it('does not rewrite the front of a longer path', () => {
    // `ngwr/date-adapter` is a prefix of the other two, and of anything a
    // consumer named for themselves. `ngwr/date-fns` is what a `\b` anchor
    // produces here, and it resolves to nothing.
    const { read } = run({
      '/a.ts': "from 'ngwr/date-adapter-fns'",
      '/b.ts': "from 'ngwr/date-adapter-luxon'",
      '/c.ts': "from 'ngwr/date-adapter-custom'",
    });

    expect(read('/a.ts')).toBe("from 'ngwr/date/adapters/fns'");
    expect(read('/a.ts')).not.toContain('ngwr/date-fns');
    expect(read('/b.ts')).toBe("from 'ngwr/date/adapters/luxon'");
    // Not ngwr's, so it is left exactly as written.
    expect(read('/c.ts')).toBe("from 'ngwr/date-adapter-custom'");
  });

  it('reaches the file types a specifier can hide in', () => {
    // `.json` because an import map or a jest `moduleNameMapper` names them,
    // `.html` for the rare inline reference.
    const { read } = run({
      '/map.json': '{ "imports": { "d": "ngwr/date-adapter-luxon" } }',
      '/page.html': '<!-- see ngwr/date-adapter -->',
      '/theme.scss': "// ngwr/date-adapter\n@use 'ngwr/button';",
    });

    expect(read('/map.json')).toContain('ngwr/date/adapters/luxon');
    expect(read('/page.html')).toContain('ngwr/date ');
    // Not visited: these entry points ship no styles, so a stylesheet cannot
    // hold a live reference to one — only a comment, which is not worth the
    // risk of rewriting inside a Sass string.
    expect(read('/theme.scss')).toContain('ngwr/date-adapter');
  });

  it('walks past the directories an install owns', () => {
    const { read, logs } = run({
      '/node_modules/ngwr/date-adapter/index.d.ts': "export * from 'ngwr/date-adapter';",
      '/src/app.ts': "from 'ngwr/date-adapter'",
    });

    // Rewriting inside `node_modules` edits the installed package rather than
    // the app, and the next install silently undoes it.
    expect(read('/node_modules/ngwr/date-adapter/index.d.ts')).toContain("'ngwr/date-adapter'");
    expect(read('/src/app.ts')).toBe("from 'ngwr/date'");
    expect(logs.some(line => line.includes('rewrote 1 file(s)'))).toBe(true);
  });

  it('counts the files it changed, not the files it read', () => {
    // A count that included every visited file would report work on an app with
    // no date adapter at all, which is the report a consumer trusts least.
    const { logs } = run({ '/src/app.ts': "import { WrButton } from 'ngwr/button';" });

    expect(logs.some(line => line.includes('rewrote 0 file(s)'))).toBe(true);
  });
});
