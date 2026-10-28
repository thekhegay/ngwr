import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, LOCALE_ID, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type WrI18nCatalog, provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrFunnelChart } from './funnel-chart';
import type { WrFunnelConversion, WrFunnelStage } from './types';

/** Widths 100 / 40 / 24 / 6; each stage keeps 40%, 60% and 25% of the one before. */
const STAGES: readonly WrFunnelStage[] = [
  { label: 'Visited', value: 12000 },
  { label: 'Signed up', value: 4800 },
  { label: 'Activated', value: 2880 },
  { label: 'Paid', value: 720, color: '#123456' },
];

@Component({
  imports: [WrFunnelChart],
  template: `
    <wr-funnel-chart
      [stages]="stages()"
      [max]="max()"
      [conversion]="conversion()"
      [showValues]="showValues()"
      [dataTable]="dataTable()"
      [ariaLabel]="ariaLabel()"
      [valueFormat]="valueFormat()"
      [percentFormat]="percentFormat()"
      [valueLabel]="valueLabel()"
    />
  `,
})
class Host {
  readonly stages = signal<readonly WrFunnelStage[]>(STAGES);
  readonly max = signal(0);
  readonly conversion = signal<WrFunnelConversion>('both');
  readonly showValues = signal(true);
  readonly dataTable = signal(false);
  readonly ariaLabel = signal<string | null>(null);
  readonly valueFormat = signal<((value: number) => string) | null>(null);
  readonly percentFormat = signal<((ratio: number) => string) | null>(null);
  readonly valueLabel = signal<string | null>(null);
}

/**
 * The bars are compared through the width the component writes on each one, a percentage
 * of the track, and the bands through their `clip-path` polygon: those are what a consumer
 * sees, and what has to stay honest — no negative width, a growing stage drawn wider, and
 * no band across a value the data does not have.
 */
