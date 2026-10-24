import { Component, LOCALE_ID, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WrWaterfallStep } from './types';
import { WrWaterfallChart } from './waterfall-chart';

/**
 * Running totals 400 / 700 / 600 / 400 / 400 on an axis from 0 to 800, so every level is
 * a round percentage of the drawing: 400 at 50%, 600 at 75%, 700 at 87.5%.
 */
const STEPS: readonly WrWaterfallStep[] = [
  { label: 'Opening', value: 400, total: true },
  { label: 'Sales', value: 300 },
  { label: 'Refunds', value: -100 },
  { label: 'Payroll', value: -200 },
  { label: 'Closing', value: 400, total: true },
];

const MINUS = '−';
/** The isolate the tooltip wraps each figure in, so a sign keeps its side under RTL. */
const FSI = '\u2068';
const PDI = '\u2069';

@Component({
  imports: [WrWaterfallChart],
  template: `
    <wr-waterfall-chart
      [steps]="steps()"
      [ariaLabel]="ariaLabel()"
      [showValues]="showValues()"
      [showGrid]="showGrid()"
      [showConnectors]="showConnectors()"
      [dataTable]="dataTable()"
      [valueFormat]="valueFormat()"
      [increaseColor]="increaseColor()"
      [decreaseColor]="decreaseColor()"
      [totalColor]="totalColor()"
      [height]="height()"
    />
  `,
})
class Host {
  readonly steps = signal<readonly WrWaterfallStep[]>(STEPS);
  readonly ariaLabel = signal<string | null>(null);
  readonly showValues = signal(true);
  readonly showGrid = signal(true);
  readonly showConnectors = signal(true);
  readonly dataTable = signal(false);
  readonly valueFormat = signal<((value: number) => string) | null>(null);
  readonly increaseColor = signal('var(--wr-color-success)');
  readonly decreaseColor = signal('var(--wr-color-danger)');
  readonly totalColor = signal('var(--wr-color-primary)');
  readonly height = signal(240);
}

/**
 * The bars are compared through the two ends the component writes on each step, as
 * percentages of the drawing's height, and the arithmetic through the running totals it
 * writes beside them: those are what a consumer sees, and what has to stay honest — a
 * total that ends where the last change does, a change that floats from the total before
 * it, and a sign and a direction for every change, not only a colour.
 */
