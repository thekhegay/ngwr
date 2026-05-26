/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * ngwr v1 → v2 codemod.
 *
 * Drops the `Component` / `Directive` / `Pipe` / `Service` suffix from:
 *   - class declarations and references
 *   - file names (`button.component.ts` → `button.ts`, etc)
 *   - template / style URL strings
 *
 * Run modes:
 *   pnpm tsx scripts/migrate-v2.ts                    # rewrite library + showcase
 *   pnpm tsx scripts/migrate-v2.ts --dry-run          # report planned changes
 *   pnpm tsx scripts/migrate-v2.ts --path <dir>       # rewrite a consumer project
 *
 * The same script ships as the consumer-facing codemod — point `--path`
 * at the consumer's `src` to update their `WrXxxComponent` imports.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

interface CliOptions {
  readonly dryRun: boolean;
  readonly paths: readonly string[];
  readonly internal: boolean;
}

function parseArgs(argv: readonly string[]): CliOptions {
  const dryRun = argv.includes('--dry-run');
  const internal = !argv.includes('--path');
  const pathIdx = argv.indexOf('--path');
  const paths =
    pathIdx >= 0
      ? [argv[pathIdx + 1]]
      : [path.join(projectRoot, 'projects', 'lib'), path.join(projectRoot, 'projects', 'showcase')];
  return { dryRun, paths, internal };
}

const SUFFIXES = ['Component', 'Directive', 'Pipe', 'Service'] as const;
type Suffix = (typeof SUFFIXES)[number];

const FILE_SUFFIXES = ['.component', '.directive', '.pipe', '.service'] as const;

/** Walk a directory tree, yielding every file path that matches `predicate`. */
function* walk(dir: string, predicate: (p: string) => boolean): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.angular') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full, predicate);
    } else if (predicate(full)) {
      yield full;
    }
  }
}

interface FileRename {
  readonly oldPath: string;
  readonly newPath: string;
}

/** Build the file-rename plan for an `.ts/.html/.scss` whose stem ends in a known infix. */
function planFileRenames(root: string): readonly FileRename[] {
  const renames: FileRename[] = [];
  for (const file of walk(root, p => /\.(ts|html|scss)$/.test(p))) {
    const dir = path.dirname(file);
    const ext = path.extname(file); // .ts / .html / .scss
    const stem = path.basename(file, ext); // e.g. "button.component"
    const match = FILE_SUFFIXES.find(s => stem.endsWith(s));
    if (!match) continue;
    const newStem = stem.slice(0, -match.length); // "button"
    if (!newStem) continue;
    renames.push({ oldPath: file, newPath: path.join(dir, `${newStem}${ext}`) });
  }
  return renames;
}

/**
 * Cases where dropping the suffix collides with another class in the same
 * package; the consumer-facing class keeps the bare name (handled by the
 * generic suffix-strip below), the OTHER class gets a descriptive label.
 *
 * Keys are the v1 class name; values are the v2 name.
 */
const COLLISION_MAP: Readonly<Record<string, string>> = {
  // tooltip — directive kept bare, panel component renamed
  WrTooltipComponent: 'WrTooltipPanel',
  // popconfirm — directive kept bare, panel component renamed
  WrPopconfirmComponent: 'WrPopconfirmPanel',
  // toast — service kept bare, item component renamed
  WrToastComponent: 'WrToastItem',
  // context-menu — directive kept bare, panel component renamed
  WrContextMenuComponent: 'WrContextMenuPanel',
  // squircle — directive kept bare, host component renamed
  WrSquircleComponent: 'WrSquircleHost',
  // meta — service kept bare, directive renamed
  WrMetaDirective: 'WrMetaBinding',
  // hotkey — service kept bare, directive renamed
  WrHotkeyDirective: 'WrHotkeyBinding',
};

/** Type renames where the new name avoids a collision with a class. */
const TYPE_RENAMES: Readonly<Record<string, string>> = {
  // The icon DATA type — renamed because `WrIcon` is now the component class.
  // Consumers writing `provideWrIcons([{ name, data } satisfies WrIcon])`
  // must use `WrIconDef`.
  WrIcon: 'WrIconDef',
  // The table SORT STATE type — renamed because `WrTableSort` is the directive.
  WrTableSort: 'WrTableSortState',
};

