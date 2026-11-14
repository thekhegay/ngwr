/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { posix } from 'node:path';

/**
 * The half of `ng g ngwr:eject` that touches neither a tree nor the network:
 * which entry points can be ejected, which files one consists of, and what each
 * file reads like once it sits in an app.
 *
 * The published package carries compiled output, so the sources come from
 * somewhere else, one file at a time, through a {@link ReadSource}. Nothing
 * here lists a directory: a raw-file host cannot, and walking the imports from
 * `public-api.ts` and the stylesheet entry reaches exactly the files the entry
 * point is built from, which leaves specs and harnesses out with no filter.
 */

/** The `exports` map of an ngwr manifest, source or published. */
type Exports = Readonly<Record<string, unknown>>;

/** Reads one file by its path under `projects/lib`, or `null` when there is none. */
type ReadSource = (path: string) => Promise<string | null>;

/** An import left as written, because the file it names could not be read. */
interface EjectWarning {
  /** The file's path inside the ejected folder. */
  readonly file: string;
  /** The line in the copy, header included. */
  readonly line: number;
  readonly specifier: string;
  readonly reason: string;
}

interface EjectedFile {
  /** The file's path from the ejected folder; a shared private file starts with `../_ngwr-internal/`. */
  readonly path: string;
  readonly content: string;
}

interface Ejected {
  readonly files: readonly EjectedFile[];
  readonly warnings: readonly EjectWarning[];
  /** Whether any copied file declares a component or a directive. */
  readonly declarable: boolean;
  /** The stylesheet entry inside the ejected folder, when the entry point ships one. */
  readonly styles: string | null;
}

/** Where the sources of a release live, as the manifest's `repository` field says. */
interface Repository {
  readonly url?: string;
  readonly directory?: string;
}

const DEFAULT_REPOSITORY = 'thekhegay/ngwr';
const DEFAULT_DIRECTORY = 'projects/lib';

/**
 * The raw-file URL of one source file at the tag of a release.
 *
 * `file` is a path under the library folder: `button/button.ts`.
 */
