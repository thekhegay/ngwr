/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * One lexer for the scripts that read TypeScript as text: which characters are
 * code and which sit in a comment, a string, a template literal or a regex
 * literal. Each caller reads its own view off the same pass — the class mask,
 * blanked comments, the counting text `gen:quality` matches, or the template
 * literals alone — plus a regex blanker for the SCSS and HTML readers, which
 * this lexer would misread.
 */

/** Words a `/` may follow and still open a regex literal: `return /x/`, `a in /x/`. */
const REGEX_AFTER = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'case',
  'delete',
  'void',
  'new',
  'do',
  'else',
  'yield',
  'await',
]);

/** An identifier character, `$` included. */
function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && /[\w$]/.test(ch);
}

/** The `'source'` rule: a value cannot be followed by a regex, so a word, a number or a closing bracket divides. */
function regexBySource(src: string, i: number): boolean {
  let j = i - 1;
  while (j >= 0 && /\s/.test(src[j])) j--;
  if (j < 0) return true;
  const prev = src[j];
  if (prev === ')' || prev === ']' || prev === '}') return false;
  if (!isWordChar(prev)) return true;
  let k = j;
  while (k >= 0 && isWordChar(src[k])) k--;
  return REGEX_AFTER.has(src.slice(k + 1, j + 1));
}

/** Every character but a newline turned into a space. */
function blankText(text: string): string {
  return text.replace(/[^\n]/g, ' ');
}

/** The class of one character of TypeScript source, as {@link lexTs} masks it. */
export const TsClass = { Code: 0, Comment: 1, String: 2, Template: 3, Regex: 4 } as const;

/** What a {@link TsToken} is; a template literal's pieces are all `'template'`. */
export type TsTokenKind = 'line-comment' | 'block-comment' | 'string' | 'template' | 'regex';

/**
 * A comment or a literal, from its opening delimiter to one past its closing
 * one. A template literal with substitutions is several pieces — `` `a${ ``,
 * `}b${`, `` }c` `` — and the code between them is not a token.
 */
export interface TsToken {
  readonly kind: TsTokenKind;
  readonly start: number;
  readonly end: number;
  /** How many `${…}` substitutions enclose it; 0 at the top level. */
  readonly depth: number;
  /** False when the file ended first. A template piece that ends in `${` is closed. */
  readonly closed: boolean;
}

/** What {@link lexTs} returns: the tokens, and the class of every character. */
export interface TsLex {
  /** Every token that is not code, in source order. */
  readonly tokens: readonly TsToken[];
  /** The {@link TsClass} of every index of the source. */
  readonly mask: Uint8Array;
}

/** How {@link lexTs} reads the one ambiguous character, `/`. */
export interface TsLexOptions {
  /**
   * How a `/` is told from division. `'source'` (the default) looks back over
   * whitespace in the raw text. `'tokens'` looks at the last token instead, so
   * a comment is invisible to it and a run of words carries across whitespace,
   * and the regex token ends at a line break and takes its flags: the rule
   * `gen/quality.ts` counts with, kept exactly because its numbers are printed.
   */
  readonly regexRule?: 'source' | 'tokens';
}

/**
 * Lex `src` once into its non-code tokens and a per-index class mask.
 *
 * A `}` closes a `${` only at the brace depth the substitution opened at, so an
 * object literal inside one does not end it, and a template inside a
 * substitution is lexed like any other.
 */
export function lexTs(src: string, options: TsLexOptions = {}): TsLex {
  const byTokens = options.regexRule === 'tokens';
  const tokens: TsToken[] = [];
  const mask = new Uint8Array(src.length);
  /** Brace depth at which each open `${` sits, innermost last. */
  const holes: number[] = [];
  let braces = 0;
  // The 'tokens' rule's memory: the last significant character and the word run.
  let prev = '';
  let word = '';

  const push = (kind: TsTokenKind, cls: number, start: number, end: number, closed: boolean): number => {
    const stop = Math.min(end, src.length);
    tokens.push({ kind, start, end: stop, depth: holes.length, closed });
    mask.fill(cls, start, stop);
    return stop;
  };

  /** One template piece from its opener (a backtick or a substitution's `}`); returns where code resumes. */
  const template = (start: number): number => {
    for (let i = start + 1; i < src.length;) {
      const ch = src[i];
      if (ch === '\\') i += 2;
      else if (ch === '`') {
        prev = '`';
        word = '';
        return push('template', TsClass.Template, start, i + 1, true);
      } else if (ch === '$' && src[i + 1] === '{') {
        const resume = push('template', TsClass.Template, start, i + 2, true);
        holes.push(braces);
        braces++;
        prev = '{';
        word = '';
        return resume;
      } else i++;
    }
    return push('template', TsClass.Template, start, src.length, false);
  };

  const opensRegex = (i: number): boolean => {
    if (!byTokens) return regexBySource(src, i);
    if (prev === '') return true;
    if (prev === ')' || prev === ']' || prev === '}') return false;
    return isWordChar(prev) ? REGEX_AFTER.has(word) : true;
  };

  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (c === '/' && next === '/') {
      const nl = src.indexOf('\n', i);
      i = push('line-comment', TsClass.Comment, i, nl < 0 ? src.length : nl, true);
      continue;
    }
    if (c === '/' && next === '*') {
      const close = src.indexOf('*/', i + 2);
      i = push('block-comment', TsClass.Comment, i, close < 0 ? src.length : close + 2, close >= 0);
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1;
      i = push('string', TsClass.String, i, j + 1, j < src.length);
      prev = c;
      word = '';
      continue;
    }
    if (c === '`') {
      i = template(i);
      continue;
    }
    if (c === '/' && opensRegex(i)) {
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < src.length) {
        const ch = src[j];
        if (ch === '\\') {
          j += 2;
          continue;
        }
        if (byTokens && ch === '\n') break;
        // A `/` inside a character class does not close the literal.
        if (ch === '[') inClass = true;
        else if (ch === ']') inClass = false;
        else if (ch === '/' && !inClass) {
          closed = true;
          break;
        }
        j++;
      }
      j++;
      if (byTokens) while (j < src.length && /[a-z]/.test(src[j])) j++;
      i = push('regex', TsClass.Regex, i, j, closed);
      prev = '/';
      word = '';
      continue;
    }

    if (c === '{') braces++;
    else if (c === '}') {
      if (holes.length > 0 && braces === holes[holes.length - 1] + 1) {
        holes.pop();
        braces--;
        i = template(i);
        continue;
      }
      braces--;
    }
    if (isWordChar(c)) word += c;
    else if (!/\s/.test(c)) word = '';
    if (!/\s/.test(c)) prev = c;
    i++;
  }

  return { tokens, mask };
}

