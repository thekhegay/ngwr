/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * What a registry item is, and what makes one invalid.
 *
 * The registry is an OPEN format: anyone can host a JSON file and anyone's
 * tooling can read it, which is exactly why the rules live in code with a gate
 * behind them rather than in prose. `registry/schema.json` is the published
 * contract; this file is the enforcement, and `check-registry.ts` fails if the
 * two ever disagree about the parts they both describe.
 *
 * The shape borrows from shadcn's registry deliberately — an author who has
 * published one should recognise this one — with the pieces Angular needs
 * instead of the pieces React needs: `entryPoints` names `ngwr/*` subpaths, and
 * `cssVars` names `--wr-*` tokens rather than arbitrary properties.
 *
 * The rule that is not cosmetic: **an item is remote content that a CLI writes
 * to disk.** Every `files[].target` is checked for absolute paths and `..`
 * segments here, because the first thing a malicious item will try is writing
 * outside the project.
 */

/** The three kinds. A fourth needs a reason, a validator branch and a doc. */
const ITEM_TYPES = ['registry:theme', 'registry:block', 'registry:component'] as const;
type WrRegistryItemType = (typeof ITEM_TYPES)[number];

/** Keys every item carries, whatever its type. */
const REQUIRED_KEYS = ['name', 'type', 'title', 'description'] as const;

interface WrRegistryFile {
  /** Path inside the item, for humans and for de-duplication. */
  readonly path: string;
  /** Where a CLI should write it, relative to the consuming project's root. */
  readonly target: string;
  readonly content: string;
}

interface WrRegistryItem {
  readonly $schema?: string;
  /** kebab-case, unique within a registry. */
  readonly name: string;
  readonly type: WrRegistryItemType;
  readonly title: string;
  readonly description: string;
  readonly author?: string;
  /** Compatible ngwr majors, e.g. `">=11"`. */
  readonly ngwr?: string;
  /** npm packages the item needs beyond ngwr itself. */
  readonly dependencies?: readonly string[];
  /** Absolute URLs of other registry items this one composes. */
  readonly registryDependencies?: readonly string[];
  /** `ngwr/*` subpaths the item imports from. Checked against the real catalog. */
  readonly entryPoints?: readonly string[];
  /** Token overrides, per theme. Keys must be `--wr-*`. */
  readonly cssVars?: {
    readonly light?: Readonly<Record<string, string>>;
    readonly dark?: Readonly<Record<string, string>>;
  };
  readonly files?: readonly WrRegistryFile[];
}

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(entry => typeof entry === 'string');

/**
 * A target a CLI may write.
 *
 * Rejects absolute paths, Windows drive letters, URL-ish schemes and any `..`
 * segment — including one that appears after a legitimate prefix, which is the
 * form a hand-rolled "starts with .." check misses.
 */
function targetProblem(target: string): string | null {
  if (target.trim() !== target || target === '') return 'is empty or padded with whitespace';
  if (target.startsWith('/') || target.startsWith('\\')) return 'is an absolute path';
  if (/^[a-zA-Z]:/.test(target)) return 'starts with a drive letter';
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return 'looks like a URL rather than a path';
  if (target.split(/[\\/]/).includes('..')) return 'walks out of the project with a ".." segment';
  if (target.includes('\0')) return 'contains a null byte';
  return null;
}

/**
 * Every problem, not the first one.
 *
 * An author fixing a published item by trial and error is the worst version of
 * this tool, and a validator that stops at the first failure guarantees it.
 */
