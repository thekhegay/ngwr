import { PIPES } from './pipes';
import { checkWellFormed } from './well-formed';

import { SELECTORS, type SelectorRef } from '#core/generated/selectors';

/**
 * Turns a template fragment into everything a synthesised component needs:
 * the `imports: [...]` array, the fields the fragment reads, and — the part
 * that decides whether a sandbox opens at all — the names nothing can resolve.
 *
 * This is a scanner, not a parser. It reads the fragment the way a person
 * skimming it would: tags, attribute names, and the expressions inside
 * bindings. That is enough for a docs excerpt and it is honest about the
 * shapes it cannot see; where it is unsure it reports the name as unresolved,
 * which drops the whole snippet to the source fallback rather than opening an
 * app that will not compile. Failing toward "shows the code" is the only
 * failure a visitor can act on.
 *
 * Known limits, all deliberate:
 *
 * - **Structural directives in the `*` micro-syntax** are matched by name only
 *   (`*ngIf` pulls in `CommonModule`); the micro-syntax's own `let`/`as`
 *   bindings are not parsed, so an alias declared there is reported as a field
 *   and gets stubbed. The docs are on `@if` / `@for` throughout, so this is a
 *   path for pasted third-party code, not for this site.
 * - **`ng-content` selectors and `exportAs` references** are not followed.
 * - **Whether the markup PARSES** is a separate question from whether its names
 *   resolve, and `well-formed.ts` answers it — a docs page can print markup it
 *   never meant to run.
 * - **A required input a snippet leaves out** is not detected. `SELECTORS` maps
 *   a selector to a symbol and says nothing about `input.required`, so
 *   `<wr-table [items]="rows">` with no `[columns]` resolves cleanly and then
 *   fails to compile in the sandbox. Closing it means teaching
 *   `scripts/lib/build-selector-map.ts` to emit required inputs.
 * - **Anything a `<script>`-side value supplies** — an `input()` on the page
 *   component, an injected service — cannot be recovered from the fragment, so
 *   it becomes a stub field with a comment saying so.
 */

/** A name the fragment reads that the snippet never shows the source of. */
interface SandboxField {
  readonly name: string;
  /**
   * How the stub has to behave for the template not to throw, and every kind
   * past `value` is a blank page someone would otherwise have seen. `object`,
   * because `{{ user.name }}` on a `null` seed is a TypeError. `list`, because
   * `wr-table` iterates what it is given. `signal`, because a fragment that
   * reads `x()` usually writes `x.set($event)` too, and a function has no
   * `.set`.
   */
  readonly kind: 'value' | 'object' | 'list' | 'method' | 'signal';
}

interface TemplateScan {
  /** Module path to the symbols imported from it, both sorted. */
  readonly imports: ReadonlyMap<string, readonly string[]>;
  readonly fields: readonly SandboxField[];
  /** Names that resolve to nothing. Non-empty means: do not build an app. */
  readonly unresolved: readonly string[];
  /**
   * Reasons a fragment cannot be synthesised even though every name resolved.
   * Also fatal, and phrased as sentences because — unlike an unknown selector —
   * they are not about a name the reader can look up.
   */
  readonly blockers: readonly string[];
  /**
   * An icon is drawn somewhere, so the bootstrap owes the app a
   * `provideWrIcons()` and the manifest a `lucide`. The only need reported from
   * here: every other provider the generated app installs is unconditional,
   * because it costs an import line rather than an npm package (see `mainTs`).
   */
  readonly needsIcons: boolean;
}

/**
 * Angular's own directives, keyed by the attribute that betrays them.
 *
 * A module rather than a directive wherever there is one, because that is what
 * a consumer writes and what the docs snippets already say — importing
 * `FormsModule` for `[(ngModel)]` keeps the generated file recognisable as the
 * one on the page.
 */