/**
 * `src` with every comment — and, with `strings`, every string body — replaced
 * by spaces, index for index, newlines kept. A template literal's body is
 * blanked whole, substitutions included; a literal the file never closes is
 * left as it is.
 */
export function blankTs(src: string, strings: boolean): string {
  const out = src.split('');
  const blank = (from: number, to: number): void => {
    for (let k = from; k < to; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  let literal = -1;

  for (const token of lexTs(src).tokens) {
    if (token.kind === 'line-comment' || token.kind === 'block-comment') blank(token.start, token.end);
    else if (!strings || token.depth > 0) continue;
    else if (token.kind === 'string') {
      if (token.closed) blank(token.start + 1, token.end - 1);
    } else if (token.kind === 'template') {
      if (src[token.start] === '`') literal = token.start;
      if (token.closed && src[token.end - 1] === '`') blank(literal + 1, token.end - 1);
    }
  }

  return out.join('');
}

/**
 * `src` reduced to what `gen:quality` counts: comments dropped (a block comment
 * leaves one space), string and template bodies emptied, every regex literal
 * written `/RE/`. Offsets and line numbers do not survive.
 */
export function stripTs(src: string): string {
  let out = '';
  let at = 0;

  for (const token of lexTs(src, { regexRule: 'tokens' }).tokens) {
    out += src.slice(at, token.start);
    at = token.end;
    if (token.kind === 'block-comment') out += ' ';
    else if (token.kind === 'regex') out += '/RE/';
    else if (token.kind === 'string') out += src[token.start].repeat(2);
    else if (token.kind === 'template') {
      out += src[token.start];
      if (token.closed) out += src[token.end - 1] === '`' ? '`' : '${';
    }
  }

  return out + src.slice(at);
}

/**
 * A `.ts` file reduced to the bodies of its top-level template literals,
 * everything else blanked index for index. Substitutions, escapes and
 * `<!-- -->` comments inside a body are blanked too; an escape takes its next
 * character with it, a newline included.
 */
export function templateLiteralsOnly(src: string): string {
  let out = '';
  let at = 0;
  let run = '';
  /** Where the open substitution of the literal being read starts, or -1. */
  let hole = -1;

  const flush = (to: number): void => {
    out += run.replace(/<!--[\s\S]*?-->/g, blankText);
    run = '';
    hole = -1;
    at = to;
  };

  for (const token of lexTs(src).tokens) {
    if (token.kind !== 'template' || token.depth > 0) continue;
    if (src[token.start] === '`') out += blankText(src.slice(at, token.start + 1));
    else run += blankText(src.slice(hole, token.start + 1));

    const closedByTick = token.closed && src[token.end - 1] === '`';
    const textEnd = !token.closed ? token.end : closedByTick ? token.end - 1 : token.end - 2;
    for (let k = token.start + 1; k < textEnd; k++) {
      if (src[k] === '\\') {
        run += k + 1 < textEnd ? '  ' : ' ';
        k++;
      } else run += src[k];
    }

    if (closedByTick) {
      run += ' ';
      flush(token.end);
    } else if (!token.closed) flush(token.end);
    else hole = textEnd;
  }

  if (hole >= 0) {
    run += blankText(src.slice(hole));
    flush(src.length);
  }
  return out + blankText(src.slice(at));
}

/**
 * `src` with its block comments, whole-line `//` comments and, with `html`,
 * `<!-- -->` comments blanked, newlines kept so line numbers still hold. For
 * SCSS and HTML, where {@link blankTs} would read an unquoted
 * `url(http://…)` as a comment: a `//` counts only when it opens its line.
 */
export function blankComments(src: string, options: { html?: boolean } = {}): string {
  const out = src.replace(/\/\*[\s\S]*?\*\//g, blankText).replace(/^[ \t]*\/\/.*$/gm, blankText);
  return options.html ? out.replace(/<!--[\s\S]*?-->/g, blankText) : out;
}

export { isWordChar };