function validateItem(raw: unknown, entryPoints: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  if (!isRecord(raw)) return ['not a JSON object'];

  for (const key of REQUIRED_KEYS) {
    if (typeof raw[key] !== 'string' || (raw[key] as string).trim() === '') problems.push(`${key} is missing`);
  }

  const name = raw['name'];
  if (typeof name === 'string' && !KEBAB.test(name)) problems.push(`name "${name}" is not kebab-case`);

  const type = raw['type'];
  if (typeof type === 'string' && !ITEM_TYPES.includes(type as WrRegistryItemType)) {
    problems.push(`type "${type}" is not one of ${ITEM_TYPES.join(', ')}`);
  }

  for (const key of ['dependencies', 'registryDependencies', 'entryPoints'] as const) {
    if (raw[key] !== undefined && !isStringArray(raw[key])) problems.push(`${key} must be an array of strings`);
  }

  if (isStringArray(raw['registryDependencies'])) {
    for (const url of raw['registryDependencies']) {
      // A relative registry dependency has no meaning: the item is fetched from
      // somewhere, and "somewhere" is not knowable to the CLI resolving it.
      if (!/^https:\/\//.test(url)) problems.push(`registryDependency "${url}" is not an https URL`);
    }
  }

  if (isStringArray(raw['entryPoints'])) {
    for (const entry of raw['entryPoints']) {
      const subpath = entry.replace(/^ngwr\//, '');
      // Checked against the catalog scan rather than a list kept here — the
      // point of the whole AI-assets pass was to stop having two of those.
      if (!entryPoints.has(subpath)) problems.push(`entryPoint "${entry}" is not an ngwr entry point`);
    }
  }

  const cssVars = raw['cssVars'];
  if (cssVars !== undefined) {
    if (!isRecord(cssVars)) problems.push('cssVars must be an object');
    else {
      for (const [theme, tokens] of Object.entries(cssVars)) {
        if (theme !== 'light' && theme !== 'dark') problems.push(`cssVars.${theme} is not a theme — use light or dark`);
        if (!isRecord(tokens)) {
          problems.push(`cssVars.${theme} must be an object of token values`);
          continue;
        }
        for (const [token, value] of Object.entries(tokens)) {
          // A "theme preset" that sets `--brand-blue` is not a theme preset; it
          // is arbitrary CSS wearing the label, and consumers install these
          // expecting the library's own token layer to be what changes.
          if (!token.startsWith('--wr-')) problems.push(`cssVars.${theme}."${token}" is not a --wr-* token`);
          if (typeof value !== 'string' || value.trim() === '') {
            problems.push(`cssVars.${theme}."${token}" has no value`);
          }
        }
      }
    }
  }

  const files = raw['files'];
  if (files !== undefined) {
    if (!Array.isArray(files)) problems.push('files must be an array');
    else {
      const seen = new Set<string>();
      for (const [index, file] of files.entries()) {
        if (!isRecord(file)) {
          problems.push(`files[${index}] is not an object`);
          continue;
        }
        for (const key of ['path', 'target', 'content'] as const) {
          if (typeof file[key] !== 'string' || (file[key] as string) === '') problems.push(`files[${index}].${key} is missing`);
        }
        const target = file['target'];
        if (typeof target === 'string') {
          const problem = targetProblem(target);
          if (problem) problems.push(`files[${index}].target "${target}" ${problem}`);
          if (seen.has(target)) problems.push(`files[${index}].target "${target}" is written twice`);
          seen.add(target);
        }
      }
    }
  }

  // Type-specific shape. A theme with files would install code nobody reviewed
  // as part of "changing the colours"; a block with no files installs nothing.
  if (type === 'registry:theme') {
    if (!isRecord(cssVars)) problems.push('a registry:theme must carry cssVars');
    if (Array.isArray(files) && files.length > 0) problems.push('a registry:theme must not ship files — it is tokens');
  }
  if ((type === 'registry:block' || type === 'registry:component') && (!Array.isArray(files) || files.length === 0)) {
    problems.push(`a ${type} must ship at least one file`);
  }

  return problems;
}

export { ITEM_TYPES, REQUIRED_KEYS, targetProblem, validateItem };
export type { WrRegistryFile, WrRegistryItem, WrRegistryItemType };
