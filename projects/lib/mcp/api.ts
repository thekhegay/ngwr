/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** One member of a class's public surface. */
interface ApiMember {
  readonly name: string;
  readonly kind: 'input' | 'model' | 'output' | 'method' | 'property';
  /** The type as declared, with Angular's wrapper unwrapped: `InputSignal<T>` reads as `T`. */
  readonly type: string;
  readonly description: string;
  readonly default: string | null;
  readonly required: boolean;
  /** Set only when the template name differs from the property name. */
  readonly alias: string | null;
}

/** A class, as the shipped declarations describe it. */
interface ApiClass {
  readonly name: string;
  readonly description: string;
  readonly example: string | null;
  readonly docs: string | null;
  readonly members: readonly ApiMember[];
}

/**
 * Angular's signal wrappers, behind whichever namespace alias ng-packagr used.
 *
 * BOTH aliases, which is not decoration: of the 167 shipped declaration files, 99
 * import Angular as `_angular_core` and 25 as `i0`. Matching only the first hid
 * every binding in those 25 files — including `WrIcon`, whose single required
 * input is the entire component.
 */
const SIGNAL_WRAPPER = /^(?:[A-Za-z_$][\w$]*\.)?(InputSignal|InputSignalWithTransform|ModelSignal|OutputEmitterRef)</;

/** Modifiers that may precede a member name in a `.d.ts`. */
const MODIFIERS = new Set(['public', 'private', 'protected', 'static', 'abstract', 'readonly', 'override', 'declare']);

/** Modifiers that mean "not part of the API". */
const HIDDEN = new Set(['private', 'protected', 'static']);

/**
 * A class's public surface, read out of the bundled `.d.ts`.
 *
 * **This is the tool that earns the server its place.** `dist/lib/types/` already
 * carries every summary, `@example` and input description, so a second copy would
 * have to justify itself — and it does not. What an agent cannot do cheaply is USE
 * those files: `ngwr-table.d.ts` is 60 KB of declarations to answer "what inputs
 * does `wr-table` take", and the answer is forty lines. Reading the shipped file
 * and returning only the surface cannot drift, because it IS the published type.
 *
 * **Scanned, not pattern-matched.** The first version was one regular expression
 * per member, and it failed the way pattern-matching a language always fails: the
 * optional JSDoc prefix was lazy but expandable, so any member the pattern could
 * not read — a `private` field, an `abstract` method, a generic signature — let
 * the match grow to the NEXT comment and swallow every public member in between,
 * filing the raw source as the following member's description.
 * `WrTable.scrollToRow` came out with a 5806-character "description" naming 42
 * internals; `WrDialog.open`, the only reason to call that service, vanished.
 * Sixty-seven public members were missing across the catalog and sixty-six leaked
 * `protected` declarations into prose.
 *
 * `typescript` would parse this properly and is not an option: this ships inside a
 * package whose only runtime dependency is `tslib`. A scanner over ng-packagr's
 * OUTPUT — a generated, regular subset of the language — is the middle path, and
 * it is small enough to reason about.
 */
function extractClass(declarations: string, symbol: string): ApiClass | null {
  const start = findClass(declarations, symbol);
  if (start === -1) return null;

  const doc = docCommentBefore(declarations, start);
  const body = classBody(declarations, start);

  return {
    name: symbol,
    description: summaryOf(doc),
    example: tagOf(doc, 'example'),
    docs: tagOf(doc, 'see'),
    members: body === null ? [] : membersOf(body, bindings(body)),
  };
}

/** Every class the file declares, `abstract` ones included. */
function declaredClasses(declarations: string): readonly string[] {
  return [...declarations.matchAll(/declare (?:abstract )?class (\w+)/g)].map(match => match[1]);
}

/** Where `declare class X` / `declare abstract class X` begins, or -1. */
function findClass(source: string, symbol: string): number {
  return source.search(new RegExp(`declare (?:abstract )?class ${escapeRegExp(symbol)}\\b`));
}

/** The `{ … }` of the class at `start`, brace-matched. */
function classBody(source: string, start: number): string | null {
  const open = source.indexOf('{', start);
  if (open === -1) return null;

  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }

  return null;
}

/** The JSDoc block immediately above a declaration, if there is one. */
function docCommentBefore(source: string, at: number): string {
  const before = source.slice(0, at);
  const close = before.lastIndexOf('*/');
  if (close === -1) return '';

  // Only when nothing but whitespace separates them — otherwise it belongs to
  // whatever came in between.
  if (before.slice(close + 2).trim() !== '') return '';

  const open = before.lastIndexOf('/**', close);

  return open === -1 ? '' : before.slice(open, close + 2);
}

