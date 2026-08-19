/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { declaredClasses, extractClass, type ApiMember } from './api.js';
import type { Catalog, CatalogEntry } from './catalog.js';
import { REQUIRED_PROVIDERS } from './providers.js';

/** A tool as `tools/list` describes it. */
interface ToolSpec {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

const DOCS = 'https://ngwr.dev';

/**
 * The four tools, and why there are only four.
 *
 * Each one answers a question an agent actually has when it is holding this
 * library for the first time: what is there, how do I use this one, what does it
 * take, and what do I have to install. Anything else it can already do — the
 * docs are prerendered HTML with a markdown twin at every URL, and the types are
 * in the tarball. A tool per docs page would be a worse version of `fetch`.
 */
const TOOLS: readonly ToolSpec[] = [
  {
    name: 'search_ngwr',
    description:
      'Search the ngwr catalog by what you need ("date range picker", "wr-select", "virtual scroll"). ' +
      'Returns matching entry points with their import line, selector and one-line description. ' +
      'Start here when you do not already know the entry point name.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What you are looking for.' },
        limit: { type: 'number', description: 'Maximum results. Defaults to 10.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_ngwr_component',
    description:
      'Everything about one entry point: description, selector, exports, import line, SCSS import, ' +
      'documentation URL and the markdown twin of its docs page. Accepts an entry point ' +
      '("ngwr/select", "select"), a symbol ("WrSelect") or a selector ("wr-select").',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Entry point, symbol or selector.' } },
      required: ['name'],
    },
  },
  {
    name: 'get_ngwr_api',
    description:
      'The public inputs, models, outputs and methods of one ngwr class, read out of the ' +
      'declarations shipped in this package — so it is the published signature, not a copy of it. ' +
      'Use instead of reading the .d.ts, which can be 60 KB for one component.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Class name, e.g. WrSelect.' },
        kind: {
          type: 'string',
          enum: ['all', 'input', 'model', 'output', 'method', 'property'],
          description: 'Narrow the surface. Defaults to all.',
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'get_ngwr_setup',
    description:
      'The exact commands and providers needed to use one or more ngwr symbols in an app: ' +
      'install, the `ng g ngwr:use` invocation that wires the import, the SCSS to load, and any ' +
      'provider the symbol depends on. Returns commands to run; it never runs them.',
    inputSchema: {
      type: 'object',
      properties: {
        symbols: {
          type: 'array',
          items: { type: 'string' },
          description: 'Symbols you intend to use, e.g. ["WrSelect", "WrDialog"].',
        },
      },
      required: ['symbols'],
    },
  },
];

/**
 * The published schema, actually enforced.
 *
 * A server that advertises `required: ["query"]` at `tools/list` and then accepts
 * a call without it is lying in a way an agent cannot detect. Worse, three of the
 * six wrong-argument shapes reached the tool body and came back as a raw V8
 * `TypeError` — `symbols.map is not a function` — presented as the answer.
 *
 * Deliberately small: presence, and the handful of types these schemas use. This
 * is not a JSON Schema implementation and should not grow into one.
 */
function validateArguments(tool: ToolSpec, args: Record<string, unknown>): string | null {
  const schema: {
    properties?: Record<string, { type?: string; items?: { type?: string }; enum?: string[] }>;
    required?: string[];
  } = tool.inputSchema;

  for (const name of schema.required ?? []) {
    if (args[name] === undefined || args[name] === null) return `\`${name}\` is required.`;
  }

  for (const [name, expected] of Object.entries(schema.properties ?? {})) {
    const value = args[name];
    if (value === undefined || value === null) continue;

    if (expected.type === 'array') {
      if (!Array.isArray(value)) return `\`${name}\` must be an array.`;

      const wanted = expected.items?.type ?? 'string';
      const items: readonly unknown[] = value;
      if (items.some(item => typeof item !== wanted)) {
        return `every item in \`${name}\` must be a ${wanted}.`;
      }
      continue;
    }

    if (expected.type && typeof value !== expected.type) return `\`${name}\` must be a ${expected.type}.`;

    // `enum` was published and unchecked, which failed in the worst possible
    // shape: `kind: "Input"` answered successfully with ZERO members, and an
    // agent has no way to tell that from a component with no inputs.
    // `typeof` rather than `String(value)`: every `enum` property here is also
    // `type: 'string'`, and stringifying an object would compare `[object Object]`.
    if (expected.enum && (typeof value !== 'string' || !expected.enum.includes(value))) {
      return `\`${name}\` must be one of ${expected.enum.join(', ')}.`;
    }
  }

  return null;
}

function isText(value: unknown): value is string {
  return typeof value === 'string';
}

/** An argument as a string, or empty — never `[object Object]`. */
function text(value: unknown): string {
  return isText(value) ? value : '';
}

