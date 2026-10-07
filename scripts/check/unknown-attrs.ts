/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * A STATIC attribute on an ngwr element that is nobody's input.
 *
 * `strictTemplates` does not catch this and cannot: an unknown attribute on a
 * custom element is legal HTML, so `<wr-btn variant="outlined">` compiles
 * clean, lands on the host as a plain DOM attribute, and the control silently
 * renders its default. That is how v13's own commit subject came to announce a
 * `wrSize` rename that shipped two majors later — following the note wrote a
 * static `size` the compiler accepted and the control ignored.
 *
 * Binding the same name is safe, because `[variant]="x"` on a component with
 * no `variant` input IS an NG8002. Only the static spelling is invisible, so
 * only the static spelling is checked here.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { exit } from 'node:process';

import { err } from '../lib/log/err';
import { info } from '../lib/log/info';

const ROOT = resolve(import.meta.dirname, '../..');
const LIB = join(ROOT, 'projects/lib');
const SHOWCASE = join(ROOT, 'projects/showcase');
const SELECTOR_MAP = join(SHOWCASE, 'app/_core/generated/selectors.ts');

/** Attributes any element may carry, so they are never a component's business. */
const GLOBAL_ATTRS = new Set([
  'id', 'class', 'style', 'title', 'lang', 'dir', 'hidden', 'slot', 'part', 'role',
  'tabindex', 'draggable', 'contenteditable', 'spellcheck', 'translate', 'inert',
  'autofocus', 'enterkeyhint', 'inputmode', 'popover', 'exportparts', 'nonce', 'is',
]);

/** Native attributes that belong to the host element rather than to a directive on it. */
const NATIVE_BY_TAG: Readonly<Record<string, readonly string[]>> = {
  a: ['href', 'target', 'rel', 'download', 'ping', 'referrerpolicy', 'type', 'hreflang'],
  button: ['type', 'disabled', 'name', 'value', 'form', 'formaction', 'formmethod', 'autocomplete'],
  input: [
    'type', 'name', 'value', 'placeholder', 'disabled', 'readonly', 'required', 'checked',
    'min', 'max', 'step', 'pattern', 'maxlength', 'minlength', 'multiple', 'accept',
    'autocomplete', 'list', 'size',
  ],
  textarea: ['name', 'placeholder', 'disabled', 'readonly', 'required', 'rows', 'cols', 'maxlength', 'minlength', 'wrap', 'autocomplete'],
  select: ['name', 'disabled', 'required', 'multiple', 'size', 'autocomplete'],
  form: ['action', 'method', 'novalidate', 'target', 'enctype', 'autocomplete', 'name'],
  img: ['src', 'alt', 'width', 'height', 'loading', 'decoding', 'srcset', 'sizes'],
  svg: ['viewBox', 'xmlns', 'fill', 'stroke', 'width', 'height'],
  video: ['src', 'controls', 'autoplay', 'loop', 'muted', 'poster', 'playsinline', 'preload', 'width', 'height'],
  audio: ['src', 'controls', 'autoplay', 'loop', 'muted', 'preload'],
  table: ['summary'],
  td: ['colspan', 'rowspan', 'headers'],
  th: ['colspan', 'rowspan', 'headers', 'scope', 'abbr'],
  label: ['for'],
  option: ['value', 'selected', 'disabled', 'label'],
  details: ['open'],
  dialog: ['open'],
  ol: ['start', 'reversed', 'type'],
  iframe: ['src', 'title', 'loading', 'allow', 'allowfullscreen', 'width', 'height', 'referrerpolicy', 'sandbox'],
};

interface Ref {
  readonly symbol: string;
  readonly path: string;
}

