/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Scans every `projects/lib/<entry>/public-api.ts` and produces a
 * `{ WrSymbol: 'ngwr/<entry>' }` map. Shipped alongside the `use`
 * schematic so `ng g ngwr:use WrFoo` knows which subpath to import from.
 *
 * The mapping is intentionally dumb: it counts any `export { WrFoo }` /
 * `export { WrFoo as Bar }` symbol regardless of whether `WrFoo` is a
 * directive, component, or service — that's what users type at the
 * command line, and the import line is identical in every case.
 *
 * DECLARABILITY is answered elsewhere, and deliberately not here. `ng g
 * ngwr:use` refuses a service rather than splicing it into an `imports: []`,
 * and the MCP's `Catalog.declarable()` reads the compiler's own `ɵcmp` / `ɵdir`
 * / `ɵpipe` markers out of the shipped `.d.ts`. Both derive it from something
 * the build already produces, so putting a flag in this map would be a third
 * copy of a fact with two authorities already.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { entryFiles, INTERNAL_ENTRY_POINTS, libEntryPoints } from './entry-points';
import { LIB_PATH } from './paths/lib';
import { blankTs } from './ts-lex';

/** `export { WrFoo, WrBar as Baz, type Quux } from './…';`, the bare form included. */
const EXPORT_LIST_RE = /export\s*(type\s*)?\{([^}]*)\}(?:\s*from\s*'([^']+)')?/g;
const EXPORT_STAR_RE = /export\s+\*\s+from\s+'([^']+)'/g;
const DECLARATION_RE =
  /^export\s+(?:declare\s+)?(?:abstract\s+)?(const|let|var|function|class|type|interface|enum)\s+(\w+)/gm;
const SYMBOL_RE = /\b(Wr[A-Z][A-Za-z0-9_]*)\b/;

/** Names `file` declares with a top-level `export const` / `class` / `type` / …. */
function declaredIn(file: string): [name: string, isType: boolean][] {
  const out: [string, boolean][] = [];
  for (const m of blankTs(readFileSync(file, 'utf8'), false).matchAll(DECLARATION_RE)) {
    if (m[2]) out.push([m[2], m[1] === 'type' || m[1] === 'interface']);
  }
  return out;
}

/** The `Wr*` value names `<entry>/public-api.ts` lists by name in an `export { … }`. */
function symbolsIn(entry: string): readonly string[] {
  const out = new Set<string>();
  for (const exported of publicExports(entry)) {
    // A type does not compile in `imports: [...]`, where `ng g ngwr:use` splices the symbol.
    if (exported.isType || exported.via !== 'list') continue;
    const sym = SYMBOL_RE.exec(exported.name)?.[1];
    if (sym) out.add(sym);
  }
  return Array.from(out);
}

/** One name an entry point's `public-api.ts` publishes. */
export interface PublicExport {
  /** The name a consumer imports. */
  readonly name: string;
  /** The name in its source module; differs only for `A as B`. */
  readonly local: string;
  /** `export type { … }`, `export { type … }`, or a declared type or interface. */
  readonly isType: boolean;
  /** The re-export specifier; absent for a bare `export { … }` and the barrel's own declarations. */
  readonly from?: string;
  /** An `export { … }` list, an `export * from`, or the barrel's own declaration. */
  readonly via: 'list' | 'star' | 'declared';
}

/**
 * Everything `projects/lib/<entry>/public-api.ts` exports: `export { … }` lists,
 * then `export * from` targets (one hop), then its own declarations; first wins.
 */