/** Runs a tool and returns the text an agent will read. */
function callTool(catalog: Catalog, name: string, args: Record<string, unknown>): string {
  switch (name) {
    // Bracket access and `text()`, because `args` genuinely IS an untyped bag off
    // the wire. The server checks it against the tool's published schema first;
    // this layer still refuses to stringify an object into `[object Object]`.
    case 'search_ngwr':
      return search(catalog, text(args['query']), Number(args['limit'] ?? 10));
    case 'get_ngwr_component':
      return component(catalog, text(args['name']));
    case 'get_ngwr_api':
      return api(catalog, text(args['symbol']), text(args['kind']) || 'all');
    case 'get_ngwr_setup':
      return setup(catalog, Array.isArray(args['symbols']) ? args['symbols'].filter(isText) : []);
    default:
      return `Unknown tool: ${name}. Available: ${TOOLS.map(tool => tool.name).join(', ')}.`;
  }
}

/**
 * Ranked search over the catalog.
 *
 * Scored rather than filtered, because the useful query is "date range picker"
 * and the useful answer is `ngwr/date-picker` first. Name and selector matches
 * outrank a description match, since a description mentions neighbours —
 * `wr-drawer` names the bottom sheet, `wr-select` names the tag mode — and a
 * substring hit there is weaker evidence than the name itself.
 */