describe('WrFunnelChart', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const all = <T extends Element = HTMLElement>(selector: string): T[] => [...root().querySelectorAll<T>(selector)];
  const text = (selector: string): string[] => all(selector).map(el => el.textContent.trim());
  const stages = (): HTMLElement[] => all('.wr-funnel-chart__stage');
  /** Each stage's bar width as written, `null` where the stage draws no bar. */
  const widths = (): (string | null)[] =>
    stages().map(stage => stage.querySelector<HTMLElement>('.wr-funnel-chart__bar')?.style.width ?? null);
  const names = (): (string | null)[] => stages().map(stage => stage.getAttribute('aria-label'));
  const bands = (): string[] => all('.wr-funnel-chart__band').map(band => band.style.clipPath);
  /** The share printed in each gap between two stages, `null` where none is. */
  const gaps = (): (string | null)[] =>
    all('.wr-funnel-chart__gap').map(
      gap => gap.querySelector('.wr-funnel-chart__gap-label')?.textContent.trim() ?? null
    );
  /** What each stage prints under its value, `null` where nothing is. */
  const overall = (): (string | null)[] =>
    stages().map(stage => stage.querySelector('.wr-funnel-chart__overall')?.textContent.trim() ?? null);
  const set = (change: (h: Host) => void): void => {
    change(host());
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('names the chart as a group, and each stage as an image with every figure it shows', () => {
    const plot = root().querySelector('.wr-funnel-chart__plot')!;
    expect(plot.getAttribute('role')).toBe('group');
    expect(plot.getAttribute('aria-label')).toBe('Funnel chart');
    expect(stages().every(stage => stage.getAttribute('role') === 'img')).toBe(true);
    expect(names()).toEqual([
      'Visited: 12,000',
      'Signed up: 4,800, 40% of previous, 40% of first',
      'Activated: 2,880, 60% of previous, 24% of first',
      'Paid: 720, 25% of previous, 6% of first',
    ]);

    set(h => h.ariaLabel.set('Sign-up funnel'));
    expect(plot.getAttribute('aria-label')).toBe('Sign-up funnel');
  });

  it('draws each bar as wide as its share of the largest stage', () => {
    expect(widths()).toEqual(['100%', '40%', '24%', '6%']);
    expect(text('.wr-funnel-chart__label')).toEqual(['Visited', 'Signed up', 'Activated', 'Paid']);
    expect(text('.wr-funnel-chart__value')).toEqual(['12,000', '4,800', '2,880', '720']);
  });

  it('joins two bars with a centred band from one width to the next', () => {
    expect(bands()).toEqual([
      'polygon(0% 0%, 100% 0%, 70% 100%, 30% 100%)',
      'polygon(30% 0%, 70% 0%, 62% 100%, 38% 100%)',
      'polygon(38% 0%, 62% 0%, 53% 100%, 47% 100%)',
    ]);
    // A band carries the two stages' paints: the chart's colour, then the stage's own.
    const last = all('.wr-funnel-chart__band')[2];
    expect(last.style.getPropertyValue('--wr-funnel-chart-band-from')).toBe('var(--wr-color-primary)');
    expect(last.style.getPropertyValue('--wr-funnel-chart-band-to')).toBe('#123456');
  });

  it('prints the share of the previous stage between the bars and of the first under the value', () => {
    // One gap per pair of stages, and nothing for the first stage, which is the reference.
    expect(gaps()).toEqual(['40%', '60%', '25%']);
    expect(overall()).toEqual([null, '40% of first', '24% of first', '6% of first']);
  });

  it('hides the bands and the shares between the bars, which every name repeats', () => {
    expect(all('.wr-funnel-chart__gap').every(gap => gap.getAttribute('aria-hidden') === 'true')).toBe(true);
    for (const gap of all('.wr-funnel-chart__gap')) expect(gap.closest('[role="img"]')).toBeNull();
  });

  it('paints a stage in the chart colour unless it has its own', () => {
    const bars = all('.wr-funnel-chart__bar');
    expect(bars[0].style.background).toBe('var(--wr-color-primary)');
    expect(bars[3].style.background).toBe('rgb(18, 52, 86)');
  });

  it('draws a stage larger than the one before WIDER, with a conversion above 100%', () => {
    // The full width is the largest stage, not the first, so nothing is clamped into the
    // shape a funnel is expected to have.
    set(h =>
      h.stages.set([
        { label: 'A', value: 100 },
        { label: 'B', value: 150 },
        { label: 'C', value: 60 },
      ])
    );
    expect(widths()).toEqual(['66.667%', '100%', '40%']);
    expect(gaps()).toEqual(['150%', '40%']);
    expect(overall()).toEqual([null, '150% of first', '60% of first']);
    // The band widens downwards, as the data does.
    expect(bands()[0]).toBe('polygon(16.667% 0%, 83.333% 0%, 100% 100%, 0% 100%)');
  });

  it('draws a stage of zero as a hairline, and works out no share OF it', () => {
    set(h =>
      h.stages.set([
        { label: 'A', value: 100 },
        { label: 'B', value: 0 },
        { label: 'C', value: 10 },
      ])
    );
    // `0%`, which the stylesheet's floor draws as a hairline.
    expect(widths()).toEqual(['100%', '0%', '10%']);
    expect(text('.wr-funnel-chart__value')).toEqual(['100', '0', '10']);
    // B kept none of A; C has no share of B, since there is nothing to be a share of.
    expect(gaps()).toEqual(['0%', null]);
    expect(overall()).toEqual([null, '0% of first', '10% of first']);
    expect(names()[2]).toBe('C: 10, 10% of first');
    // The band narrows to a point at the zero, and opens again from it.
    expect(bands()).toEqual([
      'polygon(0% 0%, 100% 0%, 50% 100%, 50% 100%)',
      'polygon(50% 0%, 50% 0%, 55% 100%, 45% 100%)',
    ]);
  });

  it('never draws a negative width, and gives a negative value no conversion', () => {
    set(h =>
      h.stages.set([
        { label: 'A', value: 100 },
        { label: 'B', value: -5 },
        { label: 'C', value: 40 },
      ])
    );
    expect(widths()).toEqual(['100%', '0%', '40%']);
    // Printed as given: it is what the data says.
    expect(text('.wr-funnel-chart__value')).toEqual(['100', '-5', '40']);
    expect(names()).toEqual(['A: 100', 'B: -5', 'C: 40, 40% of first']);
    expect(gaps()).toEqual([null, null]);
    for (const band of bands()) expect(band).not.toMatch(/-\d/);
  });

  it('draws nothing for a missing value, and joins nothing across it', () => {
    set(h =>
      h.stages.set([
        { label: 'A', value: 100 },
        { label: 'B', value: Number.NaN },
        { label: 'C', value: 40 },
      ])
    );
    expect(widths()).toEqual(['100%', null, '40%']);
    expect(text('.wr-funnel-chart__value')).toEqual(['100', '40']);
    expect(names()).toEqual(['A: 100', 'B', 'C: 40, 40% of first']);
    // The gaps are still there, as space; no band and no share crosses the missing stage.
    expect(all('.wr-funnel-chart__gap')).toHaveLength(2);
    expect(bands()).toEqual([]);
    expect(gaps()).toEqual([null, null]);
  });

  it('works out no share of a missing first stage', () => {
    set(h =>
      h.stages.set([
        { label: 'A', value: Number.POSITIVE_INFINITY },
        { label: 'B', value: 50 },
        { label: 'C', value: 25 },
      ])
    );
    expect(widths()).toEqual([null, '100%', '50%']);
    expect(overall()).toEqual([null, null, null]);
    expect(gaps()).toEqual([null, '50%']);
  });

  it('draws a funnel of zeros as hairlines rather than dividing by nothing', () => {
    set(h =>
      h.stages.set([
        { label: 'A', value: 0 },
        { label: 'B', value: 0 },
      ])
    );
    expect(widths()).toEqual(['0%', '0%']);
    expect(gaps()).toEqual([null]);
    for (const el of all('[style]')) expect(el.getAttribute('style')).not.toContain('NaN');
  });

  it('scales to a fixed `max`, drawing a stage above it full width', () => {
    set(h => {
      h.max.set(8000);
      h.dataTable.set(true);
    });
    expect(widths()).toEqual(['100%', '60%', '36%', '9%']);
    // The figure, the conversions and the table keep the stage's own value.
    expect(text('.wr-funnel-chart__value')[0]).toBe('12,000');
    expect(gaps()[0]).toBe('40%');
    expect(all('.wr-chart-table tbody tr')[0].querySelector('td')!.textContent.trim()).toBe('12,000');
  });

  it('prints only the conversions `conversion` asks for, and names every stage with both', () => {
    set(h => h.conversion.set('previous'));
    expect(gaps()).toEqual(['40%', '60%', '25%']);
    expect(overall()).toEqual([null, null, null, null]);

    set(h => h.conversion.set('first'));
    expect(gaps()).toEqual([null, null, null]);
    expect(overall()).toEqual([null, '40% of first', '24% of first', '6% of first']);

    set(h => h.conversion.set('none'));
    expect(gaps()).toEqual([null, null, null]);
    expect(overall()).toEqual([null, null, null, null]);
    // The funnel keeps its shape, and every stage still says both shares.
    expect(bands()).toHaveLength(3);
    expect(names()[1]).toBe('Signed up: 4,800, 40% of previous, 40% of first');
  });

  it('prints no value with `showValues` off, and keeps it in the name', () => {
    set(h => h.showValues.set(false));
    expect(all('.wr-funnel-chart__value')).toHaveLength(0);
    expect(overall()[1]).toBe('40% of first');
    expect(names()[0]).toBe('Visited: 12,000');
  });

  it('keeps a small real conversion off `0%`', () => {
    set(h =>
      h.stages.set([
        { label: 'Seen', value: 1_000_000 },
        { label: 'Bought', value: 400 },
      ])
    );
    expect(gaps()).toEqual(['0.04%']);
    expect(overall()[1]).toBe('0.04% of first');
  });

  it('writes every value through `valueFormat` and every conversion through `percentFormat`', () => {
    set(h => {
      h.valueFormat.set(v => `${v} users`);
      h.percentFormat.set(ratio => `${Math.round(ratio * 1000) / 10} pc`);
      h.dataTable.set(true);
    });
    expect(text('.wr-funnel-chart__value')[1]).toBe('4800 users');
    expect(gaps()[0]).toBe('40 pc');
    expect(overall()[1]).toBe('40 pc of first');
    expect(names()[1]).toBe('Signed up: 4800 users, 40 pc of previous, 40 pc of first');
    expect(text('.wr-chart-table tbody tr:nth-child(2) td')).toEqual(['4800 users', '40 pc', '40 pc']);
  });

  it('renders no data table unless asked', () => {
    expect(root().querySelector('wr-chart-table')).toBeNull();
  });

  it('tabulates the figures beside the stages: a row per stage, its value and both conversions', () => {
    set(h => {
      h.dataTable.set(true);
      h.ariaLabel.set('Sign-up funnel');
      h.stages.set([...STAGES.slice(0, 2), { label: 'Lost', value: Number.NaN }, ...STAGES.slice(2)]);
    });
    const table = root().querySelector('wr-chart-table')!;
    // Never inside an `img`, which would make it presentational.
    expect(table.closest('[role="img"]')).toBeNull();
    expect(table.querySelector('caption')!.textContent.trim()).toBe('Sign-up funnel');
    expect(text('.wr-chart-table thead th')).toEqual(['Stage', 'Value', 'From previous', 'From first']);
    const rows = all('.wr-chart-table tbody tr').map(row => [
      row.querySelector('th')!.textContent.trim(),
      ...[...row.querySelectorAll('td')].map(cell => cell.textContent.trim()),
    ]);
    // A figure the stage does not have is an empty cell.
    expect(rows).toEqual([
      ['Visited', '12,000', '', ''],
      ['Signed up', '4,800', '40%', '40%'],
      ['Lost', '', '', ''],
      ['Activated', '2,880', '', '24%'],
      ['Paid', '720', '25%', '6%'],
    ]);
  });

  it("heads the table's value column with `valueLabel`", () => {
    set(h => {
      h.dataTable.set(true);
      h.valueLabel.set('Visitors');
    });
    expect(text('.wr-chart-table thead th')).toEqual(['Stage', 'Visitors', 'From previous', 'From first']);
  });

  it('names a stage with the one conversion it has where the other means nothing', () => {
    // C has no share of the missing B before it, and still has its share of A.
    set(h =>
      h.stages.set([
        { label: 'A', value: 100 },
        { label: 'B', value: Number.NaN },
        { label: 'C', value: 50 },
      ])
    );
    expect(names()).toEqual(['A: 100', 'B', 'C: 50, 50% of first']);
  });

  it('lets a label take its direction from its own text, so it is cut at its own end', () => {
    expect(all('.wr-funnel-chart__label').every(label => label.getAttribute('dir') === 'auto')).toBe(true);
  });

  it('draws nothing at all with no stages', () => {
    set(h => h.stages.set([]));
    expect(stages()).toHaveLength(0);
    expect(all('.wr-funnel-chart__gap')).toHaveLength(0);
    expect(root().querySelector('.wr-funnel-chart__plot')!.getAttribute('aria-label')).toBe('Funnel chart');
  });

  it('holds no tab stop of its own', () => {
    expect(root().querySelectorAll('[tabindex], button, a[href]')).toHaveLength(0);
  });
});