const NG_ATTRIBUTES: Readonly<Record<string, SelectorRef>> = {
  ngModel: { symbol: 'FormsModule', path: '@angular/forms' },
  ngModelChange: { symbol: 'FormsModule', path: '@angular/forms' },
  ngModelOptions: { symbol: 'FormsModule', path: '@angular/forms' },
  ngSubmit: { symbol: 'FormsModule', path: '@angular/forms' },
  routerLink: { symbol: 'RouterLink', path: '@angular/router' },
  routerLinkActive: { symbol: 'RouterLinkActive', path: '@angular/router' },
  ngIf: { symbol: 'CommonModule', path: '@angular/common' },
  ngIfElse: { symbol: 'CommonModule', path: '@angular/common' },
  ngIfThen: { symbol: 'CommonModule', path: '@angular/common' },
  ngFor: { symbol: 'CommonModule', path: '@angular/common' },
  ngForOf: { symbol: 'CommonModule', path: '@angular/common' },
  ngForTrackBy: { symbol: 'CommonModule', path: '@angular/common' },
  ngSwitch: { symbol: 'CommonModule', path: '@angular/common' },
  ngSwitchCase: { symbol: 'CommonModule', path: '@angular/common' },
  ngSwitchDefault: { symbol: 'CommonModule', path: '@angular/common' },
  ngClass: { symbol: 'CommonModule', path: '@angular/common' },
  ngStyle: { symbol: 'CommonModule', path: '@angular/common' },
  ngTemplateOutlet: { symbol: 'CommonModule', path: '@angular/common' },
  ngTemplateOutletContext: { symbol: 'CommonModule', path: '@angular/common' },
  ngComponentOutlet: { symbol: 'CommonModule', path: '@angular/common' },
};

/**
 * Form bindings a fragment can carry and a synthesised component cannot honour.
 *
 * Every one of them takes an object built in TypeScript the snippet does not
 * show — a `FieldTree` from `form()`, a `FormGroup` — and a stub is not one:
 * `[formGroup]="{}"` throws inside `FormGroupDirective` on the first change
 * detection and `[formField]="undefined"` inside `FormField`. Both are a blank
 * page, which is the failure this module exists to avoid, so a fragment that
 * binds one goes to the source fallback with the reason spelled out. Tier 1 —
 * a snippet that IS a whole component — has the TypeScript and is unaffected,
 * which is where the Signal Forms demos live.
 */
const FORM_BINDINGS: Readonly<Record<string, string>> = {
  formField: '`[formField]` binds a Signal Forms field tree, which the snippet builds in TypeScript it does not show.',
  formRoot: '`[formRoot]` binds a Signal Forms field tree, which the snippet builds in TypeScript it does not show.',
  formGroup: '`[formGroup]` binds a `FormGroup` the snippet does not show.',
  formGroupName: '`formGroupName` needs a parent `FormGroup` the snippet does not show.',
  formArrayName: '`formArrayName` needs a parent `FormArray` the snippet does not show.',
  formControl: '`[formControl]` binds a `FormControl` the snippet does not show.',
  formControlName: '`formControlName` needs a parent `FormGroup` the snippet does not show.',
};

/** Angular's own elements. They need no import and are not custom elements. */
const NG_TAGS: ReadonlySet<string> = new Set(['ng-container', 'ng-template', 'ng-content']);

/**
 * camelCase DOM properties a template legitimately binds on a plain element.
 *
 * Only needed for the unresolved-name test below: everywhere else an unknown
 * camelCase binding on a bare `<div>` is a directive nobody imported, and
 * Angular refuses to compile it. Kept short on purpose — a name missing here
 * costs a fallback, a name wrongly present costs a broken build.
 */
const DOM_PROPERTIES: ReadonlySet<string> = new Set([
  'ariaLabel',
  'className',
  'colSpan',
  'contentEditable',
  'innerHTML',
  'innerText',
  'maxLength',
  'minLength',
  'readOnly',
  'rowSpan',
  'srcObject',
  'tabIndex',
  'textContent',
]);

/**
 * Inputs across the catalog that take a collection.
 *
 * Named rather than derived from "ends in an s", because `[status]`,
 * `[progress]` and `[class]` all do and none of them is a list — and seeding a
 * scalar with `[]` where the template then indexes it is the same blank page
 * this list exists to prevent, just from the other direction.
 */
const COLLECTION_INPUTS: ReadonlySet<string> = new Set([
  'actions',
  'breadcrumbs',
  'columns',
  'controls',
  'data',
  'events',
  'files',
  'images',
  'items',
  'links',
  'nodes',
  'options',
  'rows',
  'series',
  'steps',
  'swatches',
  'tabs',
  'texts',
  'values',
  'words',
]);

