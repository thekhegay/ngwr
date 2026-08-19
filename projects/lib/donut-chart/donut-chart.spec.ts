import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrDonutChart } from './donut-chart';
import type { WrDonutSegment } from './interfaces';

const SEGMENTS: readonly WrDonutSegment[] = [
  { label: 'Direct', value: 30 },
  { label: 'Search', value: 50, color: '#123456' },
  { label: 'Social', value: 20 },
];

@Component({
  imports: [WrDonutChart],
  template: `
    <wr-donut-chart
      [segments]="segments()"
      [showLegend]="showLegend()"
      [thickness]="thickness()"
      [centerValue]="centerValue()"
    />
  `,
})
class Host {
  readonly segments = signal<readonly WrDonutSegment[]>(SEGMENTS);
  readonly showLegend = signal(true);
  readonly thickness = signal(30);
  readonly centerValue = signal('');
}

/**
 * The arcs carry no text, so what a screen reader gets is the drawing's own name and the
 * legend — and the legend is optional. That makes the name the only thing that survives
 * `showLegend: false`, which is why it is asserted here rather than assumed.
 *
 * The arcs are compared through the rendered `d`, because a path is what a consumer
 * sees: a single non-finite datum used to write the literal text `NaN` into it, which is
 * invalid path geometry and drops every arc from that point on.
 */
describe('WrDonutChart', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const svg = (): SVGSVGElement => root().querySelector<SVGSVGElement>('.wr-donut-chart__surface svg')!;
  const paths = (): SVGPathElement[] => [...root().querySelectorAll<SVGPathElement>('.wr-donut-chart__surface path')];
  const legend = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-donut-chart__legend');
  /** Label and value are adjacent spans with no whitespace between them, so read each. */
  const legendRows = (): string[] =>
    [...root().querySelectorAll('.wr-donut-chart__legend-item')].map(el => {
      const label = el.querySelector('.wr-donut-chart__legend-label')!.textContent.trim();
      const value = el.querySelector('.wr-donut-chart__legend-value')!.textContent.trim();
      return `${label} ${value}`;
    });

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('draws one arc per segment, and names the drawing rather than its paths', () => {
    expect(paths().length).toBe(3);
    expect(svg().getAttribute('role')).toBe('img');
    for (const path of paths()) expect(path.getAttribute('d')).not.toContain('NaN');
  });

  it('announces itself even with the legend switched off', () => {
    // The arcs carry no text and the legend is optional, so without a name of its own the
    // chart is nothing at all to a screen reader in that configuration.
    fixture.componentInstance.showLegend.set(false);
    fixture.detectChanges();

    expect(svg().getAttribute('role')).toBe('img');
    expect(svg().getAttribute('aria-label')).toBe('Donut chart');
  });

  it('leaves the centre text outside the picture', () => {
    // `img` is a children-presentational role. With it on the wrapper it covered the centre
    // block too, so WebKit dropped the headline number — the one figure the legend does not
    // carry — from the accessibility tree entirely.
    fixture.componentInstance.centerValue.set('60%');
    fixture.detectChanges();

    const centre = root().querySelector<HTMLElement>('.wr-donut-chart__center-value')!;
    expect(centre.textContent.trim()).toBe('60%');
    expect(centre.closest('[role="img"]')).toBeNull();
  });

  it('uses the given colour and falls back through the palette', () => {
    expect(paths()[1].getAttribute('fill')).toBe('#123456');
    expect(paths()[0].getAttribute('fill')).toBe('var(--wr-color-primary)');
    expect(paths()[2].getAttribute('fill')).toBe('var(--wr-color-success)');
  });

  it('lists every segment in the legend with its own value', () => {
    expect(legendRows()).toEqual(['Direct 30', 'Search 50', 'Social 20']);
  });

  it('renders no legend at all when there is nothing to list', () => {
    // An empty `<ul>` is still announced as a list, of nothing.
    fixture.componentInstance.segments.set([]);
    fixture.detectChanges();

    expect(legend()).toBeNull();
    expect(paths()).toEqual([]);
  });

  it('drops the legend when asked, and keeps the ring', () => {
    fixture.componentInstance.showLegend.set(false);
    fixture.detectChanges();
    expect(legend()).toBeNull();
    expect(paths().length).toBe(3);
  });

  it('survives a segment whose value is not a number', () => {
    // `Math.max(0, NaN)` is NaN, and the running total carries it forward — so one bad
    // datum used to take out its own arc AND every arc after it.
    fixture.componentInstance.segments.set([
      { label: 'ok', value: 10 },
      { label: 'broken', value: Number.NaN },
      { label: 'after', value: 30 },
    ]);
    fixture.detectChanges();

    expect(paths().length).toBe(3);
    for (const path of paths()) expect(path.getAttribute('d')).not.toContain('NaN');
    // The bad datum counts as nothing rather than poisoning the ones behind it.
    expect(legendRows()).toEqual(['ok 10', 'broken 0', 'after 30']);
    const withBadDatum = paths()[0].getAttribute('d');

    // And it must not count towards the TOTAL either. A NaN in the sum collapses
    // `total` to its `sum > 0 ? sum : 1` fallback of 1, which silently rescales every
    // share — so the good segments have to draw exactly as they would without it.
    fixture.componentInstance.segments.set([
      { label: 'ok', value: 10 },
      { label: 'after', value: 30 },
    ]);
    fixture.detectChanges();
    expect(paths()[0].getAttribute('d')).toBe(withBadDatum);
  });

  it('treats a negative value as nothing', () => {
    fixture.componentInstance.segments.set([
      { label: 'up', value: 40 },
      { label: 'down', value: -10 },
    ]);
    fixture.detectChanges();

    expect(legendRows()).toEqual(['up 40', 'down 0']);
    for (const path of paths()) expect(path.getAttribute('d')).not.toContain('NaN');
  });

  it('fills to the centre when the thickness is zero', () => {
    // 0 means a solid pie, not a ring of zero width — the arcs must reach the middle.
    fixture.componentInstance.thickness.set(0);
    fixture.detectChanges();
    expect(paths()[0].getAttribute('d')).toContain('50 50');
  });

  it('shows the centre text only when it is given some', () => {
    expect(root().querySelector('.wr-donut-chart__center')).toBeNull();

    fixture.componentInstance.centerValue.set('100');
    fixture.detectChanges();
    expect(root().querySelector('.wr-donut-chart__center-value')!.textContent.trim()).toBe('100');
  });
});

describe('WrDonutChart under a localized catalog', () => {
  it('takes its name from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const drawing = (fixture.nativeElement as HTMLElement).querySelector('.wr-donut-chart__surface svg')!;
    expect(drawing.getAttribute('aria-label')).toBe('Круговая диаграмма');

    fixture.destroy();
  });
});