describe('WrWaterfallChart', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const all = <T extends Element = HTMLElement>(selector: string): T[] => [...root().querySelectorAll<T>(selector)];
  const text = (selector: string): string[] => all(selector).map(el => el.textContent.trim());
  const steps = (): HTMLElement[] => all('.wr-waterfall-chart__step');
  const names = (): (string | null)[] => steps().map(step => step.getAttribute('aria-label'));
  /** Each bar's two ends as written: [bottom, top], percentages of the drawing from its bottom. */
  const ends = (): [string, string][] =>
    steps().map(step => [
      step.style.getPropertyValue('--wr-waterfall-chart-lo'),
      step.style.getPropertyValue('--wr-waterfall-chart-hi'),
    ]);
  const totals = (): [number, number][] =>
    steps().map(step => [Number(step.dataset['start']), Number(step.dataset['end'])]);
  const kinds = (): string[] =>
    steps().map(step => {
      const kind = [...step.classList].find(c => /--(increase|decrease|flat|total)$/.test(c)) ?? '';
      return kind.replace('wr-waterfall-chart__step--', '');
    });
  /** The connector level each step writes, `null` where none leaves it. */
  const connectors = (): (string | null)[] =>
    steps().map(
      step =>
        step
          .querySelector<HTMLElement>('.wr-waterfall-chart__connector')
          ?.style.getPropertyValue('--wr-waterfall-chart-level') ?? null
    );
  /** Where the zero line is, as written on the drawing. */
  const zero = (): string =>
    root()
      .querySelector<HTMLElement>('.wr-waterfall-chart__track')!
      .style.getPropertyValue('--wr-waterfall-chart-zero');
  const set = (change: (h: Host) => void): void => {
    change(host());
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('names the chart as a group, and each step as an image with its change and the running total', () => {
    const plot = root().querySelector('.wr-waterfall-chart__plot')!;
    expect(plot.getAttribute('role')).toBe('group');
    expect(plot.getAttribute('aria-label')).toBe('Waterfall chart');
    expect(steps().every(step => step.getAttribute('role') === 'img')).toBe(true);
    expect(names()).toEqual([
      'Opening: total 400',
      'Sales: +300, running total 700',
      `Refunds: ${MINUS}100, running total 600`,
      `Payroll: ${MINUS}200, running total 400`,
      'Closing: total 400',
    ]);

    set(h => h.ariaLabel.set('Profit bridge'));
    expect(plot.getAttribute('aria-label')).toBe('Profit bridge');
  });

  it('keeps the running total: a change floats from the total before it, a total stands on zero', () => {
    expect(totals()).toEqual([
      [0, 400],
      [400, 700],
      [700, 600],
      [600, 400],
      [400, 400],
    ]);
    expect(kinds()).toEqual(['total', 'increase', 'decrease', 'decrease', 'total']);
    expect(ends()).toEqual([
      ['0', '50'],
      ['50', '87.5'],
      ['75', '87.5'],
      ['50', '75'],
      ['0', '50'],
    ]);
  });

  it('fits a value axis that includes zero and snaps to round numbers', () => {
    expect(text('.wr-waterfall-chart__tick')).toEqual(['800', '600', '400', '200', '0']);
    expect(
      all('.wr-waterfall-chart__grid-line').map(line => line.style.getPropertyValue('--wr-waterfall-chart-level'))
    ).toEqual(['100', '75', '50', '25', '0']);
    expect(zero()).toBe('0');
  });

  it('prints each change with its sign on the side it runs to, and a total unsigned', () => {
    expect(text('.wr-waterfall-chart__value')).toEqual(['400', '+300', `${MINUS}100`, `${MINUS}200`, '400']);
    // Down is printed under the bar, up and totals over it.
    expect(
      all('.wr-waterfall-chart__value').map(value => value.classList.contains('wr-waterfall-chart__value--below'))
    ).toEqual([false, false, true, true, false]);
    expect(root().querySelector('wr-waterfall-chart')!.classList).toContain('wr-waterfall-chart--values');
  });

  it('paints a change up, a change down and a total in their own colours, each overridable', () => {
    const bars = (): string[] => all('.wr-waterfall-chart__bar').map(bar => bar.style.background);
    expect(bars()).toEqual([
      'var(--wr-color-primary)',
      'var(--wr-color-success)',
      'var(--wr-color-danger)',
      'var(--wr-color-danger)',
      'var(--wr-color-primary)',
    ]);

    set(h => {
      h.increaseColor.set('#123456');
      h.decreaseColor.set('#654321');
      h.totalColor.set('#abcdef');
    });
    expect(bars()).toEqual([
      'rgb(171, 205, 239)',
      'rgb(18, 52, 86)',
      'rgb(101, 67, 33)',
      'rgb(101, 67, 33)',
      'rgb(171, 205, 239)',
    ]);
  });

  it('marks a total by more than its colour: its label is set apart too', () => {
    expect(text('.wr-waterfall-chart__label')).toEqual(['Opening', 'Sales', 'Refunds', 'Payroll', 'Closing']);
    expect(
      all('.wr-waterfall-chart__label').map(label => label.classList.contains('wr-waterfall-chart__label--total'))
    ).toEqual([true, false, false, false, true]);
  });

  it('joins each bar to the next at the running total the next one starts from', () => {
    expect(connectors()).toEqual(['50', '87.5', '75', '50', null]);

    set(h => h.showConnectors.set(false));
    expect(all('.wr-waterfall-chart__connector')).toHaveLength(0);
  });

  it('opens on a total before every change, and draws no line into one that restates it', () => {
    set(h =>
      h.steps.set([
        { label: 'Opening', value: 100, total: true },
        { label: 'Restated', value: 120, total: true },
        { label: 'Up', value: 10 },
        { label: 'Closing', value: 130, total: true },
      ])
    );
    expect(totals()).toEqual([
      [0, 100],
      [100, 120],
      [120, 130],
      [130, 130],
    ]);
    // Opening ends at 100 and Restated starts its own running total at 120.
    expect(connectors().map(level => level !== null)).toEqual([false, true, true, false]);
  });

  it('draws a later total at what the steps add up to, and says so once in dev mode when its value disagrees', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    set(h =>
      h.steps.set([
        { label: 'Open', value: 100, total: true },
        { label: 'Up', value: 50 },
        { label: 'Close', value: 160, total: true },
      ])
    );
    expect(totals()[2]).toEqual([150, 150]);
    expect(names()[2]).toBe('Close: total 150');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('"Close" (step 3) is given as 160');
    expect(warn.mock.calls[0][0]).toContain('add up to 150');

    set(h => h.showValues.set(false));
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('takes the float noise off a running total, so a total that matches it does not warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    set(h =>
      h.steps.set([
        { label: 'A', value: 0.1 },
        { label: 'B', value: 0.2 },
        { label: 'Total', value: 0.3, total: true },
      ])
    );
    expect(totals()[2]).toEqual([0.3, 0.3]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('hangs a running total below zero under the zero line, and prints it under its bar', () => {
    set(h =>
      h.steps.set([
        { label: 'A', value: 100 },
        { label: 'B', value: -300 },
        { label: 'Net', value: -200, total: true },
      ])
    );
    // The axis runs from -200 to 200, with zero in the middle, and a tick below it takes
    // the chart's own minus, as every figure does.
    expect(text('.wr-waterfall-chart__tick')).toEqual(['200', '100', '0', `${MINUS}100`, `${MINUS}200`]);
    expect(zero()).toBe('50');
    expect(ends()).toEqual([
      ['50', '75'],
      ['0', '75'],
      ['0', '50'],
    ]);
    expect(kinds()).toEqual(['increase', 'decrease', 'total']);
    // A total below zero takes no `+` like any total, and the same minus as a change.
    expect(text('.wr-waterfall-chart__value')).toEqual(['+100', `${MINUS}300`, `${MINUS}200`]);
    expect(
      all('.wr-waterfall-chart__value').map(value => value.classList.contains('wr-waterfall-chart__value--below'))
    ).toEqual([false, true, true]);
  });

  it('counts a change that is not a finite number as zero, written without a sign', () => {
    set(h =>
      h.steps.set([
        { label: 'Up', value: 10 },
        { label: 'Lost', value: Number.NaN },
        { label: 'End', value: 10, total: true },
      ])
    );
    expect(totals()).toEqual([
      [0, 10],
      [10, 10],
      [10, 10],
    ]);
    expect(text('.wr-waterfall-chart__value')).toEqual(['+10', '0', '10']);
    expect(names()[1]).toBe('Lost: 0, running total 10');
    // A hairline at the running total: the stylesheet keeps it visible.
    expect(ends()[1][0]).toBe(ends()[1][1]);
    // And it is a change of nothing, not an increase: a missing figure must not read as growth.
    expect(kinds()[1]).toBe('flat');
  });

  it('classes a change of zero as flat, neither way, and leaves its paint to the neutral hook', () => {
    set(h =>
      h.steps.set([
        { label: 'Up', value: 100 },
        { label: 'Same', value: 0 },
        { label: 'Down', value: -40 },
        { label: 'Gone', value: Number.POSITIVE_INFINITY },
      ])
    );
    expect(kinds()).toEqual(['increase', 'flat', 'decrease', 'flat']);
    const flat = steps()[1];
    expect(flat.classList).not.toContain('wr-waterfall-chart__step--increase');
    // No inline paint: `--wr-waterfall-chart-flat-color` in the stylesheet draws it, not `increaseColor`.
    expect(flat.querySelector<HTMLElement>('.wr-waterfall-chart__bar')!.style.background).toBe('');
    expect(steps()[0].querySelector<HTMLElement>('.wr-waterfall-chart__bar')!.style.background).toBe(
      'var(--wr-color-success)'
    );
    // Printed over its hairline, with no sign and no side to run to.
    expect(text('.wr-waterfall-chart__value')[1]).toBe('0');
    expect(flat.querySelector('.wr-waterfall-chart__value--below')).toBeNull();
  });

  it('writes every figure below zero with one minus sign: changes, running totals, totals and ticks', () => {
    const format = vi.fn((value: number) => `$${value}`);
    set(h =>
      h.steps.set([
        { label: 'Open', value: 300, total: true },
        { label: 'Eq', value: -900 },
        { label: 'Net', value: -600, total: true },
      ])
    );
    expect(names()).toEqual([
      'Open: total 300',
      `Eq: ${MINUS}900, running total ${MINUS}600`,
      `Net: total ${MINUS}600`,
    ]);
    expect(text('.wr-waterfall-chart__value')).toEqual(['300', `${MINUS}900`, `${MINUS}600`]);
    expect(
      text('.wr-waterfall-chart__tick')
        .filter(tick => tick !== '0')
        .every(tick => !tick.includes('-'))
    ).toBe(true);
    expect(text('.wr-waterfall-chart__tick').some(tick => tick.startsWith(MINUS))).toBe(true);

    // `valueFormat` gets the magnitude of every figure, the ticks included, and the chart the sign.
    set(h => {
      h.valueFormat.set(format);
      h.dataTable.set(true);
    });
    expect(format.mock.calls.every(([value]) => value >= 0)).toBe(true);
    expect(names()[1]).toBe(`Eq: ${MINUS}$900, running total ${MINUS}$600`);
    expect(text('.wr-waterfall-chart__tick').at(-1)).toMatch(new RegExp(`^${MINUS}\\$\\d+$`));
    expect(text('.wr-chart-table tbody td')).toEqual(['', '$300', `${MINUS}$900`, `${MINUS}$600`, '', `${MINUS}$600`]);
  });

  it('prints compact figures from a thousand up, and the whole figure everywhere else', () => {
    set(h =>
      h.steps.set([
        { label: 'Opening', value: 12000, total: true },
        { label: 'Sales', value: 1234 },
      ])
    );
    expect(text('.wr-waterfall-chart__value')).toEqual(['12K', '+1.2K']);
    expect(names()).toEqual(['Opening: total 12,000', 'Sales: +1,234, running total 13,234']);
  });

  it('hands `valueFormat` the magnitude of a change, and writes the sign in front itself', () => {
    const format = vi.fn((value: number) => `$${value}`);
    set(h => h.valueFormat.set(format));
    expect(text('.wr-waterfall-chart__value')).toEqual(['$400', '+$300', `${MINUS}$100`, `${MINUS}$200`, '$400']);
    expect(names()[2]).toBe(`Refunds: ${MINUS}$100, running total $600`);
    expect(format.mock.calls.every(([value]) => value >= 0)).toBe(true);
    expect(text('.wr-waterfall-chart__tick')).toEqual(['$800', '$600', '$400', '$200', '$0']);
  });

  it('prints no figure with `showValues` off, and keeps every name', () => {
    set(h => h.showValues.set(false));
    expect(all('.wr-waterfall-chart__value')).toHaveLength(0);
    expect(root().querySelector('wr-waterfall-chart')!.classList).not.toContain('wr-waterfall-chart--values');
    expect(names()[1]).toBe('Sales: +300, running total 700');
  });

  it('draws the gridlines and ticks with `showGrid`, and the zero line either way', () => {
    set(h => h.showGrid.set(false));
    expect(all('.wr-waterfall-chart__grid-line')).toHaveLength(0);
    expect(all('.wr-waterfall-chart__tick')).toHaveLength(0);
    expect(root().querySelector('.wr-waterfall-chart__y-axis')).toBeNull();
    expect(all('.wr-waterfall-chart__baseline')).toHaveLength(1);
  });

  it('writes the plot height it is given, at least 80px', () => {
    const plot = (): HTMLElement => root().querySelector<HTMLElement>('.wr-waterfall-chart__plot')!;
    expect(plot().style.height).toBe('240px');
    set(h => h.height.set(20));
    expect(plot().style.height).toBe('80px');
  });

  it('draws the empty frame with no step', () => {
    set(h => h.steps.set([]));
    expect(steps()).toHaveLength(0);
    expect(all('.wr-waterfall-chart__label')).toHaveLength(0);
    expect(text('.wr-waterfall-chart__tick')).toEqual(['1', '0.75', '0.5', '0.25', '0']);
  });

  it('renders the figures as a table only with `dataTable`', () => {
    expect(root().querySelector('wr-chart-table')).toBeNull();

    set(h => {
      h.dataTable.set(true);
      h.ariaLabel.set('Profit bridge');
    });
    expect(text('.wr-chart-table caption')).toEqual(['Profit bridge']);
    expect(text('.wr-chart-table thead th')).toEqual(['Step', 'Change', 'Running total']);
    const rows = all('.wr-chart-table tbody tr').map(row => [
      row.querySelector('th')!.textContent.trim(),
      ...[...row.querySelectorAll('td')].map(cell => cell.textContent.trim()),
    ]);
    expect(rows).toEqual([
      ['Opening', '', '400'],
      ['Sales', '+300', '700'],
      ['Refunds', `${MINUS}100`, '600'],
      ['Payroll', `${MINUS}200`, '400'],
      ['Closing', '', '400'],
    ]);
    // Beside the steps, never inside one of their images.
    expect(root().querySelector('wr-chart-table')!.closest('[role="img"]')).toBeNull();
  });

  it('holds no tab stop of its own', () => {
    set(h => h.dataTable.set(true));
    expect(root().querySelectorAll('[tabindex], button, a[href]')).toHaveLength(0);
  });
});

describe('WrWaterfallChart on the server', () => {
  it('draws everything from its inputs and measures nothing', () => {
    // Every end, level and figure is worked out from the data; only the tooltip measures a
    // box, and only after a pointer has moved. A prerendered page carries the whole chart.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const measure = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.dataTable.set(true);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.wr-waterfall-chart__bar')).toHaveLength(5);
    expect(root.querySelectorAll('.wr-waterfall-chart__connector')).toHaveLength(4);
    expect(root.querySelectorAll('.wr-chart-table tbody tr')).toHaveLength(5);
    expect(measure).not.toHaveBeenCalled();
    fixture.destroy();
    measure.mockRestore();
  });
});

describe('WrWaterfallChart numbers', () => {
  it('writes the figures in LOCALE_ID, with the sign in front of the magnitude', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de' }] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.steps.set([
      { label: 'A', value: 1500.5, total: true },
      { label: 'B', value: -250.25 },
    ]);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const values = [...root.querySelectorAll('.wr-waterfall-chart__value')].map(el => el.textContent.trim());
    // Compact from a thousand up, in German, which abbreviates nothing below a million; the
    // change below a thousand in full.
    expect(values).toEqual(['1501', `${MINUS}250,25`]);
    expect(root.querySelectorAll('.wr-waterfall-chart__step')[1].getAttribute('aria-label')).toBe(
      `B: ${MINUS}250,25, running total 1.250,25`
    );
    fixture.destroy();
  });
});