/**
 * The tags this reads, and the reason the set is closed.
 *
 * A tag is put on its own line before anything is parsed, because JSDoc allows
 * `/** Show the spinner. \@default false *\/` on ONE line and a line-based reader
 * misses it — `wr-table`'s `loading` kept `@default false` inside its prose and
 * reported no default at all. Only known tags are split out: an `@` in ordinary
 * text, or inside an `@example` body, must stay where it is.
 */
const KNOWN_TAGS = /\s+@(default|defaultValue|example|see|param|returns|throws|deprecated|internal|remarks|since)\b/g;

/** JSDoc text with the comment furniture removed and its tags on their own lines. */
function stripDoc(doc: string): string {
  return doc
    .replace(/^\s*\/\*\*/, '')
    .replace(/\*\/\s*$/, '')
    .split('\n')
    .map(line => line.replace(/^\s*\* ?/, ''))
    .join('\n')
    .replace(KNOWN_TAGS, '\n@$1')
    .trim();
}

/** Everything before the first `@tag`. */
function summaryOf(doc: string): string {
  return stripDoc(doc).split(/^@\w+/m)[0].trim();
}

/**
 * The body of one `@tag`, however many lines it runs to.
 *
 * Split on tag boundaries rather than captured with a lookahead: the version that
 * ended at `(?=^@\w+|$)` under the `m` flag stopped at the first LINE END, so
 * every tag whose body begins on the next line captured nothing. `@example` is
 * written exactly that way throughout this library — 273 of 276 classes have one
 * and three survived — which made the example section of the API tool dead code
 * that nobody noticed, because it simply never rendered.
 */
function tagOf(doc: string, tag: string): string | null {
  const text = stripDoc(doc);
  const lines = text.split('\n');
  const start = lines.findIndex(line => new RegExp(`^@${tag}\\b`).test(line));
  if (start === -1) return null;

  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => /^@\w+/.test(line));
  const body = [lines[start].replace(new RegExp(`^@${tag}\\b`), ''), ...(end === -1 ? rest : rest.slice(0, end))];

  return body.join('\n').trim() || null;
}

/** What a template may bind, and whether it must. */
interface Binding {
  readonly alias: string;
  readonly required: boolean;
}

/**
 * The input map Angular emits into `ɵcmp` / `ɵdir`.
 *
 * The only place required-ness is actually written down. Inferring it from the
 * member's type does not work — `input()` and `input.required()` both emit
 * `InputSignal<T>`, so the first attempt marked EVERY input required, including
 * the five on `wr-alert` that have defaults. The declaration also carries the
 * alias, which is the name a template binds when it differs from the property.
 */
function bindings(body: string): ReadonlyMap<string, Binding> {
  const map = new Map<string, Binding>();
  const pattern = /"([^"]+)":\s*\{\s*"alias":\s*"([^"]*)";\s*"required":\s*(true|false)/g;

  for (const [, name, alias, required] of body.matchAll(pattern)) {
    map.set(name, { alias, required: required === 'true' });
  }

  return map;
}

/**
 * Public members of a class body, read one declaration at a time.
 *
 * The scanner walks the body rather than matching it: comments are consumed as
 * comments, a declaration ends at the first `;` outside every bracket and string,
 * and a member the scanner cannot classify is skipped WITHOUT disturbing the ones
 * around it. That last property is the one a single pattern could not offer.
 */
function membersOf(body: string, declared: ReadonlyMap<string, Binding>): readonly ApiMember[] {
  const members: ApiMember[] = [];
  let doc = '';
  let i = 0;

  while (i < body.length) {
    const char = body[i];

    if (char === '/' && body[i + 1] === '*') {
      const close = body.indexOf('*/', i + 2);
      const comment = body.slice(i, close === -1 ? body.length : close + 2);
      // Only a `/** … */` block documents the member after it.
      doc = comment.startsWith('/**') ? comment : '';
      i = close === -1 ? body.length : close + 2;
      continue;
    }

    if (char === '/' && body[i + 1] === '/') {
      const newline = body.indexOf('\n', i);
      i = newline === -1 ? body.length : newline + 1;
      continue;
    }

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    const end = declarationEnd(body, i);
    const member = parseMember(body.slice(i, end), doc, declared);
    if (member) members.push(member);

    doc = '';
    i = end + 1;
  }

  return members;
}

/** The index of the `;` that ends the declaration starting at `from`. */
function declarationEnd(body: string, from: number): number {
  let depth = 0;
  let quote = '';

  for (let i = from; i < body.length; i++) {
    const char = body[i];

    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = '';
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '(' || char === '[' || char === '{' || char === '<') depth++;
    // `=>` is not a closing angle bracket, and reading it as one truncated nine
    // binding types into TypeScript that does not parse.
    if (char === ')' || char === ']' || char === '}' || (char === '>' && body[i - 1] !== '=')) depth--;

    if (char === ';' && depth <= 0) return i;
  }

  return body.length;
}

