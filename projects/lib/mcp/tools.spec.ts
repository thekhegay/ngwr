/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Catalog } from './catalog.js';
import { TOOLS, callTool, validateArguments, type ToolSpec } from './tools.js';

/**
 * The four tools and the schema check in front of them, against a fixture package.
 *
 * The fixture is a temp directory laid out like an installed `ngwr` — the four
 * kinds of file `Catalog` reads and nothing else:
 *
 *   llms-full.txt                     six entry points, in the generator's format
 *   package.json                      the `exports` map, which says who ships a stylesheet
 *   schematics/use/symbol-map.json    symbol → entry point, as the schematics write it
 *   types/ngwr-{alert,badge,select}.d.ts
 *
 * Pointing the reader at it (the constructor takes a root) is what lets this
 * suite run on a checkout that has never built `dist/`, and it also lets the
 * expectations be exact: the answer to "what does `wr-select` take" is a fixed
 * string here, where against the real catalog it changes every time someone
 * adds an input.
 *
 * The six entry points are chosen for the shapes the tools have to survive:
 * two selectors on one entry point (`badge`), a service-only entry point with
 * no selector, no description and no declarations (`overlay`), an entry point
 * whose symbol needs two providers (`date-picker`), a non-class export
 * (`WrBadgeSize`), one component with a full surface (`select`), and a nested
 * harness entry point that ships no stylesheet (`select/testing`).
 */

const CATALOG = [
  '# ngwr — full reference',
  '',
  '> Generated from the library source: every entry point with its import path,',
  '> selector(s), public exports, and description. Concise quick-ref: /llms.txt',
  '',
  '## ngwr/alert',
  "- import: `import { WrAlert } from 'ngwr/alert'`",
  '- selector: `wr-alert`',
  '- exports: WrAlert, WrAlertType',
  '- Inline status banner — info, success, warning, danger, neutral, offline.',
  '',
  '## ngwr/badge',
  "- import: `import { WrBadge } from 'ngwr/badge'`",
  '- selector: `wr-badge`, `wr-tag`',
  '- exports: WrBadge, WrTag, WrBadgeSize',
  '- Small status indicator with color variants and an optional pill shape.',
  '',
  '## ngwr/date-picker',
  "- import: `import { WrDatePicker } from 'ngwr/date-picker'`",
  '- selector: `wr-date-picker`',
  '- exports: WrDatePicker',
  '- Date, time and datetime in one component, over a pluggable adapter.',
  '',
  '## ngwr/overlay',
  "- import: `import { WrOutsideClick } from 'ngwr/overlay'`",
  '- exports: provideWrOverlay, WrOutsideClick',
  '',
  '## ngwr/select',
  "- import: `import { WrSelect } from 'ngwr/select'`",
  '- selector: `wr-select`',
  '- exports: WrSelect, WrSelectOption',
  '- Dropdown select — single, multi, search and tag modes in one component.',
  '',
  // A CDK harness entry point, written the way the generator writes the real
  // thirty-three: nested path, no selector, no description bullet.
  '## ngwr/select/testing',
  "- import: `import { WrSelectHarness } from 'ngwr/select/testing'`",
  '- exports: WrSelectHarness, WrSelectHarnessFilters',
  '',
].join('\n');

const SYMBOL_MAP = {
  WrAlert: 'ngwr/alert',
  WrBadge: 'ngwr/badge',
  WrTag: 'ngwr/badge',
  WrDatePicker: 'ngwr/date-picker',
  WrOutsideClick: 'ngwr/overlay',
  provideWrOverlay: 'ngwr/overlay',
  WrSelect: 'ngwr/select',
  WrSelectHarness: 'ngwr/select/testing',
};

/**
 * The package's own `exports` map — where `hasStyles` gets its answer.
 *
 * Faithful to the real one, including what is missing from it: `ngwr/select/testing`
 * has no entry, because a harness ships no `styles/_index.scss`. 58 of the 166
 * entry points are in that group, and `@use 'ngwr/select/testing'` is not a
 * suggestion, it is a broken Sass build.
 */
const EXPORTS = {
  './alert': { sass: './alert/styles/_index.scss' },
  './badge': { sass: './badge/styles/_index.scss' },
  './date-picker': { sass: './date-picker/styles/_index.scss' },
  './overlay': { sass: './overlay/styles/_index.scss' },
  './select': { sass: './select/styles/_index.scss' },
};