@Component({
  imports: [WrWaterfallChart],
  template: `<wr-waterfall-chart [steps]="steps()" [tooltip]="tooltip()" />`,
})
class TooltipHost {
  readonly steps = signal<readonly WrWaterfallStep[]>(STEPS);
  readonly tooltip = signal(true);
}

/**
 * The tooltip renders into a CDK overlay, so it is read off `document`. What it says is
 * asserted first; where it points, with laid-out boxes stubbed in, after.
 */
describe('WrWaterfallChart tooltip', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TooltipHost>>;

  const doc = document.documentElement;
  const steps = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-waterfall-chart__step'),
  ];
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const part = (name: string): string | null =>
    chip()?.querySelector<HTMLElement>(`.wr-chart-tooltip__${name}`)?.textContent.trim() ?? null;
  const rows = (): string[] =>
    [...(chip()?.querySelectorAll('.wr-chart-tooltip__row') ?? [])].map(row =>
      [...row.querySelectorAll('.wr-chart-tooltip__row-label, .wr-chart-tooltip__row-value')]
        .map(el => el.textContent.trim())
        .join(' ')
    );
  const hover = (index: number): void => {
    steps()[index].dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    Object.defineProperty(doc, 'clientWidth', { configurable: true, value: 1024 });
    Object.defineProperty(doc, 'clientHeight', { configurable: true, value: 768 });
    fixture = TestBed.createComponent(TooltipHost);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    Reflect.deleteProperty(doc, 'clientWidth');
    Reflect.deleteProperty(doc, 'clientHeight');
  });

  it('heads the chip with the step, and lists its change and the running total after it', () => {
    hover(2);
    expect(part('label')).toBe('Refunds');
    expect(part('value')).toBeNull();
    expect(chip()!.querySelector<HTMLElement>('.wr-chart-tooltip__swatch')!.style.background).toBe(
      'var(--wr-color-danger)'
    );
    // Each figure isolated, so in an RTL document the sign stays in front of its digits
    // as it does on the bar, rather than landing on their far side.
    expect(rows()).toEqual([`Change ${FSI}${MINUS}100${PDI}`, `Running total ${FSI}600${PDI}`]);
  });

  it('shows a total with the running total alone, since it changes nothing', () => {
    hover(4);
    expect(part('label')).toBe('Closing');
    expect(rows()).toEqual([`Running total ${FSI}400${PDI}`]);
  });

  it('draws no swatch for a change of zero, whose neutral paint says nothing', () => {
    fixture.componentInstance.steps.set([
      { label: 'Up', value: 10 },
      { label: 'Same', value: 0 },
    ]);
    fixture.detectChanges();
    hover(1);
    expect(part('label')).toBe('Same');
    expect(chip()!.querySelector('.wr-chart-tooltip__swatch')).toBeNull();
    expect(rows()).toEqual([`Change ${FSI}0${PDI}`, `Running total ${FSI}10${PDI}`]);
  });

  it('marks the column the chip is about', () => {
    hover(1);
    expect(steps()[1].classList).toContain('wr-waterfall-chart__step--active');
    expect(steps()[0].classList).not.toContain('wr-waterfall-chart__step--active');
  });

  it('points at the top edge of the hovered BAR, not at its full-height column', () => {
    const bar = steps()[1].querySelector('.wr-waterfall-chart__bar')!;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this === bar) return new DOMRect(400, 300, 60, 90);
      if (this.classList.contains('wr-waterfall-chart__step')) return new DOMRect(400, 100, 60, 400);
      return this.classList.contains('cdk-overlay-pane') ? new DOMRect(0, 0, 120, 60) : new DOMRect();
    });
    hover(1);

    const style = document.querySelector<HTMLElement>('.wr-tooltip-overlay')!.parentElement!.style;
    expect(768 - Number.parseFloat(style.bottom)).toBeCloseTo(300, 3);
    expect(Number.parseFloat(style.left) + Number.parseFloat(style.width) / 2).toBeCloseTo(430, 3);
  });

  it('leaves every name where it was — the tooltip is not the way to the numbers', () => {
    hover(1);
    expect(steps()[1].getAttribute('aria-label')).toBe('Sales: +300, running total 700');
    expect(steps()[1].hasAttribute('aria-describedby')).toBe(false);
  });

  it('shows nothing with `tooltip` off', () => {
    fixture.componentInstance.tooltip.set(false);
    fixture.detectChanges();
    hover(1);
    expect(chip()).toBeNull();
    expect(steps()[1].classList).not.toContain('wr-waterfall-chart__step--active');
  });
});