/** Identifiers an expression may name without the component owning them. */
const GLOBALS: ReadonlySet<string> = new Set([
  '$any',
  '$count',
  '$even',
  '$event',
  '$first',
  '$implicit',
  '$index',
  '$last',
  '$odd',
  'as',
  'false',
  'in',
  'instanceof',
  'let',
  'new',
  'null',
  'of',
  'this',
  'track',
  'true',
  'typeof',
  'undefined',
  'void',
]);

/** Every string literal blanked out, so their contents are not read as code. */
function stripLiterals(expression: string): string {
  return expression
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

/** `{ opacity: 0 }` — a key, not a read. Distinguished from `a ? b : c` by depth. */
function isObjectKey(expression: string, at: number, end: number): boolean {
  let depth = 0;
  for (let i = 0; i < at; i++) {
    if (expression[i] === '{') depth++;
    else if (expression[i] === '}') depth--;
  }
  if (depth <= 0) return false;
  const rest = expression.slice(end);
  return /^\s*:/.test(rest);
}

/**
 * Pipe names used in an expression, and the expression with them removed.
 *
 * The lookaround is load-bearing: without it `a || b` reports `b` as a pipe.
 * The first `|` fails (an identifier cannot start with `|`) and the scan simply
 * retries one character later, where `| b` matches perfectly — so `b` would be
 * looked up, missed, and reported as unresolved, dropping a working snippet to
 * the source fallback for a boolean.
 */
function takePipes(expression: string, into: Set<string>): string {
  return expression.replace(/(?<!\|)\|(?!\|)\s*([a-zA-Z_$][\w$]*)/g, (_match, name: string) => {
    into.add(name);
    return '';
  });
}

/**
 * `SELECTORS` keys are literal, which is the point of the generated file, but
 * a scanner asks it about arbitrary strings. Going through `hasOwn` keeps the
 * miss typed as a miss instead of leaning on an index signature that lies.
 */
function lookup<T>(map: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(map, key) ? map[key] : undefined;
}

/** Root identifiers an expression reads, tagged with how they are used. */
function collectIdentifiers(raw: string, pipes: Set<string>, out: Map<string, SandboxField['kind']>): void {
  const expression = takePipes(stripLiterals(raw), pipes);

  for (const match of expression.matchAll(/[A-Za-z_$][\w$]*/g)) {
    const name = match[0];
    const at = match.index;
    const end = at + name.length;

    if (GLOBALS.has(name)) continue;

    // A property access, not a root read: `user.name` owes us `user` only.
    const before = expression.slice(0, at).trimEnd();
    if (before.endsWith('.') || before.endsWith('?.')) continue;

    if (isObjectKey(expression, at, end)) continue;

    const after = expression.slice(end);
    // `x()` with no argument is a signal read, and typing it as a method is not
    // a harmless approximation: the same fragment writes `x.set($event)` on the
    // other half of a two-way binding, and `.set` on a function does not exist.
    // `fmt(a)` takes an argument, so a signal it is not.
    //
    // The cost, and it is only cosmetic: a bare handler — `(click)="open()"` —
    // reads the same way, so the generated component answers a click by reading
    // a signal instead of calling something. Nothing throws and nothing moves,
    // which is the right side to be wrong on, but the reader gets a component
    // shaped a little differently from the one on the page.
    const kind: SandboxField['kind'] = /^\s*\(\s*\)/.test(after)
      ? 'signal'
      : /^\s*\(/.test(after)
        ? 'method'
        : /^\s*(\.|\?\.|\[)/.test(after)
          ? 'object'
          : 'value';

    const existing = out.get(name);
    // A name read both bare and as `x.y` has to survive the `.y`, so the
    // richer seed wins. `list` is only ever set by the `@for` header, which
    // knows more than any single read does.
    if (existing === 'list' || existing === 'method' || existing === 'signal') continue;
    if (existing === 'object' && kind === 'value') continue;
    out.set(name, kind);
  }
}

/** Blocks, and the locals they declare — subtracted from the fields at the end. */
function scanControlFlow(
  template: string,
  pipes: Set<string>,
  reads: Map<string, SandboxField['kind']>,
  locals: Set<string>
): void {
  // `@for (item of items; track item.id; let i = $index)`
  for (const match of template.matchAll(/@for\s*\(([\s\S]*?)\)\s*\{/g)) {
    const header = match[1];
    const each = /^\s*([\w$]+)\s+of\s+([^;]+)/.exec(header);
    if (each) {
      locals.add(each[1]);
      const list = each[2].trim();
      collectIdentifiers(list, pipes, reads);
      const root = /^[A-Za-z_$][\w$]*/.exec(stripLiterals(list));
      if (root && !GLOBALS.has(root[0])) reads.set(root[0], 'list');
    }
    for (const declared of header.matchAll(/let\s+([\w$]+)\s*=/g)) locals.add(declared[1]);
  }

  for (const match of template.matchAll(/@(?:else\s+if|if|switch|case)\s*\(([\s\S]*?)\)\s*\{/g)) {
    const [condition, alias] = match[1].split(/;\s*as\s+/);
    if (alias) locals.add(alias.trim());
    collectIdentifiers(condition, pipes, reads);
  }

  for (const match of template.matchAll(/@let\s+([\w$]+)\s*=([\s\S]*?);/g)) {
    locals.add(match[1]);
    collectIdentifiers(match[2], pipes, reads);
  }
}

/** `[x]` / `(x)` / `[(x)]` / `*x` unwrapped to `x`, plus whether it binds. */
function unwrapAttribute(raw: string): { readonly name: string; readonly bound: boolean } {
  const banana = /^\[\((.+)\)\]$/.exec(raw);
  if (banana) return { name: banana[1], bound: true };
  const property = /^\[(.+)\]$/.exec(raw);
  if (property) return { name: property[1], bound: true };
  const event = /^\((.+)\)$/.exec(raw);
  if (event) return { name: event[1], bound: true };
  if (raw.startsWith('*')) return { name: raw.slice(1), bound: true };
  if (raw.startsWith('@')) return { name: raw.slice(1), bound: true };
  return { name: raw, bound: false };
}

/** An attribute that targets the host element itself, never a directive. */
const isHostBinding = (name: string): boolean =>
  name.startsWith('attr.') || name.startsWith('class.') || name.startsWith('style.') || name.startsWith('data-');

function scanTemplate(template: string): TemplateScan {
  // Comments first: a commented-out `<wr-foo>` must not pull in an import, and
  // an ellipsis inside one must not be read as an expression.
  const source = template.replace(/<!--[\s\S]*?-->/g, '');

  const refs = new Map<string, SelectorRef>();
  const unresolved = new Set<string>();
  const blockers = new Set<string>();
  // `[(ngModel)]` inside a `<form>` needs a `name`, or NgModel throws NG01352
  // on first render. Collected and judged at the end, because the `<form>` may
  // be scanned after the control it wraps.
  let sawForm = false;
  let namelessNgModel = false;
  const pipes = new Set<string>();
  const reads = new Map<string, SandboxField['kind']>();
  const locals = new Set<string>();
  let needsIcons = false;

  const use = (ref: SelectorRef): void => {
    refs.set(`${ref.path}#${ref.symbol}`, ref);
  };

  for (const tag of source.matchAll(/<([a-zA-Z][\w:-]*)((?:'[^']*'|"[^"]*"|[^'">])*)\/?>/g)) {
    const name = tag[1].toLowerCase();
    const attributes = tag[2];

    if (name === 'wr-icon') needsIcons = true;
    if (name === 'form') sawForm = true;

    let hasNgModel = false;
    let hasControlName = false;

    const element = lookup(SELECTORS.tags, name);
    if (element) use(element);
    else if (name.includes('-') && !NG_TAGS.has(name)) unresolved.add(`<${name}>`);

    // Whether anything on this element is a directive decides how strict the
    // camelCase test below can be: on `<wr-btn>` or `<input wrInput>` a
    // camelCase binding is an input of the thing that is already imported; on a
    // bare `<div>` it is a directive nobody brought.
    let elementHasDirective = element !== undefined;
    const pending: string[] = [];
    // `<button wr-btn icon="search">` renders a `<wr-icon>` the fragment never
    // names, so a scan for the TAG alone leaves the generated app without a
    // registry and the button without its glyph. Deferred rather than decided
    // in place, because the attribute that identifies the directive may be read
    // AFTER the icon one — `button[wr-btn]` is the documented spelling and the
    // element itself resolves to nothing.
    let iconAttribute = false;

    for (const attribute of attributes.matchAll(/([^\s=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      const raw = attribute[1];
      const value = attribute[2] ?? attribute[3] ?? attribute[4] ?? '';

      if (raw.startsWith('#')) {
        locals.add(raw.slice(1));
        continue;
      }
      if (raw.startsWith('let-')) {
        locals.add(raw.slice(4) || '$implicit');
        continue;
      }

      const { name: plain, bound } = unwrapAttribute(raw);
      if (plain === 'icon' || plain.endsWith('Icon')) iconAttribute = true;
      if (plain === 'ngModel') hasNgModel = true;
      if (plain === 'name' || plain === 'ngModelOptions') hasControlName = true;
      if (bound && value) {
        collectIdentifiers(value, pipes, reads);
        // `[items]="rows"` — a plural input taking a bare name is the one place
        // the fragment says what SHAPE a value has, and it matters: `wr-table`
        // seeded with `null` throws the moment it iterates, which is a blank
        // page. A heuristic, and admitted as one; `[]` is wrong for a scalar
        // only in the harmless direction (it renders as nothing).
        const bare = /^\s*([A-Za-z_$][\w$]*)\s*$/.exec(value);
        if (bare && COLLECTION_INPUTS.has(plain)) reads.set(bare[1], 'list');
      }
      if (isHostBinding(plain)) continue;

      const directive = lookup(SELECTORS.attributes, plain);
      if (directive) {
        use(directive);
        elementHasDirective = true;
        continue;
      }

      const blocker = lookup(FORM_BINDINGS, plain);
      if (blocker !== undefined) {
        blockers.add(blocker);
        elementHasDirective = true;
        continue;
      }

      const angular = lookup(NG_ATTRIBUTES, plain);
      if (angular) {
        use(angular);
        elementHasDirective = true;
        continue;
      }

      // A `wr`-prefixed name the map does not know gets no special treatment,
      // and an early version that flagged it outright is why: it sent working
      // snippets to the source fallback in bulk, for names that were never a
      // problem. Two kinds hide there. `[wrMentionItems]` and
      // `[wrAffixOffsetTop]` are INPUTS on a directive the same element already
      // carries — Angular's own naming convention, and covered by the deferred
      // test below. `wrToolbarStart`, `wrSplitterStart` and `wrCompareBefore`
      // are not directives at all: they are bare projection markers the parent
      // reads with `ng-content select`, so they need no import and compile as
      // plain attributes.
      if (bound && /[A-Z]/.test(plain) && !DOM_PROPERTIES.has(plain)) pending.push(plain);
    }

    if (hasNgModel && !hasControlName) namelessNgModel = true;
    // Only where something on this element takes inputs: `icon` on a bare
    // `<div>` is a plain attribute nothing reads.
    if (elementHasDirective && iconAttribute) needsIcons = true;
    if (!elementHasDirective) for (const name of pending) unresolved.add(`[${name}]`);
  }

  for (const problem of checkWellFormed(template)) blockers.add(problem);

  if (sawForm && namelessNgModel) {
    blockers.add('`[(ngModel)]` inside a `<form>` needs a `name`, and the snippet does not give one.');
  }

  for (const interpolation of source.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
    collectIdentifiers(interpolation[1], pipes, reads);
  }
  scanControlFlow(source, pipes, reads, locals);

  for (const pipe of pipes) {
    const ref = lookup(PIPES, pipe);
    if (ref) use(ref);
    else unresolved.add(`| ${pipe}`);
  }

  const imports = new Map<string, readonly string[]>();
  for (const ref of refs.values()) {
    const existing = imports.get(ref.path) ?? [];
    if (!existing.includes(ref.symbol)) {
      imports.set(
        ref.path,
        [...existing, ref.symbol].sort((a, b) => a.localeCompare(b))
      );
    }
  }

  const fields = [...reads.entries()]
    .filter(([name]) => !locals.has(name))
    .map(([name, kind]) => ({ name, kind }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    imports: new Map([...imports.entries()].sort(([a], [b]) => a.localeCompare(b))),
    fields,
    unresolved: [...unresolved].sort((a, b) => a.localeCompare(b)),
    blockers: [...blockers].sort((a, b) => a.localeCompare(b)),
    needsIcons,
  };
}

export { scanTemplate, type SandboxField, type TemplateScan };