const SELECT_TYPES = `
import * as _angular_core from '@angular/core';

interface WrSelectOption<T> {
    label: string;
    value: T;
}

/**
 * Dropdown select — single, multi, search and tag modes in one component.
 *
 * @see https://ngwr.dev/reference/components/select
 */
declare class WrSelect<T> {
    /** Options the panel renders. */
    readonly options: _angular_core.InputSignal<readonly T[]>;
    /**
     * Placeholder shown while nothing is chosen.
     *
     * @default null
     */
    readonly placeholder: _angular_core.InputSignal<string | null>;
    /** Accessible name for the trigger. */
    readonly ariaLabel: _angular_core.InputSignal<string | null>;
    /** The chosen value. */
    readonly value: _angular_core.ModelSignal<T | null>;
    /** Emitted when the panel opens. */
    readonly opened: _angular_core.OutputEmitterRef<void>;
    /** The trigger element, for consumers that need to measure it. */
    readonly trigger: _angular_core.ElementRef<HTMLElement> | null;
    protected readonly resolvedSize: _angular_core.Signal<string>;
    /** Move focus to the trigger. */
    focus(): void;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<WrSelect<any>, never>;
    static ɵcmp: _angular_core.ɵɵComponentDeclaration<WrSelect<any>, "wr-select", never, { "options": { "alias": "options"; "required": true; "isSignal": true; }; "placeholder": { "alias": "placeholder"; "required": false; "isSignal": true; }; "ariaLabel": { "alias": "aria-label"; "required": false; "isSignal": true; }; "value": { "alias": "value"; "required": false; "isSignal": true; }; }, { "value": "valueChange"; "opened": "opened"; }, never, never, true, never>;
}

export { WrSelect };
export type { WrSelectOption };
`;

const BADGE_TYPES = `
import * as _angular_core from '@angular/core';

type WrBadgeSize = 'sm' | 'md' | 'lg';

/**
 * Small status indicator.
 *
 * @see https://ngwr.dev/reference/components/badge
 */
declare class WrBadge {
    /** Visual size. */
    readonly size: _angular_core.InputSignal<WrBadgeSize>;
}

/** The richer label in the same entry point. */
declare class WrTag {
    /** Text content, when not projected. */
    readonly label: _angular_core.InputSignal<string | null>;
}

export { WrBadge, WrTag };
export type { WrBadgeSize };
`;

const ALERT_TYPES = `
/** Inline status banner. */
declare class WrAlert {
    /** Visual variant. */
    readonly type: _angular_core.InputSignal<string>;
}

export { WrAlert };
`;

let root: string;
let catalog: Catalog;

/** Number of `## ngwr/x` hits a search answer contains. */
const hits = (answer: string): number => answer.split('\n').filter(line => line.startsWith('## ngwr/')).length;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'ngwr-mcp-tools-'));

  writeFileSync(join(root, 'llms-full.txt'), CATALOG);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'ngwr', exports: EXPORTS }));
  mkdirSync(join(root, 'schematics', 'use'), { recursive: true });
  writeFileSync(join(root, 'schematics', 'use', 'symbol-map.json'), JSON.stringify(SYMBOL_MAP, null, 2));
  mkdirSync(join(root, 'types'), { recursive: true });
  writeFileSync(join(root, 'types', 'ngwr-select.d.ts'), SELECT_TYPES);
  writeFileSync(join(root, 'types', 'ngwr-badge.d.ts'), BADGE_TYPES);
  writeFileSync(join(root, 'types', 'ngwr-alert.d.ts'), ALERT_TYPES);
  // No declarations for `overlay`, `date-picker` or `select/testing`: an entry
  // point whose declarations are missing has to answer, not throw.

  catalog = new Catalog(root);
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('TOOLS', () => {
  it('declares exactly the four tools the server advertises', () => {
    // The list is the server's whole surface — a fifth tool, or a rename, is a
    // protocol change for every client that has already listed them.
    expect(TOOLS.map(tool => tool.name)).toEqual([
      'search_ngwr',
      'get_ngwr_component',
      'get_ngwr_api',
      'get_ngwr_setup',
    ]);
  });

  it('gives every tool a schema whose required keys are properties it declares', () => {
    for (const tool of TOOLS) {
      const schema = tool.inputSchema as { type: string; properties: Record<string, unknown>; required: string[] };

      // A client validates arguments against this before the call is made, so a
      // `required` naming a property that is not there rejects every call.
      expect(schema.type).toBe('object');
      expect(schema.required.length).toBeGreaterThan(0);
      for (const key of schema.required) expect(Object.keys(schema.properties)).toContain(key);
      expect(tool.description.length).toBeGreaterThan(40);
    }
  });
});