export function publicExports(entry: string): PublicExport[] {
  const dir = resolve(LIB_PATH, entry);
  const file = join(dir, 'public-api.ts');
  const src = blankTs(readFileSync(file, 'utf8'), false);
  const out = new Map<string, PublicExport>();
  const add = (record: PublicExport): void => {
    if (!out.has(record.name)) out.set(record.name, record);
  };

  for (const list of src.matchAll(EXPORT_LIST_RE)) {
    const from = list[3];
    for (const member of (list[2] ?? '').split(',')) {
      const trimmed = member.trim();
      if (!trimmed) continue;
      const inlineType = /^type\s/.test(trimmed);
      const parts = trimmed.replace(/^type\s+/, '').split(/\s+as\s+/);
      const name = (parts[parts.length - 1] ?? '').trim();
      const local = (parts[0] ?? '').trim();
      if (name) add({ name, local, isType: Boolean(list[1]) || inlineType, ...(from ? { from } : {}), via: 'list' });
    }
  }

  for (const star of src.matchAll(EXPORT_STAR_RE)) {
    const from = star[1] ?? '';
    const base = from.replace(/\.js$/, '');
    // An unresolved target adds nothing rather than failing scripts that read only the lists.
    const target = [join(dir, `${base}.ts`), join(dir, base, 'index.ts')].find(path => existsSync(path));
    for (const [name, isType] of target ? declaredIn(target) : []) {
      add({ name, local: name, isType, from, via: 'star' });
    }
  }

  for (const [name, isType] of declaredIn(file)) add({ name, local: name, isType, via: 'declared' });

  return [...out.values()];
}

/**
 * Throws unless every export of every {@link INTERNAL_ENTRY_POINTS} entry point is
 * declared under a JSDoc carrying `@internal`.
 *
 * A class may carry a decorator between its JSDoc and `export class` — the data table
 * is a `@Component` — so one decorator call is stepped over. Its arguments may hold
 * no comment end and no `export`, which keeps the step from running on into the next
 * declaration.
 */
export function assertInternalEntryPoints(): void {
  for (const entry of INTERNAL_ENTRY_POINTS) {
    const sources = entryFiles(entry).map(file => readFileSync(file, 'utf8'));
    for (const { name } of publicExports(entry)) {
      const declaration = new RegExp(
        String.raw`/\*\*((?:(?!\*/)[\s\S])*)\*/\s*(?:@[A-Za-z]\w*\((?:(?!\*/|\bexport\s)[\s\S])*\)\s*)?export\s+(?:declare\s+)?(?:abstract\s+)?(?:const|let|function|class|type|interface|enum)\s+${name}\b|/\*\*((?:(?!\*/)[\s\S])*)\*/\s*(?:type|interface)\s+${name}\b`
      );
      const doc = sources.map(source => declaration.exec(source)).find(Boolean);
      if (!doc || !/@internal\b/.test(doc[1] ?? doc[2] ?? '')) {
        throw new Error(
          `ngwr/${entry} is kept out of every catalog as internal, but \`${name}\` is not marked \`@internal\`. ` +
            'Mark it, or move it to an entry point the catalogs list (INTERNAL_ENTRY_POINTS in scripts/lib/entry-points.ts).'
        );
      }
    }
  }
}

/** Build the full symbol → subpath map. */
export function buildSymbolMap(): Record<string, string> {
  assertInternalEntryPoints();

  // `<name>/testing` is an entry point and its harnesses are public, but a
  // harness is never something `ng g ngwr:use` splices into a component — it
  // belongs in a spec. Pulling the seventy of them in would quadruple the
  // schematic's non-declarable table for symbols nobody will ask it for. The
  // internal entry points are out for the reason their list gives.
  const entries = libEntryPoints().filter(
    entry => !entry.split('/').includes('testing') && !INTERNAL_ENTRY_POINTS.has(entry)
  );

  const map: Record<string, string> = {};
  for (const entry of entries) {
    const subpath = `ngwr/${entry}`;
    for (const sym of symbolsIn(entry)) {
      if (map[sym] && map[sym] !== subpath) {
        // First wins — the order in `entries` is alphabetical and entries
        // don't intentionally re-export each other; collisions here are a
        // signal something is off in the source, not the consumer's problem.
        continue;
      }
      map[sym] = subpath;
    }
  }
  return map;
}
