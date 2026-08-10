import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrBarChart } from './bar-chart';
import type { WrBarChartDatum } from './interfaces';

const DATA: readonly WrBarChartDatum[] = [
  { label: 'Mon', value: 10 },
  { label: 'Tue', value: 20 },
  { label: 'Wed', value: 5, color: '#abcdef' },
];

@Component({
  imports: [WrBarChart],
  template: `
    <wr-bar-chart [data]="data()" [max]="max()" [height]="height()" [showValues]="showValues()" [color]="color()" />
  `,
})
class Host {
  readonly data = signal<readonly WrBarChartDatum[]>(DATA);
  readonly max = signal(0);
  readonly height = signal(200);
  readonly showValues = signal(true);
  readonly color = signal('var(--wr-color-primary)');
}

/**
 * Bar heights are percentages written as inline styles, which jsdom reports
 * verbatim — so the scale is checkable without layout. The interesting half of
 * this component is what the scale does when the data is not what it promised.
 */
describe('WrBarChart', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const columns = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-bar-chart__column')];
  const bars = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-bar-chart__bar')];
  const heights = (): string[] => bars().map(bar => bar.style.height);
  const names = (): (string | null)[] => columns().map(column => column.getAttribute('aria-label'));
  const labels = (): string[] => [...root().querySelectorAll('.wr-bar-chart__label')].map(el => el.textContent.trim());
  const values = (): string[] => [...root().querySelectorAll('.wr-bar-chart__value')].map(el => el.textContent.trim());

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('draws one bar per datum, labelled and valued', () => {
    expect(bars().length).toBe(3);
    expect(labels()).toEqual(['Mon', 'Tue', 'Wed']);
    expect(values()).toEqual(['10', '20', '5']);
  });

  it('scales every bar against the largest value', () => {
    expect(heights()).toEqual(['50%', '100%', '25%']);
  });

  it('scales against an explicit max instead', () => {
    fixture.componentInstance.max.set(40);
    fixture.detectChanges();

    expect(heights()).toEqual(['25%', '50%', '12.5%']);
  });

  it('pairs the label with the value in each bar name', () => {
    // The label row and the value row are separate containers, so a screen
    // reader read three numbers and then three labels with nothing tying them
    // together — and with `showValues` off the numbers were not in the
    // accessible tree at all.
    expect(names()).toEqual(['Mon: 10', 'Tue: 20', 'Wed: 5']);
    for (const column of columns()) expect(column.getAttribute('role')).toBe('img');
    expect(root().querySelector('.wr-bar-chart__labels')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps the names when the visible values are hidden', () => {
    fixture.componentInstance.showValues.set(false);
    fixture.detectChanges();

    expect(values()).toEqual([]);
    expect(names()).toEqual(['Mon: 10', 'Tue: 20', 'Wed: 5']);
  });

  it('keeps one non-finite datum from rescaling every other bar', () => {
    // `Math.max(...values)` is NaN as soon as one value is, so the scale fell
    // back to 1 and asked the healthy bars for a height of `value * 100`%.
    fixture.componentInstance.data.set([
      { label: 'Mon', value: 10 },
      { label: 'Tue', value: 20 },
      { label: 'Bad', value: Number.NaN },
    ]);
    fixture.detectChanges();

    expect(heights()).toEqual(['50%', '100%', '0%']);
    expect(values()).toEqual(['10', '20', '0']);
    expect(root().textContent).not.toContain('NaN');
  });

  it('reads a negative value as an empty bar without hiding the number', () => {
    fixture.componentInstance.data.set([
      { label: 'Mon', value: 10 },
      { label: 'Tue', value: -4 },
    ]);
    fixture.detectChanges();

    expect(heights()).toEqual(['100%', '0%']);
    expect(values()).toEqual(['10', '-4']);
  });

  it('draws flat bars rather than dividing by zero when everything is zero', () => {
    fixture.componentInstance.data.set([
      { label: 'Mon', value: 0 },
      { label: 'Tue', value: 0 },
    ]);
    fixture.detectChanges();

    expect(heights()).toEqual(['0%', '0%']);
  });

  it('renders nothing at all for an empty data set', () => {
    fixture.componentInstance.data.set([]);
    fixture.detectChanges();

    expect(bars()).toEqual([]);
    expect(labels()).toEqual([]);
  });

  it('takes the colour from the datum, then from the input', () => {
    expect(bars()[0].style.background).toBe('var(--wr-color-primary)');
    expect(bars()[2].style.background).toBe('rgb(171, 205, 239)');

    fixture.componentInstance.color.set('var(--wr-color-success)');
    fixture.detectChanges();
    expect(bars()[0].style.background).toBe('var(--wr-color-success)');
  });

  it('keeps the plot tall enough to be a chart', () => {
    const plot = (): HTMLElement => root().querySelector<HTMLElement>('.wr-bar-chart__plot')!;
    expect(plot().style.height).toBe('200px');

    fixture.componentInstance.height.set(10);
    fixture.detectChanges();
    expect(plot().style.height).toBe('40px');
  });
});
