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

import { type CatalogEntry, Catalog, parseCatalog } from './catalog.js';

/**
 * The catalog reader's spec.
 *
 * `parseCatalog` is one half of a contract between two files in this repo:
 * `scripts/gen-ai-assets.ts` writes `llms-full.txt`, this reads it. So the
 * samples below are copied from the real generated shapes rather than invented
 * — a parser tested against text no generator emits proves nothing. The shapes
 * that matter are the four the generator actually produces: one selector,
 * several, none at all (a service-only entry point, which also has no
 * description bullet), and a nested path like `ngwr/i18n/en`.
 *
 * The malformed cases are here because the file is READ FROM DISK at runtime in
 * an installed package. A truncated or half-written file must come back as an
 * empty catalog, not as a crash inside someone's editor.
 */

/** One `## ngwr/x` section, in the generator's own format. */
const SECTION = {
  alert: [
    '## ngwr/alert',
    "- import: `import { WrAlert } from 'ngwr/alert'`",
    '- selector: `wr-alert`',
    '- exports: WrAlert, WrAlertType',
    '- Inline status banner — info, success, warning, danger, neutral, offline.',
  ],
  badge: [
    '## ngwr/badge',
    "- import: `import { WrBadge } from 'ngwr/badge'`",
    '- selector: `wr-badge`, `wr-tag`',
    '- exports: WrBadge, WrTag, WrBadgeSize',
    '- Small status indicator with color variants. Reach for `<wr-tag>` when you need a richer label.',
  ],
  // Service-only: no selector to bind and no description bullet. Both fields
  // are absent from the text, not empty in it.
  overlay: [
    '## ngwr/overlay',
    "- import: `import { WrOutsideClick } from 'ngwr/overlay'`",
    '- exports: provideWrOverlay, WrOutsideClick, WR_OVERLAY',
  ],
  english: ['## ngwr/i18n/en', "- import: `import { wrEn } from 'ngwr/i18n/en'`", '- exports: wrEn'],
};

/** The blurb the generator writes above the first section. */
const PREAMBLE = [
  '# ngwr — full reference',
  '',
  '> Generated from the library source: every entry point with its import path,',
  '> selector(s), public exports, and description. Concise quick-ref: /llms.txt',
  '',
];

const CATALOG_TEXT = [...PREAMBLE, ...SECTION.alert, '', ...SECTION.badge, '', ...SECTION.overlay, ''].join('\n');

const SYMBOL_MAP = {
  WrAlert: 'ngwr/alert',
  WrBadge: 'ngwr/badge',
  WrTag: 'ngwr/badge',
  provideWrOverlay: 'ngwr/overlay',
};

/**
 * The package's own `exports` map, in the shape `hasStyles` reads.
 *
 * Both shapes below are real. An entry point with a stylesheet carries a `sass`
 * condition pointing at its `styles/_index.scss`; one without — a harness, a
 * service, an adapter, `ngwr/i18n/en` here — is absent from the map altogether,
 * which is how 94 of the 202 entry points look.
 */
const EXPORTS = {
  '.': { sass: './styles.scss' },
  './alert': { sass: './alert/styles/_index.scss' },
  './badge': { sass: './badge/styles/_index.scss' },
  './overlay': { sass: './overlay/styles/_index.scss' },
  './i18n/*.json': './i18n/*.json',
};

/** The entry for `ngwr/badge`, which every `find` case is expected to reach. */
const badgeOf = (catalog: Catalog): CatalogEntry | null => catalog.find('wr-tag');

