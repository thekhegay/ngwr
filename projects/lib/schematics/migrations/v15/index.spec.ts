/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HostTree, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import ngUpdateV15 from './index';

/**
 * `ng update ngwr@15`, which REWRITES the neutral token renames and REPORTS
 * every use of a removed intent.
 *
 * Both halves need a spec and they fail in opposite directions, the same way
 * v14's do. The reporting half fails by staying quiet, and quiet is
 * indistinguishable from "nothing to do". The rewriting half fails by touching
 * something it should not — and here that risk is sharper than in any earlier
 * migration, because the rules key on a token NAME rather than on an element:
 * `--wr-color-light` is a prefix of `--wr-color-light-rgb` and of
 * `--wr-color-light-lighter`, and getting the order or the lookahead wrong
 * produces a name that is not a token at all, which is the exact failure the
 * whole migration exists to prevent.
 */

interface Run {
  readonly logs: readonly string[];
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

function rewrite(path: string, content: string): string {
  return run({ [path]: content }).read(path);
}

const said = (logs: readonly string[], fragment: string): boolean => logs.some(line => line.includes(fragment));

describe('ng update ngwr@15', () => {
  it('says nothing to do on a project that uses none of it', () => {
    const { logs } = run({ '/src/app/app.html': '<wr-btn color="primary">Save</wr-btn>' });

    expect(said(logs, 'nothing to do')).toBe(true);
  });

  describe('the neutral tokens it rewrites', () => {
    it.each([
      ['--wr-color-light', '--wr-color-outline'],
      ['--wr-color-light-rgb', '--wr-color-outline-rgb'],
      ['--wr-color-dark', '--wr-color-on-surface'],
      ['--wr-color-dark-rgb', '--wr-color-on-surface-rgb'],
      ['--wr-color-muted-text', '--wr-color-on-surface-muted'],
      ['--wr-color-muted-text-rgb', '--wr-color-on-surface-muted-rgb'],
      ['--wr-color-medium', '--wr-color-on-surface-muted'],
      ['--wr-color-medium-rgb', '--wr-color-on-surface-muted-rgb'],
    ])('moves %s to %s', (from, to) => {
      expect(rewrite('/src/a.scss', `.card { color: var(${from}); }`)).toBe(`.card { color: var(${to}); }`);
    });

    /**
     * The whole reason `TOKEN_RENAMES` is ordered longest-first AND carries a
     * `(?![\w-])` lookahead. With either one missing, `--wr-color-light-rgb`
     * becomes `--wr-color-outline-rgb` by the wrong route — the short rule
     * matching the prefix — and any name the short rule does not cover, such as
     * `-light-lighter`, is silently mangled into a token that does not exist.
     */
    it('never matches inside a longer token name', () => {
      const source = [
        '.a { border-color: var(--wr-color-light-lighter); }',
        '.b { background: var(--wr-color-dark-darker); }',
        '.c { color: var(--wr-color-medium-contrast); }',
      ].join('\n');

      expect(rewrite('/src/a.scss', source)).toBe(source);
    });

    it('leaves the intents that survived alone', () => {
      const source = '.a { color: var(--wr-color-primary); background: var(--wr-color-info-soft); }';

      expect(rewrite('/src/a.scss', source)).toBe(source);
    });

    /**
     * A token name means the same thing in all three file kinds, which is why
     * these rules are not scoped to an element the way v14's renames are: a
     * stylesheet declares and reads one, a template writes one in an inline
     * `style`, and a component writes one into a signal or a class binding.
     */
    it('reaches a template and a component file, not only a stylesheet', () => {
      expect(rewrite('/src/a.html', '<div style="color: var(--wr-color-dark)"></div>')).toContain(
        'var(--wr-color-on-surface)'
      );
      expect(rewrite('/src/a.ts', "const c = 'rgba(var(--wr-color-light-rgb), 0.4)';")).toContain(
        'var(--wr-color-outline-rgb)'
      );
    });

    it('rewrites a declaration as readily as a read', () => {
      expect(rewrite('/src/a.scss', '.theme { --wr-color-dark: #fff; }')).toBe(
        '.theme { --wr-color-on-surface: #fff; }'
      );
    });
  });

  describe('the entry point it moves', () => {
    it.each([
      [`import { WrSortableList } from 'ngwr/drag-drop';`, `import { WrSortableList } from 'ngwr/sortable-list';`],
      [`@use 'ngwr/drag-drop';`, `@use 'ngwr/sortable-list';`],
      [`import('ngwr/drag-drop/testing')`, `import('ngwr/sortable-list/testing')`],
    ])('moves %s', (before, after) => {
      expect(rewrite('/a.ts', before)).toBe(after);
    });

    it('leaves the CDK package alone', () => {
      // A different package, and the one every `cdkDrag` consumer imports.
      const source = `import { CdkDrag } from '@angular/cdk/drag-drop';`;

      expect(rewrite('/a.ts', source)).toBe(source);
    });
  });

  describe('the two values it rewrites', () => {
    // These are renames and not reports, because each value was named after an
    // intent and never painted one: both tones always resolved to a neutral
    // ROLE, and the timeline's quiet dot was always a hollow ring.
    it.each([
      ['<p wrTypography tone="dark">x</p>', '<p wrTypography tone="base">x</p>'],
      ['<p wrTypography tone="medium">x</p>', '<p wrTypography tone="muted">x</p>'],
      ['<p tone="dark" wrTypography>x</p>', '<p tone="base" wrTypography>x</p>'],
      ['<p tone="medium" wrTypography>x</p>', '<p tone="muted" wrTypography>x</p>'],
      [
        '<wr-timeline-item color="medium">x</wr-timeline-item>',
        '<wr-timeline-item color="neutral">x</wr-timeline-item>',
      ],
    ])('moves %s', (before, after) => {
      expect(rewrite('/a.html', before)).toBe(after);
    });

    /**
     * Scoped to the element, the opposite call from the intent detector below,
     * because `tone` and `color` carrying these words mean something else
     * anywhere but here.
     */
    it('leaves the same attribute on anything else alone', () => {
      const source = [
        '<p tone="dark">not the directive</p>',
        '<app-chart color="medium">not the timeline</app-chart>',
        '<wr-timeline color="medium">the container, not the item</wr-timeline>',
      ].join('\n');

      expect(rewrite('/a.html', source)).toBe(source);
    });

    it('moves the BEM class each of them emits', () => {
      expect(rewrite('/a.scss', '.wr-typography--tone-dark { margin: 0; }')).toContain('.wr-typography--tone-base');
      expect(rewrite('/a.scss', '.wr-typography--tone-medium { margin: 0; }')).toContain('.wr-typography--tone-muted');
      expect(rewrite('/a.scss', '.wr-timeline-item--medium { margin: 0; }')).toContain('.wr-timeline-item--neutral');
    });

    it('reaches an inline template in a component file', () => {
      expect(rewrite('/a.ts', 'template: `<p wrTypography tone="medium">x</p>`,')).toContain('tone="muted"');
    });

    /**
     * The half of `IN_TAG` no timing case can show. A `>` inside an earlier
     * binding ends the tag for the ambiguous `[^>]*?` spelling, so the rename
     * never fires — and a leftover is silent here, because a `tone` matching no
     * value renders untoned with no error at all. Both of these pass with the
     * quote-safe form and fail with the loose one.
     */
    it('crosses a binding that contains a greater-than sign', () => {
      expect(rewrite('/a.html', `<p wrTypography [hidden]="n > 0" tone="medium">x</p>`)).toContain('tone="muted"');
      expect(rewrite('/a.html', `<wr-timeline-item [hidden]="n > 0" color="medium">x</wr-timeline-item>`)).toContain(
        'color="neutral"'
      );
    });
  });

  describe('the removed intents it reports', () => {
    it('names a `color` attribute, static or bound, and spares one that survived', () => {
      expect(said(run({ '/a.html': '<wr-btn color="secondary">Go</wr-btn>' }).logs, 'removed intent')).toBe(true);
      expect(said(run({ '/a.html': `<wr-tag [color]="'medium'">x</wr-tag>` }).logs, 'removed intent')).toBe(true);
      expect(said(run({ '/a.html': '<wr-btn color="primary">Go</wr-btn>' }).logs, 'removed intent')).toBe(false);
    });

    /**
     * Deliberately not anchored to an element, unlike every rule in
     * `migration-v14`. The alternative is a list of every component taking a
     * `WrColor`, which is wrong the moment the catalog grows — so this has to
     * fire on a component the migration has never heard of.
     */
    it('fires on a component it does not know about', () => {
      expect(said(run({ '/a.html': '<app-thing color="dark" />' }).logs, 'removed intent')).toBe(true);
    });

    it('names a class that no longer matches', () => {
      expect(said(run({ '/a.scss': '.wr-btn--secondary { margin: 0; }' }).logs, 'no longer emits it')).toBe(true);
      expect(said(run({ '/a.scss': '.wr-btn--primary { margin: 0; }' }).logs, 'no longer emits it')).toBe(false);
    });

    it('names a secondary token, which has no successor and is never rewritten', () => {
      const source = '.a { color: var(--wr-color-secondary-ink); }';
      const { logs, read } = run({ '/a.scss': source });

      expect(said(logs, 'second brand colour')).toBe(true);
      expect(read('/a.scss')).toBe(source);
    });

    it('names an orphan shade rather than guessing a role for it', () => {
      const source = '.a { border-color: var(--wr-color-light-lighter); }';
      const { logs, read } = run({ '/a.scss': source });

      expect(said(logs, 'SHADE of a removed intent')).toBe(true);
      expect(read('/a.scss')).toBe(source);
    });

    it('names a `$base-colors` map still carrying a removed key', () => {
      const source = "@use 'ngwr/theme' with ($base-colors: (primary: #06c, secondary: #e21a62));";

      expect(said(run({ '/a.scss': source }).logs, '$base-colors')).toBe(true);
      expect(
        said(run({ '/b.scss': "@use 'ngwr/theme' with ($base-colors: (primary: #06c));" }).logs, '$base-colors')
      ).toBe(false);
    });

    it('names a WrColor literal the narrowed union refuses', () => {
      expect(said(run({ '/a.ts': "const c: WrColor = 'medium';" }).logs, 'WrColor')).toBe(true);
    });

    it('names a sortable list still rendering its row from a template', () => {
      const source = [
        '<wr-sortable-list [(items)]="rows">',
        '  <ng-template let-row>{{ row.label }}</ng-template>',
        '</wr-sortable-list>',
      ].join('\n');
      const { logs, read } = run({ '/a.html': source });

      expect(said(logs, 'wr-sortable-item')).toBe(true);
      expect(read('/a.html')).toBe(source);
    });

    it('leaves a migrated sortable list alone', () => {
      const source = [
        '<wr-sortable-list [(items)]="rows">',
        '  @for (row of rows(); track row.id) {',
        '    <wr-sortable-item>{{ row.label }}</wr-sortable-item>',
        '  }',
        '</wr-sortable-list>',
      ].join('\n');

      expect(said(run({ '/a.html': source }).logs, 'wr-sortable-item')).toBe(false);
    });

    it('does not claim an ng-template that belongs to something else', () => {
      const source = ['<wr-select [options]="o" />', '<ng-template #tpl>x</ng-template>'].join('\n');

      expect(said(run({ '/a.html': source }).logs, 'wr-sortable-item')).toBe(false);
    });
  });

  /**
   * Three whole removals, and every one of them reports rather than rewrites:
   * nothing the library can write means what the removed thing meant in the
   * same place. The specs below prove that in both directions — that each is
   * named, and that each leaves the file byte-for-byte alone.
   */
  describe('the three things it removes and reports', () => {
    it('names an import of the removed squircle entry point, and rewrites nothing', () => {
      const source = "import { WrSquircle } from 'ngwr/squircle';";
      const { logs, read } = run({ '/a.ts': source });

      expect(said(logs, 'ngwr/squircle')).toBe(true);
      expect(read('/a.ts')).toBe(source);
    });

    it.each([
      ['an attribute', '/a.html', '<div wrSquircle [radius]="14">x</div>'],
      ['the host element', '/a.html', '<wr-squircle>x</wr-squircle>'],
      ['a Sass use', '/a.scss', "@use 'ngwr/squircle';"],
      ['a BEM selector', '/a.scss', '.wr-squircle--bordered { border: 0; }'],
      ['a custom property', '/a.scss', '.x { --wr-squircle-radius: 12px; }'],
    ])('names %s', (_what, path, source) => {
      const { logs, read } = run({ [path]: source });

      expect(said(logs, 'ngwr/squircle')).toBe(true);
      expect(read(path)).toBe(source);
    });

    it('does not read a native corner-shape squircle as the removed directive', () => {
      const source = ['<wr-btn shape="squircle">Save</wr-btn>', '.x { corner-shape: squircle; }'].join('\n');

      expect(said(run({ '/a.html': source }).logs, 'ngwr/squircle')).toBe(false);
    });

    it.each([
      ['the element', '/a.html', '<wr-action-sheet [actions]="rows" />'],
      ['an import', '/a.ts', "import { WrActionSheet } from 'ngwr/action-sheet';"],
      ['a harness import', '/a.ts', "import { WrActionSheetHarness } from 'ngwr/action-sheet/testing';"],
      ['a BEM selector', '/a.scss', '.wr-action-sheet__action { color: red; }'],
    ])('names %s of the removed action sheet', (_what, path, source) => {
      const { logs, read } = run({ [path]: source });

      expect(said(logs, 'ngwr/action-sheet')).toBe(true);
      expect(read(path)).toBe(source);
    });

    it('leaves the drawer the action sheet was a preset over alone', () => {
      const source = '<wr-drawer position="bottom" rounded>x</wr-drawer>';

      expect(said(run({ '/a.html': source }).logs, 'ngwr/action-sheet')).toBe(false);
    });

    it.each([
      ['bare', '<wr-drawer position="bottom" showHandle>x</wr-drawer>'],
      ['bound', '<wr-drawer [showHandle]="true">x</wr-drawer>'],
      ['after a binding holding a greater-than', '<wr-drawer [hasBackdrop]="n > 0" showHandle>x</wr-drawer>'],
    ])('names a %s drawer grab handle', (_what, source) => {
      const { logs, read } = run({ '/a.html': source });

      expect(said(logs, 'showHandle')).toBe(true);
      expect(read('/a.html')).toBe(source);
    });

    it('names the handle classes a stylesheet or a locator keys on', () => {
      expect(said(run({ '/a.scss': '.wr-drawer__handle { cursor: grab; }' }).logs, 'showHandle')).toBe(true);
      expect(said(run({ '/a.ts': "q('.wr-drawer__panel--handle')" }).logs, 'showHandle')).toBe(true);
    });

    /**
     * The handle detector is anchored to `<wr-drawer`, unlike the intent one,
     * and this is the case that decides it: `showHandle` is a live public
     * input on `<wr-compare>` and an internal computed on `wr-textarea`, so an
     * unanchored rule would name files whose markup is correct and invite
     * someone to delete it.
     */
    it('does not claim a showHandle that belongs to another component', () => {
      const source = ['<wr-compare [showHandle]="true" />', '<wr-drawer>x</wr-drawer>'].join('\n');

      expect(said(run({ '/a.html': source }).logs, 'showHandle')).toBe(false);
    });

    /**
     * The quote-safe `IN_TAG` again. A catastrophic regex is synchronous, so
     * vitest's timeout cannot interrupt it — the fixture is small enough that
     * the ambiguous spelling costs seconds rather than hours, which is what
     * makes a regression fail instead of freezing the suite.
     */
    it('steps over an unmatched drawer without backtracking', () => {
      const source = `<wr-drawer position="left">${'<p class="a" id="b">x</p>'.repeat(60)}`;
      const started = performance.now();

      run({ '/a.html': source });

      expect(performance.now() - started).toBeLessThan(2000);
    });
  });

  /**
   * The manifest is what `ng update` reads, and v14 shipped saying one thing
   * while doing another — its own commit subject announced a rename it had not
   * made. So the description is held to the rule rather than trusted.
   */
  it('describes itself in the manifest the way it behaves', () => {
    const manifest = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'migrations.json'), 'utf8')) as {
      schematics: Record<string, { version: string; description: string; factory: string }>;
    };
    const entry = manifest.schematics['migration-v15'];

    expect(entry).toBeDefined();
    expect(entry.version).toBe('15.0.0');
    expect(entry.factory).toBe('./migrations/v15/index#default');
    for (const rewritten of ['--wr-color-light', '--wr-color-dark', '--wr-color-muted-text', '--wr-color-medium']) {
      expect(entry.description).toContain(rewritten);
    }
    for (const reported of ['secondary', 'light', 'medium', 'dark']) {
      expect(entry.description).toContain(reported);
    }
    // The three outright removals, which the manifest has to name for the same
    // reason: a migration that says nothing about them reads as "nothing to do".
    for (const removed of ['ngwr/squircle', 'ngwr/action-sheet', 'showHandle']) {
      expect(entry.description).toContain(removed);
    }
  });

  /**
   * A catastrophic regex is SYNCHRONOUS, so vitest's timeout cannot interrupt
   * it — a regression would freeze the suite rather than fail it. These
   * fixtures are sized so the ambiguous `[^>]` spelling of `IN_TAG` costs
   * seconds where the quote-safe one costs under a millisecond, which is what
   * makes a regression fail instead of hang. That form froze `ng update
   * ngwr@14` on ordinary templates in every 14.x release up to 14.5.0.
   */
  describe('an element with no removed intent, followed by ordinary markup', () => {
    const rows = (lines: number): string[] =>
      Array.from(
        { length: lines },
        (_, i) =>
          `  <button wr-btn size="sm" type="button" [title]="'row.${i}' | wrT" (click)="pick(${i})"><wr-icon name="x" /></button>`
      );

    it.each([
      {
        shape: 'a button with a surviving intent',
        element: '<wr-btn color="primary" [disabled]="n > 0">Save</wr-btn>',
      },
      { shape: 'a tag with no colour at all', element: `<wr-tag [icon]="'x'" [title]="'it\\'s'">Draft</wr-tag>` },
      { shape: 'an alert with a bound type', element: `<wr-alert [type]="n > 0 ? 'info' : 'warning'" closable />` },
      {
        shape: 'a typography element with no tone',
        element: `<p wrTypography variant="body" [class.x]="a > b" [title]="'it\\'s'">Copy</p>`,
      },
      {
        shape: 'a timeline item with a surviving colour',
        element: `<wr-timeline-item color="success" [title]="'it\\'s'">Done</wr-timeline-item>`,
      },
    ])('answers at once on $shape', ({ element }) => {
      const source = ['<div class="wrap">', `  ${element}`, ...rows(4), '</div>', ''].join('\n');
      const started = performance.now();
      const { read } = run({ '/src/app/grid.html': source });
      const elapsed = performance.now() - started;

      expect(read('/src/app/grid.html')).toBe(source);
      expect(elapsed).toBeLessThan(100);
    });
  });
});