describe('callTool — search_ngwr', () => {
  it('renders each hit as a heading, selector, import line and description', () => {
    expect(callTool(catalog, 'search_ngwr', { query: 'date-picker' })).toBe(
      [
        '## ngwr/date-picker',
        'selector: wr-date-picker',
        "import: import { WrDatePicker } from 'ngwr/date-picker'",
        'Date, time and datetime in one component, over a pluggable adapter.',
      ].join('\n')
    );
  });

  it('leaves out the selector line for an entry point with nothing to bind', () => {
    const answer = callTool(catalog, 'search_ngwr', { query: 'provideWrOverlay' });

    // `ngwr/overlay` is providers and a directive token; printing an empty
    // `selector:` would invite an agent to write a tag that does not exist.
    expect(answer).toBe(['## ngwr/overlay', "import: import { WrOutsideClick } from 'ngwr/overlay'"].join('\n'));
  });

  it('ranks a name and selector match above a mention in another description', () => {
    const answer = callTool(catalog, 'search_ngwr', { query: 'tag' });

    // `wr-select`'s description names the tag MODE; `ngwr/badge` is the entry
    // point that actually has `<wr-tag>`. Descriptions name neighbours, so a
    // hit in one is the weakest evidence there is — and the answer to "tag"
    // being `ngwr/select` would be wrong in the way an agent acts on.
    expect(answer.split('\n').filter(line => line.startsWith('## '))).toEqual(['## ngwr/badge', '## ngwr/select']);
  });

  it('ranks an entry point that matches every term first', () => {
    const answer = callTool(catalog, 'search_ngwr', { query: 'select tag' });

    // Same two entry points, opposite order: `select` now matches on name,
    // selector and exports, and `badge` only on the second term.
    expect(answer.indexOf('## ngwr/select')).toBeLessThan(answer.indexOf('## ngwr/badge'));
  });

  it('honours a limit, and falls back to a sane one for a nonsense limit', () => {
    // `wr` is in every selector and every export, so all six entry points hit.
    expect(hits(callTool(catalog, 'search_ngwr', { query: 'wr' }))).toBe(6);
    expect(hits(callTool(catalog, 'search_ngwr', { query: 'wr', limit: 2 }))).toBe(2);
    // Zero means "unset", not "no results" — a client sending its default 0
    // should still get an answer.
    expect(hits(callTool(catalog, 'search_ngwr', { query: 'wr', limit: 0 }))).toBe(6);
    // Negative cannot mean fewer than one.
    expect(hits(callTool(catalog, 'search_ngwr', { query: 'wr', limit: -4 }))).toBe(1);
  });

  it('asks for a query rather than dumping the catalog', () => {
    // The failure mode this prevents is 166 entry points arriving as one blob
    // because an argument was dropped.
    expect(callTool(catalog, 'search_ngwr', { query: '' })).toBe('Give me something to search for.');
    expect(callTool(catalog, 'search_ngwr', { query: '   ' })).toBe('Give me something to search for.');
    expect(callTool(catalog, 'search_ngwr', {})).toBe('Give me something to search for.');
  });

  it('says so, with somewhere to go next, when nothing matches', () => {
    expect(callTool(catalog, 'search_ngwr', { query: 'kubernetes' })).toBe(
      'Nothing in the ngwr catalog matches "kubernetes". The full list is https://ngwr.dev/llms.txt.'
    );
  });
});