describe('parseCatalog', () => {
  it('reads path, name, import line and exports out of a section', () => {
    const [entry] = parseCatalog(SECTION.alert.join('\n'));

    expect(entry).toEqual({
      path: 'ngwr/alert',
      // `name` is what the docs URL and the "close matches" hint are built from.
      name: 'alert',
      // Backticks are the generator's markdown, not part of the import line an
      // agent is meant to paste.
      import: "import { WrAlert } from 'ngwr/alert'",
      selectors: ['wr-alert'],
      exports: ['WrAlert', 'WrAlertType'],
      description: 'Inline status banner — info, success, warning, danger, neutral, offline.',
    });
  });

  it('keeps every selector when one entry point declares several', () => {
    const [entry] = parseCatalog(SECTION.badge.join('\n'));

    // `ngwr/badge` ships two components. Dropping the second would make
    // `<wr-tag>` unfindable by the name a consumer actually types.
    expect(entry.selectors).toEqual(['wr-badge', 'wr-tag']);
  });

  it('leaves selectors and description empty for a service-only entry point', () => {
    const [entry] = parseCatalog(SECTION.overlay.join('\n'));

    // Nothing to bind in a template, and the generator writes no description
    // bullet for these — so the absent fields have to read as absent, not as a
    // stray empty string in the middle of a rendered answer.
    expect(entry.selectors).toEqual([]);
    expect(entry.description).toBe('');
    expect(entry.exports).toEqual(['provideWrOverlay', 'WrOutsideClick', 'WR_OVERLAY']);
  });

  it('keeps a nested entry point path whole', () => {
    const [entry] = parseCatalog(SECTION.english.join('\n'));

    // Thirty-eight entry points are nested. `name` carries the slash because it
    // is the part after `ngwr/`, and `ngwr/i18n/en` is a real import path.
    expect(entry.path).toBe('ngwr/i18n/en');
    expect(entry.name).toBe('i18n/en');
  });

  it('takes the bullet with no `label:` prefix as the description', () => {
    const [entry] = parseCatalog(
      ['## ngwr/x', "- import: `import { X } from 'ngwr/x'`", '- Does a thing.', '- And keeps doing it.'].join('\n')
    );

    // Two prose bullets read as one description; the labelled bullets never do.
    expect(entry.description).toBe('Does a thing. And keeps doing it.');
  });

  it('reads every section in a file, ignoring the preamble above the first', () => {
    const entries = parseCatalog(CATALOG_TEXT);

    // The `# ngwr — full reference` header and its `>` blurb are not an entry.
    expect(entries.map(entry => entry.path)).toEqual(['ngwr/alert', 'ngwr/badge', 'ngwr/overlay']);
  });

  it('skips a section whose heading is not an entry point path', () => {
    const entries = parseCatalog([...SECTION.alert, '', '## Notes', '- Not an entry point.'].join('\n'));

    // A future generator that adds a prose section must not turn it into a
    // catalog entry an agent would then try to `import`.
    expect(entries.map(entry => entry.path)).toEqual(['ngwr/alert']);
  });

  it('returns nothing for input that is missing, empty or section-less', () => {
    // `null` is what `Catalog` passes when the file is not in the package —
    // an install that predates the asset must degrade to an empty catalog.
    expect(parseCatalog(null)).toEqual([]);
    expect(parseCatalog('')).toEqual([]);
    expect(parseCatalog(PREAMBLE.join('\n'))).toEqual([]);
  });

  it('survives a section that was cut off mid-write', () => {
    const entries = parseCatalog(['## ngwr/alert', '- import: `import'].join('\n'));

    // A half-written file still parses: the entry is there with the fields that
    // made it, and the missing ones are empty rather than undefined.
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ path: 'ngwr/alert', selectors: [], exports: [], description: '' });
  });

  it('drops empty items from a trailing separator in a list field', () => {
    const [entry] = parseCatalog(['## ngwr/x', '- exports: A, B,', '- selector: `wr-x`,'].join('\n'));

    expect(entry.exports).toEqual(['A', 'B']);
    expect(entry.selectors).toEqual(['wr-x']);
  });
});

