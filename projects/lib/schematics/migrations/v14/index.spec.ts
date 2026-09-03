/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { HostTree, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import ngUpdateV14 from './index';

/**
 * `ng update ngwr@14`, which REWRITES five renames and REPORTS everything else.
 *
 * Both halves need a spec, for opposite reasons.
 *
 * The reporting half fails by staying quiet, and quiet is indistinguishable
 * from "nothing to do". Six detectors carry negative lookaheads and none of them
 * was exercised before this file — one of the six was reporting the idiomatic
 * `provideWrDateAdapter({ locale })` as having no locale, which is the shape the
 * audit stand itself writes.
 *
 * The rewriting half fails the other way: by touching something it should not.
 * Every rule here is anchored to an element, and the anchor is a negative
 * lookahead rather than a `\b` precisely because `<wr-table` is a prefix of
 * `<wr-table-filter` and `<wr-window` of `<wr-window-taskbar` — the trap the v9
 * migration documents about `<wr-checkbox-group`. So each rewrite case names its
 * neighbour and asserts the neighbour survives untouched.
 *
 * Every case below therefore comes in a pair: the input that must move (or
 * warn), and the neighbouring input that must NOT.
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
  const rule = ngUpdateV14() as (target: Tree, ctx: SchematicContext) => Tree;
  const next = rule(tree, context);

  return { logs, read: (path: string) => next.readText(path) };
}

/** Run one file through the rule and hand back what it looks like afterwards. */
function rewrite(path: string, content: string): string {
  return run({ [path]: content }).read(path);
}

const said = (logs: readonly string[], fragment: string): boolean => logs.some(line => line.includes(fragment));

describe('ng update ngwr@14', () => {
  it('says nothing to do on a project that uses none of it', () => {
    const { logs } = run({ '/src/app/app.html': '<wr-button>Save</wr-button>' });

    expect(said(logs, 'nothing to do')).toBe(true);
  });

  it('names the loading bar, which breaks silently', () => {
    const { logs } = run({ '/src/app/shell.html': '<wr-loading-bar />\n<router-outlet />' });

    expect(said(logs, 'provideWrLoadingBarRouter')).toBe(true);
    expect(said(logs, '/src/app/shell.html')).toBe(true);
  });

  it('names a router tab, and leaves a plain tab alone', () => {
    expect(said(run({ '/a.html': '<wr-tab title="One" routerLink="one" />' }).logs, 'wrTabsRouting')).toBe(true);
    expect(said(run({ '/b.html': '<wr-tab title="One" key="one" />' }).logs, 'wrTabsRouting')).toBe(false);
  });

  it('accepts every spelling of a date locale, including the shorthand', () => {
    // The regression that motivated this file. All four of these HAVE a locale.
    const withLocale = [
      "provideWrDateAdapter({ locale: 'ru-RU' })",
      'provideWrDateAdapter({ locale })',
      "provideWrDateAdapter({ adapter: makeAdapter(), locale: 'ru-RU' })",
      "provideWrDateAdapter({\n  locale: 'ru-RU',\n})",
    ];
    for (const source of withLocale) {
      expect(said(run({ '/c.ts': source }).logs, 'provideWrDateAdapter'), source).toBe(false);
    }

    // And these do not.
    for (const source of ['provideWrDateAdapter()', 'provideWrDateAdapter({ adapter: makeAdapter() })']) {
      expect(said(run({ '/d.ts': source }).logs, 'provideWrDateAdapter'), source).toBe(true);
    }
  });

  it('names a catalog that still translates the removed pagination key', () => {
    const stale = "export const de = { pagination: { of: 'von', next: 'Weiter' } };";
    expect(said(run({ '/i18n/de.ts': stale }).logs, 'pagination.of')).toBe(true);

    // `common.of` is still shipped and still unread — a catalog translating it is
    // not stale, and dragging every catalog into the warning would train people
    // to ignore it.
    const fine = "export const de = { common: { of: 'von' }, pagination: { range: '{{from}}–{{to}}' } };";
    expect(said(run({ '/i18n/de2.ts': fine }).logs, 'pagination.of')).toBe(false);
  });

  it('names an ofLabel binding, which is the half markup can see', () => {
    expect(said(run({ '/e.html': '<wr-pagination [ofLabel]="x" />' }).logs, 'ofLabel')).toBe(true);
    expect(said(run({ '/f.html': '<wr-pagination [total]="x" />' }).logs, 'ofLabel')).toBe(false);
  });

  describe('the renames it rewrites', () => {
    it('moves the alert dismiss toggle in every form it is written', () => {
      // The bare attribute is the COMMON form here — `closable` defaults to
      // false — and it is also the form a `name=`-only rule silently skips.
      expect(rewrite('/a.html', '<wr-alert closeable />')).toBe('<wr-alert closable />');
      expect(rewrite('/b.html', '<wr-alert type="danger" closeable>Body</wr-alert>')).toBe(
        '<wr-alert type="danger" closable>Body</wr-alert>'
      );
      expect(rewrite('/c.html', '<wr-alert [closeable]="x" />')).toBe('<wr-alert [closable]="x" />');
      // Multi-line open tags are the ordinary shape once a component has four
      // attributes, and `[^>]*?` matches a newline like any other character.
      expect(rewrite('/d.html', '<wr-alert\n  type="info"\n  closeable\n/>')).toBe(
        '<wr-alert\n  type="info"\n  closable\n/>'
      );
    });

    it('leaves a `closeable` that is not the alert input alone', () => {
      // Someone else's component, and the alert's own `closeLabel`, which starts
      // with the same five letters.
      const other = '<app-panel closeable />\n<wr-alert closeLabel="Dismiss" />';
      expect(rewrite('/e.html', other)).toBe(other);
    });

    it('moves totalItems on the table and not on its two sibling elements', () => {
      expect(rewrite('/f.html', '<wr-table [columns]="c" [totalItems]="n" />')).toBe(
        '<wr-table [columns]="c" [total]="n" />'
      );
      // `<wr-table` is a prefix of both of these. A `\b` anchor would rename
      // through them; the lookahead is what stops it.
      const siblings = '<wr-table-filter [totalItems]="n" />\n<wr-table-sort [totalItems]="n" />';
      expect(rewrite('/g.html', siblings)).toBe(siblings);
    });

    it('moves the pager page in all three binding forms', () => {
      expect(rewrite('/h.html', '<wr-pagination [total]="120" [(currentPage)]="p" />')).toBe(
        '<wr-pagination [total]="120" [(page)]="p" />'
      );
      expect(rewrite('/i.html', '<wr-pagination [currentPage]="p()" (currentPageChange)="p.set($event)" />')).toBe(
        '<wr-pagination [page]="p()" (pageChange)="p.set($event)" />'
      );
      // A host property that HAPPENS to be called currentPage is not the input,
      // and only the left-hand side of the binding moves.
      expect(rewrite('/j.html', '<wr-pagination [(currentPage)]="currentPage" />')).toBe(
        '<wr-pagination [(page)]="currentPage" />'
      );
    });

    it('leaves currentPage alone everywhere it is not a pager attribute', () => {
      const mine = 'readonly currentPage = signal(1);\n<app-pager [(currentPage)]="currentPage" />';
      expect(rewrite('/k.ts', mine)).toBe(mine);
    });

    it('renames the button boolean unscoped, because the name is unique', () => {
      // `wr-btn` is also an ATTRIBUTE selector, so there is no one tag to anchor
      // to — and no other library ships an input by this name.
      expect(rewrite('/l.html', '<button wr-btn loading [isDisabledWhenLoading]="false">Go</button>')).toBe(
        '<button wr-btn loading [disabledWhenLoading]="false">Go</button>'
      );
      expect(rewrite('/m.ts', 'readonly isDisabledWhenLoading = input(true);')).toBe(
        'readonly disabledWhenLoading = input(true);'
      );
    });

    it('retires the window chrome vocabulary v8 was supposed to retire', () => {
      // The service call is the primary form: a window is always opened, never
      // written as an element by the consumer.
      expect(rewrite('/n.ts', "manager.open(Cmp, { title: 'T', chromeSize: 'compact' });")).toBe(
        "manager.open(Cmp, { title: 'T', chromeSize: 'sm' });"
      );
      expect(rewrite('/o.ts', "manager.open(Cmp, { chromeSize: 'normal' });")).toBe(
        "manager.open(Cmp, { chromeSize: 'md' });"
      );
      expect(rewrite('/p.html', '<wr-window chromeSize="compact" />')).toBe('<wr-window chromeSize="sm" />');
      expect(rewrite('/q.html', `<wr-window [chromeSize]="'normal'" />`)).toBe(`<wr-window [chromeSize]="'md'" />`);
      // A consumer override of the BEM class has to move with it — the class is
      // public API here.
      expect(rewrite('/r.scss', '.wr-window--chrome-compact { --wr-window-chrome-height: 1rem; }')).toBe(
        '.wr-window--chrome-sm { --wr-window-chrome-height: 1rem; }'
      );
    });

    it("does not touch a window STATE that happens to be spelled 'normal'", () => {
      // `WrWindowState` is `'normal' | 'minimized' | 'maximized'` and is NOT a
      // density. The value rules are keyed to `chromeSize`, so this survives.
      const state = "expect(await win.getState()).toBe('normal');\nconst s: WrWindowState = 'normal';";
      expect(rewrite('/s.ts', state)).toBe(state);
    });

    it('moves the pagination harness filter, which is named after the input', () => {
      expect(rewrite('/t.ts', 'loader.getHarness(WrPaginationHarness.with({ currentPage: 3 }))')).toBe(
        'loader.getHarness(WrPaginationHarness.with({ page: 3 }))'
      );
      // Another harness's filter of the same name is not this one.
      const other = 'loader.getHarness(WrCarouselHarness.with({ currentPage: 3 }))';
      expect(rewrite('/u.ts', other)).toBe(other);
    });

    it('says what it rewrote, and still says nothing to do on a clean project', () => {
      expect(said(run({ '/v.html': '<wr-alert closeable />' }).logs, 'rewrote 1 file(s)')).toBe(true);
      expect(said(run({ '/w.html': '<wr-alert closable />' }).logs, 'nothing to do')).toBe(true);
    });
  });

  it('rewrites an attribute sitting after a `>` inside an earlier binding', () => {
    // The gap a plain `[^>]*?` leaves, and the reason it matters more than it
    // looks: the leftover is SILENT. A static `closeable` that matches no input
    // is an ordinary DOM attribute, `strictTemplates` reports nothing, and the
    // alert simply stops being dismissible. Only the bracketed forms are loud.
    const { read } = run({
      '/a.html': `<wr-alert [type]="count > 0 ? 'info' : 'danger'" closeable>A</wr-alert>`,
      '/b.html': `<wr-table [rows]="n > 1 ? a : b" totalItems="42" />`,
    });

    expect(read('/a.html')).toContain('closable');
    expect(read('/a.html')).not.toContain('closeable');
    expect(read('/b.html')).toContain('total="42"');
  });

  it('moves both window chrome classes, including the one nothing styled', () => {
    // `--chrome-normal` was every default window in v13, because the class is
    // built from the input's value. Nothing in the library styled it, so it was
    // easy to miss — and a consumer override keyed on it fails silently, since
    // CSS has no error to report.
    const { read } = run({ '/s.scss': '.wr-window--chrome-compact { a: 1 } .wr-window--chrome-normal { b: 2 }' });
    const out = read('/s.scss');

    expect(out).toContain('.wr-window--chrome-sm');
    expect(out).toContain('.wr-window--chrome-md');
    expect(out).not.toContain('compact');
    expect(out).not.toContain('normal');
  });
});
