/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Writes `projects/showcase/app/_core/generated/selectors.ts` — the
 * `selector part → { symbol, path }` map the docs site resolves a template
 * fragment against, so a snippet showing `<wr-select>` can name the imports it
 * needs without a hand-kept table going stale beside it.
 *
 *   pnpm gen:selectors
 *
 * Runs as the first step of `build:showcase`, and the output is committed so a
 * clean checkout type-checks before anything is generated.
 *
 * The scan lives in `scripts/lib/build-selector-map.ts` — read its header
 * before changing anything here; the completeness assertion and the
 * comment-aware brace matcher are both load-bearing and both were paid for.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { buildSelectorMap, type WrSelectorMap, type WrSelectorTarget } from './lib/build-selector-map';
import { ROOT_PATH } from './lib/paths/root';

const OUT_DIR = resolve(ROOT_PATH, 'projects/showcase/app/_core/generated');
const OUT_FILE = join(OUT_DIR, 'selectors.ts');

const LIB_ROOT = resolve(ROOT_PATH, 'projects/lib');

/**
 * One secondary entry point, as the filesystem describes it.
 *
 * Read once and passed around, because three different questions are asked of
 * the same walk: which subpaths exist, which of them ship a stylesheet, and
 * where each one's templates live.
 */
interface EntryPoint {
  /** The public subpath: `ngwr/button`, `ngwr/icon/adapters/lucide`. */
  readonly subpath: string;
  /** Its directory under `projects/lib`. */
  readonly dir: string;
  /** Whether it ships `styles/_index.scss`. */
  readonly ships: boolean;
}

/** Every secondary entry point under `projects/lib`, in subpath order. */
function entryPoints(dir = LIB_ROOT, prefix = ''): EntryPoint[] {
  const out: EntryPoint[] = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules' || name === 'testing') continue;
    const full = resolve(dir, name);
    try {
      if (!statSync(full).isDirectory()) continue;
    } catch {
      continue;
    }
    const entry = prefix ? `${prefix}/${name}` : name;
    if (existsSync(join(full, 'ng-package.json'))) {
      out.push({ subpath: `ngwr/${entry}`, dir: full, ships: existsSync(join(full, 'styles', '_index.scss')) });
    }
    out.push(...entryPoints(full, entry));
  }
  return out.sort((a, b) => a.subpath.localeCompare(b.subpath));
}

/**
 * Entry points that actually ship a stylesheet, as `ngwr/<name>` subpaths.
 *
 * The sandbox needs this to write `@use 'ngwr/button';` instead of the umbrella
 * `@use 'ngwr';`, and it cannot guess: `@use` on an entry point with no
 * `styles/_index.scss` — `ngwr/date`, `ngwr/utils`, every `<name>/testing` — is
 * a build error, while the umbrella compiles all hundred-and-twenty component
 * sheets whether the demo draws one component or all of them. Reading the
 * filesystem is the only honest source; a hand-kept list would drift the first
 * time an entry point grew or lost styles.
 */
function styleEntryPoints(entries: readonly EntryPoint[]): string[] {
  return entries.filter(e => e.ships).map(e => e.subpath);
}

/**
 * The BEM block a `.wr-*` class belongs to: `wr-icon__svg` and
 * `wr-select--open` are both painted by their block's stylesheet.
 */
function blockOf(cls: string): string {
  return cls.split('__')[0].split('--')[0];
}

/** Every file under `dir` matching `pred`, without descending into a nested entry point. */
function filesIn(dir: string, pred: (name: string) => boolean, stopAt: ReadonlySet<string> = new Set()): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) {
      if (!stopAt.has(full)) out.push(...filesIn(full, pred, stopAt));
      continue;
    }
    if (pred(name)) out.push(full);
  }
  return out;
}

/** Selectors at brace depth 0 of an SCSS file, comments stripped. */
function topLevelSelectors(source: string): string[] {
  const src = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const out: string[] = [];
  let depth = 0;
  let buffer = '';
  for (const ch of src) {
    if (ch === '{') {
      if (depth === 0) out.push(buffer.trim());
      depth++;
      buffer = '';
      continue;
    }
    if (ch === '}') {
      depth--;
      buffer = '';
      continue;
    }
    // A depth-0 `@use`/`$var:` statement ends at its semicolon and is not a selector.
    if (depth === 0) buffer = ch === ';' ? '' : buffer + ch;
  }
  return out;
}

