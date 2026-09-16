import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

import { parseTemplate } from '@angular/compiler';

import { describe, expect, it } from 'vitest';

/**
 * `--wr-icon-size` is only read by ONE selector in the whole library —
 * `.wr-icon`, the `<wr-icon>` host (`icon/styles/_index.scss`). A bare inline
 * `<svg class="wr-icon__svg">` sizes itself at `1em` of its own font and never
 * looks at the hook, so a component rule that sets `--wr-icon-size` on a button,
 * a span or the svg itself does exactly nothing.
 *
 * Seventeen such declarations had accumulated across eight entry points, each one
 * reading like a size that was being applied. They were removed, and the four
 * that sat on a `<button>` — where the glyph was the browser's control font
 * rather than anything anyone chose — took a `font-size: inherit` instead; this
 * holds the line.
 *
 * The check is source-only, and that is a limit rather than a shortcut: jsdom
 * applies no stylesheet cascade, so no rendered-DOM spec in this repo can watch
 * a custom property fail to resolve. What a scan CAN do is pair each declaration
 * with the template it lands on, which is precisely where the defect lived.
 *
 * Templates are parsed with Angular's own parser rather than matched with a
 * regex — `@if` / `@for` branches hold the interesting cases (`wr-alert__icon`
 * is a `<wr-icon>` in one branch and a bare `<svg>` in the other), and a regex
 * cannot see the nesting that decides whether a class sits ABOVE an icon host.
 *
 * One blind spot, named rather than papered over: a class only counts here when
 * a template writes it, as a `class` attribute or a `[class.x]` binding. A class
 * a component puts on its OWN host is invisible — whether it is a static
 * `host: { class: '…' }` or, like `wr-btn`, a `[class]` that `button.ts`
 * assembles in a `computed()`. So a hook on `.wr-btn` itself would fail this
 * spec even though `button.html` really does render a `<wr-icon>` inside that
 * host. It fails CLOSED, which is the safe direction, and the answer is an
 * `ALLOWED_WITHOUT_HOST` line saying so — not a regex guessing at a `computed()`.
 * (`.wr-btn__icon` and every other hook in the library today is written in a
 * template, so nothing is on the list for that reason yet.)
 */
const LIB = join(process.cwd(), 'projects/lib');

/**
 * Selectors allowed to declare the hook without owning a `<wr-icon>`, each with
 * the reason — the `check:tokens` "say why" idiom. Anything not listed here has
 * to be witnessed in a template.
 */
const ALLOWED_WITHOUT_HOST: ReadonlyMap<string, string> = new Map([
  [
    ':root',
    "the hook's own default (`icon/styles/_index.scss`) — the declaration every other rule overrides, not an override itself",
  ],
]);

function files(root: string, ext: string, skip: readonly string[] = []): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || skip.includes(name)) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (extname(full) === ext) out.push(full);
    }
  };
  walk(root);
  return out;
}

/** Comments stripped, so a `--wr-icon-size` written in prose is not a declaration. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

interface Declaration {
  readonly file: string;
  readonly line: number;
  /** The rule's own selector list, with `&` already resolved against its parents. */
  readonly selectors: readonly string[];
}

/**
 * Every `--wr-icon-size:` in an SCSS file, with the selector it lands on.
 *
 * A character walk rather than a line scan, because a selector list can span
 * lines (`.wr-select__chip-remove,\n.wr-select__clear {`) and the whole point is
 * to attribute the declaration to every selector in it. At-rules are transparent
 * scopes: `@media (pointer: coarse) { .wr-select__clear { … } }` resolves to
 * `.wr-select__clear`, since the media query changes when the rule applies, not
 * what it applies to.
 */
