import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { CHART_MARKERS, chartMarkerPath } from 'ngwr/charts/core';
import { describe, expect, it } from 'vitest';

/**
 * What the charts' stylesheets promise that no rendered DOM in jsdom can show — no
 * layout, no cascade from a sheet, no forced-colors mode — held against the COMPILED
 * CSS. That each rule then paints what it says is measured in a browser.
 *
 * `sass` is resolved through `@angular/build`, as `theme/sass-entry.spec.ts` does.
 */
interface Sass {
  compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
}

const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;

const LIB = join(process.cwd(), 'projects/lib');
const CHARTS = join(LIB, 'charts');

const compile = (chart: string): string =>
  sass
    .compileString(`@use 'charts/${chart}/styles';`, { loadPaths: [LIB], style: 'expanded' })
    .css.replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations of the rule whose selector is exactly `.${cls}`, outside any at-rule. */
function rule(css: string, cls: string): string {
  return new RegExp(`(?:^|\\n)\\.${cls}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
}

/**
 * Every folder under `charts/` with a template of its own. `charts/core` has none, and
 * is the one folder allowed none: it holds the helpers the charts share and draws no
 * chart. Its one template, `chart-table.html`, is the data table a chart renders for
 * screen readers, clipped out of sight and painting no mark, so the scan below has
 * nothing in it to find. A chart whose template stopped being found would drop out of
 * every case below in silence, so the folders without one are named rather than
 * skipped.
 */
const folders = readdirSync(CHARTS, { withFileTypes: true }).filter(entry => entry.isDirectory());
const TEMPLATELESS = ['core'];
const drawn = folders.filter(({ name }) => existsSync(join(CHARTS, name, `${name}.html`)));

/** Each chart's elements painted by an inline `[style.background]`, by their first class. */
const marks = drawn.flatMap(({ name }) => {
  const template = readFileSync(join(CHARTS, name, `${name}.html`), 'utf8');
  return [...template.matchAll(/<[a-z][\w-]*\b((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)]
    .filter(tag => tag[1].includes('[style.background]'))
    .map(tag => [name, /class="([\w-]+)/.exec(tag[1])?.[1] ?? ''] as const);
});

/**
 * Every chart mark drawn as an HTML box keeps its colour under `forced-colors`. The SVG
 * charts keep their fills and strokes there, but a mark painted with an inline
 * `background` does not: forced colors resets `background-color` to `Canvas`, so the
 * bars, the meter's slices and the heatmap's squares vanished into the page and left
 * only their labels. Every element painted that way is read off the TEMPLATES, so a
 * new one is held to the rule too.
 */
describe('chart marks under forced colors', () => {
  it('reads the template of every folder that draws', () => {
    expect(folders.filter(entry => !drawn.includes(entry)).map(({ name }) => name)).toEqual(TEMPLATELESS);
  });

  it('finds the marks it checks', () => {
    // A template scan that matched nothing would make every case below vacuous.
    expect(marks.map(([, cls]) => cls)).toEqual(
      expect.arrayContaining(['wr-bar-chart__bar', 'wr-meter-group__slice', 'wr-calendar-heatmap__cell'])
    );
    expect(marks.every(([, cls]) => cls !== '')).toBe(true);
  });

  it.each(marks)('%s keeps the colour of .%s', (chart, cls) => {
    expect(rule(compile(chart), cls)).toMatch(/forced-color-adjust:\s*none/);
  });

  it("gives the meter's track an edge, since forced colors paints it as the page", () => {
    expect(compile('meter-group')).toMatch(
      /@media \(forced-colors: active\)\s*\{\s*\.wr-meter-group__bar\s*\{\s*outline: 1px solid CanvasText;/
    );
  });
});

describe('chart geometry', () => {
  it("lays the meter's gaps over the slices rather than beside them", () => {
    // A margin between slices was added ON TOP of widths that are already shares of the
    // bar: a 50/100 meter of five slices filled 55% of it, and a zero slice still added
    // its margin. An outline takes no room.
    const css = compile('meter-group');
    expect(rule(css, 'wr-meter-group__slice')).toMatch(/outline: calc\(var\(--wr-space-xs\) \/ 2\) solid/);
    expect(rule(css, 'wr-meter-group__slice')).not.toMatch(/margin/);
    expect(css).not.toMatch(/\.wr-meter-group__slice \+ \.wr-meter-group__slice/);
  });

  it('bounds the value above a bar to its column, ellipsised', () => {
    // Forty five-digit values at 1280px overlapped into one smear, the outermost past
    // the chart.
    const value = rule(compile('bar-chart'), 'wr-bar-chart__value');
    expect(value).toMatch(/max-width: 100%/);
    expect(value).toMatch(/text-overflow: ellipsis/);
    expect(value).toMatch(/white-space: nowrap/);
    expect(value).toMatch(/flex: none/);
  });

  it("lets a legend's marker reach past its box, since every shape has the circle's area", () => {
    // The swatch's viewBox is sized for the circle, and a triangle's point and a
    // diamond's tips reach past it. An SVG clips at its own viewport by default, which
    // cut the point off three of the six shapes. Read off the template, so a resized
    // viewBox or radius moves the list of shapes that overhang.
    const template = readFileSync(join(CHARTS, 'chart-legend/chart-legend.html'), 'utf8');
    const svg = /<svg\b[^>]*wr-chart-legend__swatch--marker[\s\S]*?<\/svg>/.exec(template)?.[0] ?? '';
    const half = Math.abs(Number(/viewBox="(-?[\d.]+)/.exec(svg)?.[1]));
    const r = Number(/markerPath\(item\.marker, ([\d.]+)\)/.exec(svg)?.[1]);
    const reach = (shape: (typeof CHART_MARKERS)[number]): number =>
      Math.max(...(chartMarkerPath(shape, r).match(/-?[\d.]+/g) ?? []).map(value => Math.abs(Number(value))));

    expect(CHART_MARKERS.filter(shape => reach(shape) > half)).toEqual(['triangle', 'diamond', 'triangle-down']);
    expect(rule(compile('chart-legend'), 'wr-chart-legend__swatch--marker')).toMatch(/overflow: visible/);
  });

  it('grows a bar from nothing by the share the component writes, not by a height', () => {
    // The share is the bar's `flex-grow`; a basis of 0 and no shrink are what make it
    // exactly that share of what the column has left under the value.
    const bar = rule(compile('bar-chart'), 'wr-bar-chart__bar');
    expect(bar).toMatch(/flex: 0 0 0/);
    expect(bar).not.toMatch(/(?:^|[\s;])height:/);
  });
});

/**
 * Every chart that renders the `dataTable` copy positions its host. The table is out of
 * flow, so against a static host it resolves to an ancestor outside the chart, and in an
 * unpositioned scroller its 1px box kept its place in the scrolled content: a line chart
 * 2000px down a 300px scroller grew the page by 1600px of blank scroll before its host
 * was positioned. Read off the templates, so a chart that gains the table is held to it.
 */
describe('charts with a data table', () => {
  const tabled = drawn
    .map(({ name }) => name)
    .filter(name => readFileSync(join(CHARTS, name, `${name}.html`), 'utf8').includes('<wr-chart-table'));

  it('finds the charts it checks', () => {
    expect(tabled).toEqual(expect.arrayContaining(['line-chart', 'radar-chart', 'scatter-chart']));
  });

  it.each(tabled)('%s positions its host', chart => {
    expect(rule(compile(chart), `wr-${chart}`)).toMatch(/position:\s*relative/);
  });
});