/**
 * `wr-<block>` → the entry point whose stylesheet PAINTS it.
 *
 * This is the map the sandbox was missing, and it is deliberately built from
 * the stylesheets rather than from {@link buildSelectorMap}: the selector map
 * answers "which subpath exports the class behind `<wr-select>`", which is a
 * different question with a different answer. Forty-two of the blocks here have
 * no element selector of the same name at all — `wr-select-panel`, `wr-toast`,
 * `wr-typography`, every `*-overlay` — and where the two DO share a name they
 * can still disagree, because a class name is not a directory name: `wr-btn` is
 * painted by `ngwr/button`, and `<wr-accordion>` is a tag whose class is
 * `wr-collapse-group--accordion`, painted by `ngwr/collapse`. So tags are
 * resolved through the selector map and classes through this one — see
 * {@link styleDependencies}, which uses both.
 *
 * Ownership is decided in three layers, each narrower than the last, and the
 * first one that names exactly one entry point wins. The layers exist because
 * a sheet can legitimately write another block's class: `theme/_focus.scss`
 * carries `.wr-back-top:focus-visible` and `.wr-alert__close:focus-visible`
 * for forty-one selectors it does not own, so "mentions the class" and even
 * "has a top-level rule for it" both answer `ngwr/theme` for a dozen blocks.
 *
 * 1. a bare `.wr-block` / `.wr-block--modifier` rule — nothing after the class;
 * 2. any top-level rule whose first compound is the block (pseudos, combinators);
 * 3. any top-level rule starting at the block, `__element` included.
 *
 * Throws when a layer leaves two candidates, rather than picking the one that
 * sorts first: a wrong owner emits a stylesheet the demo does not need and
 * omits the one it does, which is the failure this whole map exists to end.
 */
function blockOwners(entries: readonly EntryPoint[]): Map<string, string> {
  const layers: Map<string, Set<string>>[] = [
    new Map<string, Set<string>>(),
    new Map<string, Set<string>>(),
    new Map<string, Set<string>>(),
  ];
  const claim = (layer: Map<string, Set<string>>, block: string, subpath: string): void => {
    let set = layer.get(block);
    if (!set) layer.set(block, (set = new Set()));
    set.add(subpath);
  };

  for (const entry of entries) {
    if (!entry.ships) continue;
    for (const file of filesIn(join(entry.dir, 'styles'), name => name.endsWith('.scss'))) {
      for (const rule of topLevelSelectors(readFileSync(file, 'utf8'))) {
        if (rule.startsWith('@')) continue;
        for (const one of rule.split(',')) {
          const selector = one.trim().replace(/\s+/g, ' ');
          const match = /^\.(wr-[\w-]+)/.exec(selector);
          if (!match) continue;
          const cls = match[1];
          const block = blockOf(cls);
          const root = cls === block || cls.startsWith(`${block}--`);
          claim(layers[2], block, entry.subpath);
          if (root) claim(layers[1], block, entry.subpath);
          if (root && selector === `.${cls}`) claim(layers[0], block, entry.subpath);
        }
      }
    }
  }

  const owners = new Map<string, string>();
  for (const block of layers[2].keys()) {
    const candidates = layers.find(layer => (layer.get(block)?.size ?? 0) > 0)!.get(block)!;
    if (candidates.size !== 1) {
      throw new Error(
        `gen:selectors — \`.${block}\` is declared by ${[...candidates].sort().join(' and ')} and the map cannot pick one. ` +
          `Give the owning entry point a bare \`.${block} { … }\` rule, or move the borrowed selector out of the other sheet.`
      );
    }
    owners.set(block, [...candidates][0]);
  }
  return owners;
}

/** Where a template can name a `.wr-*` class. Expression bindings included: a literal is a literal. */
const CLASS_ATTRIBUTES = [/\bclass\s*=\s*"([^"]*)"/g, /\[class\]\s*=\s*"([^"]*)"/g, /\[ngClass\]\s*=\s*"([^"]*)"/g];
const CLASS_BINDING = /\[class\.(wr-[\w-]*)\]/g;
/** A `wr-` token that is not the tail of a longer one — `--wr-color-surface` is a token, not a class. */
const CLASS_TOKEN = /(?<![\w-])wr-[a-z][\w-]*/g;
const ELEMENT_TAG = /<(wr-[a-z][\w-]*)/g;