function declarations(file: string): Declaration[] {
  const source = code(readFileSync(file, 'utf8'));
  const found: Declaration[] = [];
  const stack: string[][] = [];
  let buffer = '';
  let line = 1;

  const resolve = (prelude: string): string[] => {
    const parents = stack.length > 0 ? stack[stack.length - 1] : [''];
    const out: string[] = [];
    for (const raw of prelude.split(',')) {
      const child = raw.trim();
      if (child === '') continue;
      for (const parent of parents) {
        out.push(child.includes('&') ? child.replaceAll('&', parent) : `${parent} ${child}`.trim());
      }
    }
    return out;
  };

  for (const char of source) {
    if (char === '\n') line += 1;
    if (char === '{') {
      const prelude = buffer.trim();
      // An at-rule scopes WHEN a rule applies, never what it matches, so it
      // contributes nothing to `&` — carry the enclosing selectors through.
      stack.push(prelude.startsWith('@') ? (stack[stack.length - 1] ?? ['']) : resolve(prelude));
      buffer = '';
    } else if (char === '}') {
      stack.pop();
      buffer = '';
    } else if (char === ';') {
      if (/--wr-icon-size\s*:/.test(buffer)) {
        found.push({ file, line, selectors: stack[stack.length - 1] ?? [''] });
      }
      buffer = '';
    } else {
      buffer += char;
    }
  }
  return found;
}

/**
 * The compound a selector actually matches — its rightmost part, as a set of
 * class names plus an optional element name. `.wr-cascader-panel
 * .wr-cascader__opt-arrow` targets the arrow, not the panel.
 */
interface Key {
  readonly classes: readonly string[];
  readonly element: string | null;
}

function keyCompound(selector: string): Key {
  const compound =
    selector
      .split(/[\s>+~]+/)
      .filter(Boolean)
      .pop() ?? '';
  // Pseudo-classes and -elements describe a state, not an element to find.
  const bare = compound.replace(/::?[\w-]+(\([^)]*\))?/g, '');
  const classes = [...bare.matchAll(/\.([\w-]+)/g)].map(m => m[1]);
  const element = /^([a-z][\w-]*)/.exec(bare)?.[1] ?? null;
  return { classes, element };
}

interface Owner {
  /** Every class on the element, from a static `class` and from `[class.x]`. */
  readonly classes: ReadonlySet<string>;
  readonly name: string;
  /** True when the element IS a `<wr-icon>` or has one below it. */
  readonly ownsIcon: boolean;
}

/**
 * The shape this walk needs out of Angular's template AST, structurally rather
 * than by class: `TmplAstElement`, `TmplAstTemplate` and every block node carry
 * their children under different keys, and the walk below finds them all.
 */
interface AstNode {
  readonly name?: unknown;
  readonly attributes?: unknown;
  readonly inputs?: unknown;
  readonly children?: unknown;
}

/** Every element in every library template, tagged with whether it owns an icon host. */
function templateElements(): Owner[] {
  const owners: Owner[] = [];

  const classesOf = (node: AstNode): Set<string> => {
    const out = new Set<string>();
    for (const attr of (node.attributes ?? []) as { name: string; value: string }[]) {
      if (attr.name === 'class') for (const c of attr.value.split(/\s+/).filter(Boolean)) out.add(c);
    }
    // `[class.wr-x]="…"` — the class is conditional but the element is the same
    // one, so it still counts as a place the hook could legitimately land.
    for (const input of (node.inputs ?? []) as { name: string }[]) {
      if (input.name.startsWith('class.')) out.add(input.name.slice('class.'.length));
    }
    return out;
  };

  /** Child node arrays, whatever block holds them — `@if`, `@for`, `@switch`, `@defer`. */
  const childrenOf = (node: AstNode): AstNode[] => {
    const out: AstNode[] = [];
    for (const value of Object.values(node as object) as unknown[]) {
      if (Array.isArray(value)) {
        for (const item of value as unknown[]) if (item !== null && typeof item === 'object') out.push(item);
      } else if (value !== null && typeof value === 'object' && 'children' in value) {
        out.push(value);
      }
    }
    return out;
  };

  const isElement = (node: AstNode): node is AstNode & { name: string } =>
    typeof node.name === 'string' && Array.isArray(node.attributes) && Array.isArray(node.children);

  /** Depth-first, returning whether anything at or below `node` is a `<wr-icon>`. */
  const visit = (node: AstNode, seen: Set<object>): boolean => {
    if (seen.has(node)) return false;
    seen.add(node);
    let below = false;
    for (const child of childrenOf(node)) below = visit(child, seen) || below;
    if (!isElement(node)) return below;
    const ownsIcon = node.name === 'wr-icon' || below;
    owners.push({ classes: classesOf(node), name: node.name, ownsIcon });
    return ownsIcon;
  };

  for (const file of files(LIB, '.html', ['schematics', 'mcp', '_svg'])) {
    const parsed = parseTemplate(readFileSync(file, 'utf8'), file, { preserveWhitespaces: true });
    const seen = new Set<object>();
    for (const node of parsed.nodes) visit(node as AstNode, seen);
  }
  return owners;
}