/** One declaration's text as a member, or `null` when it is not public API. */
function parseMember(text: string, doc: string, declared: ReadonlyMap<string, Binding>): ApiMember | null {
  const words: string[] = [];
  let rest = text.trim();

  // Leading modifiers, in whatever order they were written.
  for (;;) {
    const match = /^([A-Za-z]+)\s+/.exec(rest);
    if (!match || !MODIFIERS.has(match[1])) break;
    words.push(match[1]);
    rest = rest.slice(match[0].length);
  }

  if (words.some(word => HIDDEN.has(word))) return null;

  // `@internal` is the library saying "this is not for you" about a member that
  // is `public` only because TypeScript needed it to be. Forty-five ship.
  if (/^@internal\b/m.test(stripDoc(doc))) return null;

  const accessor = /^(get|set)\s+/.exec(rest);
  if (accessor) rest = rest.slice(accessor[0].length);

  const named = /^(#?[A-Za-z_$][\w$]*)(\?)?/.exec(rest);
  // Index signatures, computed names, `#private` fields — not API.
  if (!named || named[1].startsWith('#')) return null;

  const name = named[1];
  // `ɵcmp` / `ɵfac` are the compiler's, and a constructor is not something a
  // consumer of an Angular class ever calls — 92 of them were being listed as
  // methods with a return type of `unknown`.
  if (name.startsWith('ɵ') || name === 'constructor') return null;

  rest = rest.slice(named[0].length).trim();

  // A method may carry generics and a parameter list before its return type.
  const callable = rest.startsWith('<') || rest.startsWith('(');
  const signature = callable ? rest.slice(0, rest.length - afterSignature(rest).length).trim() : '';
  if (callable) rest = afterSignature(rest);

  const colon = rest.indexOf(':');
  const type = colon === -1 ? 'unknown' : collapse(rest.slice(colon + 1));
  const wrapper = SIGNAL_WRAPPER.exec(type);
  const binding = declared.get(name);

  return {
    // A method carries its signature, because that is what a caller has to know.
    // A getter does not: `get componentInstance(): C` is read as a property, and
    // naming it `componentInstance()` invites a call that does not exist.
    name: callable && signature && !accessor ? `${name}${collapse(signature)}` : name,
    // A getter is a property to anyone reading it, whatever it compiles to.
    kind: accessor ? 'property' : kindOf(wrapper?.[1], callable),
    type: unwrap(type),
    description: summaryOf(doc),
    default: tagOf(doc, 'default'),
    required: binding?.required ?? false,
    alias: binding && binding.alias !== name ? binding.alias : null,
  };
}

/** Past a member's `<generics>(parameters)`, to whatever follows. */
function afterSignature(rest: string): string {
  let depth = 0;

  for (let i = 0; i < rest.length; i++) {
    const char = rest[i];
    if (char === '(' || char === '<') depth++;
    if (char === ')' || (char === '>' && rest[i - 1] !== '=')) {
      depth--;
      if (depth === 0 && char === ')') return rest.slice(i + 1).trim();
    }
  }

  return rest;
}

function kindOf(wrapper: string | undefined, callable: boolean): ApiMember['kind'] {
  if (wrapper === 'OutputEmitterRef') return 'output';
  if (wrapper === 'ModelSignal') return 'model';
  if (wrapper?.startsWith('InputSignal')) return 'input';

  return callable ? 'method' : 'property';
}

/** `InputSignal<'sm' | 'md'>` reads as `'sm' | 'md'` — the type a template binds. */
function unwrap(type: string): string {
  const match = SIGNAL_WRAPPER.exec(type);
  if (!match) return type;

  const inner = balanced(type.slice(match[0].length));

  // `InputSignalWithTransform<T, TransformT>` — the first argument is the value.
  return splitTopLevel(inner)[0].trim();
}

/** Up to the `>` that closes the wrapper, counting nesting and ignoring `=>`. */
function balanced(source: string): string {
  let depth = 1;

  for (let i = 0; i < source.length; i++) {
    if (source[i] === '<') depth++;
    if (source[i] === '>' && source[i - 1] !== '=') {
      depth--;
      if (depth === 0) return source.slice(0, i);
    }
  }

  return source;
}

/** Split on commas that sit outside every bracket. */
function splitTopLevel(source: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '<' || char === '(' || char === '[' || char === '{') depth++;
    if (char === ')' || char === ']' || char === '}' || (char === '>' && source[i - 1] !== '=')) depth--;

    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  parts.push(current);

  return parts;
}

function collapse(type: string): string {
  return type.replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export { declaredClasses, extractClass };
export type { ApiClass, ApiMember };
