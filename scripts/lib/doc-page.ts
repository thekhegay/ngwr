/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * What the generators read off a showcase docs page's own source: the
 * attributes of its `<ngwr-doc-page>` and the `ngwr/*` entry points its demos
 * import.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** One attribute as written: a binding keeps its brackets, so `[since]` and `since` are two names. */
interface TagAttr {
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
 * back as an attribute called `sidebarOpen`.
 */
function parseAttrs(soup: string): TagAttr[] {
  const out: TagAttr[] = [];
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

/** The opening `<ngwr-doc-page` itself, never `<ngwr-doc-page-…>`. */
const DOC_PAGE = /<ngwr-doc-page(?=[\s>])/g;

/** The text of the tag opening at `at`, through its `>`, quoted values respected; `null` when it never closes. */
function openingTag(html: string, at: number): string | null {
  let quote = '';
  for (let i = at; i < html.length; i++) {
    const c = html[i];
    if (quote !== '') {
      if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === '>') return html.slice(at, i + 1);
  }
  return null;
}

/**
 * The attributes of every `<ngwr-doc-page>` opening tag in a template, in
 * source order, by name as written; `null` for a tag that never closes.
 *
 * The tag's end is found by walking past quoted values, because a description
 * can hold a `>` and a `[^>]*` match cuts the tag there. A repeated name keeps
 * its first value, as the browser does.
 */
function docPageTags(html: string): (ReadonlyMap<string, string> | null)[] {
  const tags: (ReadonlyMap<string, string> | null)[] = [];
  for (const found of html.matchAll(DOC_PAGE)) {
    const tag = openingTag(html, found.index);
    if (tag === null) {
      tags.push(null);
      continue;
    }
    const soup = tag.slice(found[0].length, -1).replace(/\/$/, '');
    const attrs = new Map<string, string>();
    for (const { name, value } of parseAttrs(soup)) if (!attrs.has(name)) attrs.set(name, value);
    tags.push(attrs);
  }
  return tags;
}

/**
 * Every `ngwr/*` entry point a page directory's demos import at runtime, with
 * the value symbols each one supplies, in first-seen order.
 *
 * Template literals are stripped first, since a page's snippet strings print
 * imports it never runs. `import type`, inline `type` members and `/testing`
 * subpaths are skipped, an alias counts under its imported name, and an entry
 * point left with no symbol is left out.
 */
function pageNgwrImports(dir: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.ts') || file.endsWith('.routing.ts') || file.endsWith('.spec.ts')) continue;
    const src = readFileSync(join(dir, file), 'utf8').replace(/`(?:\\.|[^`\\])*`/g, '``');

    for (const [, typeOnly, names, path] of src.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s+from\s+'(ngwr\/[^']+)'/g)) {
      if (typeOnly || path.endsWith('/testing')) continue;
      const symbols = out.get(path) ?? new Set<string>();
      for (const raw of names.split(',')) {
        const trimmed = raw.trim();
        if (/^type\s/.test(trimmed)) continue;
        const name = trimmed.split(/\s+as\s+/)[0].trim();
        if (/^[A-Za-z_$]/.test(name)) symbols.add(name);
      }
      if (symbols.size > 0) out.set(path, symbols);
    }
  }
  return out;
}

export { docPageTags, pageNgwrImports, parseAttrs };
export type { TagAttr };