describe('callTool — get_ngwr_component', () => {
  it('answers with everything needed to use an entry point', () => {
    expect(callTool(catalog, 'get_ngwr_component', { name: 'badge' })).toBe(
      [
        '# ngwr/badge',
        '',
        'Small status indicator with color variants and an optional pill shape.',
        '',
        '- selector: wr-badge, wr-tag',
        "- import: import { WrBadge } from 'ngwr/badge'",
        "- styles: @use 'ngwr/badge';",
        '- exports: WrBadge, WrTag, WrBadgeSize',
        // Only the exports that are classes: `WrBadgeSize` is a type, and
        // pointing get_ngwr_api at it wastes a round trip.
        '- classes with an API: WrBadge, WrTag (use get_ngwr_api)',
        '- docs: https://ngwr.dev/reference/components/badge',
        '- docs as markdown: https://ngwr.dev/reference/components/badge.md',
      ].join('\n')
    );
  });

  it('reaches the same entry point from a symbol or a selector', () => {
    const byName = callTool(catalog, 'get_ngwr_component', { name: 'ngwr/badge' });

    // An agent holding `<wr-tag>` from a template, or `WrTag` from an import,
    // must not have to know it lives in `ngwr/badge`.
    expect(callTool(catalog, 'get_ngwr_component', { name: 'WrTag' })).toBe(byName);
    expect(callTool(catalog, 'get_ngwr_component', { name: 'wr-tag' })).toBe(byName);
  });

  it('omits the selector and the API line for an entry point that has neither', () => {
    const answer = callTool(catalog, 'get_ngwr_component', { name: 'ngwr/overlay' });

    expect(answer).not.toContain('selector');
    expect(answer).not.toContain('classes with an API');
    // It does ship a stylesheet, though — the line is about styles, not classes.
    expect(answer).toContain("- styles: @use 'ngwr/overlay';");
  });

  it('names a stylesheet only for an entry point that ships one', () => {
    const harness = callTool(catalog, 'get_ngwr_component', { name: 'ngwr/select/testing' });

    // Read from the package's `exports` map. The line used to be printed for
    // every entry point, and 58 of the 166 ship no `styles/_index.scss` — so
    // following the advice for a harness, a service or an adapter fails a
    // consumer's build with "Can't find stylesheet to import".
    expect(harness).not.toContain('- styles:');
    expect(harness).toContain("- import: import { WrSelectHarness } from 'ngwr/select/testing'");
    expect(callTool(catalog, 'get_ngwr_component', { name: 'ngwr/select' })).toContain("- styles: @use 'ngwr/select';");
  });

  it('points at close names when there is no match, and at search when there are none', () => {
    // "sel" is not an entry point, but it is the start of one — the suggestion
    // saves a second call.
    expect(callTool(catalog, 'get_ngwr_component', { name: 'sel' })).toBe(
      'No ngwr entry point matches "sel". Close: ngwr/select, ngwr/select/testing.'
    );
    expect(callTool(catalog, 'get_ngwr_component', { name: 'kubernetes' })).toBe(
      'No ngwr entry point matches "kubernetes". Use search_ngwr to find one.'
    );
  });

  it('links the docs page the class itself documents, and nothing when it names none', () => {
    const documented = callTool(catalog, 'get_ngwr_component', { name: 'ngwr/badge' });
    const undocumented = callTool(catalog, 'get_ngwr_component', { name: 'ngwr/overlay' });

    // This case used to pin a guess: the URL was built as
    // `reference/components/<name>` for everything, and half the catalog is
    // documented somewhere else — directives, services, pipes, utils and
    // validators have their own clusters, the animation components live under
    // `/animations/`, and the harness entry points have no page at all. 84 of
    // the 166 got a link that 404s, the markdown twin beside it doubly so: an
    // agent that fetched the twin parsed the 404 page as documentation. The URL
    // now comes from the `@see` in the class's own JSDoc — the same string the
    // docs site is built from — and an entry point without one gets no line,
    // because no link is a better answer than a wrong one.
    expect(documented).toContain('- docs: https://ngwr.dev/reference/components/badge');
    expect(documented).toContain('- docs as markdown: https://ngwr.dev/reference/components/badge.md');
    expect(undocumented).not.toContain('- docs');
  });
});

