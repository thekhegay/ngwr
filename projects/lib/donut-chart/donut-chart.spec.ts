import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

@Component({
  imports: [WrDonutChart],
  template: `<wr-donut-chart [segments]="segments" [tooltip]="tooltip()" />`,
})
class TooltipHost {
  readonly segments = SEGMENTS;
  readonly tooltip = signal(true);
}

/**
 * What the tooltip says, and that it follows the arc under the pointer. WHERE it points is
 * worked out from the drawing's box, which jsdom reports as 0×0 — the block after this one
 * gives it a box. The one piece of CSS that decides whether an arc can be hovered at all is
 * asserted only in part: the centre text used to cover the whole drawing, and no stylesheet
 * reaches jsdom, so that half is measured in the browser.
 */
describe('WrDonutChart tooltip', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TooltipHost>>;

  const paths = (): SVGPathElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<SVGPathElement>('.wr-donut-chart__surface path'),
  ];
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const part = (name: string): HTMLElement | null =>
    chip()?.querySelector<HTMLElement>(`.wr-chart-tooltip__${name}`) ?? null;

  const hover = (el: Element): void => {
    el.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(TooltipHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('shows the label, value and colour of the hovered slice', () => {
    hover(paths()[1]);

    expect(part('label')!.textContent.trim()).toBe('Search');
    expect(part('value')!.textContent.trim()).toBe('50');
    expect(part('swatch')!.style.background).toBe('rgb(18, 52, 86)');
  });

  it('follows the pointer from one slice to the next', () => {
    hover(paths()[0]);
    hover(paths()[2]);

    expect(document.querySelectorAll('.wr-chart-tooltip')).toHaveLength(1);
    expect(part('label')!.textContent.trim()).toBe('Social');
  });

  it('shows nothing with `tooltip` off', () => {
    fixture.componentInstance.tooltip.set(false);
    fixture.detectChanges();

    hover(paths()[0]);

    expect(chip()).toBeNull();
  });
});

/**
 * One slice facing each way, and a sliver. Clockwise from three o'clock in hundredths of
 * a turn: East 0–12.5 (middle 22.5°), South 12.5–37.5 (90°), West 37.5–74.5 (201.6°),
 * the sliver 74.5–75.5 (exactly 270°, twelve o'clock) and North-east 75.5–100 (315.9°,
 * just on the side of three o'clock).
 */
const COMPASS: readonly WrDonutSegment[] = [
  { label: 'East', value: 12.5 },
  { label: 'South', value: 25 },
  { label: 'West', value: 37 },
  { label: 'Sliver', value: 1 },
  { label: 'North-east', value: 24.5 },
];

@Component({
  imports: [WrDonutChart],
  template: `<wr-donut-chart [segments]="segments" />`,
})
class CompassHost {
  readonly segments = COMPASS;
}

/**
 * Where the chip points. jsdom lays nothing out, so the drawing is given a box — 200px
 * square at (100, 100), centre (200, 200), radius 100 — the chip a size, and the document
 * a 1024×768 one, and the case reads what the CDK wrote from the anchor: the placement class, and the
 * edges of the box the pane is laid out in, which are the anchor point's own coordinates.
 * That the chip then paints there is measured in a browser.
 */
describe('WrDonutChart tooltip anchor', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CompassHost>>;

  const root = document.documentElement;
  const paths = (): SVGPathElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<SVGPathElement>('.wr-donut-chart__surface path'),
  ];
  const pane = (): HTMLElement => document.querySelector<HTMLElement>('.wr-tooltip-overlay')!;
  /** The box the CDK lays the pane out in, in px. */
  const box = (): Record<'top' | 'bottom' | 'left' | 'right' | 'width' | 'height', number> => {
    const style = pane().parentElement!.style;
    const px = (value: string): number => Number.parseFloat(value);
    return {
      top: px(style.top),
      bottom: px(style.bottom),
      left: px(style.left),
      right: px(style.right),
      width: px(style.width),
      height: px(style.height),
    };
  };
  const hover = (label: string): void => {
    paths()[COMPASS.findIndex(s => s.label === label)].dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
  };
  /** The arc's outer edge at `degrees`, clockwise from three o'clock. */
  const arc = (degrees: number): { x: number; y: number } => ({
    x: 200 + 100 * Math.cos((degrees * Math.PI) / 180),
    y: 200 + 100 * Math.sin((degrees * Math.PI) / 180),
  });

  /**
   * The drawing at `(100, top)`, and every chip 80×26 — a chip with no size fits anywhere,
   * which would hide the flip.
   */
  const create = (top = 100): void => {
    fixture = TestBed.createComponent(CompassHost);
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg')!;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this === svg) return new DOMRect(100, top, 200, 200);
      return this.classList.contains('cdk-overlay-pane') ? new DOMRect(0, 0, 80, 26) : new DOMRect();
    });
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    Object.defineProperty(root, 'clientWidth', { configurable: true, value: 1024 });
    Object.defineProperty(root, 'clientHeight', { configurable: true, value: 768 });
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    Reflect.deleteProperty(root, 'clientWidth');
    Reflect.deleteProperty(root, 'clientHeight');
  });

  it('points a lower slice from below, at the middle of its outer arc', () => {
    create();
    hover('South');

    expect(pane().classList).toContain('wr-tooltip-overlay--bottom');
    // Below the point: the box starts at its y, centred on its x.
    expect(box().top).toBeCloseTo(arc(90).y, 3);
    expect(box().left + box().width / 2).toBeCloseTo(arc(90).x, 3);
  });

  it("points a slice at three o'clock from the right, and one at nine from the left", () => {
    create();
    hover('East');
    expect(pane().classList).toContain('wr-tooltip-overlay--right');
    // To the right of the point: the box starts at its x, centred on its y.
    expect(box().left).toBeCloseTo(arc(22.5).x, 3);
    expect(box().top + box().height / 2).toBeCloseTo(arc(22.5).y, 3);

    hover('West');
    expect(pane().classList).toContain('wr-tooltip-overlay--left');
    // To the left of it: the box ENDS at its x.
    expect(1024 - box().right).toBeCloseTo(arc(201.6).x, 3);
    expect(box().top + box().height / 2).toBeCloseTo(arc(201.6).y, 3);
  });

  it("points a sliver at its own middle, not at a neighbour's", () => {
    create();
    hover('Sliver');

    // Twelve o'clock exactly, between a slice pointed at from the left and one from the
    // right: from above, at the top of the ring.
    expect(pane().classList).toContain('wr-tooltip-overlay--top');
    expect(768 - box().bottom).toBeCloseTo(arc(270).y, 3);
    expect(box().left + box().width / 2).toBeCloseTo(arc(270).x, 3);

    hover('North-east');
    expect(pane().classList).toContain('wr-tooltip-overlay--right');
  });

  it('flips a chip with no room above it below the point instead', () => {
    // The ring's top edge on the top edge of the viewport.
    create(0);
    hover('Sliver');

    expect(pane().classList).toContain('wr-tooltip-overlay--bottom');
    expect(box().top).toBeCloseTo(0, 3);
  });

  it('keeps a slice at three o\'clock pointed from the right under dir="rtl"', () => {
    TestBed.overrideProvider(Directionality, { useValue: { value: 'rtl', change: new Subject<Direction>() } });
    create();
    hover('East');

    // The drawing does not mirror, so neither does the side: the logical name is the one
    // the arrow keys on under RTL, and the box still starts at the point's x.
    expect(pane().classList).toContain('wr-tooltip-overlay--left');
    expect(box().left).toBeCloseTo(arc(22.5).x, 3);
  });
});
