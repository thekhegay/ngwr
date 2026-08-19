/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** One entry point, as `llms-full.txt` describes it. */
interface CatalogEntry {
  /** `ngwr/select` */
  readonly path: string;
  /** `select` */
  readonly name: string;
  /** `import { WrSelect } from 'ngwr/select'` */
  readonly import: string;
  /** `wr-select`, or several, or none for a service-only entry point. */
  readonly selectors: readonly string[];
  readonly exports: readonly string[];
  readonly description: string;
}

/**
 * The catalog, read from the files the package already ships.
 *
 * **No second copy of anything, and that is the design constraint this whole
 * server was built under.** `llms-full.txt` (~57 KB, 202 entry points) and
 * `schematics/use/symbol-map.json` (215 symbols) are already in the tarball for
 * other reasons, and the `.d.ts` bundle carries every signature. A server that
 * embedded its own index would be a fourth copy to keep in step with the library,
 * and the first one to go stale.
 *
 * What it adds on top is the part none of those files have: a way to ASK. An
 * agent that does not already know an entry point's name cannot use a `.d.ts`,
 * and reading ~57 KB of catalog to answer "what renders markdown" is the cost this
 * exists to remove.
 */
class Catalog {
  private readonly root: string;
  private entries: readonly CatalogEntry[] | null = null;
  private symbols: Readonly<Record<string, string>> | null = null;
  private exports: Record<string, unknown> | null = null;

  constructor(root?: string) {
    this.root = root ?? defaultRoot();
  }

  /** Every entry point, in catalog order. */
  all(): readonly CatalogEntry[] {
    this.entries ??= parseCatalog(this.read('llms-full.txt'));

    return this.entries;
  }

  /** Symbol name to entry point path, from the schematics' own map. */
  symbolMap(): Readonly<Record<string, string>> {
    if (this.symbols) return this.symbols;

    const raw = this.read(join('schematics', 'use', 'symbol-map.json'));
    // A null prototype, because this map is looked up with a caller's string:
    // `find('constructor')` on a plain object returns a FUNCTION, and the next
    // line called `.toLowerCase()` on it and threw.
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    const map = Object.assign(Object.create(null) as Record<string, string>, parsed);
    this.symbols = map;

    return map;
  }

  /**
   * Does this entry point ship a stylesheet?
   *
   * Read from the package's own `exports` map rather than assumed: 94 of the 202
   * entry points ship no `styles/_index.scss` — the testing harnesses, the
   * services, the adapters — and telling a consumer to `@use` one of those breaks
   * their Sass build.
   *
   * Count them with `hasStyles()` rather than by tallying `sass` conditions in the
   * `exports` map: six of those keys are not catalog entry points at all (the root
   * plus `animations`, `breakpoints`, `grid`, `reset`, `typography-utilities`), so
   * that arithmetic comes out six short.
   */
  hasStyles(path: string): boolean {
    this.exports ??= (() => {
      const raw = this.read('package.json');
      const parsed = raw ? (JSON.parse(raw) as { exports?: Record<string, unknown> }) : {};

      return parsed.exports ?? {};
    })();

    const entry = this.exports[`.${path.slice('ngwr'.length)}`];

    return typeof entry === 'object' && entry !== null && 'sass' in entry;
  }

  /** An entry point by `ngwr/select`, by `select`, or by any symbol it exports. */
  find(query: string): CatalogEntry | null {
    const wanted = query.trim();
    const mapped: unknown = this.symbolMap()[wanted];
    const path = typeof mapped === 'string' ? mapped : undefined;
    const normalised = (path ?? (wanted.startsWith('ngwr/') ? wanted : `ngwr/${wanted}`)).toLowerCase();

    return (
      this.all().find(entry => entry.path.toLowerCase() === normalised) ??
      this.all().find(entry => entry.exports.some(name => name.toLowerCase() === wanted.toLowerCase())) ??
      this.all().find(entry => entry.selectors.some(selector => selector === wanted)) ??
      null
    );
  }

