import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrLineSeries } from './interfaces';
import { WrLineChart } from './line-chart';

/**
 * Which of the stylesheet's rules SIZE each drawing, asked of the rendered chart.
 *
 * The defect was a selector, not a template: the plot's stretch rule was written
 * against a bare `svg`, and once the legend swatch became an `<svg>` as well that
 * rule reached it and won on specificity — `.wr-line-chart svg` is (0,1,1),
 * `.wr-line-chart__swatch` is (0,1,0) — so a 1rem × 0.125rem dash rendered as a
 * 337 × 44px band, its line scaled to a 42px stroke painted across the series names.
 *
 * jsdom applies no stylesheet cascade, so a computed size would read the same nothing
 * for the dash and for the band, and that size is measured in Chromium instead. What
 * jsdom DOES answer exactly is `Element.matches`, so this file reads the rules out of
 * the source, resolves `&`, and asks each one whether it reaches the elements the
 * template actually renders. That holds both halves at once — a template that drops the
 * plot's class fails here as surely as a selector that reaches too far — and it does not
 * depend on how the selector is spelled: `svg:first-of-type` or `svg[viewBox]` reach the
 * swatch just as a bare `svg` did, while `&__plot svg` would not.
 *
 * It asserts EXCLUSIVITY rather than a winner, which is what lets it stand without a
 * cascade: one sizing rule per drawing leaves no specificity contest to lose.
 */
const SOURCE = readFileSync(join(process.cwd(), 'projects/lib/line-chart/styles/_index.scss'), 'utf8');

const HOST = '.wr-line-chart';

/** A declaration that decides a box's size, as opposed to a value that merely names one. */
const SIZING = /(?:^|[;{\s])(?:min-|max-)?(?:width|height|inline-size|block-size)\s*:/;

interface Rule {
  readonly selector: string;
  readonly body: string;
}

/** Commas that separate selectors, not the ones inside `:is(…)` or `:not(…)`. */
function splitSelectors(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of list) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current.trim());
  return parts.filter(Boolean);
}

/**
 * The stylesheet's rules with `&` resolved. The file is one `.wr-line-chart` block
 * nesting its rules one level deep, and that is the only shape this reads: anything it
 * cannot place — a second nesting level, an at-rule or include inside the block, a rule
 * outside it — THROWS, because a rule it skipped is a rule whose reach goes unchecked.
 */
function rules(): Rule[] {
  const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');
  const open = code.search(/^\.wr-line-chart\s*\{/m);
  if (open < 0) throw new Error('line-chart/styles/_index.scss has no top-level `.wr-line-chart {` block to read');
  const before = code.slice(0, open).replace(/^@use [^;]+;/gm, '');
  if (before.trim()) throw new Error(`a rule outside the \`.wr-line-chart\` block goes unread: ${before.trim()}`);

  const found: Rule[] = [];
  let buffer = '';
  let i = code.indexOf('{', open) + 1;
  for (; i < code.length && code[i] !== '}'; i++) {
    const ch = code[i];
    if (ch === ';') {
      if (buffer.trim().startsWith('@')) throw new Error(`\`${buffer.trim()}\` can emit rules this reader cannot see`);
      buffer = '';
    } else if (ch === '{') {
      const selector = buffer.trim();
      const end = code.indexOf('}', i);
      const body = code.slice(i + 1, end);
      if (selector.startsWith('@') || body.includes('{')) {
        throw new Error(`\`${selector}\` nests a block, and this reader resolves one level only — extend it`);
      }
      for (const part of splitSelectors(selector)) {
        found.push({ selector: part.includes('&') ? part.replaceAll('&', HOST) : `${HOST} ${part}`, body });
      }
      buffer = '';
      i = end;
    } else {
      buffer += ch;
    }
  }
  if (code.slice(i + 1).trim()) throw new Error('a rule after the `.wr-line-chart` block goes unread');
  return found;
}

const SERIES: readonly WrLineSeries[] = [
  { label: 'Visits', data: [10, 20, 30] },
  { label: 'Signups', data: [1, 2, 3] },
];

@Component({
  imports: [WrLineChart],
  template: `<wr-line-chart [series]="series" [xLabels]="['Mon', 'Tue', 'Wed']" />`,
})
class Host {
  readonly series = SERIES;
}

describe('wr-line-chart: which rules size each drawing', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  // Read inside the cases rather than while the suite is collected, so a stylesheet this
  // cannot read fails as a named case with its reason instead of an empty file.
  let read: Rule[] | undefined;
  const RULES = (): Rule[] => (read ??= rules());

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  /** By position, not by class: the class is half of what is under test. */
  const plot = (): SVGSVGElement => root().querySelector<SVGSVGElement>('.wr-line-chart__plot > svg')!;
  const sizedBy = (el: Element): string[] =>
    RULES()
      .filter(rule => SIZING.test(rule.body) && el.matches(rule.selector))
      .map(rule => rule.selector);
  const body = (selector: string): string => RULES().find(rule => rule.selector === selector)?.body ?? '';

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    // Hovered, so the tooltip's swatches exist too. jsdom lays nothing out, so the plot's
    // box is stubbed to read a clientX as a viewBox x.
    plot().getBoundingClientRect = () => new DOMRect(0, 0, 600, 300);
    plot().dispatchEvent(new MouseEvent('pointermove', { clientX: 300 }));
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('reads the rules it asks about', () => {
    expect(() => RULES()).not.toThrow();
    expect(body('.wr-line-chart__swatch')).toMatch(/width:\s*1rem;[^}]*height:\s*0\.125rem/);
    expect(body('.wr-line-chart__svg')).toMatch(/width:\s*100%;[^}]*height:\s*100%/);
  });

  it('sizes every swatch, in the legend and in the tooltip, by the swatch rule alone', () => {
    const swatches = [...root().querySelectorAll('.wr-line-chart__swatch')];
    // Two legend `<svg>`s and two tooltip `<span>`s: an empty list would pass the loop.
    expect(swatches.map(el => el.tagName.toLowerCase())).toEqual(['svg', 'svg', 'span', 'span']);
    for (const swatch of swatches) expect(sizedBy(swatch), swatch.outerHTML).toEqual(['.wr-line-chart__swatch']);
  });

  it('stretches the plot by a rule that reaches nothing else in the chart', () => {
    expect(plot()).not.toBeNull();
    expect(sizedBy(plot())).toEqual(['.wr-line-chart__svg']);
    const reached = [...root().querySelectorAll('.wr-line-chart__svg')];
    expect(reached).toHaveLength(1);
    expect(reached[0]).toBe(plot());
  });
});