describe('Catalog', () => {
  let root: string;
  let empty: string;

  beforeAll(() => {
    // A fixture package root — the same four files an installed `ngwr` has that
    // this reader touches, and nothing else. Pointing the reader at a temp dir
    // is what keeps this suite green on a checkout that has never run
    // `pnpm build:lib`.
    root = mkdtempSync(join(tmpdir(), 'ngwr-mcp-catalog-'));
    empty = mkdtempSync(join(tmpdir(), 'ngwr-mcp-bare-'));

    writeFileSync(join(root, 'llms-full.txt'), CATALOG_TEXT);
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ name: 'ngwr', version: '10.2.1-fixture', exports: EXPORTS })
    );
    mkdirSync(join(root, 'schematics', 'use'), { recursive: true });
    writeFileSync(join(root, 'schematics', 'use', 'symbol-map.json'), JSON.stringify(SYMBOL_MAP));
    mkdirSync(join(root, 'types'), { recursive: true });
    writeFileSync(join(root, 'types', 'ngwr-i18n-en.d.ts'), 'declare const wrEn: object;\n');
    // Real declaration shape, ORDER INCLUDED: `ɵfac` is emitted above `ɵcmp`,
    // and the first version of `declarable()` matched all five markers in one
    // alternation — so it read the factory first and called every component a
    // service. A fixture without markers could not tell.
    writeFileSync(
      join(root, 'types', 'ngwr-chip.d.ts'),
      [
        'declare class WrChip {',
        '    static ɵfac: i0.ɵɵFactoryDeclaration<WrChip, never>;',
        '    static ɵcmp: i0.ɵɵComponentDeclaration<WrChip, "wr-chip", never, {}, {}, never, ["*"], true, never>;',
        '}',
        'declare class WrChipService {',
        '    static ɵfac: i0.ɵɵFactoryDeclaration<WrChipService, never>;',
        '    static ɵprov: i0.ɵɵInjectableDeclaration<WrChipService>;',
        '}',
        '',
      ].join('\n')
    );
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(empty, { recursive: true, force: true });
  });

  it('reads the catalog out of llms-full.txt at its root', () => {
    expect(new Catalog(root).all().map(entry => entry.path)).toEqual(['ngwr/alert', 'ngwr/badge', 'ngwr/overlay']);
  });

  it('parses the file once and holds the result', () => {
    const catalog = new Catalog(root);
    const first = catalog.all();

    rmSync(join(root, 'llms-full.txt'));
    try {
      // ~57 KB re-parsed per tool call would be the whole cost of the server.
      // Deleting the file mid-flight is the only way to prove it was not.
      expect(catalog.all()).toBe(first);
    } finally {
      writeFileSync(join(root, 'llms-full.txt'), CATALOG_TEXT);
    }
  });

  it('degrades to an empty catalog when the package ships none of its assets', () => {
    const catalog = new Catalog(empty);

    // Every read is `existsSync`-guarded: an older install, or a package
    // installed with `--ignore-scripts`, answers "nothing here" and keeps going.
    expect(catalog.all()).toEqual([]);
    expect(catalog.symbolMap()).toEqual({});
    expect(catalog.types('ngwr/alert')).toBeNull();
    // An unreadable `exports` map has to read as "no stylesheet". The other way
    // round it hands a consumer an `@use` that breaks their Sass build, which is
    // a worse answer than saying nothing.
    expect(catalog.hasStyles('ngwr/alert')).toBe(false);
  });

  it('reports its own version, not the one in the environment', () => {
    // `npm_package_version` is set by whatever project INVOKED the server, so a
    // consumer app had its own version reported back to it as the catalog's.
    // Only an install test showed that — inside this repo the two happen to be
    // the same file. The environment is poisoned here to prove the answer does
    // not come from it.
    const previous = process.env['npm_package_version'];
    process.env['npm_package_version'] = '99.99.99';

    try {
      expect(new Catalog(root).version()).toBe('10.2.1-fixture');
    } finally {
      if (previous === undefined) delete process.env['npm_package_version'];
      else process.env['npm_package_version'] = previous;
    }
  });

  it('answers 0.0.0 when there is no manifest to read', () => {
    expect(new Catalog(empty).version()).toBe('0.0.0');
  });

  it('reports a stylesheet only for an entry point whose exports map declares one', () => {
    const catalog = new Catalog(root);

    // Read from the package's own map rather than assumed from the path: 94 of
    // the 202 entry points ship no `styles/_index.scss`, and `get_ngwr_component`
    // used to tell a consumer to `@use` every one of them.
    expect(catalog.hasStyles('ngwr/alert')).toBe(true);
    expect(catalog.hasStyles('ngwr/badge')).toBe(true);
    // Nested and absent from the map, which is what every harness, service and
    // adapter looks like. The map's own glob keys (`./i18n/*.json`) are plain
    // strings rather than conditions objects, so presence alone is not the test.
    expect(catalog.hasStyles('ngwr/i18n/en')).toBe(false);
    expect(catalog.hasStyles('ngwr/not-a-thing')).toBe(false);
  });

  it('reads the schematics symbol map as the schematics wrote it', () => {
    expect(new Catalog(root).symbolMap()['WrTag']).toBe('ngwr/badge');
  });

  it('finds an entry point by path, by bare name, miscased or padded', () => {
    const catalog = new Catalog(root);

    // These are the things an agent types: the import path, the folder name,
    // and whatever casing and whitespace it remembered.
    expect(catalog.find('ngwr/badge')).toBe(badgeOf(catalog));
    expect(catalog.find('badge')).toBe(badgeOf(catalog));
    expect(catalog.find('BADGE')).toBe(badgeOf(catalog));
    expect(catalog.find('  badge  ')).toBe(badgeOf(catalog));
  });

  it('misses a path whose `ngwr/` prefix is miscased', () => {
    // A wart, pinned so it is a decision rather than a surprise: the prefix
    // check is case-SENSITIVE while the comparison after it is not, so
    // `NGWR/badge` is re-prefixed into `ngwr/NGWR/badge` and matches nothing —
    // even though the bare `BADGE` above resolves fine. `get_ngwr_component`
    // answers "No ngwr entry point matches" for it.
    expect(new Catalog(root).find('NGWR/badge')).toBeNull();
  });

  it('finds an entry point by a symbol it exports, whatever the casing', () => {
    const catalog = new Catalog(root);

    // `WrTag` does not live at `ngwr/tag`; only the symbol map and the exports
    // list know it is in `ngwr/badge`.
    expect(catalog.find('WrTag')).toBe(badgeOf(catalog));
    expect(catalog.find('wrtag')).toBe(badgeOf(catalog));
    expect(catalog.find('WR_OVERLAY')).toMatchObject({ path: 'ngwr/overlay' });
  });

  it('finds an entry point by selector, matched exactly', () => {
    const catalog = new Catalog(root);

    expect(catalog.find('wr-tag')).toMatchObject({ path: 'ngwr/badge' });
    // A selector is case-sensitive in a template, so it is case-sensitive here:
    // `WR-TAG` is not a thing anyone can write in HTML that Angular will match.
    expect(catalog.find('WR-TAG')).toBeNull();
  });

  it('returns null for something that is not in the catalog', () => {
    expect(new Catalog(root).find('WrNotAThing')).toBeNull();
  });

  it('maps an entry point path onto the flattened declaration file name', () => {
    const catalog = new Catalog(root);

    // `ngwr/i18n/en` ships as `types/ngwr-i18n-en.d.ts` — every slash becomes a
    // dash, which is how ng-packagr flattens them.
    expect(catalog.types('ngwr/i18n/en')).toBe('declare const wrEn: object;\n');
    expect(catalog.types('ngwr/badge')).toBeNull();
  });

  it('answers a query that names a property of Object.prototype as no match', () => {
    const catalog = new Catalog(root);

    // This case used to pin the opposite, and the opposite was a crash.
    // `symbolMap()` was a raw `JSON.parse` result, so it inherited
    // `Object.prototype`: the lookup `this.symbolMap()[wanted]` handed back a
    // FUNCTION for `toString`, and the path handling called `.toLowerCase()` on
    // it and threw a TypeError. Every tool that resolves a name goes through
    // this one method, so any of them could be asked an ordinary-looking
    // question and answer with a V8 message. The map is a null-prototype object
    // now, so an inherited name is simply not in it.
    expect(catalog.find('toString')).toBeNull();
    expect(catalog.find('constructor')).toBeNull();
    // And the fix is not "the map is empty": a real symbol still resolves.
    expect(catalog.find('WrTag')).toBe(badgeOf(catalog));
  });

  describe('declarable', () => {
    /**
     * `ng g ngwr:use` refuses a non-declarable, so the MCP must stop recommending
     * it for one — and it decides from the SHIPPED `.d.ts`, where the compiler
     * already wrote the answer, rather than from a second hand-kept list.
     */
    it('reads the compiler markers, not the order they appear in', () => {
      const catalog = new Catalog(root);

      expect(catalog.declarable('WrChip', 'ngwr/chip')).toBe(true);
      expect(catalog.declarable('WrChipService', 'ngwr/chip')).toBe(false);
    });

    it('says "cannot say" rather than "no" for a symbol the types do not declare', () => {
      const catalog = new Catalog(root);

      expect(catalog.declarable('WrNotThere', 'ngwr/chip')).toBeNull();
      expect(catalog.declarable('WrChip', 'ngwr/no-such-entry')).toBeNull();
    });
  });
});