describe('WrFunnelChart on the server', () => {
  it('draws everything from its inputs and measures nothing', () => {
    // Every width and band is worked out from the data; only the tooltip measures a box,
    // and only after a pointer has moved. A prerendered page carries the whole funnel.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const measure = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.dataTable.set(true);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.wr-funnel-chart__bar')).toHaveLength(4);
    expect(root.querySelectorAll('.wr-funnel-chart__band')).toHaveLength(3);
    expect(root.querySelectorAll('.wr-chart-table tbody tr')).toHaveLength(4);
    expect(measure).not.toHaveBeenCalled();
    fixture.destroy();
    measure.mockRestore();
  });
});

describe('WrFunnelChart numbers', () => {
  it('writes the values and the conversions in LOCALE_ID', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de' }] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.stages.set([
      { label: 'A', value: 1500.5 },
      { label: 'B', value: 600.2 },
    ]);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.wr-funnel-chart__value')!.textContent.trim()).toBe('1.500,5');
    // German separates the sign with a no-break space, and writes the fraction with a comma.
    expect(root.querySelector('.wr-funnel-chart__gap-label')!.textContent.trim()).toBe('40 %');
    fixture.destroy();
  });
});

@Component({
  imports: [WrFunnelChart],
  template: `<wr-funnel-chart [stages]="stages" [tooltip]="tooltip()" />`,
})
class TooltipHost {
  readonly stages: readonly WrFunnelStage[] = [
    { label: 'Visited', value: 1000 },
    { label: 'Signed up', value: 400, color: '#abcdef' },
    { label: 'Lost', value: Number.NaN },
    { label: 'Off', value: 0 },
  ];
  readonly tooltip = signal(true);
}

