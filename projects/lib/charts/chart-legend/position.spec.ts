import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { WrChartLegend } from './chart-legend';
import type { WrChartLegendItem, WrChartLegendPosition } from './types';

const ITEMS: readonly WrChartLegendItem[] = [
  { label: 'Visits', color: 'rgb(1, 2, 3)' },
  { label: 'Signups', color: 'rgb(4, 5, 6)', dash: '7 4' },
];

@Component({
  imports: [WrChartLegend],
  template: `<ul wr-chart-legend toggleable [items]="items" [position]="position()" [(hiddenSeries)]="hidden"></ul>`,
})
class Host {
  readonly items = ITEMS;
  readonly position = signal<WrChartLegendPosition>('bottom');
  readonly hidden = signal<readonly number[]>([]);
}

@Component({
  imports: [WrChartLegend],
  template: `<ul wr-chart-legend [items]="items"></ul>`,
})
class DefaultHost {
  readonly items = ITEMS;
}

/**
 * Where a legend sits is a class on the list: the stylesheet turns it into a row or a
 * column, and a chart that draws the legend turns it into room from the plot. jsdom lays
 * nothing out, so the classes are read here and the rules off the compiled sheet.
 */
describe('WrChartLegend position', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const list = (): HTMLUListElement => (fixture.nativeElement as HTMLElement).querySelector('ul')!;
  const modifiers = (): string[] => [...list().classList].filter(name => /--(top|bottom|start|end|none)$/.test(name));

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('sits below by default', () => {
    const plain = TestBed.createComponent(DefaultHost);
    plain.detectChanges();
    const classes = (plain.nativeElement as HTMLElement).querySelector('ul')!.classList;
    expect(classes).toContain('wr-chart-legend--bottom');
    plain.destroy();
  });

  it.each(['top', 'bottom', 'start', 'end', 'none'] as const)('wears one modifier for %s, and no other', position => {
    fixture.componentInstance.position.set(position);
    fixture.detectChanges();

    expect(modifiers()).toEqual([`wr-chart-legend--${position}`]);
  });

  it('keeps its rows and its toggling under `none`, which only hides it', () => {
    fixture.componentInstance.position.set('none');
    fixture.detectChanges();

    // Still in the DOM: `hiddenSeries` is written from outside, and comes back with the legend.
    expect(list().querySelectorAll('li')).toHaveLength(2);
    list().querySelectorAll('button')[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.hidden()).toEqual([1]);
  });

  it('tags every row with its position, the key a chart dims its series by', () => {
    expect([...list().querySelectorAll('li')].map(row => row.getAttribute('data-wr-series'))).toEqual(['0', '1']);
  });
});

describe('WrChartLegend position stylesheet', { timeout: COMPILE_TIMEOUT }, () => {
  const css = (): string => compileSass("@use 'charts/chart-legend/styles';").replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ?? '';

  it('runs the rows down a column at inline start and end', () => {
    const column = rule('.wr-chart-legend--start,\n.wr-chart-legend--end');
    expect(column).toMatch(/flex-direction: column/);
    expect(column).toMatch(/flex-wrap: nowrap/);
    expect(column).toMatch(/flex: none/);
  });

  it('draws nothing under none', () => {
    expect(rule('.wr-chart-legend--none')).toMatch(/display: none/);
  });

  it('keeps its room from the plot on the side it sits on, only inside a chart that opted in', () => {
    const inside = (position: string): string => rule(`:where(.wr-chart--legend) > .wr-chart-legend--${position}`);
    expect(inside('top')).toMatch(/margin-block-end: var\(--wr-chart-legend-space\)/);
    expect(inside('bottom')).toMatch(/margin-block-start: var\(--wr-chart-legend-space\)/);
    expect(inside('bottom')).toMatch(/justify-content: center/);
    expect(inside('start')).toMatch(/margin-inline-end: var\(--wr-chart-legend-space\)/);
    expect(inside('end')).toMatch(/margin-inline-start: var\(--wr-chart-legend-space\)/);
    // A legend an app places itself, or one a chart still places by hand, gets no margin.
    expect(rule('.wr-chart-legend--bottom')).toBe('');
    expect(rule('.wr-chart-legend--top')).toBe('');
  });

  it('keys a row with an 8px dot, the size the tooltip keys its rows with', () => {
    expect(css()).toMatch(/--wr-chart-legend-dot-size: 0\.5rem/);
    expect(compileSass("@use 'popover/styles';")).toMatch(/\.wr-chart-tooltip__row-swatch\s*\{[^}]*width: 0\.5rem/);
  });
});