describe('callTool — get_ngwr_api', () => {
  it('renders the public surface, grouped, with required, alias and default', () => {
    expect(callTool(catalog, 'get_ngwr_api', { symbol: 'WrSelect' })).toBe(
      [
        '# WrSelect — ngwr/select',
        '',
        'Dropdown select — single, multi, search and tag modes in one component.',
        '',
        '## inputs',
        '- `options`: readonly T[] (required) — Options the panel renders.',
        '- `placeholder`: string | null default null — Placeholder shown while nothing is chosen.',
        '- `ariaLabel`: string | null (bound as `aria-label`) — Accessible name for the trigger.',
        '',
        '## models',
        '- `value`: T | null — The chosen value.',
        '',
        '## outputs',
        '- `opened`: void — Emitted when the panel opens.',
        '',
        '## methods',
        // A method carries its signature, so an agent knows what to pass
        // without opening the `.d.ts` this tool exists to replace.
        '- `focus()`: void — Move focus to the trigger.',
        '',
        'Docs: https://ngwr.dev/reference/components/select',
      ].join('\n')
    );
  });

  it('leaves plain properties out of the default answer and reachable on request', () => {
    const properties = callTool(catalog, 'get_ngwr_api', { symbol: 'WrSelect', kind: 'property' });

    // `trigger` is public but it is not something a template binds, so it does
    // not belong in the list an agent scans for inputs.
    expect(callTool(catalog, 'get_ngwr_api', { symbol: 'WrSelect' })).not.toContain('- `trigger`');
    expect(properties).toContain('- `trigger`: _angular_core.ElementRef<HTMLElement> | null');
    // This one heading is spelled by hand: pluralising the kind with a bare `s`,
    // as the other four are, printed `## propertys`.
    expect(properties).toContain('## properties');
  });

  it('narrows to one kind on request', () => {
    const inputs = callTool(catalog, 'get_ngwr_api', { symbol: 'WrSelect', kind: 'input' });

    expect(inputs).toContain('## inputs');
    expect(inputs).not.toContain('## models');
    expect(inputs).not.toContain('## outputs');
  });

  it('never reports a protected member as API', () => {
    // The one thing that would be actively harmful: `resolvedSize` is an
    // internal the library renames without notice.
    expect(callTool(catalog, 'get_ngwr_api', { symbol: 'WrSelect', kind: 'property' })).not.toContain('resolvedSize');
  });

  it('reads a second class out of the same entry point', () => {
    // `ngwr/badge` ships two. Resolving the entry point and then the class is
    // the reason the tool takes a symbol rather than an entry point name.
    expect(callTool(catalog, 'get_ngwr_api', { symbol: 'WrTag' })).toContain('# WrTag — ngwr/badge');
    expect(callTool(catalog, 'get_ngwr_api', { symbol: 'WrBadge' })).toContain('- `size`: WrBadgeSize');
  });

  it('explains a symbol that is exported but is not a class', () => {
    // Type aliases, tokens and provider functions all land here, and naming the
    // entry point's exports is what turns the dead end into a next step.
    expect(callTool(catalog, 'get_ngwr_api', { symbol: 'WrBadgeSize' })).toBe(
      'WrBadgeSize is not a class in ngwr/badge. It exports: WrBadge, WrTag, WrBadgeSize.'
    );
  });

  it('says when an entry point ships no declarations at all', () => {
    expect(callTool(catalog, 'get_ngwr_api', { symbol: 'provideWrOverlay' })).toBe(
      'ngwr/overlay ships no declarations, so there is no API to read.'
    );
  });

  it('falls back to the not-found answer for an unknown symbol', () => {
    expect(callTool(catalog, 'get_ngwr_api', { symbol: 'WrKubernetes' })).toBe(
      'No ngwr entry point matches "WrKubernetes". Use search_ngwr to find one.'
    );
  });
});

describe('callTool — get_ngwr_setup', () => {
  it('answers with the install, the wiring command and the styles for each symbol', () => {
    expect(callTool(catalog, 'get_ngwr_setup', { symbols: ['WrBadge'] })).toBe(
      [
        '# Setting these up',
        '',
        '## 1. Install',
        'ng add ngwr',
        '(prompts for styles, date adapter, density and theme, and prints a bootstrap snippet)',
        '',
        '## 2. Wire each symbol into the component that uses it',
        'ng g ngwr:use WrBadge --path src/app/some.component.ts   # ngwr/badge',
        '',
        // The one thing everybody gets wrong about this generator, so the tool
        // says it before the agent runs the command.
        '`--path` is a NAMED option, not positional — passing it bare fails with `Unknown argument`.',
        '',
        '## 3. Styles',
        "@use 'ngwr';   // everything, or per component:",
        "@use 'ngwr/badge';",
        '',
      ].join('\n')
    );
  });

  it('names every provider a symbol cannot work without', () => {
    const answer = callTool(catalog, 'get_ngwr_setup', { symbols: ['WrDatePicker'] });

    // A date picker with neither provider compiles, renders, and does nothing —
    // no error names the cause, which is the whole reason this section exists.
    expect(answer).toContain('## 4. Providers these need');
    expect(answer).toContain("provideWrOverlay() // from 'ngwr/overlay'");
    expect(answer).toContain('provideWrDateAdapter(wrDateFnsAdapter)');
    expect(answer).toContain('why: every date mode goes through an adapter; there is no built-in default');
  });

  it('leaves the provider section out for a symbol that needs none', () => {
    expect(callTool(catalog, 'get_ngwr_setup', { symbols: ['WrAlert'] })).not.toContain('Providers');
  });

  it('handles several symbols at once and reports the ones it cannot place', () => {
    const answer = callTool(catalog, 'get_ngwr_setup', { symbols: ['WrSelect', 'WrBadge', 'WrNope'] });

    expect(answer).toContain('ng g ngwr:use WrSelect --path src/app/some.component.ts   # ngwr/select');
    expect(answer).toContain('ng g ngwr:use WrBadge --path src/app/some.component.ts   # ngwr/badge');
    expect(answer).toContain("@use 'ngwr/select';");
    // Named at the end rather than silently dropped: a typo an agent can see is
    // a typo it can fix.
    expect(answer).toContain('Not in the catalog: WrNope. Try search_ngwr.');
  });

  it('gives no provider advice for a symbol it could not resolve', () => {
    const answer = callTool(catalog, 'get_ngwr_setup', { symbols: ['WrDialog'] });

    // `WrDialog` matches the overlay rule by name, but it is not in this
    // catalog — advice about a symbol the install does not have is noise, and
    // the missing line is the honest answer.
    expect(answer).not.toContain('## 4. Providers these need');
    expect(answer).toContain('Not in the catalog: WrDialog. Try search_ngwr.');
  });

  it('asks for a symbol when given none', () => {
    expect(callTool(catalog, 'get_ngwr_setup', { symbols: [] })).toBe('Name at least one symbol, e.g. ["WrSelect"].');
    expect(callTool(catalog, 'get_ngwr_setup', {})).toBe('Name at least one symbol, e.g. ["WrSelect"].');
  });
});