/**
 * A bare attribute on an element — `<button wr-btn>`, `<input wrInput>`.
 *
 * Scanning tags and classes is not enough, and the gap was live: `WrButton`'s
 * selector is `'wr-btn, button[wr-btn], a[wr-btn]'`, and the documented spelling
 * is the attribute one. So `ngwr/tour` and `ngwr/transfer` shipped without
 * `ngwr/button` — a generated sandbox for either rendered raw user-agent
 * buttons, which is the same defect this map exists to close, one selector kind
 * further along. Structural attributes (`*ngIf`), bindings and events are
 * excluded by the leading boundary and by requiring the name to start a word.
 */
const BARE_ATTRIBUTE = /(?<=[\s])(wr[A-Z][\w]*|wr-[a-z][\w-]*)(?=[\s=>/])/g;

/**
 * Per entry point, the OTHER entry points whose stylesheets it needs — closed
 * transitively and narrowed to the ones that ship a sheet.
 *
 * A component's style dependencies are not its import dependencies, which is
 * the regression this fixes. `wr-select` draws its chevron as an inline
 * `<svg class="wr-icon__svg wr-select__chevron">`: the rotation is its own
 * sheet's, the SIZE is `ngwr/icon`'s, and a demo whose TypeScript imports only
 * `ngwr/select` used to render a chevron as tall as the field. Two shapes carry
 * that, and both are read out of the entry point's `.html` templates:
 *
 * - a CLASS another entry point paints, resolved through {@link blockOwners};
 * - an ELEMENT another entry point ships, resolved through the selector map and
 *   falling back to {@link blockOwners} for the internal ones no `public-api.ts`
 *   exports (`<wr-select-panel>`). `<wr-btn>` renders `<wr-spinner>` when it is
 *   loading and `<wr-table>` renders `<wr-pagination>`, so this half is the
 *   same defect wearing a tag instead of a class.
 *
 * Only `.html` is scanned. The inline `template:` literals in the library were
 * checked and every `wr-` class in one belongs to its own block, so parsing TS
 * would add reach the catalog does not use and prose the throw below would trip
 * over.
 *
 * **Transitive, not one level**, because the sandbox looks up only the subpaths
 * the SNIPPET imports: a demo importing `ngwr/table` never mentions
 * `ngwr/pagination`, which is what pulls in `ngwr/select` and then `ngwr/icon`.
 * Closing here rather than at the call site keeps `stylesScss` a lookup, and
 * cycles are fine — the walk is a visited set, not recursion.
 *
 * A class whose block resolves to nothing THROWS. A quietly shorter map is
 * exactly the failure being fixed, and it fails as a chevron the size of a
 * field rather than as an error.
 */