  /**
   * The version of the package this server is part of.
   *
   * From its own `package.json`, NOT from `npm_package_version` — npx sets that
   * from the project that INVOKED the server, so a consumer app saw its own
   * version reported back as the catalog's. Only an install test catches that:
   * in the repo the two happen to be the same file.
   */
  version(): string {
    const raw = this.read('package.json');
    const parsed = raw ? (JSON.parse(raw) as { version?: string }) : {};

    return parsed.version ?? '0.0.0';
  }

  /** The bundled declarations for an entry point, or `null` when not shipped. */
  types(path: string): string | null {
    const file = join('types', `${path.replace(/\//g, '-')}.d.ts`);

    return this.read(file);
  }

  /**
   * Whether `symbol` is something Angular accepts in `imports: []`.
   *
   * Read from the SHIPPED declaration file rather than from a table, because the
   * compiler already wrote the answer there: a component, directive or pipe gets
   * a `static ɵcmp` / `ɵdir` / `ɵpipe` whose first type argument is the class. A
   * service gets `ɵprov` instead. So this needs no second copy of anything, and
   * cannot drift — which matters, because the alternative was a hand-kept list
   * and `ng g ngwr:use` now REFUSES a non-declarable: recommending the command
   * for `WrDialog` would hand an agent a line that errors.
   *
   * `null` when the types are not there to read, so a caller can tell "not
   * declarable" from "cannot say".
   */
  declarable(symbol: string, path: string): boolean | null {
    const source = this.types(path);
    if (!source) return null;

    // Ask for the declarable markers FIRST and separately. A single alternation
    // over all five answers with whichever appears earliest in the file, and
    // `ɵfac` is always emitted above `ɵcmp` — so the combined form calls every
    // component a non-declarable, while a fixture with no markers at all hides
    // it. Two passes, no ordering assumption.
    const declarable = new RegExp(`static ɵ(?:cmp|dir|pipe): [^;]*<${symbol}[,>]`);
    if (declarable.test(source)) return true;

    // Only claim "no" for a symbol this file actually declares; a `.d.ts` that
    // merely mentions the name is not evidence, which is the difference between
    // "not declarable" and "cannot say".
    const declared = new RegExp(`static ɵ(?:prov|fac): [^;]*<${symbol}[,>]`);

    return declared.test(source) ? false : null;
  }

  private read(relative: string): string | null {
    const file = join(this.root, relative);

    return existsSync(file) ? readFileSync(file, 'utf8') : null;
  }
}

/**
 * The installed package root, from this file's own location.
 *
 * `dist/lib/mcp/server.js` at runtime, `projects/lib/mcp/` in the repo — one level
 * up either way, which is what makes the same code testable in place and correct
 * once published.
 */
function defaultRoot(): string {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

/**
 * `llms-full.txt` into entries.
 *
 * The generator's format is fixed and checked by `pnpm check:llms`, so parsing it
 * is a contract between two files in the same repo rather than a guess at someone
 * else's output.
 */
function parseCatalog(source: string | null): readonly CatalogEntry[] {
  if (!source) return [];

  const entries: CatalogEntry[] = [];

  for (const section of source.split(/^## /m).slice(1)) {
    const [heading, ...lines] = section.split('\n');
    const path = heading.trim();
    if (!path.startsWith('ngwr/')) continue;

    const field = (label: string): string =>
      lines
        .find(line => line.startsWith(`- ${label}:`))
        ?.slice(label.length + 4)
        .trim() ?? '';

    // The description is the one bullet with no `label:` prefix.
    const description =
      lines
        .filter(line => line.startsWith('- ') && !/^- [a-z]+:/.test(line))
        .map(line => line.slice(2).trim())
        .join(' ') || '';

    entries.push({
      path,
      name: path.slice('ngwr/'.length),
      import: unquote(field('import')),
      selectors: unquote(field('selector'))
        .split(',')
        .map(selector => selector.trim().replace(/`/g, ''))
        .filter(Boolean),
      exports: field('exports')
        .split(',')
        .map(name => name.trim())
        .filter(Boolean),
      description,
    });
  }

  return entries;
}

function unquote(value: string): string {
  return value.replace(/`/g, '').trim();
}

export { Catalog, parseCatalog };
export type { CatalogEntry };