/** Reads the two buckets out of the generated map, which is plain data. */
function selectorMap(): { tags: Record<string, Ref>; attributes: Record<string, Ref> } {
  const src = readFileSync(SELECTOR_MAP, 'utf8');
  const bucket = (name: string): Record<string, Ref> => {
    const start = src.indexOf(`${name}: {`);
    if (start === -1) throw new Error(`selector map has no \`${name}\` bucket`);
    const out: Record<string, Ref> = {};
    const body = src.slice(start, src.indexOf('\n  },', start));
    for (const m of body.matchAll(/"([^"]+)":\s*\{\s*symbol:\s*"([^"]+)",\s*path:\s*"([^"]+)"/g)) {
      out[m[1]] = { symbol: m[2], path: m[3] };
    }
    return out;
  };
  return { tags: bucket('tags'), attributes: bucket('attributes') };
}

/**
 * Declared input names per exported class, read from the library source.
 *
 * The public name is the alias when one is given — `input(…, { alias: 'x' })`
 * — because the alias is what a template writes.
 */
function inputsBySymbol(): Map<string, Set<string>> {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === 'schematics') continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (extname(full) === '.ts' && !full.endsWith('.spec.ts')) files.push(full);
    }
  };
  walk(LIB);

  const out = new Map<string, Set<string>>();
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const cls of src.matchAll(/export (?:abstract )?class (\w+)/g)) {
      const from = cls.index ?? 0;
      const next = src.slice(from + 1).search(/\nexport (?:abstract )?class /);
      const body = src.slice(from, next === -1 ? undefined : from + 1 + next);
      const names = out.get(cls[1]) ?? new Set<string>();
      // Just the declaration — NOT its generic. `input<string | ((row: X) => Y) | null>()`
      // has a `>` inside the type argument, so a `<[^>]*>` matcher stopped at the
      // arrow and missed the input entirely: `rowKey`, `groupBy` and `childrenKey`
      // all read as undeclared.
      for (const m of body.matchAll(/readonly\s+(\w+)\s*=\s*(?:input|model)(?:\.required)?\b/g)) {
        names.add(m[1]);
      }
      // `input(…, { alias: 'x' })` — the alias is the spelling a template uses.
      for (const m of body.matchAll(/alias:\s*'([^']+)'/g)) names.add(m[1]);
      // A host that reflects an attribute accepts it as well.
      for (const m of body.matchAll(/'\[?attr\.([\w-]+)\]?'\s*:/g)) names.add(m[1]);
      out.set(cls[1], names);
    }
  }
  return out;
}

function templates(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '_generated') continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (extname(full) === '.html' || extname(full) === '.ts') out.push(full);
    }
  };
  walk(SHOWCASE);
  return out;
}

/**
 * A `.ts` file reduced to its template literals, everything else blanked out.
 *
 * **A SNIPPET is markup too, and it is the markup that gets copied.** This
 * check read `.html` only, so `<wr-btn variant="outlined">` in a live demo was
 * caught while the same line printed in a code block beside it was not — and a
 * printed line is what a reader pastes into their own app. The gap was not
 * hypothetical: thirty-two snippets taught `<button wr-btn>` with no `type`,
 * which inside a form is a submit button, while every `.html` in the repo was
 * held to the rule by `@angular-eslint`.
 *
 * Blanked rather than extracted so every offset still lines up with the real
 * file and a finding keeps its line number. Only backtick literals are kept:
 * scanning the whole file would read `Signal<WrFoo>` as an element.
 */