describe('the `--wr-icon-size` hook is only set where a `<wr-icon>` reads it', () => {
  const elements = templateElements();
  const declared = files(LIB, '.scss', ['schematics', 'mcp', '_svg']).flatMap(declarations);

  /** Does any template element carrying all of `key`'s classes own an icon host? */
  const witnessed = (key: Key): boolean => {
    if (key.element === 'wr-icon') return true;
    if (key.classes.length === 0) return false;
    return elements.some(el => el.ownsIcon && key.classes.every(c => el.classes.has(c)));
  };

  it('reads the stylesheets and the templates at all', () => {
    // A scan that silently matched nothing would pass every assertion below.
    expect(declared.length).toBeGreaterThan(10);
    expect(elements.filter(el => el.name === 'wr-icon').length).toBeGreaterThan(10);
  });

  it('finds no declaration on a selector that owns only a bare svg', () => {
    const dead: string[] = [];

    for (const declaration of declared) {
      for (const selector of declaration.selectors) {
        const reason = ALLOWED_WITHOUT_HOST.get(selector);
        if (reason !== undefined) continue;
        if (witnessed(keyCompound(selector))) continue;
        dead.push(
          `${relative(LIB, declaration.file)}:${declaration.line} — \`${selector}\` sets --wr-icon-size, but no template ` +
            'puts a `<wr-icon>` on or under that element. A bare `.wr-icon__svg` is `1em` of its own font and ignores ' +
            "the hook: set `font-size` on the glyph's owner instead. If the class is one the component applies to its " +
            'own HOST (a `host: { class }` literal, or a computed `[class]` like `wr-btn`) this scan cannot see it — ' +
            'add the selector to ALLOWED_WITHOUT_HOST saying that. Either way the list wants a reason, not just an entry.'
        );
      }
    }

    expect(dead).toEqual([]);
  });

  it('witnesses every allowlisted selector as deliberate rather than forgotten', () => {
    const stale = [...ALLOWED_WITHOUT_HOST.keys()].filter(
      selector => !declared.some(d => d.selectors.includes(selector))
    );
    expect(stale, 'allowlisted selectors that no longer declare the hook').toEqual([]);
  });

  it('leaves no inline template outside the scan', () => {
    // The scan reads `.html` files. A `<wr-icon>` in an inline `template:` would
    // be invisible to it, and the failure mode is a silent pass — so refuse one.
    const inline = files(LIB, '.ts', ['schematics', 'mcp', '_svg'])
      .filter(f => !f.endsWith('.spec.ts'))
      .filter(f => /template:\s*[`'"][^`'"]*<wr-icon/.test(code(readFileSync(f, 'utf8'))))
      .map(f => relative(LIB, f));

    expect(inline, 'inline templates rendering a `<wr-icon>`; teach templateElements() to read them').toEqual([]);
  });
});