/** Replace `WrFooComponent` / `WrFooDirective` / etc. with `WrFoo` everywhere. */
function rewriteClassReferences(content: string): string {
  // 1. Resolve collision-mapped names first (they're more specific).
  let out = content;
  for (const [from, to] of Object.entries(COLLISION_MAP)) {
    out = out.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
  }

  // 2. Strip the generic suffix from any remaining `Wr*Component` etc.
  const re = new RegExp(`\\b(Wr[A-Z][A-Za-z0-9]*)(${SUFFIXES.join('|')})\\b`, 'g');
  out = out.replace(re, (_full, base: string, suffix: Suffix) => {
    void suffix;
    return base;
  });

  // 3. Apply targeted TYPE renames — only inside `import type {…}` clauses
  // or `: Foo` annotations, so we don't accidentally clobber the class name
  // that now occupies the bare identifier.
  for (const [from, to] of Object.entries(TYPE_RENAMES)) {
    // `import type { …, From, … } from 'ngwr/…'`
    out = out.replace(new RegExp(`(import\\s+type\\s*\\{[^}]*?)\\b${from}\\b`, 'g'), `$1${to}`);
    // `import { type From }` mixed clause
    out = out.replace(new RegExp(`(import\\s*\\{[^}]*?\\btype\\s+)${from}\\b`, 'g'), `$1${to}`);
    // `: From` annotation
    out = out.replace(new RegExp(`(:\\s*)${from}\\b`, 'g'), `$1${to}`);
    // `<From>` generic argument
    out = out.replace(new RegExp(`<${from}\\b`, 'g'), `<${to}`);
    // `as From` assertion
    out = out.replace(new RegExp(`\\bas ${from}\\b`, 'g'), `as ${to}`);
  }
  return out;
}

/**
 * Rewrite v6 button props that fused into the new `[shape]` enum.
 *   `<wr-btn rounded>`         → `<wr-btn shape="pill">`
 *   `<wr-btn [rounded]="true">`→ `<wr-btn shape="pill">`
 *   `<wr-btn squircle>`        → `<wr-btn shape="squircle">`
 *
 * Runs on `.html` and `.ts` (template literal strings).
 */
function rewriteButtonProps(content: string): string {
  return (
    content
      // `rounded` and `[rounded]="true"` on <wr-btn> / button[wr-btn] / a[wr-btn].
      .replace(/(<(?:wr-btn|[^<>]*?\bwr-btn\b)[^>]*?\s)\[?rounded\]?(?:="true")?(\s|>|\/>)/g, '$1shape="pill"$2')
      .replace(/(<(?:wr-btn|[^<>]*?\bwr-btn\b)[^>]*?\s)\[?squircle\]?(?:="true")?(\s|>|\/>)/g, '$1shape="squircle"$2')
  );
}

/**
 * Update path strings like `./button.component` → `./button` and
 * `./button.component.html` → `./button.html`. Lookahead allows trailing
 * extensions (`.html`, `.scss`) without consuming them.
 */
function rewritePathStrings(content: string): string {
  const re = /(['"])([^'"\n]*?)\.(?:component|directive|pipe|service)(?=['"./])/g;
  return content.replace(re, (_m, q1: string, prefix: string) => `${q1}${prefix}`);
}

interface FileEdit {
  readonly path: string;
  readonly before: string;
  readonly after: string;
}

function planContentRewrites(root: string): readonly FileEdit[] {
  const edits: FileEdit[] = [];
  for (const file of walk(root, p => /\.(ts|html|scss|json|md)$/.test(p))) {
    const before = fs.readFileSync(file, 'utf8');
    let after = before;
    if (/\.(ts|html|md)$/.test(file)) {
      after = rewriteClassReferences(after);
    }
    if (/\.(ts|html)$/.test(file)) {
      after = rewriteButtonProps(after);
    }
    if (/\.ts$/.test(file)) {
      after = rewritePathStrings(after);
    }
    if (after !== before) edits.push({ path: file, before, after });
  }
  return edits;
}

function applyFileRenames(renames: readonly FileRename[], dryRun: boolean): void {
  for (const { oldPath, newPath } of renames) {
    if (dryRun) {
      console.log(`rename  ${path.relative(projectRoot, oldPath)}  →  ${path.relative(projectRoot, newPath)}`);
      continue;
    }
    if (fs.existsSync(newPath)) {
      console.warn(`skip rename (target exists): ${newPath}`);
      continue;
    }
    fs.mkdirSync(path.dirname(newPath), { recursive: true });
    fs.renameSync(oldPath, newPath);
  }
}

function applyContentEdits(edits: readonly FileEdit[], dryRun: boolean): void {
  for (const { path: p, after } of edits) {
    if (dryRun) {
      console.log(`rewrite ${path.relative(projectRoot, p)}`);
      continue;
    }
    fs.writeFileSync(p, after, 'utf8');
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const allFileRenames: FileRename[] = [];
  const allEdits: FileEdit[] = [];

  for (const root of options.paths) {
    if (!fs.existsSync(root)) {
      console.warn(`skip (path does not exist): ${root}`);
      continue;
    }
    allFileRenames.push(...planFileRenames(root));
  }

  // Apply file renames first so content rewrites read the post-rename tree.
  applyFileRenames(allFileRenames, options.dryRun);

  for (const root of options.paths) {
    if (!fs.existsSync(root)) continue;
    allEdits.push(...planContentRewrites(root));
  }

  applyContentEdits(allEdits, options.dryRun);

  console.log('');
  console.log(`${options.dryRun ? '[dry-run] would rename' : 'renamed'}  ${allFileRenames.length} files`);
  console.log(`${options.dryRun ? '[dry-run] would rewrite' : 'rewrote'}  ${allEdits.length} files`);
}

main();