/**
 * The tooltip renders into a CDK overlay, so it is read off `document`. What it says is
 * asserted first; where it points, with laid-out boxes stubbed in, after.
 */
describe('WrFunnelChart tooltip', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TooltipHost>>;

  const doc = document.documentElement;
  const stages = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-funnel-chart__stage'),
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
    stages()[index].dispatchEvent(new MouseEvent('mouseenter'));
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

  it('heads the chip with the stage and its value, and lists both conversions', () => {
    hover(1);
    expect(part('label')).toBe('Signed up');
    expect(part('value')).toBe('400');
    expect(chip()!.querySelector<HTMLElement>('.wr-chart-tooltip__swatch')!.style.background).toBe(
      'rgb(171, 205, 239)'
    );
    expect(rows()).toEqual(['From previous 40%', 'From first 40%']);
  });

  it('shows the first stage with no conversion, since it is the reference', () => {
    hover(0);
    expect(part('label')).toBe('Visited');
    expect(rows()).toEqual([]);
  });

  it('marks the stage the chip is about', () => {
    hover(1);
    expect(stages()[1].classList).toContain('wr-funnel-chart__stage--active');
    expect(stages()[0].classList).not.toContain('wr-funnel-chart__stage--active');
  });

  it('opens nothing on a missing stage, and a stage of zero still opens with its hairline', () => {
    hover(2);
    expect(chip()).toBeNull();
    // The wash marks the row the open tooltip is about, and there is none.
    expect(stages().filter(stage => stage.classList.contains('wr-funnel-chart__stage--active'))).toEqual([]);

    hover(3);
    expect(stages()[3].classList).toContain('wr-funnel-chart__stage--active');
    expect(part('label')).toBe('Off');
    expect(part('value')).toBe('0');
    // No share of the missing stage before it; its share of the first is a real zero.
    expect(rows()).toEqual(['From first 0%']);
  });

  it('points at the top edge of the hovered BAR', () => {
    // The stage row is the full width; the bar is centred in it, at x 400..600, from y 200.
    const bar = stages()[1].querySelector('.wr-funnel-chart__bar')!;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this === bar) return new DOMRect(400, 200, 200, 32);
      if (this.classList.contains('wr-funnel-chart__stage')) return new DOMRect(0, 200, 1000, 32);
      return this.classList.contains('cdk-overlay-pane') ? new DOMRect(0, 0, 120, 60) : new DOMRect();
    });
    hover(1);

    const style = document.querySelector<HTMLElement>('.wr-tooltip-overlay')!.parentElement!.style;
    expect(768 - Number.parseFloat(style.bottom)).toBeCloseTo(200, 3);
    expect(Number.parseFloat(style.left) + Number.parseFloat(style.width) / 2).toBeCloseTo(500, 3);
  });

  it('leaves every name where it was — the tooltip is not the way to the numbers', () => {
    hover(1);
    expect(stages()[1].getAttribute('aria-label')).toBe('Signed up: 400, 40% of previous, 40% of first');
    expect(stages()[1].hasAttribute('aria-describedby')).toBe(false);
  });

  it('shows nothing with `tooltip` off', () => {
    fixture.componentInstance.tooltip.set(false);
    fixture.detectChanges();
    hover(1);
    expect(chip()).toBeNull();
    expect(stages()[1].classList).not.toContain('wr-funnel-chart__stage--active');
  });
});