function templateLiteralsOnly(src: string): string {
  const out: string[] = [];
  const blank = (text: string): string => text.replace(/[^\n]/g, ' ');
  let i = 0;
  let depth = 0; // backtick nesting, so a literal inside `${…}` does not end the outer one
  let literal = false;
  let run = '';

  const flushCode = (text: string): void => out.push(blank(text));

  while (i < src.length) {
    const ch = src[i];
    if (!literal) {
      const open = src.indexOf('`', i);
      if (open === -1) {
        flushCode(src.slice(i));
        break;
      }
      flushCode(src.slice(i, open + 1));
      literal = true;
      depth = 1;
      run = '';
      i = open + 1;
      continue;
    }
    if (ch === '\\') {
      run += '  ';
      i += 2;
      continue;
    }
    if (ch === '$' && src[i + 1] === '{') {
      // Skip the expression whole, counting braces AND backticks so a nested
      // literal inside it cannot close the one we are in.
      let j = i + 2;
      let braces = 1;
      let ticks = 0;
      while (j < src.length && braces > 0) {
        const c = src[j];
        if (c === '\\') j++;
        else if (c === '`') ticks = ticks === 0 ? 1 : 0;
        else if (!ticks && c === '{') braces++;
        else if (!ticks && c === '}') braces--;
        j++;
      }
      run += blank(src.slice(i, j));
      i = j;
      continue;
    }
    if (ch === '`') {
      depth--;
      run += ' ';
      i++;
      if (depth === 0) {
        // HTML comments are prose, not markup: a `-->` inside one ends the
        // attribute soup of whatever element the scan was reading.
        out.push(run.replace(/<!--[\s\S]*?-->/g, blank));
        literal = false;
      }
      continue;
    }
    run += ch;
    i++;
  }
  return out.join('');
}

/**
 * Pages whose snippets name an older vocabulary ON PURPOSE — a migration guide
 * prints the attribute it is telling you to rename, and a codemod's fixtures
 * exist to carry the old spelling.
 */
const SNIPPET_EXEMPT = ['start/migration/', '_core/sandbox/'];

/**
 * Attributes owned by somebody other than ngwr, which a snippet may legitimately
 * carry on an ngwr element.
 *
 * A snippet has no `imports` around it, so the check cannot tell which
 * directives are in scope — and these are the ones the docs genuinely teach on
 * ngwr elements: the template-driven forms pair, which `NgModel` and
 * `RequiredValidator` declare, and the CDK's initial-focus marker. Listing them
 * is narrower than skipping `.ts` files altogether, which is what hid thirty-two
 * `<button wr-btn>` without a `type`.
 */
const FOREIGN_ATTRS = new Set(['name', 'required', 'cdkFocusInitial', 'ngModel', 'ngDefaultControl', 'form']);

/** `<wr-select …>` is prose shorthand for "and the rest", not an attribute. */
const ELLIPSIS = /^(?:\u2026|\.\.\.)$/;

interface Finding {
  readonly file: string;
  readonly line: number;
  readonly tag: string;
  readonly attr: string;
  readonly value: string;
  readonly knownOn: readonly string[];
}

/**
 * Attributes that belong to somebody else's directive, so their presence on an
 * ngwr element says nothing about ngwr. Angular's own forms and router, plus
 * the one third-party directive the showcase uses.
 */
const NON_NGWR = new Set([
  'formControlName', 'formGroupName', 'formArrayName', 'ngModel', 'ngModelGroup',
  'ngProjectAs', 'routerLink', 'routerLinkActive', 'ngNonBindable', 'mask',
]);

interface Attr {
  readonly name: string;
  readonly value: string;
  /** A plain `name` or `name="v"` — never a binding, an output or a reference. */
  readonly isStatic: boolean;
}

/**
 * Splits one element's attribute soup.
 *
 * Hand-rolled rather than regexed, because the regex version matched a
 * BINDING'S VALUE as the next attribute's name: `[(open)]="sidebarOpen"` came
 * back as an unknown attribute called `sidebarOpen`, and 200 of the first
 * run's 226 findings were that one mistake wearing different names.
 */