function styleDependencies(entries: readonly EntryPoint[], map: WrSelectorMap): Record<string, readonly string[]> {
  const owners = blockOwners(entries);
  const ships = new Set(styleEntryPoints(entries));
  const nested = new Set(entries.map(e => e.dir));
  const direct = new Map<string, Set<string>>();

  for (const entry of entries) {
    const found = new Set<string>();
    const stopAt = new Set([...nested].filter(dir => dir !== entry.dir && dir.startsWith(`${entry.dir}/`)));

    for (const file of filesIn(entry.dir, name => name.endsWith('.html'), stopAt)) {
      // Comments first, and this is not a nicety: `select.html` and
      // `segmented.html` both explain their `controlId` in a comment that
      // names `<wr-form-field>`, and reading prose as markup gave `ngwr/select`
      // a dependency on `ngwr/form` that nothing on the page paints. Same
      // lesson the selector scan learned about `@Component(` in a docblock.
      const html = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, ' ');
      const where = relative(ROOT_PATH, file);

      const chunks: string[] = [];
      for (const re of CLASS_ATTRIBUTES) for (const m of html.matchAll(re)) chunks.push(m[1]);
      for (const m of html.matchAll(CLASS_BINDING)) chunks.push(m[1]);

      for (const chunk of chunks) {
        for (const token of chunk.matchAll(CLASS_TOKEN)) {
          const block = blockOf(token[0]);
          const owner = owners.get(block);
          if (!owner) {
            throw new Error(
              `gen:selectors — ${where} paints \`.${token[0]}\` and no entry point's stylesheet declares \`.${block}\`. ` +
                'Either the class is a typo, or its sheet writes the block only through interpolation, which this scan cannot follow.'
            );
          }
          if (owner !== entry.subpath) found.add(owner);
        }
      }

      for (const m of html.matchAll(ELEMENT_TAG)) {
        const tag = m[1];
        const target = map.tags[tag]?.path ?? owners.get(tag);
        if (!target) {
          throw new Error(
            `gen:selectors — ${where} renders <${tag}>, which is neither an exported selector nor a block any stylesheet declares.`
          );
        }
        if (target !== entry.subpath) found.add(target);
      }

      // Attribute-selector directives. Unlike a tag or a class, an unknown name
      // here is ordinary markup (`type`, `role`, a consumer's own attribute), so
      // this one looks up rather than throwing — the attribute map is the whole
      // authority on which names are ours.
      for (const m of html.matchAll(BARE_ATTRIBUTE)) {
        const target = map.attributes[m[1]]?.path;
        if (target && target !== entry.subpath) found.add(target);
      }
    }

    direct.set(entry.subpath, found);
  }

  const out: Record<string, readonly string[]> = {};
  for (const entry of entries) {
    const seen = new Set<string>();
    const queue = [...(direct.get(entry.subpath) ?? [])];
    while (queue.length > 0) {
      const next = queue.shift()!;
      if (next === entry.subpath || seen.has(next)) continue;
      seen.add(next);
      queue.push(...(direct.get(next) ?? []));
    }
    const closed = [...seen].filter(p => ships.has(p)).sort();
    if (closed.length > 0) out[entry.subpath] = closed;
  }
  return out;
}

/**
 * The `lucide` range this repository builds against, read from the root
 * `package.json` verbatim.
 *
 * The sandbox has to write a version into every generated project's
 * `package.json`, and it runs in a browser that cannot read this manifest — so
 * the range has to travel to it as a constant. It was a hand-kept literal in
 * `sandbox/project.ts` until it drifted twice in one day behind Dependabot
 * bumps; reading the manifest here is what makes the next bump arrive in the
 * sandbox on its own.
 *
 * Throws rather than falling back to a default: a plausible-looking wrong
 * version in every generated project is the exact failure being removed, and
 * it would fail in the container minutes later with nothing pointing here.
 */