function ejectRawUrl(version: string, file: string, repository: Repository = {}): string {
  const slug = /github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/.exec(repository.url ?? '')?.[1] ?? DEFAULT_REPOSITORY;
  const directory = (repository.directory ?? DEFAULT_DIRECTORY).replace(/^\/+|\/+$/g, '');

  return `https://raw.githubusercontent.com/${slug}/v${version}/${directory}/${file}`;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Every entry point with code behind it: no root, no wildcard, no stylesheet-only path. */
function codeEntryPoints(exports: Exports): readonly string[] {
  return Object.keys(exports)
    .filter(
      key =>
        key.startsWith('./') &&
        !key.includes('*') &&
        !key.endsWith('.json') &&
        isRecord(exports[key]) &&
        'default' in exports[key]
    )
    .map(key => key.slice(2));
}

/** Why an entry point is never ejected, read off its path alone. */
function structuralRefusal(entry: string): string | null {
  if (/(^|\/)testing$/.test(entry)) return 'a test harness';
  if (/(^|\/)router$/.test(entry)) return 'a router adapter';
  if (/^i18n(\/|$)/.test(entry)) return 'a translation catalogue';

  return null;
}

/** The entry points `ng g ngwr:eject` accepts by name, from the `exports` map. */
function ejectableEntryPoints(exports: Exports): readonly string[] {
  return codeEntryPoints(exports).filter(entry => structuralRefusal(entry) === null);
}

/** Why `entry` cannot be ejected, or `null` when its name is acceptable. */
function ejectRefusal(entry: string, exports: Exports): string | null {
  const reason = structuralRefusal(entry);
  if (reason) return `ngwr/${entry} is ${reason}, not a component. Eject the component it belongs to.`;
  if (ejectableEntryPoints(exports).includes(entry)) return null;

  return `ngwr/${entry} is not an entry point. Give a component's path under ngwr/: ${ejectableEntryPoints(exports).join(', ')}.`;
}

/** The entry point a path under the library folder belongs to: the longest one that contains it. */
function ownerOf(path: string, entryPoints: readonly string[]): string | null {
  let owner: string | null = null;
  for (const entry of entryPoints) {
    if ((path === entry || path.startsWith(`${entry}/`)) && (owner === null || entry.length > owner.length)) {
      owner = entry;
    }
  }

  return owner;
}

const NOT_FOUND = 'reaches a file that could not be read from the source, so nothing was copied for it';

/** The folder private files are copied to, beside the ejected one and shared by its neighbours. */
const EJECT_SHARED_DIR = '_ngwr-internal';

/** The header each copied file opens with. `entry` is `null` for a private file in the shared folder. */
function ejectHeader(file: string, entry: string | null, version: string): string {
  const lines = [
    entry === null
      ? `Copied from ngwr@${version} by \`ng g ngwr:eject\`: a private file that ejected components share.`
      : `Copied from ngwr@${version}, entry point ngwr/${entry}, by \`ng g ngwr:eject\`.`,
    '`ng update` no longer updates this copy.',
  ];

  return file.endsWith('.html')
    ? `<!--\n  ${lines.join('\n  ')}\n-->\n`
    : `${lines.map(line => `// ${line}`).join('\n')}\n\n`;
}

/** Whether a line is commentary, where an `import … from` is prose or a usage example. */
const isCommentLine = (line: string): boolean => /^\s*(\*|\/\*|\/\/)/.test(line);

const TS_SPECIFIER = /(\bfrom\s+|\bimport\s*\(\s*|^\s*import\s+)(['"])([^'"]+)\2/g;
const TS_RESOURCE = /\b(?:templateUrl|styleUrl)\s*:\s*(['"])([^'"]+)\1/g;
const TS_STYLE_URLS = /\bstyleUrls\s*:\s*\[([^\]]*)\]/g;
const SASS_LOAD = /^(\s*@(use|forward|import)\s+)(['"])([^'"]+)\3(.*)$/;

/**
 * The files of one entry point, rewritten to live outside the library.
 *
 * Starts at `public-api.ts`, the barrel and the stylesheet the `exports` map
 * names, and follows every relative import, `templateUrl`, `styleUrl` and Sass
 * load. Where one lands decides what happens to it:
 *
 * - inside the entry point: the file is copied, at the same place in the folder;
 * - on another entry point: the import becomes that entry point's package path
 *   (`../utils` reads `ngwr/utils`, `../../button/styles` reads `ngwr/button`),
 *   so the copy keeps using the installed package for everything but itself;
 * - on a file no package path exposes (`animations/internal`, a theme partial):
 *   the file is copied too, under `../_ngwr-internal/<its path in the library>`,
 *   its own imports are followed the same way, and the import is rewritten to
 *   reach it there. Later ejects beside this one share that folder.
 *
 * A file path in the result is relative to the ejected folder, so a shared one
 * starts with `../_ngwr-internal/`. Only an import whose file cannot be read is
 * left as written and reported.
 *
 * `folder` is the name of the folder the copy is written to, which a private
 * file reaching back into the component has to spell.
 *
 * Resolves to `null` when the entry point has no `public-api.ts` to start from.
 */
async function collectEjected(
  entry: string,
  exports: Exports,
  version: string,
  read: ReadSource,
  folder: string = posix.basename(entry)
): Promise<Ejected | null> {
  const entryPoints = codeEntryPoints(exports);
  const loaded = new Map<string, string | null>();
  const files = new Map<string, string>();
  const warnings: EjectWarning[] = [];
  const queue: string[] = [];
  const queued = new Set<string>();

  const load = async (path: string): Promise<string | null> => {
    if (!loaded.has(path)) loaded.set(path, await read(path));

    return loaded.get(path) ?? null;
  };

  /** Queues the first candidate that exists; `false` when none does. */
  const follow = async (candidates: readonly string[]): Promise<boolean> => {
    for (const candidate of candidates) {
      if ((await load(candidate)) !== null) {
        if (!queued.has(candidate)) {
          queued.add(candidate);
          queue.push(candidate);
        }

        return true;
      }
    }

    return false;
  };

  const own = (path: string): boolean => ownerOf(path, entryPoints) === entry;
  /** Where a library path lands, relative to the ejected folder. */
  const placed = (path: string): string => (own(path) ? posix.relative(entry, path) : `../${EJECT_SHARED_DIR}/${path}`);
  const header = (file: string): string => ejectHeader(file, own(file) ? entry : null, version);

  /** `line` is 1-based in the source; the warning names the line in the copy, below its header. */
  const warn = (file: string, line: number, specifier: string): void => {
    warnings.push({
      file: placed(file),
      line: line + header(file).split('\n').length - 1,
      specifier,
      reason: NOT_FOUND,
    });
  };

  /** The package path a load that leaves the entry point should read, or `null` when it has none. */
  const publicPath = (target: string, sass: boolean): string | null => {
    const owner = ownerOf(target, entryPoints);
    if (owner === null || owner === entry) return null;

    const rest = target.slice(owner.length + 1);
    if (!sass) return rest === '' || rest === 'index' || rest === 'public-api' ? `ngwr/${owner}` : null;

    // `<entry>/styles` is what the `sass` condition resolves to. The theme's is
    // `theme/_index.scss`, which forwards `theme/styles` whole.
    const entryExports = exports[`./${owner}`];
    const shipsStyles = isRecord(entryExports) && 'sass' in entryExports;

    return shipsStyles && /^styles(\/_?index(\.scss)?)?$/.test(rest) ? `ngwr/${owner}` : null;
  };

  /**
   * What a relative specifier reads once both ends are placed, or `null` to
   * leave it as written: two files on the same side keep their distance.
   */
  const relocated = (file: string, target: string): string | null => {
    if (own(file) === own(target)) return null;

    // From the parent both folders sit in, where the ejected one has a name:
    // a private file reaching back into the component has to spell it.
    const fromParent = (path: string): string => posix.join(folder, placed(path));
    const relative = posix.relative(posix.dirname(fromParent(file)), fromParent(target));

    return relative.startsWith('.') ? relative : `./${relative}`;
  };

  const sassCandidates = (target: string): readonly string[] => {
    const base = posix.basename(target).replace(/\.scss$/, '');
    const parent = posix.dirname(target);

    return [
      `${parent}/_${base}.scss`,
      `${parent}/${base}.scss`,
      `${parent}/${base}/_index.scss`,
      `${parent}/${base}/index.scss`,
    ];
  };

  const rewriteTs = async (file: string, source: string): Promise<string> => {
    const dir = posix.dirname(file);
    const lines = source.split('\n');

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (isCommentLine(line)) continue;

      for (const match of [...line.matchAll(TS_SPECIFIER)]) {
        const specifier = match[3];
        if (!specifier.startsWith('.')) continue;

        const target = posix.normalize(posix.join(dir, specifier));
        let replacement = publicPath(target, false);
        if (replacement === null) {
          if (!(await follow(target === entry ? [`${entry}/index.ts`] : [`${target}.ts`, `${target}/index.ts`]))) {
            warn(file, index + 1, specifier);
            continue;
          }
          replacement = relocated(file, target);
        }
        if (replacement !== null) {
          lines[index] = lines[index].replace(`${match[2]}${specifier}${match[2]}`, `'${replacement}'`);
        }
      }
    }

    const resources = [...source.matchAll(TS_RESOURCE)].map(match => match[2]);
    for (const list of source.matchAll(TS_STYLE_URLS)) {
      resources.push(...[...list[1].matchAll(/(['"])([^'"]+)\1/g)].map(match => match[2]));
    }
    for (const resource of resources) await follow([posix.normalize(posix.join(dir, resource))]);

    return lines.join('\n');
  };

  const rewriteSass = async (file: string, source: string): Promise<string> => {
    const dir = posix.dirname(file);
    const lines = source.split('\n');

    for (let index = 0; index < lines.length; index++) {
      const match = SASS_LOAD.exec(lines[index]);
      if (!match) continue;

      const [, head, rule, quote, specifier, tail] = match;
      if (/^(sass:|ngwr(\/|$)|https?:)/.test(specifier) || specifier.endsWith('.css')) continue;

      const target = posix.normalize(posix.join(dir, specifier));
      const packagePath = publicPath(target, true);
      if (packagePath !== null) {
        // A `@use` with no `as` is named after its last segment, which the package path changes.
        const namespace = rule === 'use' && !/^\s+as\s/.test(tail) ? ` as ${posix.basename(specifier)}` : '';
        lines[index] = `${head}${quote}${packagePath}${quote}${namespace}${tail}`;
        continue;
      }

      if (!(await follow(sassCandidates(target)))) {
        warn(file, index + 1, specifier);
        continue;
      }

      const replacement = relocated(file, target);
      if (replacement !== null) lines[index] = `${head}${quote}${replacement}${quote}${tail}`;
    }

    return lines.join('\n');
  };

  if (!(await follow([`${entry}/public-api.ts`]))) return null;
  await follow([`${entry}/index.ts`]);

  const entryExports = exports[`./${entry}`];
  const sassEntry = isRecord(entryExports) ? (entryExports as { readonly sass?: unknown }).sass : null;
  const stylesFile = typeof sassEntry === 'string' ? posix.normalize(sassEntry) : null;
  const styles = stylesFile !== null && (await follow([stylesFile])) ? stylesFile : null;

  let declarable = false;
  for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
    const source = (await load(file)) ?? '';
    let content = source;
    if (file.endsWith('.ts')) {
      declarable ||= own(file) && /^\s*@(Component|Directive)\s*\(/m.test(source);
      content = await rewriteTs(file, source);
    } else if (file.endsWith('.scss')) {
      content = await rewriteSass(file, source);
    }
    files.set(file, header(file) + content);
  }

  return {
    files: [...files]
      .map(([path, content]) => ({ path: placed(path), content }))
      .sort((a, b) => (a.path < b.path ? -1 : 1)),
    warnings,
    declarable,
    styles: styles === null ? null : placed(styles),
  };
}

/**
 * The entry point a name refers to: itself, or the one nested entry point a
 * bare name ends, the way `component-style` reads `bar-chart`.
 */
function ejectTarget(name: string, exports: Exports): string {
  const candidates = ejectableEntryPoints(exports);
  if (candidates.includes(name) || name.includes('/')) return name;

  const nested = candidates.filter(candidate => candidate.endsWith(`/${name}`));

  return nested.length === 1 ? nested[0] : name;
}

export { EJECT_SHARED_DIR, collectEjected, ejectHeader, ejectRawUrl, ejectRefusal, ejectTarget, ejectableEntryPoints };
export type { EjectWarning, Ejected, EjectedFile, Exports, ReadSource, Repository };
