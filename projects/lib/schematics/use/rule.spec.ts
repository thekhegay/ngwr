/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { HostTree, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import { NON_DECLARABLE, useRule } from './rule';
import type { Schema } from './schema';

/**
 * `ng g ngwr:use` against a stock standalone component.
 *
 * The rule is driven directly with a fake symbol map rather than through
 * `SchematicTestRunner`, which would load `collection.json` out of `dist/` and
 * make this suite depend on a build.
 *
 * The case that matters is a symbol that is not a declarable. The schematic
 * edits two places — the import line, which is identical for every symbol, and
 * the `@Component({ imports })` array, which is not — and it used to edit both
 * unconditionally. `ng g ngwr:use WrDialog` therefore printed
 * `✓ Added WrDialog (from ngwr/dialog)` and left an `imports: [WrDialog]` that
 * the AOT compiler rejects: "Component imports must be standalone components,
 * directives, pipes, or must be NgModules."
 */

/** Only the two symbols the behaviour tests need; the real map ships in `dist`. */
const SYMBOL_MAP: Record<string, string> = {
  WrButton: 'ngwr/button',
  WrDialog: 'ngwr/dialog',
};

const COMPONENT = `import { Component } from '@angular/core';

@Component({
  selector: 'app-page',
  imports: [],
  templateUrl: './page.html',
})
export class Page {}
`;

interface Run {
  readonly tree: Tree;
  readonly logs: readonly string[];
}

/** A context with nothing but the logger the rule writes to. */
function run(tree: Tree, options: Schema): Run {
  const logs: string[] = [];
  const context = {
    logger: { info: (message: string) => logs.push(message), warn: (message: string) => logs.push(message) },
  } as unknown as SchematicContext;

  const rule = useRule(options, SYMBOL_MAP) as (target: Tree, ctx: SchematicContext) => Tree;
  rule(tree, context);

  return { tree, logs };
}

function component(): Tree {
  const tree = new HostTree();
  tree.create('/src/app/page.ts', COMPONENT);

  return tree;
}

// --- the table, checked against the library it describes ---------------------

/**
 * The workspace root, walked up from the runner's cwd.
 *
 * Not `import.meta.url`: the Angular unit-test builder bundles specs, so that
 * URL names a location in the bundle rather than this file — the same trap
 * `mcp/server.spec.ts` documents at length.
 */
function workspaceRoot(): string {
  let dir = process.cwd();
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml')) && existsSync(join(dir, 'angular.json'))) return dir;
    const up = dirname(dir);
    if (up === dir) {
      throw new Error(`no workspace root above ${process.cwd()} — looked for pnpm-workspace.yaml beside angular.json`);
    }
    dir = up;
  }
}

const LIB = resolve(workspaceRoot(), 'projects', 'lib');

const stripComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * The symbol → subpath map exactly as `scripts/lib/build-symbol-map.ts` builds
 * it: `Wr*` value exports of the entry points one level down, first one wins.
 *
 * Reproduced rather than imported because the generator writes its output
 * straight into `dist`, and a spec that read the built file would only be true
 * of the last build.
 */
function symbolMap(): Record<string, string> {
  const map: Record<string, string> = {};
  const entries = readdirSync(LIB)
    .filter(name => !name.startsWith('.'))
    .filter(name => statSync(join(LIB, name)).isDirectory())
    .filter(name => existsSync(join(LIB, name, 'public-api.ts')) && existsSync(join(LIB, name, 'ng-package.json')))
    .sort();

  for (const entry of entries) {
    const source = readFileSync(join(LIB, entry, 'public-api.ts'), 'utf8');
    for (const block of source.matchAll(/export\s*(type\s*)?\{([^}]+)\}/g)) {
      if (block[1]) continue;
      for (const member of block[2].split(',')) {
        const trimmed = member.trim();
        if (!trimmed || /^type\s/.test(trimmed)) continue;
        const published = trimmed.split(/\s+as\s+/).pop() ?? trimmed;
        const symbol = /\b(Wr[A-Z][A-Za-z\d_]*)\b/.exec(published);
        if (symbol && !map[symbol[1]]) map[symbol[1]] = `ngwr/${entry}`;
      }
    }
  }

  return map;
}

/** Every `.ts` file under an entry point, spec files aside. */
function filesOf(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...filesOf(full));
    else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) out.push(full);
  }

  return out;
}

/**
 * What a symbol is, read off its declaration — `'component'`, `'a service'`,
 * `'a class'`, …
 *
 * The decorator is found by walking back over its balanced parentheses from the
 * `class` keyword, not by taking the last `@Component(` in the file: several
 * classes carry a JSDoc `@example` that uses one, and a plain text search reads
 * that as the declaration's own decorator.
 */
function kindOf(symbol: string, entry: string): string {
  for (const file of filesOf(join(LIB, entry))) {
    const source = stripComments(readFileSync(file, 'utf8'));

    const cls = new RegExp(`export\\s+(abstract\\s+)?class\\s+${symbol}\\b`).exec(source);
    if (cls) {
      const head = source.slice(0, cls.index).trimEnd();
      let decorator: string | undefined;
      if (head.endsWith(')')) {
        let depth = 0;
        let i = head.length - 1;
        for (; i >= 0; i--) {
          if (head[i] === ')') depth++;
          else if (head[i] === '(' && --depth === 0) break;
        }
        decorator = /@(\w+)\s*$/.exec(head.slice(0, i))?.[1];
      }
      if (decorator === 'Component' || decorator === 'Directive' || decorator === 'Pipe') return 'declarable';

      return decorator === 'Service' || decorator === 'Injectable'
        ? 'a service'
        : cls[1]
          ? 'an abstract class'
          : 'a class';
    }

    const constant = new RegExp(`export\\s+const\\s+${symbol}\\b[^=]*=\\s*(new\\s+InjectionToken)?`).exec(source);
    if (constant) return constant[1] ? 'an injection token' : 'a constant';

    if (new RegExp(`export\\s+function\\s+${symbol}\\b`).test(source)) return 'a function';
  }

  throw new Error(`${symbol} is in the symbol map but nothing under ngwr/${entry} declares it`);
}

describe('ng g ngwr:use', () => {
  it('refuses a symbol that is not a declarable, and says what it is', () => {
    const tree = component();

    expect(() => run(tree, { symbol: 'WrDialog', path: 'src/app/page.ts' })).toThrow(
      /WrDialog is a service, not a component, directive or pipe/
    );
    // Nothing half-applied: an import on its own would be harmless, but the
    // `imports: [WrDialog]` that used to come with it is a build failure.
    expect(tree.readText('/src/app/page.ts')).toBe(COMPONENT);
  });

  it('still adds a declarable to both the imports and the array', () => {
    const { tree, logs } = run(component(), { symbol: 'WrButton', path: 'src/app/page.ts' });

    const source = tree.readText('/src/app/page.ts');
    expect(source).toContain("import { WrButton } from 'ngwr/button';");
    expect(source).toContain('imports: [WrButton]');
    expect(logs).toContain('✓ Added WrButton (from ngwr/button) to /src/app/page.ts.');
  });

  it('lists exactly the public symbols the library declares as non-declarable', () => {
    const derived: Record<string, string> = {};
    for (const [symbol, subpath] of Object.entries(symbolMap())) {
      const kind = kindOf(symbol, subpath.replace(/^ngwr\//, ''));
      if (kind !== 'declarable') derived[symbol] = kind;
    }

    // Deep equality both ways: a service missing from the table is spliced into
    // `imports` again, and a declarable wrongly in it is refused for no reason.
    expect(NON_DECLARABLE).toEqual(derived);
  });
});