function parseAttrs(soup: string): Attr[] {
  const out: Attr[] = [];
  let i = 0;
  while (i < soup.length) {
    while (i < soup.length && /\s/.test(soup[i])) i++;
    if (i >= soup.length) break;

    let name = '';
    while (i < soup.length && !/[\s=]/.test(soup[i])) name += soup[i++];
    if (name === '') break;

    let value = '';
    while (i < soup.length && /\s/.test(soup[i])) i++;
    if (soup[i] === '=') {
      i++;
      while (i < soup.length && /\s/.test(soup[i])) i++;
      const quote = soup[i];
      if (quote === '"' || quote === "'") {
        i++;
        while (i < soup.length && soup[i] !== quote) value += soup[i++];
        i++;
      } else {
        while (i < soup.length && !/\s/.test(soup[i])) value += soup[i++];
      }
    }

    out.push({ name, value, isStatic: !/^[[(*#@]/.test(name) && !name.includes('.') });
  }
  return out;
}

/**
 * Attribute names the library projects content INTO — `<ng-content
 * select="[wrResultExtra]">`. A consumer writes them on an element to choose a
 * slot, so they are a selector like any other and never an input.
 */
function projectionSlots(): Set<string> {
  const out = new Set<string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules') continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (extname(full) === '.html' || extname(full) === '.ts') {
        for (const m of readFileSync(full, 'utf8').matchAll(/select\s*=\s*["'`][^"'`]*\[([\w-]+)\]/g)) out.add(m[1]);
      }
    }
  };
  walk(LIB);
  return out;
}

function main(): void {
  const { tags, attributes } = selectorMap();
  const inputs = inputsBySymbol();
  const slots = projectionSlots();
  const findings: Finding[] = [];

  // One opening tag, with its attribute soup. Quote-safe so a `>` inside an
  // attribute value cannot end the element early — the same shape the v14
  // codemod needed, for the same reason.
  const ELEMENT = /<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)\/?>/g;

  for (const file of templates()) {
    const raw = readFileSync(file, 'utf8');
    const isTs = extname(file) === '.ts';
    if (isTs && SNIPPET_EXEMPT.some(skip => file.includes(skip))) continue;
    const src = isTs ? templateLiteralsOnly(raw) : raw;
    for (const el of src.matchAll(ELEMENT)) {
      const tag = el[1];
      const present = parseAttrs(el[2] ?? '');

      // Everything that could own an input here: the tag's own component, plus
      // every attribute-selector directive written on the element.
      const owners: Ref[] = [];
      if (tags[tag]) owners.push(tags[tag]);
      // `[wrDropdown]="menu"` applies the directive just as `wrDropdown` does,
      // so the lookup is on the bare name.
      for (const a of present) {
        const bare = a.name.replace(/^[[(]+|[\])]+$/g, '');
        if (attributes[bare]) owners.push(attributes[bare]);
      }
      if (owners.length === 0) continue;

      const accepted = new Set<string>([...NON_NGWR, ...slots, ...FOREIGN_ATTRS]);
      for (const o of owners) for (const n of inputs.get(o.symbol) ?? []) accepted.add(n);
      for (const n of NATIVE_BY_TAG[tag] ?? []) accepted.add(n);
      // An attribute SELECTOR is how a directive is applied, never an input.
      for (const n of Object.keys(attributes)) accepted.add(n);
      for (const a of present) if (ELLIPSIS.test(a.name)) accepted.add(a.name);

      const line = src.slice(0, el.index).split('\n').length;
      for (const a of present) {
        if (!a.isStatic) continue;
        if (GLOBAL_ATTRS.has(a.name) || accepted.has(a.name)) continue;
        if (/^(aria|data|ng|let|i18n|xmlns|xlink)[-.:]?/.test(a.name)) continue;
        findings.push({
          file: file.slice(ROOT.length + 1),
          line,
          tag,
          attr: a.name,
          value: a.value,
          knownOn: [...new Set(owners.map(o => o.symbol))],
        });
      }
    }
  }

  if (findings.length === 0) {
    info('✓ Attributes — every static attribute on an ngwr element is a declared input.');
    return;
  }

  err(`\n✘ ${findings.length} static attribute(s) on an ngwr element that nothing declares:\n`);
  for (const f of findings) {
    err(`  ${f.file}:${f.line}`);
    err(`    <${f.tag} ${f.attr}${f.value ? `="${f.value}"` : ''}>  —  not an input of ${f.knownOn.join(' / ')}`);
  }
  err('');
  exit(1);
}

main();
