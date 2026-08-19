/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Writes a markdown twin of every docs page next to the prerendered HTML:
 * `/reference/components/button` also ships as `/reference/components/button.md`.
 *
 * Why: `llms-full.txt` is one ~35 KB blob covering the whole catalog, which is
 * the right shape for "what is ngwr" and the wrong one for "how do I use
 * `wr-select`". An agent that already knows the component should be able to
 * fetch that component alone, and appending `.md` to the URL it already has is
 * the convention that costs it no lookup.
 *
 * Runs AFTER `build:showcase`, converting the PRERENDERED HTML rather than the
 * page sources. That direction is deliberate, and is the same lesson
 * `gen-sitemap.ts` records: a generator that re-reads `app/` re-implements the
 * docs IA and drifts the first time something is renamed. The rendered page
 * cannot drift from what shipped — if a section stops rendering, its markdown
 * disappears with it, and the floor check below turns that into a failed build.
 *
 * What is deliberately dropped: the live demo itself (`.demo`), playground
 * controls, and the icon grids. They are rendered UI, not documentation — the
 * source block that sits under each demo is what carries the information, and
 * dumping the demo's own DOM would bury it.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exit } from 'node:process';

import { JSDOM } from 'jsdom';

import { err } from './lib/log/err';
import { info } from './lib/log/info';
import { ROOT_PATH } from './lib/paths/root';

const SITE = 'https://ngwr.dev';
const DIST = join(ROOT_PATH, 'dist/showcase');
const ROUTES_JSON = join(DIST, 'prerendered-routes.json');

/**
 * Floor, set AT the current number rather than below it. Slack in a floor
 * licenses exactly the silent erosion this check exists to catch — which only
 * holds if it is raised alongside the export: the floor read 190 while the
 * export wrote 198. The routes in {@link NO_TWIN} are outside the count by
 * design and always were.
 */
const MIN_PAGES = 198;

/**
 * Doc pages that will never have a twin, named so the decision is on the record.
 *
 * The six raw-SVG icon galleries are `RenderMode.Client` on purpose (see
 * `app.routes.server.ts`): prerendering one means up to 240 inlined arbitrary
 * SVGs — the two adapter galleries that DO prerender weigh ~230 KB each — to
 * produce a twin under a kilobyte, because the grid is dropped from the export
 * anyway. That is the wrong trade, and re-deriving a twin from `app/` instead
 * is exactly the drift this generator exists to avoid. So they get none.
 *
 * They still render `<ngwr-doc-page>`, which advertises a `.md` alternate
 * unconditionally — that link points at nothing for these six, and fixing it
 * means an opt-out on the doc-page component, not a change here.
 */
const NO_TWIN: readonly string[] = [
  '/icons/tabler',
  '/icons/phosphor',
  '/icons/heroicons',
  '/icons/iconoir',
  '/icons/radix',
  '/icons/bootstrap',
];

/** Elements whose subtree is rendered UI — kept off the page, not summarized. */
const SKIP = new Set(['div.demo', 'div.controls', 'div.preview', 'ngwr-icon-grid']);

const isSkipped = (el: Element): boolean => {
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
  return SKIP.has(`${el.tagName.toLowerCase()}.${cls}`) || SKIP.has(el.tagName.toLowerCase());
};

/** Collapse runs of whitespace the way HTML rendering does. */
const squash = (text: string): string => text.replace(/\s+/g, ' ');

/**
 * Prose is full of literal tag names — "renders as `<wr-btn>`" — and a markdown
 * reader parses those as inline HTML and drops them. Escaping only `<` keeps
 * the text intact without littering it: backticks are left alone because the
 * pages already use them as markdown, and `>` is only special at line start.
 */
const escapeTags = (text: string): string => text.replace(/</g, '\\<');