@Component({
  imports: [WrFunnelChart],
  template: `<wr-funnel-chart [stages]="stages()" />`,
})
class CatalogHost {
  readonly stages = signal<readonly WrFunnelStage[]>(STAGES);
}

/**
 * Every stage's name is one catalog sentence per shape, so a locale places its own
 * punctuation and order round the figures: Japanese joins them with `、`, where English
 * hard-coded `, ` and `: ` used to announce "登録: 4,800, 前段階の40%, 初段階の40%".
 */
describe('WrFunnelChart catalog', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CatalogHost>>;

  const names = (): (string | null)[] =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('.wr-funnel-chart__stage')].map(stage =>
      stage.getAttribute('aria-label')
    );

  const catalog: WrI18nCatalog = {
    funnelChart: {
      ofPrevious: '前段階の{{percent}}',
      ofFirst: '初段階の{{percent}}',
      stageName: '{{label}}：{{value}}',
      stageNameOne: '{{label}}：{{value}}、{{conversion}}',
      stageNameBoth: '{{label}}：{{value}}、{{previous}}、{{first}}',
    },
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'xx', availableLocales: ['xx'] }),
        provideWrI18nStaticLoader({ xx: catalog }),
      ],
    });
    fixture = TestBed.createComponent(CatalogHost);
    fixture.detectChanges();
    // The static loader resolves through a promise even for a catalog already in memory.
    await Promise.resolve();
    await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('builds each name from the sentence for its shape, with no punctuation of its own', () => {
    expect(names()).toEqual([
      'Visited：12,000',
      'Signed up：4,800、前段階の40%、初段階の40%',
      'Activated：2,880、前段階の60%、初段階の24%',
      'Paid：720、前段階の25%、初段階の6%',
    ]);

    fixture.componentInstance.stages.set([
      { label: 'A', value: 100 },
      { label: 'B', value: Number.NaN },
      { label: 'C', value: 50 },
    ]);
    fixture.detectChanges();
    expect(names()).toEqual(['A：100', 'B', 'C：50、初段階の50%']);
  });
});

/**
 * What the stylesheet promises that no rendered DOM in jsdom can show, held against the
 * COMPILED sheet; `sass` is resolved through `@angular/build`, as `charts/stylesheets.spec.ts`
 * does. That each rule then paints what it says is measured in a browser.
 */
describe('WrFunnelChart stylesheet', () => {
  const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as {
    compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
  };
  const css = sass
    .compileString(`@use 'charts/funnel-chart/styles';`, {
      loadPaths: [join(process.cwd(), 'projects/lib')],
      style: 'expanded',
    })
    .css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';

  it('lets each figure take its direction from its own text, shrunk against the bar', () => {
    // Under RTL a negative value read `20-` and "30% of first" read "of first 30%".
    expect(rule('.wr-funnel-chart__value, .wr-funnel-chart__overall')).toMatch(/unicode-bidi: plaintext/);
    // Stretched, a plaintext figure lines up on its own text's start: the column's far edge.
    expect(rule('.wr-funnel-chart__figures')).toMatch(/align-items: flex-start/);
  });
});
