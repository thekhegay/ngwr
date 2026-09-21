/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * What an `@each` in the stylesheets iterates, read out of the SCSS without
 * compiling it.
 *
 * Two gates need that answer, and the one thing they must not do is disagree
 * about it. `check:tokens` expands `var(--wr-color-#{$name}-dark)` into the nine
 * names it stands for, so a concretely-named declaration can be seen as painted
 * with; `check:color-only` unrolls `&--#{$name}` into the nine modifiers it
 * emits, so each can be judged on its own declarations. The resolution used to
 * live inside `check-tokens.ts`, and a second copy in the colour gate would be
 * two readings of one loop: a list one of them drops and the other expands is a
 * token called alive by the first and a rule the second never looks at, with
 * both runs green. So it lives here once and both import it.
 *
 * What it can read is deliberately narrow — a FLAT list or map literal assigned
 * at the start of a line (`$alert-colors: (info: info, …)`) whose every key is a
 * plain name, one `map.keys()` hop from such a map (`$colors:
 * map.keys($base-colors)`, the public loop list every component walks), and an
 * inline `(a, b, c)`. Anything else — a map of maps, a quoted key, a mixin
 * argument, a `map.keys()` written in the `@each` itself — resolves to
 * `undefined` rather than to a best guess, because a guess is the one answer
 * neither caller can tell from the truth. What not knowing means is each
 * caller's decision rather than this module's: `check:tokens` falls back to
 * matching the interpolation as a pattern, `check:color-only` demands a marker.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

function scssFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...scssFiles(path));
    else if (extname(path) === '.scss') out.push(path);
  }
  return out;
}

/**
 * A list declared inside a comment is not a list.
 *
 * Only a `//` that opens its line is stripped, which is the reading
 * `check:tokens` had before this module existed and is kept so its results did
 * not move when it started importing. A trailing `//` inside a multi-line map
 * would cost the member after it — none of the maps under `projects/` carries
 * one today.
 */
function withoutComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

/**
 * Members of `(a, b, c)` or `(a: 1, b: 2)`, as the `@each` binds them — or
 * `undefined` when any entry's KEY is not a plain name.
 *
 * All or nothing, because a partial reading is a wrong one: `(success: x,
 * 'danger': y)` used to come back as `[success]`, and the loop over it was then
 * unrolled for one member and judged green while the other went unread. A key
 * that is quoted, a space-separated list or anything computed makes the whole
 * list unknown, which each caller already has an answer for. Values may be
 * anything — a hex, a length — and are kept only where they are plain names.
 */
function members(body: string): LoopList | undefined {
  const keys: string[] = [];
  const values: string[] = [];
  for (const entry of body.split(',')) {
    if (entry.trim() === '') continue;
    const [key, value] = entry.includes(':') ? entry.split(':') : [entry, entry];
    if (!/^[\w-]+$/.test(key.trim())) return undefined;
    keys.push(key.trim());
    if (/^[\w-]+$/.test(value.trim())) values.push(value.trim());
  }
  return keys.length > 0 ? { keys, values } : undefined;
}

/** The members an `@each` binds: `$key` from `keys`, `$key, $value` from both. */
export interface LoopList {
  readonly keys: string[];
  readonly values: string[];
}

/**
 * An `@each` header — the loop variable, an optional second one for a map's
 * values, and the expression it iterates.
 *
 * The expression may run over several lines, `(\n success,\n danger\n)`, and
 * any variables past the second are matched and not captured. Both used to end
 * the match — `.+?` cannot cross a newline, and a third `$glyph` was not in the
 * pattern at all — and a loop the pattern does not see is neither unrolled nor
 * reported: it passed. `check:tokens` tests one line at a time, where the two
 * spellings agree.
 *
 * Callers must test it against text whose `#{…}` interpolations are already
 * masked, or a `#{` inside the expression ends the match early.
 */
export const EACH = /@each\s+\$([\w-]+)(?:\s*,\s*\$([\w-]+))?(?:\s*,\s*\$[\w-]+)*\s+in\s+([^{]+?)\s*\{/;

/**
 * Every list an `@each` under `roots` can iterate, by BARE name.
 *
 * `theme.$colors` in a component and `$colors` in the theme are one list under
 * two spellings, so the namespace is dropped on the way in. Two files declaring
 * the same name with different members is the case this cannot resolve, so it
 * drops the name rather than guessing — an expansion that is wrong calls a dead
 * token alive, or judges a modifier the stylesheet never emits, and either is
 * worse than not expanding at all.
 */
export function loopLists(roots: readonly string[]): Map<string, LoopList> {
  return listsIn(roots.flatMap(root => scssFiles(root).map(file => readFileSync(file, 'utf8'))));
}

/**
 * The same reading over stylesheet SOURCES rather than a tree — what
 * `check:color-only` feeds its own fixtures through, so a regression in how a
 * list is read fails that gate's self-test instead of passing on the tree.
 */
export function listsIn(sources: readonly string[]): Map<string, LoopList> {
  const out = new Map<string, LoopList>();
  const dropped = new Set<string>();
  const aliases = new Map<string, string>();

  const remember = (name: string, list: LoopList | undefined): void => {
    const seen = out.get(name);
    if (!list || (seen && seen.keys.join() !== list.keys.join())) dropped.add(name);
    if (list) out.set(name, list);
  };

  for (const source of sources) {
    const src = withoutComments(source);
    // Every `$name: (` is looked at, and only a FLAT literal closed by its own
    // `)` is read. `[^)]*` used to cut a map of maps at its first `)`, so
    // overlay's `$placements` came back as `[top, center]` — a key and a value
    // from two different levels — and a loop over one would have been unrolled
    // under names the stylesheet never emits. A literal this cannot read drops
    // the name, so another file's flat list of the same name cannot stand in
    // for it.
    for (const opener of src.matchAll(/^\$([\w-]+)\s*:\s*\(/gm)) {
      const flat = /^\$[\w-]+\s*:\s*\(([^()]*)\)\s*(?:!default\s*)?;/.exec(src.slice(opener.index));
      remember(opener[1], flat ? members(flat[1]) : undefined);
    }
    // `$colors: map.keys($base-colors)` — the public loop list, one hop away
    // from the map every component's `@each` is really walking.
    for (const [, name, map] of src.matchAll(/^\$([\w-]+)\s*:\s*map\.keys\(\s*\$([\w-]+)\s*\)/gm)) {
      aliases.set(name, map);
    }
  }

  for (const [name, source] of aliases) {
    const list = dropped.has(source) ? undefined : out.get(source);
    if (list) remember(name, { keys: list.keys, values: list.keys });
  }
  for (const name of dropped) out.delete(name);

  return out;
}

/**
 * The list behind an `@each`'s expression — an inline `(a, b)`, over as many
 * lines as it likes, or a name `loopLists()` resolved — or `undefined` when it
 * is neither.
 */
export function resolveLoopList(expression: string, lists: ReadonlyMap<string, LoopList>): LoopList | undefined {
  const inline = /^\(([^()]*)\)$/.exec(expression.trim());
  if (inline) return members(inline[1]);
  return /^\(/.test(expression.trim()) ? undefined : lists.get(expression.trim().replace(/^[\w-]+\./, '').replace('$', ''));
}
