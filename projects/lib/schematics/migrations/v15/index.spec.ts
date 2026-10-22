/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HostTree, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import semver from 'semver';
import { describe, expect, it } from 'vitest';

import ngUpdateV15 from './index';

/**
 * `ng update ngwr` to v15, which REWRITES paths, provider calls, `-rgb` reads,
 * neutral token reads and two values, and REPORTS everything that needs a
 * decision.
 *
 * Both halves need a spec, and they fail in opposite directions. The reporting
 * half fails by staying quiet, and quiet reads as "nothing to do". The
 * rewriting half fails by touching something it should not — a path one segment
 * too far, a token inside a longer name, an attribute on someone else's
 * element — and each of those produces something no resolver, browser or
 * compiler complains about. So most cases come in a pair: the input that must
 * move (or warn), and the neighbour that must not.
 *
 * Two properties are held for the whole rule rather than per family: an
 * already-v15 tree comes through byte for byte, and a second run changes
 * nothing. The second one is not decoration — the migration is registered so
 * that it re-runs on every update between v15 release candidates.
 */

interface Run {
  readonly logs: readonly string[];
  /** The tree after the rule, read back by path. */
  readonly read: (path: string) => string;
}

function run(files: Readonly<Record<string, string>>): Run {
  const tree = new HostTree();
  for (const [path, content] of Object.entries(files)) tree.create(path, content);

  const logs: string[] = [];
  const context = {
    logger: { info: (message: string) => logs.push(message), warn: (message: string) => logs.push(message) },
  } as unknown as SchematicContext;
  const rule = ngUpdateV15() as (target: Tree, ctx: SchematicContext) => Tree;
  const next = rule(tree, context);

  return { logs, read: (path: string) => next.readText(path) };
}

/** Run one file through the rule and hand back what it looks like afterwards. */
function rewrite(path: string, content: string): string {
  return run({ [path]: content }).read(path);
}

const said = (logs: readonly string[], fragment: string): boolean => logs.some(line => line.includes(fragment));