function lucideRange(): string {
  const manifest = JSON.parse(readFileSync(resolve(ROOT_PATH, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const range = manifest.dependencies?.['lucide'] ?? manifest.devDependencies?.['lucide'];
  if (!range) {
    throw new Error(
      'gen:selectors — no `lucide` in the root package.json (dependencies or devDependencies). ' +
        'The sandbox pins the icon set from it: restore the dependency, or drop LUCIDE_VERSION here and in sandbox/project.ts.'
    );
  }
  return range;
}

function bucket(entries: Record<string, WrSelectorTarget>): string {
  return Object.entries(entries)
    .map(([key, t]) => `    ${JSON.stringify(key)}: { symbol: ${JSON.stringify(t.symbol)}, path: ${JSON.stringify(t.path)} },`)
    .join('\n');
}

function serialize(
  map: WrSelectorMap,
  styles: readonly string[],
  deps: Record<string, readonly string[]>,
  lucide: string
): string {
  return `/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/* eslint-disable */
/**
 * GENERATED by \`pnpm gen:selectors\` from the library's \`@Component\` /
 * \`@Directive\` selectors — do not edit.
 *
 * Rename a selector in \`projects/lib\` and re-run; this follows. Missing an
 * entry means the class is not exported from any \`public-api.ts\` — fix it
 * there, not here. The scan is \`scripts/lib/build-selector-map.ts\`.
 *
 * ${map.stats.mapped} of ${map.stats.declarations} declarations are mapped: ${map.stats.withoutSelector} carry no selector and
 * ${map.stats.internal} are internal classes no entry point publishes. A deliberate subset,
 * not a lossy one — the generator throws rather than skipping what it cannot read.
 */

/** Where a selector part resolves to: the class, and the subpath to import it from. */
export interface SelectorRef {
  readonly symbol: string;
  readonly path: string;
}

/**
 * \`satisfies\` rather than a \`Record<string, …>\` annotation, deliberately: the
 * keys stay literal, so \`SELECTORS.tags['wr-btn']\` type-checks and a typo is a
 * compile error instead of \`undefined\` at runtime.
 *
 * A name can appear in BOTH buckets — \`wr-btn\` is the element \`<wr-btn>\` and
 * the attribute in \`button[wr-btn]\`, one class either way.
 */
export const SELECTORS = {
  /** Element selectors, without the angle brackets: \`wr-alert\`. */
  tags: {
${bucket(map.tags)}
  },
  /** Attribute selectors, without the square brackets: \`wrInput\`. */
  attributes: {
${bucket(map.attributes)}
  },
} satisfies {
  readonly tags: Record<string, SelectorRef>;
  readonly attributes: Record<string, SelectorRef>;
};

/**
 * Every \`ngwr/*\` subpath that ships a stylesheet, so a generated project can
 * \`@use\` exactly the components it renders. \`@use\` on an entry point without
 * one does not fail quietly — it fails the build.
 */
export const STYLE_ENTRY_POINTS: readonly string[] = [
${styles.map(p => `  ${JSON.stringify(p)},`).join('\n')}
];

/**
 * Per entry point, the OTHER \`ngwr/*\` stylesheets it needs to paint correctly
 * — transitively closed, and every value is in {@link STYLE_ENTRY_POINTS}.
 *
 * A component's STYLE dependencies are not its IMPORT dependencies, and the
 * sandbox learned that the hard way: \`wr-select\` draws its chevron as an
 * inline \`<svg class="wr-icon__svg wr-select__chevron">\`, so a generated
 * project whose TypeScript imported only \`ngwr/select\` rotated a chevron that
 * \`ngwr/icon\` was supposed to have SIZED, and it came out as tall as the
 * field. Derived from the library's templates by \`pnpm gen:selectors\` — a
 * class another entry point paints, or an element another entry point ships —
 * so the next component that reaches across cannot break this quietly.
 *
 * Closed here rather than at the call site because the consumer only knows the
 * subpaths the SNIPPET imports: a demo importing \`ngwr/table\` never names
 * \`ngwr/pagination\`, which is what reaches \`ngwr/select\` and then \`ngwr/icon\`.
 */
export const STYLE_DEPENDENCIES: Readonly<Record<string, readonly string[]>> = {
${Object.entries(deps)
  .map(([key, value]) => `  ${JSON.stringify(key)}: [${value.map(v => JSON.stringify(v)).join(', ')}],`)
  .join('\n')}
};

/**
 * The \`lucide\` range from this repository's own \`package.json\`, for the
 * \`package.json\` a generated sandbox project ships when a snippet draws an
 * icon.
 *
 * The sandbox needs a version and runs in a browser, which cannot read the
 * repository's manifest — so it is baked in here instead. Nothing to keep in
 * step: bump \`lucide\` and re-run \`pnpm gen:selectors\`, which \`build:showcase\`
 * does first thing.
 */
export const LUCIDE_VERSION = ${JSON.stringify(lucide)};
`;
}

function main(): void {
  const map = buildSelectorMap();
  const { stats } = map;

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const entries = entryPoints();
  const styles = styleEntryPoints(entries);
  const deps = styleDependencies(entries, map);
  const lucide = lucideRange();
  writeFileSync(OUT_FILE, serialize(map, styles, deps, lucide));

  console.log(
    `✓ ${relative(ROOT_PATH, OUT_FILE)} — ${Object.keys(map.tags).length} tags, ` +
      `${Object.keys(map.attributes).length} attributes from ${stats.mapped} declarations, ` +
      `${styles.length} style entry points, ` +
      `${Object.keys(deps).length} with style dependencies, lucide ${lucide}`
  );
  console.log(
    `  ${stats.files} files, ${stats.declarations} declarations` +
      `${stats.mentions > 0 ? ` (+${stats.mentions} mentioned in comments or strings)` : ''}: ` +
      `${stats.mapped} mapped, ${stats.withoutSelector} with no selector, ${stats.internal} internal.`
  );
  if (stats.internal > 0) {
    // Printed in full rather than counted: an internal class here is a decision
    // ("nothing outside the library writes `<wr-mention-panel>`"), and a reader
    // can only check it against the catalog if the names are on screen.
    console.log(`  Internal (not exported from any public-api.ts): ${stats.internalClasses.join(', ')}`);
  }
}

main();