function search(catalog: Catalog, query: string, limit: number): string {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 'Give me something to search for.';

  const scored = catalog
    .all()
    .map(entry => ({ entry, score: score(entry, terms) }))
    .filter(hit => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.path.localeCompare(b.entry.path))
    .slice(0, Math.max(1, Math.min(limit || 10, 40)));

  if (scored.length === 0) {
    return `Nothing in the ngwr catalog matches "${query}". The full list is ${DOCS}/llms.txt.`;
  }

  return scored
    .map(({ entry }) =>
      [
        `## ${entry.path}`,
        entry.selectors.length > 0 ? `selector: ${entry.selectors.join(', ')}` : null,
        `import: ${entry.import}`,
        entry.description,
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n\n');
}

function score(entry: CatalogEntry, terms: readonly string[]): number {
  const name = entry.name.toLowerCase();
  const selectors = entry.selectors.join(' ').toLowerCase();
  const exports = entry.exports.join(' ').toLowerCase();
  const description = entry.description.toLowerCase();

  let total = 0;
  for (const term of terms) {
    if (name === term) total += 100;
    else if (name.includes(term)) total += 40;
    if (selectors.includes(term)) total += 30;
    if (exports.includes(term)) total += 20;
    if (description.includes(term)) total += 5;
  }

  return total;
}

function component(catalog: Catalog, name: string): string {
  const entry = catalog.find(name);
  if (!entry) return notFound(catalog, name);

  const declarations = catalog.types(entry.path);
  const classes = declarations ? declaredClasses(declarations).filter(symbol => entry.exports.includes(symbol)) : [];
  const url = docsUrl(declarations, classes);

  return [
    `# ${entry.path}`,
    '',
    // An entry point with no description bullet answered with three blank lines.
    ...(entry.description ? [entry.description, ''] : []),
    entry.selectors.length > 0 ? `- selector: ${entry.selectors.join(', ')}` : null,
    `- import: ${entry.import}`,
    // Only when there is one to load: 58 entry points ship no stylesheet.
    catalog.hasStyles(entry.path) ? `- styles: @use '${entry.path}';` : null,
    `- exports: ${entry.exports.join(', ')}`,
    classes.length > 0 ? `- classes with an API: ${classes.join(', ')} (use get_ngwr_api)` : null,
    // From the class's own `@see`, never guessed. Half the catalog — directives,
    // services, pipes, utils, every `*/testing` harness — has no page under
    // `/reference/components/`, and a link that 404s is worse than none.
    url ? `- docs: ${url}` : null,
    url ? `- docs as markdown: ${url}.md` : null,
  ]
    .filter(line => line !== null)
    .join('\n');
}

/** The documented URL of the first class that declares one. */
function docsUrl(declarations: string | null, classes: readonly string[]): string | null {
  if (!declarations) return null;

  for (const symbol of classes) {
    const found = extractClass(declarations, symbol);
    if (found?.docs?.startsWith('http')) return found.docs.split(/\s/)[0];
  }

  return null;
}

function api(catalog: Catalog, symbol: string, kind: string): string {
  const entry = catalog.find(symbol);
  if (!entry) return notFound(catalog, symbol);

  const declarations = catalog.types(entry.path);
  if (!declarations) return `${entry.path} ships no declarations, so there is no API to read.`;

  const found = extractClass(declarations, symbol);
  if (!found) {
    return `${symbol} is not a class in ${entry.path}. It exports: ${entry.exports.join(', ')}.`;
  }

  const wanted = kind === 'all' ? null : kind;
  const members = found.members.filter(member => (wanted ? member.kind === wanted : member.kind !== 'property'));

  return [
    `# ${found.name} — ${entry.path}`,
    '',
    found.description,
    '',
    ...group(members, 'input'),
    ...group(members, 'model'),
    ...group(members, 'output'),
    ...group(members, 'method'),
    ...group(members, 'property'),
    found.example ? `## Example\n${found.example}` : null,
    found.docs ? `Docs: ${found.docs}` : null,
  ]
    .filter(line => line !== null)
    .join('\n');
}

function group(members: readonly ApiMember[], kind: ApiMember['kind']): string[] {
  const matching = members.filter(member => member.kind === kind);
  if (matching.length === 0) return [];

  return [
    `## ${kind === 'property' ? 'properties' : `${kind}s`}`,
    ...matching.map(member => {
      const bits = [`- \`${member.name}\`: ${member.type}`];
      if (member.alias) bits.push(`(bound as \`${member.alias}\`)`);
      if (member.required) bits.push('(required)');
      if (member.default) bits.push(`default ${member.default}`);
      if (member.description) bits.push(`— ${member.description.replace(/\s+/g, ' ')}`);

      return bits.join(' ');
    }),
    '',
  ];
}

function setup(catalog: Catalog, symbols: readonly string[]): string {
  if (symbols.length === 0) return 'Name at least one symbol, e.g. ["WrSelect"].';

  const found = symbols.map(symbol => ({ symbol, entry: catalog.find(symbol) }));
  const missing = found.filter(hit => !hit.entry).map(hit => hit.symbol);
  const resolved = found.filter((hit): hit is { symbol: string; entry: CatalogEntry } => hit.entry !== null);

  const providers = REQUIRED_PROVIDERS.filter(required => resolved.some(hit => required.test.test(hit.symbol)));
  // `ng g ngwr:use` refuses anything outside `schematics/use/symbol-map.json`
  // ("ngwr:use: unknown symbol"), and `find()` resolves far more than that — it
  // matches any name on an entry point's `exports:` line, so every harness class
  // and every exported type came back as a command that fails. Ask the same map
  // the schematic asks; the rest get the import line they actually need, since a
  // type or a harness must never go into a component's `imports: []` anyway.
  const knows = catalog.symbolMap();

  return [
    '# Setting these up',
    '',
    '## 1. Install',
    'ng add ngwr',
    '(prompts for styles, date adapter, density and theme, and prints a bootstrap snippet)',
    '',
    '## 2. Wire each symbol into the component that uses it',
    ...resolved.map(hit => {
      // Two questions, and the schematic answers "no" to either one. It has to
      // KNOW the symbol, and the symbol has to be declarable — `ng g ngwr:use`
      // refuses a service or a token now rather than splicing it into an
      // `imports: []` where it would not compile. `declarable()` reads the
      // shipped `.d.ts`, so this needs no copy of that list.
      const known = typeof knows[hit.symbol] === 'string';
      const declarable = catalog.declarable(hit.symbol, hit.entry.path);

      if (known && declarable !== false) {
        return `ng g ngwr:use ${hit.symbol} --path src/app/some.component.ts   # ${hit.entry.path}`;
      }

      const why = known ? 'not a declarable — inject or call it' : 'ng g ngwr:use does not know this symbol';

      return `import { ${hit.symbol} } from '${hit.entry.path}';   // by hand — ${why}`;
    }),
    '',
    '`--path` is a NAMED option, not positional — passing it bare fails with `Unknown argument`.',
    '',
    '## 3. Styles',
    "@use 'ngwr';   // everything, or per component:",
    // Only the entry points that ship one. `component()` was fixed for this and
    // `setup()` was missed — which is worse here, because this tool's entire
    // output is commands to run, and `@use 'ngwr/table/testing'` fails the build.
    ...resolved.filter(hit => catalog.hasStyles(hit.entry.path)).map(hit => `@use '${hit.entry.path}';`),
    '',
    ...(providers.length > 0
      ? [
          '## 4. Providers these need',
          ...providers.map(required => `${required.provider}\n   why: ${required.why}`),
          '',
        ]
      : []),
    ...(missing.length > 0 ? [`Not in the catalog: ${missing.join(', ')}. Try search_ngwr.`] : []),
  ].join('\n');
}

function notFound(catalog: Catalog, name: string): string {
  const near = catalog
    .all()
    .filter(entry => entry.name.includes(name.toLowerCase().replace(/^ngwr\//, '')))
    .slice(0, 5)
    .map(entry => entry.path);

  return [
    `No ngwr entry point matches "${name}".`,
    near.length > 0 ? `Close: ${near.join(', ')}.` : 'Use search_ngwr to find one.',
  ].join(' ');
}

export { TOOLS, callTool, validateArguments };
export type { ToolSpec };