/** Inline markup — the leaves of a paragraph, a heading or a table cell. */
function inline(node: Node): string {
  if (node.nodeType === 3) return escapeTags(squash(node.textContent ?? ''));
  if (node.nodeType !== 1) return '';

  const el = node as Element;
  const kids = (): string => Array.from(el.childNodes).map(inline).join('');

  switch (el.tagName.toLowerCase()) {
    case 'code':
    case 'kbd': {
      // A backtick inside the code text would close the span early; the CommonMark
      // answer is a longer fence, not an escape.
      const text = squash(el.textContent ?? '').trim();
      const fence = '`'.repeat(Math.max(1, ...[...text.matchAll(/`+/g)].map(m => m[0].length + 1)));
      return `${fence}${text}${fence}`;
    }
    case 'strong':
    case 'b':
      return `**${kids()}**`;
    case 'em':
    case 'i':
      return `_${kids()}_`;
    case 'a': {
      const href = el.getAttribute('href') ?? '';
      const text = kids().trim();
      if (!href || !text) return text;
      return `[${text}](${href.startsWith('/') ? SITE + href : href})`;
    }
    case 'br':
      return ' ';
    default:
      return kids();
  }
}

const text = (el: Element | null): string => (el ? inline(el).trim() : '');

/** ```lang fence. The language rides on the host element (see `doc-code.ts`). */
function fence(code: Element, out: string[]): void {
  if (code.hasAttribute('data-empty')) return;

  const body = (code.querySelector('pre > code') ?? code.querySelector('pre'))?.textContent ?? '';
  if (!body.trim()) return;

  const lang = code.getAttribute('data-language') ?? code.getAttribute('language') ?? '';
  // A tab strip means the page shows several files and only the open one is in
  // the DOM. Name the rest instead of pretending the block is complete.
  const tabs = Array.from(code.querySelectorAll('.tabs__btn')).map(t => text(t));
  if (tabs.length > 1) out.push(`_Also shown on the page: ${tabs.slice(1).join(', ')}._`);

  out.push(`\`\`\`${lang}\n${body.replace(/\s+$/, '')}\n\`\`\``);
}

/** A `<table>` becomes a markdown table; cells keep their inline markup. */
function table(el: Element, out: string[]): void {
  const cell = (td: Element): string => inline(td).trim().replace(/\|/g, '\\|');
  const rows = Array.from(el.querySelectorAll('tr')).map(tr => Array.from(tr.children).map(cell));
  if (rows.length === 0) return;

  const [head, ...body] = rows;
  const width = Math.max(...rows.map(r => r.length));
  const pad = (r: string[]): string => `| ${[...r, ...Array<string>(width - r.length).fill('')].join(' | ')} |`;

  out.push([pad(head), `| ${Array<string>(width).fill('---').join(' | ')} |`, ...body.map(pad)].join('\n'));
}

function list(el: Element, out: string[]): void {
  const ordered = el.tagName.toLowerCase() === 'ol';
  const items = Array.from(el.children)
    .filter(li => li.tagName.toLowerCase() === 'li')
    .map((li, i) => `${ordered ? `${i + 1}.` : '-'} ${inline(li).trim()}`)
    .filter(line => line.length > 2);
  if (items.length > 0) out.push(items.join('\n'));
}

/** Everything under a section's body, in document order. */
function blocks(el: Element, out: string[]): void {
  for (const child of Array.from(el.children)) {
    if (isSkipped(child)) continue;

    switch (child.tagName.toLowerCase()) {
      case 'ngwr-doc-code':
        fence(child, out);
        break;
      case 'ngwr-doc-snippet':
      case 'ngwr-doc-playground':
        // The demo is skipped by SKIP; what is left worth keeping is its source.
        for (const code of Array.from(child.querySelectorAll('ngwr-doc-code'))) fence(code, out);
        break;
      case 'ngwr-doc-api':
        for (const t of Array.from(child.querySelectorAll('table'))) table(t, out);
        break;
      case 'p': {
        const line = text(child);
        if (line) out.push(line);
        break;
      }
      case 'ul':
      case 'ol':
        list(child, out);
        break;
      case 'h3':
        out.push(`### ${text(child)}`);
        break;
      case 'h4':
        out.push(`#### ${text(child)}`);
        break;
      case 'table':
        table(child, out);
        break;
      case 'pre':
        out.push(`\`\`\`\n${(child.textContent ?? '').replace(/\s+$/, '')}\n\`\`\``);
        break;
      default:
        blocks(child, out);
    }
  }
}

/** `null` when the route is not a docs page (the 404, redirect stubs, …). */
function render(document: Document, route: string): string | null {
  const page = document.querySelector('ngwr-doc-page');
  const header = page?.querySelector(':scope > header');
  const title = text(header?.querySelector('h1') ?? null);
  if (!page || !title) return null;

  const out: string[] = [`# ${title}`];

  const description = text(header?.querySelector('p.description') ?? null);
  if (description) out.push(`> ${description}`);

  const labels = Array.from(header?.querySelectorAll('.labels wr-badge') ?? []).map(b => text(b));
  const meta = [`Source: ${SITE}${route}`];
  if (labels.length > 0) meta.push(`Kind: ${labels.join(', ')}`);
  out.push(meta.join('  \n'));

  for (const section of Array.from(page.querySelectorAll(':scope > .content > ngwr-doc-section'))) {
    const heading = text(section.querySelector(':scope > header > h2'));
    if (heading) out.push(`## ${heading}`);

    const intro = text(section.querySelector(':scope > header > p.description'));
    if (intro) out.push(intro);

    const body = section.querySelector(':scope > .content');
    if (body) blocks(body, out);
  }

  const seeAlso = Array.from(page.querySelectorAll('ngwr-doc-see-also .see-also__card'));
  if (seeAlso.length > 0) {
    out.push('## See also');
    out.push(
      seeAlso
        .map(card => {
          const href = card.getAttribute('href') ?? '';
          const name = text(card.querySelector('.see-also__name'));
          const desc = text(card.querySelector('.see-also__desc'));
          return `- [${name}](${SITE}${href})${desc ? ` — ${desc}` : ''}`;
        })
        .join('\n')
    );
  }

  return `${out.join('\n\n')}\n`;
}

function main(): void {
  if (!existsSync(ROUTES_JSON)) {
    err(`\n✘ md docs: ${ROUTES_JSON} not found. Run build:showcase first — this step must follow the build.\n`);
    exit(1);
  }

  const routes = Object.keys(
    (JSON.parse(readFileSync(ROUTES_JSON, 'utf8')) as { routes?: Record<string, unknown> }).routes ?? {}
  );

  let written = 0;
  let bytes = 0;

  for (const route of routes) {
    const html = route === '/' ? join(DIST, 'index.html') : join(DIST, route.replace(/^\//, ''), 'index.html');
    if (!existsSync(html)) continue;

    const source = readFileSync(html, 'utf8');
    // Redirect stubs render a meta-refresh and nothing else.
    if (source.includes('http-equiv="refresh"')) continue;

    const markdown = render(new JSDOM(source).window.document, route);
    if (!markdown) continue;

    // `/reference/components/button` -> `…/button.md`, a sibling of its own
    // directory, so the URL an agent already holds works with `.md` appended.
    const target = route === '/' ? join(DIST, 'index.md') : `${join(DIST, route.replace(/^\//, ''))}.md`;
    writeFileSync(target, markdown);
    written++;
    bytes += Buffer.byteLength(markdown);
  }

  // A recorded exemption that has quietly stopped applying is worse than no
  // record at all: it keeps asserting a decision someone already reversed. If
  // one of these prerenders again its twin was just written above, so the entry
  // has to go rather than sit there explaining an absence that isn't.
  const stale = NO_TWIN.filter(route => existsSync(join(DIST, route.replace(/^\//, ''), 'index.html')));
  if (stale.length > 0) {
    err(
      `\n✘ md docs: ${stale.join(', ')} now prerender, so NO_TWIN is stale.\n` +
        `  Drop them from the list in scripts/gen-md-docs.ts and raise MIN_PAGES.\n`
    );
    exit(1);
  }

  if (written < MIN_PAGES) {
    err(
      `\n✘ md docs: only ${written} pages exported (expected >= ${MIN_PAGES}).\n` +
        `  The prerender output or the doc-page markup changed — not shipping a stunted export.\n`
    );
    exit(1);
  }

  info(`✓ markdown docs — ${written} pages, ${Math.round(bytes / 1024)} KB`);
}

main();