describe('ng update ngwr to v15', () => {
  it('says nothing to do on a project that uses none of it', () => {
    const { logs } = run({ '/src/app/app.html': '<button wr-btn color="primary">Save</button>' });

    expect(said(logs, 'nothing to do')).toBe(true);
  });

  describe('the import paths it moves', () => {
    it.each([
      ["import { WrBarChart } from 'ngwr/bar-chart';", "import { WrBarChart } from 'ngwr/charts/bar-chart';"],
      ["@use 'ngwr/calendar-heatmap';", "@use 'ngwr/charts/calendar-heatmap';"],
      [
        "import { WrGaugeHarness } from 'ngwr/gauge/testing';",
        "import { WrGaugeHarness } from 'ngwr/charts/gauge/testing';",
      ],
      ["import { WrAurora } from 'ngwr/aurora';", "import { WrAurora } from 'ngwr/bits/aurora';"],
      ['@forward "ngwr/split-text";', '@forward "ngwr/bits/split-text";'],
      ["import { WrConfetti } from 'ngwr/confetti';", "import { WrConfetti } from 'ngwr/bits/confetti';"],
      ["import { WrSortableList } from 'ngwr/drag-drop';", "import { WrSortableList } from 'ngwr/sortable-list';"],
      ["@use 'ngwr/drag-drop';", "@use 'ngwr/sortable-list';"],
      ["import { lucideIcons } from 'ngwr/icon/adapters/lucide';", "import { lucideIcons } from 'ngwr/icon';"],
    ])('moves %s', (before, after) => {
      const path = before.startsWith('@') ? '/src/styles.scss' : '/src/app/a.ts';
      expect(rewrite(path, before)).toBe(after);
    });

    it('reaches a JSON path map, which can name a package path too', () => {
      const tsconfig = '{ "paths": { "ngwr/sparkline": ["node_modules/ngwr/sparkline"] } }';

      expect(rewrite('/tsconfig.json', tsconfig)).toBe(
        '{ "paths": { "ngwr/charts/sparkline": ["node_modules/ngwr/charts/sparkline"] } }'
      );
    });

    it('leaves the CDK package and every other spelling of the name alone', () => {
      // `@angular/cdk/drag-drop` is a different package, and the one every
      // `cdkDrag` consumer imports. The others are a different package and a
      // longer name that merely starts the same way.
      const source = [
        "import { CdkDrag } from '@angular/cdk/drag-drop';",
        "import { x } from 'my-ngwr/gauge';",
        "import { y } from 'ngwr/gauge-extras';",
        "import { WrIcon } from 'ngwr/icon';",
      ].join('\n');

      expect(rewrite('/a.ts', source)).toBe(source);
    });

    it('does not move a path that already moved', () => {
      const source = "import { WrGauge } from 'ngwr/charts/gauge';\n@use 'ngwr/bits/waves';";

      expect(rewrite('/a.ts', source)).toBe(source);
    });

    it('folds the lucide import into the ngwr/icon import the file already has', () => {
      // Two declarations from one module compile, and every duplicate-import
      // lint rule flags them. A type-only one stays apart, since joining it
      // would make its names value imports; so does one an app wrote itself.
      const before = [
        "import { provideWrIcons, WrIcon } from 'ngwr/icon';",
        "import type { WrIconDefinition } from 'ngwr/icon';",
        "import { lucideIcons, lucide } from 'ngwr/icon/adapters/lucide';",
        '',
      ].join('\n');

      expect(rewrite('/a.ts', before)).toBe(
        [
          "import { provideWrIcons, WrIcon, lucideIcons, lucide } from 'ngwr/icon';",
          "import type { WrIconDefinition } from 'ngwr/icon';",
          '',
        ].join('\n')
      );

      const untouched = "import { WrIcon } from 'ngwr/icon';\nimport { provideWrIcons } from 'ngwr/icon';\n";
      expect(rewrite('/b.ts', untouched)).toBe(untouched);
    });
  });

  describe('the provider calls it moves into provideWr()', () => {
    it('collects the calls in one array into one provideWr(), and fixes the imports', () => {
      const before = `import { ApplicationConfig } from '@angular/core';
import { provideWrDensity } from 'ngwr/density';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { provideWrToastConfig } from 'ngwr/toast';

export const appConfig: ApplicationConfig = {
  providers: [
    provideWrDensity({ defaultDensity: 'sm' }),
    provideWrToastConfig({ duration: 6000 }),
    provideWrIcons(lucideIcons({ check: Check })),
  ],
};
`;
      const after = `import { ApplicationConfig } from '@angular/core';
import { provideWr } from 'ngwr';
import { withDensity } from 'ngwr/density';
import { provideWrIcons, lucideIcons } from 'ngwr/icon';
import { withToast } from 'ngwr/toast';

export const appConfig: ApplicationConfig = {
  providers: [
    provideWr(withDensity({ defaultDensity: 'sm' }), withToast({ duration: 6000 })),
    provideWrIcons(lucideIcons({ check: Check })),
  ],
};
`;

      expect(rewrite('/src/app/app.config.ts', before)).toBe(after);
    });

    it('breaks a long provideWr() over lines, keeping the options verbatim', () => {
      const before = `import { provideWrMeta } from 'ngwr/meta';
import { provideWrStorage, type ProvideWrStorageOptions } from 'ngwr/storage';
import { provideWrTheme } from 'ngwr/theme';

const storage: ProvideWrStorageOptions = { prefix: 'app' };

bootstrapApplication(App, {
  providers: [
    provideRouter(routes),
    provideWrStorage(storage),
    provideWrMeta({ titleSuffix: ' | A product name long enough to wrap' }),
    provideWrTheme({
      defaultMode: 'dark',
    }),
  ],
});
`;
      const after = `import { provideWr } from 'ngwr';
import { withMeta } from 'ngwr/meta';
import { type WrStorageOptions, withStorage } from 'ngwr/storage';
import { withTheme } from 'ngwr/theme';

const storage: WrStorageOptions = { prefix: 'app' };

bootstrapApplication(App, {
  providers: [
    provideRouter(routes),
    provideWr(
      withStorage(storage),
      withMeta({ titleSuffix: ' | A product name long enough to wrap' }),
      withTheme({
        defaultMode: 'dark',
      }),
    ),
  ],
});
`;

      expect(rewrite('/src/main.ts', before)).toBe(after);
    });

    it('deletes a bare provideWrDateAdapter(), which is the default now, and moves one with options', () => {
      const bare = `import { provideWrDateAdapter } from 'ngwr/date';
TestBed.configureTestingModule({ providers: [provideWrDateAdapter(), provideRouter([])] });
`;
      expect(rewrite('/a.spec.ts', bare)).toBe('TestBed.configureTestingModule({ providers: [provideRouter([])] });\n');

      const locale = `import { provideWrDateAdapter, type WrDateAdapterOptions } from 'ngwr/date';
export const routes = [{ path: 'ru', providers: [provideWrDateAdapter({ locale: 'ru' })] }];
`;
      expect(rewrite('/b.ts', locale)).toBe(`import { provideWr } from 'ngwr';
import { type WrDatesOptions, withDates } from 'ngwr/date';
export const routes = [{ path: 'ru', providers: [provideWr(withDates({ locale: 'ru' }))] }];
`);
    });

    it('merges into a provideWr() the array already holds', () => {
      const before = `import { provideWr } from 'ngwr';
import { provideWrDensity } from 'ngwr/density';
import { withTheme } from 'ngwr/theme';

export const appConfig = {
  providers: [
    provideWr(withTheme({ defaultMode: 'dark' })),
    provideWrDensity()
  ],
};
`;
      const after = `import { provideWr } from 'ngwr';
import { withDensity } from 'ngwr/density';
import { withTheme } from 'ngwr/theme';

export const appConfig = {
  providers: [
    provideWr(withTheme({ defaultMode: 'dark' }), withDensity())
  ],
};
`;

      expect(rewrite('/c.ts', before)).toBe(after);
    });

    it('leaves a call it cannot move where it is, and names the file', () => {
      // A variable, a ternary, a feature already there (the same kind twice
      // throws in dev mode), an alias, and the theme attribute that is gone.
      const untouched = {
        '/a.ts': "import { provideWrDensity } from 'ngwr/density';\nexport const density = provideWrDensity();",
        '/b.ts': "providers: [isDev ? provideWrMeta({ titleSuffix: ' (dev)' }) : []]",
        '/c.ts': 'providers: [provideWr(withDensity()), provideWrDensity({ defaultDensity: "sm" })]',
        '/d.ts': "import { provideWrStorage as storage } from 'ngwr/storage';\nproviders: [storage()]",
        '/e.ts': "providers: [provideWrTheme({ attribute: 'data-mode' })]",
      };
      const { read, logs } = run(untouched);

      for (const [path, before] of Object.entries(untouched)) expect(read(path), path).toBe(before);
      expect(said(logs, 'a provider call this could not move into `provideWr()` in 5 file(s)')).toBe(true);
      expect(said(logs, 'the theme `attribute` option in 1 file(s)')).toBe(true);
    });

    it('moves the first of two calls of one kind and leaves the second for the report', () => {
      // v14 let the later call win; the same feature twice in provideWr() throws
      // in dev mode. Which value the app meant is not something to guess.
      const before = `import { provideWrDensity } from 'ngwr/density';

export const config = {
  providers: [provideWrDensity({ defaultDensity: 'sm' }), provideWrDensity({ defaultDensity: 'lg' })],
};
`;
      const { read, logs } = run({ '/src/app/twice.ts': before });

      expect(read('/src/app/twice.ts')).toBe(`import { provideWr } from 'ngwr';
import { provideWrDensity, withDensity } from 'ngwr/density';

export const config = {
  providers: [provideWr(withDensity({ defaultDensity: 'sm' })), provideWrDensity({ defaultDensity: 'lg' })],
};
`);
      expect(said(logs, 'a provider call this could not move into `provideWr()` in 1 file(s)')).toBe(true);
      expect(logs).toContain('  /src/app/twice.ts:2, 5');

      // The same when the array already holds a provideWr() without that kind.
      const merged = run({
        '/m.ts': 'providers: [provideWr(withTheme()), provideWrMeta({ a: 1 }), provideWrMeta({ a: 2 })]',
      }).read('/m.ts');
      expect(merged).toContain('provideWr(withTheme(), withMeta({ a: 1 })), provideWrMeta({ a: 2 })]');
    });

    it('leaves a providers array quoted in a string or left in a comment, and adds no import for it', () => {
      // A docs snippet holds import lines too. Reading it as code once edited the
      // file's real `ngwr/theme` import and appended a `provideWr` import that
      // nothing used.
      const source = [
        "import { WrTheme } from 'ngwr/theme';",
        '',
        '// providers: [provideWrDensity()],',
        "export const snippet = `import { provideWrTheme } from 'ngwr/theme';",
        '',
        'bootstrapApplication(App, { providers: [provideWrTheme()] });`;',
        '',
      ].join('\n');

      expect(rewrite('/docs.ts', source)).toBe(source);
    });

    it('names the provider rewrite in what it says it rewrote', () => {
      const { logs } = run({ '/a.ts': 'providers: [provideWrMeta()]' });

      expect(said(logs, 'into one provideWr()')).toBe(true);
    });
  });

  describe('the -rgb reads it turns into color-mix()', () => {
    it.each([
      ['rgba(var(--wr-color-primary-rgb), 0.12)', 'color-mix(in srgb, var(--wr-color-primary) 12%, transparent)'],
      ['rgba(var(--wr-color-danger-rgb), .5)', 'color-mix(in srgb, var(--wr-color-danger) 50%, transparent)'],
      ['rgba( var( --wr-color-info-rgb ) , 0.045 )', 'color-mix(in srgb, var(--wr-color-info) 4.5%, transparent)'],
      ['rgba(var(--wr-color-success-rgb), 35%)', 'color-mix(in srgb, var(--wr-color-success) 35%, transparent)'],
      ['rgba(var(--wr-color-warning-rgb), 1)', 'var(--wr-color-warning)'],
      ['rgb(var(--wr-color-on-surface-rgb))', 'var(--wr-color-on-surface)'],
      [
        'rgba(var(--wr-color-primary-rgb), var(--my-alpha))',
        'color-mix(in srgb, var(--wr-color-primary) calc(var(--my-alpha) * 100%), transparent)',
      ],
      ['rgba(var(--wr-color-backdrop-rgb), 0.45)', 'color-mix(in srgb, var(--wr-color-backdrop) 45%, transparent)'],
      [
        'rgba(var(--wr-color-medium-rgb, 113, 128, 150), 0.18)',
        'color-mix(in srgb, var(--wr-color-on-surface-muted, rgb(113, 128, 150)) 18%, transparent)',
      ],
      // The base of a renamed token mixes from its successor, not from a name
      // nothing declares.
      ['rgba(var(--wr-color-light-rgb), 0.5)', 'color-mix(in srgb, var(--wr-border-base) 50%, transparent)'],
      ['rgba(var(--wr-color-dark-rgb), 0.08)', 'color-mix(in srgb, var(--wr-color-on-surface) 8%, transparent)'],
      [
        'rgba(var(--wr-color-muted-text-rgb), 0.6)',
        'color-mix(in srgb, var(--wr-color-on-surface-muted) 60%, transparent)',
      ],
      ['rgba(var(--wr-calendar-accent-rgb), 0.2)', 'color-mix(in srgb, var(--wr-calendar-accent) 20%, transparent)'],
      ['rgba(var(--wr-color-picker-rgb), 0.3)', 'color-mix(in srgb, var(--wr-color-picker-color) 30%, transparent)'],
    ])('turns %s into %s', (before, after) => {
      expect(rewrite('/src/a.scss', `.a { background: ${before}; }`)).toBe(`.a { background: ${after}; }`);
    });

    it('reaches an inline style and a string in a component', () => {
      expect(rewrite('/a.html', '<i style="color: rgba(var(--wr-color-primary-rgb), 0.4)"></i>')).toBe(
        '<i style="color: color-mix(in srgb, var(--wr-color-primary) 40%, transparent)"></i>'
      );
      expect(rewrite('/a.ts', "readonly track = input('rgba(var(--wr-color-light-rgb), 0.6)');")).toBe(
        "readonly track = input('color-mix(in srgb, var(--wr-border-base) 60%, transparent)');"
      );
    });

    it('leaves what it cannot read, and names it', () => {
      // No successor, an interpolated name, a fallback that is not a channel
      // list, and an alpha from TypeScript: each is a decision or a value this
      // cannot see.
      const sources = [
        '.a { color: rgba(var(--wr-color-secondary-rgb), 0.2); }',
        '.b { color: rgba(var(--wr-color-#{$intent}-rgb), 0.2); }',
        '.c { color: rgba(var(--wr-color-primary-rgb, var(--x)), 0.2); }',
      ];
      for (const source of sources) {
        const { read, logs } = run({ '/a.scss': source });
        expect(read('/a.scss'), source).toBe(source);
        expect(said(logs, 'a `-rgb` read the rewrite could not turn into `color-mix()`'), source).toBe(true);
      }

      // eslint-disable-next-line no-template-curly-in-string -- the source under test IS a template literal
      const ts = 'const c = `rgba(var(--wr-color-primary-rgb), ${alpha})`;';
      expect(rewrite('/a.ts', ts)).toBe(ts);
    });
  });

  describe('the neutral token reads it renames', () => {
    it.each([
      ['--wr-color-light', '--wr-border-base'],
      ['--wr-color-outline', '--wr-border-base'],
      ['--wr-color-border', '--wr-border-subtle'],
      ['--wr-color-border-subtle', '--wr-border-subtle'],
      ['--wr-color-border-strong', '--wr-border-subtle'],
      ['--wr-color-dark', '--wr-color-on-surface'],
      ['--wr-color-white-contrast', '--wr-color-on-surface'],
      ['--wr-color-medium', '--wr-color-on-surface-muted'],
      ['--wr-color-muted-text', '--wr-color-on-surface-muted'],
    ])('moves %s to %s', (from, to) => {
      expect(rewrite('/src/a.scss', `.card { border: 1px solid var(${from}); }`)).toBe(
        `.card { border: 1px solid var(${to}); }`
      );
    });

    it('never matches inside a longer token name', () => {
      // A shade of a removed intent has no successor and is reported; the
      // surviving roles and intents start with some of the same letters.
      const source = [
        '.a { border-color: var(--wr-color-light-lighter); }',
        '.b { background: var(--wr-color-dark-darker); }',
        '.c { color: var(--wr-color-medium-contrast); }',
        '.d { color: var(--wr-color-on-surface-muted); background: var(--wr-color-info-soft); }',
      ].join('\n');

      expect(rewrite('/src/a.scss', source)).toBe(source);
    });

    it('reaches a template and a component file, not only a stylesheet', () => {
      expect(rewrite('/a.html', '<div style="color: var(--wr-color-dark)"></div>')).toBe(
        '<div style="color: var(--wr-color-on-surface)"></div>'
      );
      expect(rewrite('/a.ts', "el.style.getPropertyValue('--wr-color-outline');")).toContain("'--wr-border-base'");
    });

    it('reports a declaration rather than renaming it', () => {
      // Setting `--wr-color-medium` restyled a FILL in v14; writing the same
      // value to `--wr-color-on-surface-muted` would restyle every muted text.
      const source = ':root { --wr-color-medium: #888; --wr-color-primary-rgb: 1, 2, 3; }';
      const { read, logs } = run({ '/src/styles.scss': source });

      expect(read('/src/styles.scss')).toBe(source);
      expect(said(logs, 'a declaration of a token v15 removed')).toBe(true);
    });

    it.each([
      ['a template style binding', '/a.html', '<div [style.--wr-color-medium]="gray">x</div>'],
      ['a style binding with a unit', '/a.html', '<div [style.--wr-color-light.px]="1">x</div>'],
      ['an inline style', '/a.html', '<div style="--wr-color-dark: #222">x</div>'],
      ['a host binding', '/a.ts', "host: { '[style.--wr-color-outline]': 'line' },"],
      ['a HostBinding', '/a.ts', "@HostBinding('style.--wr-color-border') line = '#ccc';"],
      ['setProperty()', '/a.ts', "document.documentElement.style.setProperty('--wr-color-medium', '#888');"],
      ['removeProperty()', '/a.ts', 'el.style.removeProperty("--wr-color-dark");'],
      ['Renderer2 setStyle()', '/a.ts', 'this.r.setStyle(el, `--wr-color-light`, v, RendererStyleFlags2.DashCase);'],
      [
        'a style object',
        '/a.ts',
        "export const vars = { '--wr-color-light': '#f5f5f5', \"--wr-color-dark\": '#111' };",
      ],
      ['an ngStyle object', '/a.html', `<div [ngStyle]="{ '--wr-color-muted-text': c }">x</div>`],
    ])('lists %s instead of renaming the name it sets', (_what, path, source) => {
      const { read, logs } = run({ [path]: source });

      expect(read(path)).toBe(source);
      expect(said(logs, 'a declaration of a token v15 removed in 1 file(s)')).toBe(true);
      expect(said(logs, `${path}:1`)).toBe(true);
    });

    it('still renames a read beside a declaration of the same name', () => {
      expect(rewrite('/a.html', '<div style="--wr-color-dark: #222; color: var(--wr-color-dark)">y</div>')).toBe(
        '<div style="--wr-color-dark: #222; color: var(--wr-color-on-surface)">y</div>'
      );
      expect(rewrite('/a.ts', "el.style.setProperty('--x', 'var(--wr-color-medium)');")).toBe(
        "el.style.setProperty('--x', 'var(--wr-color-on-surface-muted)');"
      );
      // A backtick is not a key quote, so a name quoted that way in prose is a read.
      expect(rewrite('/a.scss', '// `--wr-color-outline`: the old hairline')).toBe(
        '// `--wr-border-base`: the old hairline'
      );
    });
  });

  describe('the two values it renames', () => {
    it.each([
      ['<p wrTypography tone="dark">x</p>', '<p wrTypography tone="base">x</p>'],
      ['<p wrTypography tone="medium">x</p>', '<p wrTypography tone="muted">x</p>'],
      ['<p tone="dark" wrTypography>x</p>', '<p tone="base" wrTypography>x</p>'],
      [`<p wrTypography [tone]="'medium'">x</p>`, `<p wrTypography [tone]="'muted'">x</p>`],
      [`<p [tone]="'dark'" wrTypography>x</p>`, `<p [tone]="'base'" wrTypography>x</p>`],
      [
        '<wr-timeline-item color="medium">x</wr-timeline-item>',
        '<wr-timeline-item color="neutral">x</wr-timeline-item>',
      ],
      [
        `<wr-timeline-item [color]="'medium'">x</wr-timeline-item>`,
        `<wr-timeline-item [color]="'neutral'">x</wr-timeline-item>`,
      ],
    ])('moves %s', (before, after) => {
      expect(rewrite('/a.html', before)).toBe(after);
    });

    it('leaves the same attribute on anything else alone', () => {
      const source = [
        '<p tone="dark">not the directive</p>',
        '<p wrTypographyX tone="dark">a longer attribute</p>',
        '<app-chart color="medium">not the timeline</app-chart>',
        '<wr-timeline color="medium">the container, not the item</wr-timeline>',
      ].join('\n');

      expect(rewrite('/a.html', source)).toBe(source);
    });

    it('crosses a binding that contains a greater-than sign, and stays in its own tag', () => {
      expect(rewrite('/a.html', `<p wrTypography [hidden]="n > 0" tone="medium">x</p>`)).toContain('tone="muted"');
      expect(rewrite('/b.html', `<wr-timeline-item [hidden]="n > 0" color="medium" />`)).toContain('color="neutral"');

      // An apostrophe inside a value opens nothing, so the rename cannot run
      // from one element into the next.
      const next = `<wr-timeline-item title="Today's" />\n<app-dot [x]="'y'" color="medium" />`;
      expect(rewrite('/c.html', next)).toBe(next);
    });

    it('reaches an inline template in a component file', () => {
      expect(rewrite('/a.ts', 'template: `<p wrTypography tone="medium">x</p>`,')).toContain('tone="muted"');
    });

    it('moves the BEM class each of them emits', () => {
      expect(rewrite('/a.scss', '.wr-typography--tone-dark { margin: 0; }')).toBe(
        '.wr-typography--tone-base { margin: 0; }'
      );
      expect(rewrite('/a.scss', '.wr-typography--tone-medium { margin: 0; }')).toBe(
        '.wr-typography--tone-muted { margin: 0; }'
      );
      expect(rewrite('/a.ts', "q('.wr-timeline-item--medium')")).toBe("q('.wr-timeline-item--neutral')");
    });
  });

  describe('what it reports', () => {
    /**
     * One row per report family: a file that must be named, by a fragment of
     * the report's own lead, and left exactly as it was.
     */
    it.each([
      ['the umbrella', '/src/styles.scss', "@use 'ngwr';", "the `@use 'ngwr'` umbrella"],
      [
        'a sheet above the configured theme',
        '/src/styles.scss',
        "@use 'ngwr/reset';\n@use 'ngwr/theme' with ($base-colors: (primary: #06c));",
        'above a configured',
      ],
      ['a removed intent as a colour', '/a.html', '<button wr-btn color="secondary">Go</button>', 'removed intent'],
      ['a bound removed intent', '/a.html', `<wr-tag [color]="'dark'">x</wr-tag>`, 'removed intent'],
      ['a removed intent class', '/a.scss', '.wr-btn--light { margin: 0; }', '`--dark` class'],
      ['a secondary token', '/a.scss', '.a { color: var(--wr-color-secondary-ink); }', '`--wr-color-secondary*`'],
      ['a shade', '/a.scss', '.a { color: var(--wr-color-dark-lighter); }', 'a shade of a removed intent'],
      [
        'a $base-colors key',
        '/a.scss',
        "@use 'ngwr/theme' with ($base-colors: (primary: #06c, secondary: #e21a62));",
        '`$base-colors`',
      ],
      ['a WrColor literal', '/a.ts', "const c: WrColor = 'medium';", '`WrColor` literal'],
      ['a data-theme selector', '/a.scss', "[data-theme='dark'] .hero { color: #fff; }", '`[data-theme]`'],
      ['a data-theme write', '/a.ts', "document.documentElement.setAttribute('data-theme', 'dark');", '`[data-theme]`'],
      ['theme.dark', '/a.scss', '.panel { @include theme.dark { color: #eee; } }', '`theme.dark`'],
      ['dark-selector()', '/a.scss', '#{theme.dark-selector()} .x { color: red; }', '`theme.dark`'],
      ['the runtime palette', '/a.ts', 'const t = wrThemeTokens({ primary: x });', '`wrThemeTokens()`'],
      [
        'a token read in TypeScript',
        '/a.ts',
        "getComputedStyle(el).getPropertyValue('--wr-color-primary')",
        '`getPropertyValue()`',
      ],
      ['provideWrOverlay()', '/a.ts', 'providers: [provideWrOverlay()]', '`provideWrOverlay()`'],
      ['ngwr/config', '/a.ts', "import { provideWrConfig } from 'ngwr/config';", '`ngwr/config`'],
      ['ngwr/media', '/a.ts', "import { WrMedia } from 'ngwr/media';", '`ngwr/media`'],
      [
        'a responsive overlay provider',
        '/a.ts',
        'providers: [provideWrResponsiveOverlays({ breakpoint: 768 })]',
        'responsive bottom sheet',
      ],
      ['a responsive select', '/a.html', '<wr-select responsive [(value)]="v" />', 'responsive bottom sheet'],
      [
        'a responsive popover, after a `>` binding',
        '/a.html',
        '<button [disabled]="n > 0" [wrPopover]="tip" responsive>?</button>',
        'responsive bottom sheet',
      ],
      ['the overlay stylesheet', '/a.scss', "@use 'ngwr/overlay';", 'responsive bottom sheet'],
      ['a responsive dialog', '/a.ts', 'inject(WrDialog).open(Edit, { responsive: true });', 'responsive bottom sheet'],
      ['ngwr/markdown', '/a.ts', "import { WrMarkdown } from 'ngwr/markdown';", '`ngwr/markdown`'],
      ['a markdown element', '/a.html', '<wr-markdown [value]="notes" />', '`ngwr/markdown`'],
      ['the editor format', '/a.html', '<wr-editor format="markdown" [(value)]="notes" />', '`<wr-editor format>`'],
      ['ngwr/action-sheet', '/a.html', '<wr-action-sheet [actions]="rows" />', '`ngwr/action-sheet`'],
      ['ngwr/squircle', '/a.html', '<div wrSquircle [radius]="14">x</div>', '`ngwr/squircle`'],
      ['the drawer handle', '/a.html', '<wr-drawer position="bottom" showHandle>x</wr-drawer>', 'showHandle'],
      ['a drawer handle class', '/a.scss', '.wr-drawer__handle { cursor: grab; }', 'showHandle'],
      [
        'the date-fns adapter',
        '/a.ts',
        "import { provideWrDateFnsAdapter } from 'ngwr/date/adapters/fns';",
        'date-fns or Luxon',
      ],
      [
        'an undecorated adapter',
        '/a.ts',
        'export class AppDateAdapter extends WrDateAdapter<Date> {}',
        'undecorated `WrDateAdapter`',
      ],
      ['the Feather adapter', '/a.ts', "import { featherIcons } from 'ngwr/icon/adapters/feather';", 'Feather'],
      [
        'a sortable list template',
        '/a.html',
        '<wr-sortable-list [(items)]="rows">\n  <ng-template let-row>{{ row.label }}</ng-template>\n</wr-sortable-list>',
        '<wr-sortable-list> with an <ng-template> row',
      ],
      [
        'a sortable list trackBy',
        '/a.html',
        '<wr-sortable-list [(items)]="rows" [trackBy]="byId" />',
        '<wr-sortable-list> with an <ng-template> row',
      ],
      [
        'the form error provider',
        '/a.ts',
        'providers: [provideWrFormErrors({ required: () => "Required" })]',
        '`provideWrFormErrors()`',
      ],
      ['a sidebar class', '/a.scss', '.wr-sidebar__entry--active { font-weight: 600; }', "<wr-sidebar>'s old shape"],
      ['a sidebar with no icons bound', '/a.html', '<wr-sidebar [entries]="nav" />', "<wr-sidebar>'s old shape"],
      [
        'a sidebar string badge',
        '/a.ts',
        "const nav: WrSidebarEntry[] = [{ title: 'Inbox', url: '/in', badge: '12' }];",
        "<wr-sidebar>'s old shape",
      ],
      ['the keyboard inset', '/a.scss', '.bar { bottom: var(--wr-keyboard-inset, 0px); }', '`--wr-keyboard-inset`'],
      ['the star-border hook', '/a.scss', '.x { --wr-star-border-stop: 20%; }', '`--wr-star-border-stop`'],
    ])('names %s and changes nothing', (_what, path, source, fragment) => {
      const { read, logs } = run({ [path]: source });

      expect(read(path)).toBe(source);
      expect(said(logs, fragment)).toBe(true);
      expect(said(logs, path)).toBe(true);
      expect(said(logs, 'nothing to do')).toBe(false);
    });

    it.each([
      ['a surviving intent', '/a.html', '<button wr-btn color="primary">Go</button>', 'removed intent'],
      ['a surviving intent class', '/a.scss', '.wr-btn--primary { margin: 0; }', '`--dark` class'],
      ['a native squircle', '/a.html', '<button wr-btn shape="squircle">Save</button>', '`ngwr/squircle`'],
      [
        'the drawer an action sheet preset',
        '/a.html',
        '<wr-drawer position="bottom" rounded>x</wr-drawer>',
        'ngwr/action-sheet',
      ],
      // `showHandle` is a live input on `<wr-compare>`, so the detector is
      // anchored to the drawer.
      ['the compare handle', '/a.html', '<wr-compare [showHandle]="true" />', 'showHandle'],
      [
        'a migrated sortable list',
        '/a.html',
        '<wr-sortable-list [(items)]="rows">\n  @for (row of rows(); track row.id) {\n    <wr-sortable-item>{{ row.label }}</wr-sortable-item>\n  }\n</wr-sortable-list>\n<ng-template #empty>none</ng-template>',
        '<wr-sortable-list>',
      ],
      [
        'a responsive input another component keeps',
        '/a.html',
        '<wr-descriptions responsive [items]="i" />',
        'responsive bottom sheet',
      ],
      [
        'a sidebar with its icons bound',
        '/a.html',
        `<wr-sidebar [entries]="nav" [defaultItemIcon]="'dot'" />`,
        "<wr-sidebar>'s old shape",
      ],
      [
        'the overlay entry point in TypeScript',
        '/a.ts',
        "import { WR_OVERLAY } from 'ngwr/overlay';",
        'responsive bottom sheet',
      ],
      [
        'a decorated adapter',
        '/a.ts',
        '@Service()\nexport class AppDateAdapter extends WrDateAdapter<Date> {}',
        'undecorated',
      ],
      [
        'a configured theme first',
        '/s.scss',
        "@use 'ngwr/theme' with ($base-colors: (primary: #06c));\n@use 'ngwr/reset';",
        'above a configured',
      ],
    ])('does not name %s', (_what, path, source, fragment) => {
      expect(said(run({ [path]: source }).logs, fragment)).toBe(false);
    });

    it('names the line of every hit, counted in the file as the rewrite left it', () => {
      // The provider rewrite folds three lines into one and adds an import, so a
      // line counted in the file as written would point one below each hit. The
      // first `color` opens its line, where the pattern's leading `\s` is the
      // newline that ends the line before.
      const source = [
        "import { provideWrDensity } from 'ngwr/density';",
        "import { provideWrMeta } from 'ngwr/meta';",
        "import { provideWrToastConfig } from 'ngwr/toast';",
        'export const config = {',
        '  providers: [',
        '    provideWrDensity(),',
        '    provideWrToastConfig({ duration: 1 }),',
        '    provideWrMeta({ a: 1 }),',
        '  ],',
        '};',
        '@Component({',
        '  template: `<wr-btn',
        'color="dark">x</wr-btn>',
        '<wr-tag color="secondary">y</wr-tag>`,',
        '})',
        'export class X {}',
        '',
      ].join('\n');
      const { read, logs } = run({ '/src/app/x.ts': source });
      const lines = read('/src/app/x.ts').split('\n');

      expect(lines[11]).toBe('color="dark">x</wr-btn>');
      expect(lines[12]).toBe('<wr-tag color="secondary">y</wr-tag>`,');
      expect(logs).toContain('  /src/app/x.ts:12, 13');
    });

    it('names a removed intent the value rename does not resolve, and not the one it does', () => {
      // `<wr-timeline-item color="medium">` is rewritten to `neutral`, so naming
      // it as a removed intent would send someone after a site already fixed.
      expect(said(run({ '/a.html': '<wr-timeline-item color="medium" />' }).logs, 'removed intent')).toBe(false);
      expect(said(run({ '/b.html': '<wr-timeline-item color="dark" />' }).logs, 'removed intent')).toBe(true);
    });
  });

  describe('the reports that read the whole project', () => {
    it('names a density setting only while no stylesheet loads the density sheet', () => {
      const app = { '/src/app/app.config.ts': 'providers: [provideWr(withDensity())]' };

      expect(said(run(app).logs, "no `@use 'ngwr/density'` anywhere")).toBe(true);
      expect(
        said(run({ ...app, '/src/styles.scss': "@use 'ngwr/theme';\n@use 'ngwr/density';" }).logs, 'ngwr/density')
      ).toBe(false);
    });

    it('names a form field with no copy only while the project has no validation catalog', () => {
      const form = { '/src/app/form.html': '<wr-form-field label="Email"><input wrInput /></wr-form-field>' };

      expect(said(run(form).logs, 'a form field with no <wr-form-error>')).toBe(true);
      expect(
        said(
          run({ ...form, '/src/app/i18n.ts': "export const en = { validation: { required: 'Required.' } };" }).logs,
          'a form field'
        )
      ).toBe(false);
      // A field that names its own error already has a source.
      const claimed =
        '<wr-form-field><input wrInput /><wr-form-error key="required">Required.</wr-form-error></wr-form-field>';
      expect(said(run({ '/x.html': claimed }).logs, 'a form field')).toBe(false);
    });

    it('names a date picker only while no catalog carries validation.dateFormat', () => {
      const picker = { '/src/app/when.html': '<wr-date-picker [(value)]="when" />' };

      expect(said(run(picker).logs, 'a date picker with no `validation.dateFormat`')).toBe(true);
      expect(
        said(
          run({ ...picker, '/src/i18n/en.json': '{ "validation": { "dateFormat": "Expected {{example}}" } }' }).logs,
          'a date picker'
        )
      ).toBe(false);
    });
  });

  /**
   * What a project looks like once it has been migrated by hand, or by an
   * earlier run. Every rule has to read it as finished — this is the tree an rc
   * user already on v15 hands the migration on the next update.
   */
  const v15Tree: Readonly<Record<string, string>> = {
    '/src/app/app.config.ts': `import { provideWr } from 'ngwr';
import { withDensity } from 'ngwr/density';
import { lucideIcons, provideWrIcons } from 'ngwr/icon';
import { withTheme } from 'ngwr/theme';

export const appConfig = {
  providers: [provideWr(withDensity({ defaultDensity: 'sm' }), withTheme()), provideWrIcons(lucideIcons({}))],
};
`,
    '/src/app/chart.ts': `import { WrBarChart } from 'ngwr/charts/bar-chart';
import { WrAurora } from 'ngwr/bits/aurora';
import { WrSortableList, WrSortableItem } from 'ngwr/sortable-list';
import { resolveCssColor } from 'ngwr/utils';

@Component({
  template: \`<p wrTypography tone="muted">x</p><wr-timeline-item color="neutral" />\`,
})
export class Chart {
  readonly empty = input('color-mix(in srgb, var(--wr-border-base) 50%, transparent)');
  readonly ok = (a: number, b: number) => a < b && b > 0;
}
`,
    '/src/app/list.html': `<wr-sortable-list [(items)]="rows">
  @for (row of rows(); track row.id) {
    <wr-sortable-item>{{ row.label }}</wr-sortable-item>
  }
</wr-sortable-list>
<wr-sidebar [entries]="nav" [defaultGroupIcon]="'folder'" [defaultItemIcon]="null" />
<wr-form-field label="Email"><input wrInput /></wr-form-field>
<wr-date-picker [(value)]="when" />
<button wr-btn color="primary" shape="squircle">Save</button>
`,
    '/src/app/i18n.ts': "export const en = { validation: { required: 'Required.', dateFormat: 'Use {{example}}' } };\n",
    '/src/styles.scss': `@use 'ngwr/theme';
@use 'ngwr/density';
@use 'ngwr/button';
@use 'ngwr/charts/bar-chart';
@use 'ngwr/sortable-list';

.card {
  border: 1px solid var(--wr-border-base);
  color: var(--wr-color-on-surface-muted);
  background: light-dark(#fff, #0b1120);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--wr-color-primary) 12%, transparent);
}
.wr-typography--tone-base { margin: 0; }
`,
    '/tsconfig.json': '{ "compilerOptions": { "paths": { "ngwr/charts/*": ["node_modules/ngwr/charts/*"] } } }\n',
  };

  it('comes through an already-v15 project byte for byte, and says nothing to do', () => {
    const { read, logs } = run(v15Tree);

    for (const [path, before] of Object.entries(v15Tree)) expect(read(path), path).toBe(before);
    expect(logs).toEqual(['ngwr v15 migration: nothing to do — no affected usage found.']);
  });

  /** A v14 project touching every rewrite family at once. */
  const v14Tree: Readonly<Record<string, string>> = {
    '/src/app/app.config.ts': `import { provideWrDateAdapter } from 'ngwr/date';
import { provideWrDensity } from 'ngwr/density';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { provideWrIcons } from 'ngwr/icon';
import { provideWrToastConfig } from 'ngwr/toast';

export const appConfig = {
  providers: [
    provideWrDateAdapter(),
    provideWrDensity({ defaultDensity: 'sm' }),
    provideWrToastConfig({ duration: 6000 }),
    provideWrIcons(lucideIcons({})),
  ],
};
`,
    '/src/app/chart.ts': `import { WrBarChart } from 'ngwr/bar-chart';
import { WrAurora } from 'ngwr/aurora';
import { WrSortableList } from 'ngwr/drag-drop';

@Component({ template: \`<p wrTypography tone="medium">x</p><wr-timeline-item color="medium" />\` })
export class Chart {
  readonly empty = input('rgba(var(--wr-color-light-rgb), 0.5)');
}
`,
    '/src/styles.scss': `@use 'ngwr/theme';
@use 'ngwr/density';
@use 'ngwr/bar-chart';
@use 'ngwr/drag-drop';

.card {
  border: 1px solid var(--wr-color-outline);
  color: var(--wr-color-muted-text);
  box-shadow: 0 0 0 4px rgba(var(--wr-color-primary-rgb), 0.12);
}
.wr-typography--tone-dark { margin: 0; }
`,
  };

  it('changes nothing more on a second run', () => {
    const first = run(v14Tree);
    const once = Object.fromEntries(Object.keys(v14Tree).map(path => [path, first.read(path)]));
    const second = run(once);

    for (const [path, content] of Object.entries(once)) expect(second.read(path), path).toBe(content);
    expect(said(first.logs, 'rewrote 3 file(s)')).toBe(true);
    expect(said(second.logs, 'rewrote')).toBe(false);
  });

  it('lands the v14 project on the v15 one', () => {
    const { read } = run(v14Tree);

    expect(read('/src/app/app.config.ts')).toBe(`import { provideWr } from 'ngwr';
import { withDensity } from 'ngwr/density';
import { lucideIcons, provideWrIcons } from 'ngwr/icon';
import { withToast } from 'ngwr/toast';

export const appConfig = {
  providers: [
    provideWr(withDensity({ defaultDensity: 'sm' }), withToast({ duration: 6000 })),
    provideWrIcons(lucideIcons({})),
  ],
};
`);
    expect(read('/src/app/chart.ts')).toContain("from 'ngwr/charts/bar-chart'");
    expect(read('/src/app/chart.ts')).toContain("from 'ngwr/bits/aurora'");
    expect(read('/src/app/chart.ts')).toContain("from 'ngwr/sortable-list'");
    expect(read('/src/app/chart.ts')).toContain('tone="muted"');
    expect(read('/src/app/chart.ts')).toContain('color="neutral"');
    expect(read('/src/styles.scss')).toBe(`@use 'ngwr/theme';
@use 'ngwr/density';
@use 'ngwr/charts/bar-chart';
@use 'ngwr/sortable-list';

.card {
  border: 1px solid var(--wr-border-base);
  color: var(--wr-color-on-surface-muted);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--wr-color-primary) 12%, transparent);
}
.wr-typography--tone-base { margin: 0; }
`);
  });

  describe('where it sits in ng update', () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), 'projects/lib/schematics/migrations.json'), 'utf8')
    ) as {
      schematics: Record<string, { version: string; description: string; factory: string }>;
    };
    const entry = manifest.schematics['migration-v15'];

    /**
     * The range `ng update` builds, copied from `executeMigrations` in
     * `@angular/cli/src/commands/update/utilities/migration.js`: the target
     * loses its prerelease, and a prerelease `from` starts at `-0`.
     */
    const runs = (version: string, from: string, to: string): boolean =>
      semver.satisfies(
        version,
        new semver.Range(`>${semver.prerelease(from) ? `${from.split('-')[0]}-0` : from} <=${to.split('-')[0]}`),
        { includePrerelease: true }
      );

    it('is registered with the factory it ships', () => {
      expect(entry.factory).toBe('./migrations/v15/index#default');
      expect(entry.version).toBe('15.0.0');
    });

    it.each([
      ['14.12.1', '15.0.0-rc.2', true],
      ['14.12.1', '15.0.0', true],
      ['13.2.0', '15.0.0-rc.1', true],
      // rc.0 and rc.1 shipped with no codemod, so an app already on one of
      // them has to run it on its next update. `15.0.0-0` would skip it here.
      ['15.0.0-rc.0', '15.0.0-rc.2', true],
      ['15.0.0-rc.1', '15.0.0', true],
      ['15.0.0', '15.0.1', false],
      ['14.12.1', '14.13.0', false],
    ])('runs from %s to %s: %s', (from, to, expected) => {
      expect(runs(entry.version, from, to)).toBe(expected);
    });

    it('says in ng update what it rewrites and what it reports', () => {
      for (const named of [
        'ngwr/charts/',
        'ngwr/bits/',
        'ngwr/sortable-list',
        'ngwr/icon/adapters/lucide',
        'provideWr(',
        'color-mix',
        '--wr-color-light',
        '--wr-color-outline',
        '--wr-color-dark',
        '--wr-color-medium',
        '--wr-color-muted-text',
        'tone',
        'neutral',
        "@use 'ngwr'",
        'secondary',
        'data-theme',
        'ngwr/config',
        'ngwr/media',
        'ngwr/markdown',
        'ngwr/action-sheet',
        'ngwr/squircle',
        'provideWrFormErrors',
        'provideWrOverlay',
      ]) {
        expect(entry.description, named).toContain(named);
      }
    });
  });

  /**
   * A catastrophic regex is SYNCHRONOUS, so vitest's timeout cannot interrupt
   * it, and a regression has to FAIL the budget in bounded time rather than
   * freeze the suite. The fixtures are the ones `migration-v14` sized against
   * the ambiguous `(?:"[^"]*"|'[^']*'|[^>])*?` form: an element with nothing
   * to rewrite, then button lines whose quotes that form pairs across `/>`.
   * Four lines cost it seconds per element; the rules that read through two
   * spans (a directive and its attribute, in either order) hung at four, so
   * those get three. The quote-safe form answers each in about a millisecond.
   */
  describe('an element with nothing to rewrite, followed by ordinary markup', () => {
    const buttons = (lines: number): string[] =>
      Array.from(
        { length: lines },
        (_, i) =>
          `  <button wr-btn size="sm" type="button" [title]="'row.${i}' | wrT" (click)="pick(${i})"><wr-icon name="x" /></button>`
      );

    it.each([
      {
        rule: '[wrTypography] without a tone',
        lines: 3,
        element: `<p wrTypography variant="body" [class.x]="a > b" [title]="'p.title' | wrT">Copy</p>`,
      },
      {
        rule: '<wr-timeline-item> without a medium colour',
        lines: 4,
        element: `<wr-timeline-item color="success" [title]="'t.title' | wrT">Done</wr-timeline-item>`,
      },
      {
        rule: '<wr-drawer> without showHandle',
        lines: 4,
        element: `<wr-drawer position="left" [title]="'d.title' | wrT" [(open)]="open">x</wr-drawer>`,
      },
      {
        rule: '<wr-select> without responsive',
        lines: 4,
        element: `<wr-select [options]="opts()" [placeholder]="'s.ph' | wrT" (valueChange)="v.set($event)" />`,
      },
      {
        rule: '[wrDropdown] without responsive',
        lines: 3,
        element: `<button wr-btn [wrDropdown]="menu" [title]="'m.title' | wrT" (click)="track('menu')">Menu</button>`,
      },
      {
        rule: '<wr-editor> without format',
        lines: 4,
        element: `<wr-editor [placeholder]="'e.ph' | wrT" [(value)]="doc" (touch)="touched()" />`,
      },
      {
        rule: '<wr-sortable-list> without trackBy',
        lines: 4,
        element: `<wr-sortable-list [(items)]="rows" [ariaLabel]="'l.label' | wrT" />`,
      },
    ])('answers at once on $rule', ({ element, lines }) => {
      const source = ['<div class="wrap">', `  ${element}`, ...buttons(lines), '</div>', ''].join('\n');
      const started = performance.now();
      const { read } = run({ '/src/app/grid.html': source });
      const elapsed = performance.now() - started;

      expect(read('/src/app/grid.html')).toBe(source);
      expect(elapsed).toBeLessThan(100);
    });

    it('answers at once on a tag with many quoted attributes and nothing to rename', () => {
      const element = `<p wrTypography ${Array.from({ length: 18 }, (_, i) => `data-a${i}="v"`).join(' ')}>x</p>`;
      const started = performance.now();
      const { read } = run({ '/u.html': element });
      const elapsed = performance.now() - started;

      expect(read('/u.html')).toBe(element);
      expect(elapsed).toBeLessThan(100);
    });
  });
});