describe('validateArguments', () => {
  /** The published spec of one tool, so these cases run against the real schemas. */
  const specOf = (name: string): ToolSpec => {
    const found = TOOLS.find(tool => tool.name === name);
    if (!found) throw new Error(`no tool named ${name}; got ${TOOLS.map(tool => tool.name).join(', ')}`);

    return found;
  };

  it('has no complaint about arguments the published schema allows', () => {
    // `null` means "nothing wrong"; the server refuses the call on anything else.
    expect(validateArguments(specOf('search_ngwr'), { query: 'select', limit: 5 })).toBeNull();
    // An optional argument left out, and one sent as an explicit `null`, are
    // both "not given" — clients send both for a value they have no opinion on,
    // and rejecting the second one would refuse calls that are fine.
    expect(validateArguments(specOf('search_ngwr'), { query: 'select' })).toBeNull();
    expect(validateArguments(specOf('search_ngwr'), { query: 'select', limit: null })).toBeNull();
  });

  it('names the required argument a call left out', () => {
    // A server that publishes `required: ["query"]` at `tools/list` and then
    // answers a call without it is lying in a way an agent cannot detect.
    expect(validateArguments(specOf('search_ngwr'), {})).toBe('`query` is required.');
    expect(validateArguments(specOf('get_ngwr_api'), { kind: 'input' })).toBe('`symbol` is required.');
  });

  it('names the argument whose type the schema does not allow', () => {
    expect(validateArguments(specOf('search_ngwr'), { query: 12 })).toBe('`query` must be a string.');
    expect(validateArguments(specOf('search_ngwr'), { query: 'x', limit: '5' })).toBe('`limit` must be a number.');
  });

  it('checks an array argument and the items in it', () => {
    // `symbols.map is not a function` was one of three raw V8 TypeErrors that
    // used to reach the agent as the answer to its question.
    expect(validateArguments(specOf('get_ngwr_setup'), { symbols: 'WrSelect' })).toBe('`symbols` must be an array.');
    expect(validateArguments(specOf('get_ngwr_setup'), { symbols: ['WrSelect', 7] })).toBe(
      'every item in `symbols` must be a string.'
    );
    // An empty array satisfies the schema; the tool itself asks for a symbol.
    expect(validateArguments(specOf('get_ngwr_setup'), { symbols: [] })).toBeNull();
  });
});

describe('callTool — an unknown tool', () => {
  it('names the tools that do exist', () => {
    // A client calling a tool this server does not have is usually a stale tool
    // list, and the recovery is one `tools/list` away — so say what is there.
    // Over the wire the server refuses the name outright with a JSON-RPC
    // -32602 (server.spec covers that); this is the answer for anything that
    // reaches `callTool` some other way, and it must not be a crash.
    expect(callTool(catalog, 'get_ngwr_docs', {})).toBe(
      'Unknown tool: get_ngwr_docs. Available: search_ngwr, get_ngwr_component, get_ngwr_api, get_ngwr_setup.'
    );
  });
});
