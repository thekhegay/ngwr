import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WR_DATE_LOCALE } from 'ngwr/date';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrCalendarHeatmap } from './calendar-heatmap';
import type { WrHeatmapDatum } from './interfaces';

@Component({
  imports: [WrCalendarHeatmap],
  template: `
    <wr-calendar-heatmap
      [data]="data()"
      [endDate]="endDate()"
      [weeks]="weeks()"
      [showLabels]="showLabels()"
      [tooltip]="tooltip()"
    />
  `,
})
class Host {
  readonly data = signal<readonly WrHeatmapDatum[]>([
    { date: '2025-08-11', value: 4 },
    { date: '2025-08-12', value: 8 },
  ]);
  readonly endDate = signal<string | Date | null>('2025-08-16');
  readonly weeks = signal(4);
  readonly showLabels = signal(true);
  readonly tooltip = signal(true);
}

/**
 * The grid is CSS Grid placed by `grid-column` / `grid-row` inline styles, which jsdom does
 * report — so where every cell sits is checkable without layout. `endDate` is pinned in each
 * test because the default is "today", and a spec that drifts with the clock is worse than
 * no spec.
 */
describe('WrCalendarHeatmap', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const grid = (): HTMLElement => root().querySelector<HTMLElement>('.wr-calendar-heatmap__grid')!;
  const cells = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-calendar-heatmap__cell')];
  const weekdayLabels = (): string[] =>
    [...root().querySelectorAll('.wr-calendar-heatmap__weekday')].map(el => el.textContent.trim());
  const monthLabels = (): string[] =>
    [...root().querySelectorAll('.wr-calendar-heatmap__month')].map(el => el.textContent.trim());
  const cellFor = (iso: string): HTMLElement | undefined =>
    cells().find(cell => cell.getAttribute('data-date') === iso);
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  /** A `mousemove` over a square, bubbling to the one listener the grid has. */
  const hover = (el: Element): void => {
    el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    fixture.detectChanges();
  };

  const mount = (locale = 'en-GB'): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: WR_DATE_LOCALE, useValue: locale }, provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  beforeEach(() => mount());
  afterEach(() => fixture.destroy());

  it('lays out one column per week and one row per weekday', () => {
    // Four weeks ending on a Saturday: 28 days, plus whatever the Sunday alignment adds.
    expect(cells().length % 7).toBe(0);
    const rows = new Set(cells().map(cell => cell.style.gridRow));
    expect(rows.size).toBe(7);
  });

  it('places a day in the row its weekday sits on', () => {
    // 11 Aug 2025 is a Monday, and row 1 is Monday when column 0 starts on Sunday.
    expect(cellFor('2025-08-11')!.style.gridRow).toBe('2');
    expect(cellFor('2025-08-10')!.style.gridRow).toBe('1');
  });

  it('sums two entries that fall on the same day', () => {
    fixture.componentInstance.data.set([
      { date: '2025-08-11', value: 3 },
      { date: '2025-08-11', value: 5 },
    ]);
    fixture.detectChanges();

    // `data-value`, not the `title`: the tooltip is human-facing text now — the
    // date through `Intl.DateTimeFormat`, the count through `Intl.NumberFormat`,
    // and the sentence composed in the catalog — so asserting it would pin this
    // suite to whatever locale it happens to run under.
    expect(cellFor('2025-08-11')!.getAttribute('data-value')).toBe('8');
  });

  it('leaves a day with no entry at zero', () => {
    expect(cellFor('2025-08-13')!.getAttribute('data-value')).toBe('0');
  });

  it('announces itself as one picture, with the cells kept quiet', () => {
    // Every cell used to be a bare `<span>` carrying a `title`, which a screen reader on a
    // role-less span does not read — so the grid was several hundred anonymous nodes and no
    // name at all. One name for the picture, and the cells out of the tree.
    expect(grid().getAttribute('role')).toBe('img');
    expect(grid().getAttribute('aria-label')).toBeTruthy();
    expect(cells()[0].getAttribute('aria-hidden')).toBe('true');
  });

  it('names the weekdays in the locale, keeping every other one blank', () => {
    // The blanks are deliberate — a label on all seven rows does not fit — but the three
    // that show were hard-coded English.
    expect(weekdayLabels().length).toBe(7);
    expect(weekdayLabels()[1]).toBe('Mon');
    expect(weekdayLabels()[0]).toBe('');
    expect(weekdayLabels()[2]).toBe('');
  });

  it('names the months in the locale', () => {
    expect(monthLabels()).toContain('Aug');
  });

  it('drops both label rows when asked', () => {
    fixture.componentInstance.showLabels.set(false);
    fixture.detectChanges();

    expect(weekdayLabels()).toEqual([]);
    expect(monthLabels()).toEqual([]);
  });

  it('follows the locale it was given', () => {
    mount('ru-RU');

    // Russian short weekday names are lower-case and abbreviated differently.
    expect(weekdayLabels()[1]).not.toBe('Mon');
    expect(weekdayLabels()[1].length).toBeGreaterThan(0);
    expect(monthLabels().some(label => /[а-яА-Я]/.test(label))).toBe(true);
  });

  it('keeps one non-finite day from flattening the whole map', () => {
    // `Math.max(a, NaN)` is `NaN` and `NaN > 0` is false, so the data set's maximum used to
    // collapse and EVERY cell in the rendered window — not just the bad day — painted the
    // empty colour at full opacity. A year of real activity read as a year of none.
    fixture.componentInstance.data.set([
      { date: '2025-08-11', value: 4 },
      { date: '2025-08-12', value: 8 },
      { date: '2025-08-13', value: Number.NaN },
    ]);
    fixture.detectChanges();

    // The tallest day still paints the colour, and the mid day still scales against it.
    expect(cellFor('2025-08-12')!.style.background).toBe('var(--wr-color-primary)');
    expect(cellFor('2025-08-11')!.style.background).toBe('var(--wr-color-primary)');
    // The bad day loses only itself — and it reports a number, not the word NaN.
    // Asserted on BOTH halves: `data-value` is what a spec and a harness read,
    // and the tooltip is what a person sees, so `NaN` leaking into either is the
    // failure. The text is not compared to a literal here — it is locale-formatted,
    // and the tooltip block below pins one locale on purpose.
    expect(cellFor('2025-08-13')!.getAttribute('data-value')).toBe('0');
    hover(cellFor('2025-08-13')!);
    expect(chip()!.textContent.trim()).toMatch(/: 0$/);
    expect(chip()!.textContent).not.toContain('NaN');
  });

  it('paints a negative day as nothing, not as a light day', () => {
    // `value / max` for a negative value is a NEGATIVE intensity, and nothing
    // floored it. `colorFor` treats anything but exactly 0 as activity and
    // `opacityFor` put it in the lightest band, so a day of -5 rendered exactly
    // like a day of 1 and unlike the empty day it should have matched.
    fixture.componentInstance.data.set([
      { date: '2025-08-11', value: 10 },
      { date: '2025-08-12', value: -5 },
      { date: '2025-08-13', value: 1 },
    ]);
    fixture.detectChanges();

    const negative = cellFor('2025-08-12')!;
    const light = cellFor('2025-08-13')!;
    expect(negative.style.background).toBe('rgba(var(--wr-color-light-rgb), 0.5)');
    expect(negative.style.background).not.toBe(light.style.background);
  });

  it('renders an empty grid rather than nothing when there is no data', () => {
    // With the tooltip off, so every day's sentence is on the page at once as a `title`.
    fixture.componentInstance.tooltip.set(false);
    fixture.componentInstance.data.set([]);
    fixture.detectChanges();

    expect(cells().length).toBeGreaterThan(0);
    for (const cell of cells()) expect(cell.getAttribute('title')).toMatch(/: 0$/);
  });
});

describe('WrCalendarHeatmap under a localized catalog', () => {
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

    const grid = (fixture.nativeElement as HTMLElement).querySelector('.wr-calendar-heatmap__grid')!;
    expect(grid.getAttribute('aria-label')).toBe('Календарная тепловая карта');

    fixture.destroy();
  });
});

/**
 * One listener on the grid rather than one per day, so the day is found from the event
 * target — which is what these drive. Where the chip lands against a 11px square needs
 * layout and is measured in a browser.
 */
describe('WrCalendarHeatmap tooltip', () => {
  @Component({
    imports: [WrCalendarHeatmap],
    template: `<wr-calendar-heatmap [data]="data" endDate="2025-08-16" [weeks]="4" [tooltip]="tooltip()" />`,
  })
  class TooltipHost {
    readonly data: readonly WrHeatmapDatum[] = [{ date: '2025-08-11', value: 1234 }];
    readonly tooltip = signal(true);
  }

  let fixture: ReturnType<typeof TestBed.createComponent<TooltipHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const cellFor = (iso: string): HTMLElement => root().querySelector<HTMLElement>(`[data-date="${iso}"]`)!;
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const move = (el: Element): void => {
    el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: WR_DATE_LOCALE, useValue: 'en-GB' }, provideWrOverlay()] });
    fixture = TestBed.createComponent(TooltipHost);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('says what the square used to say in its title — the day and the count, in the locale', () => {
    move(cellFor('2025-08-11'));

    // Built from the same two formatters the component uses, for the locale this block
    // pins, so it holds wherever the suite runs.
    const day = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(2025, 7, 11));
    const count = new Intl.NumberFormat('en-GB').format(1234);
    expect(chip()!.querySelector('.wr-chart-tooltip__value')!.textContent.trim()).toBe(`${day}: ${count}`);
    // A sentence already, so no separate label and no swatch.
    expect(chip()!.querySelector('.wr-chart-tooltip__label')).toBeNull();
    expect(chip()!.querySelector('.wr-chart-tooltip__swatch')).toBeNull();
  });

  it('follows the pointer from day to day with one chip', () => {
    move(cellFor('2025-08-11'));
    move(cellFor('2025-08-12'));

    expect(document.querySelectorAll('.wr-chart-tooltip')).toHaveLength(1);
    expect(chip()!.textContent.trim()).toMatch(/: 0$/);
  });

  it('starts to leave over the gap between squares, and stays if the pointer lands on one in time', () => {
    move(cellFor('2025-08-11'));
    const grid = root().querySelector('.wr-calendar-heatmap__cells')!;

    move(grid);
    vi.advanceTimersByTime(50);
    fixture.detectChanges();
    move(cellFor('2025-08-12'));
    vi.advanceTimersByTime(500);
    fixture.detectChanges();
    expect(chip()).not.toBeNull();

    move(grid);
    vi.advanceTimersByTime(110);
    fixture.detectChanges();
    expect(chip()).toBeNull();
  });

  it('writes no `title` while it shows its own, and goes back to the `title` with it off', () => {
    expect(cellFor('2025-08-11').hasAttribute('title')).toBe(false);

    fixture.componentInstance.tooltip.set(false);
    fixture.detectChanges();
    move(cellFor('2025-08-11'));

    expect(chip()).toBeNull();
    expect(cellFor('2025-08-11').getAttribute('title')).toMatch(/1,234$/);
  });

  describe('where it points', () => {
    const doc = document.documentElement;
    /** The box the CDK lays the pane out in, in px. */
    const box = (): Record<'top' | 'bottom' | 'left' | 'width', number> => {
      const style = document.querySelector<HTMLElement>('.wr-tooltip-overlay')!.parentElement!.style;
      return {
        top: Number.parseFloat(style.top),
        bottom: Number.parseFloat(style.bottom),
        left: Number.parseFloat(style.left),
        width: Number.parseFloat(style.width),
      };
    };
    const pane = (): HTMLElement => document.querySelector<HTMLElement>('.wr-tooltip-overlay')!;

    /**
     * A 1024×768 document, a 160×26 chip, and the square for `iso` laid out as an 11px
     * square at `(x, y)` — drawn at `scale` of that, about its centre, the way `:hover`
     * grows it.
     */
    const layout = (iso: string, x: number, y: number, scale = 1): void => {
      Object.defineProperty(doc, 'clientWidth', { configurable: true, value: 1024 });
      Object.defineProperty(doc, 'clientHeight', { configurable: true, value: 768 });
      const square = cellFor(iso);
      Object.defineProperty(square, 'offsetWidth', { configurable: true, value: 11 });
      Object.defineProperty(square, 'offsetHeight', { configurable: true, value: 11 });
      const drawn = 11 * scale;
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        if (this === square) return new DOMRect(x + 5.5 - drawn / 2, y + 5.5 - drawn / 2, drawn, drawn);
        return this.classList.contains('cdk-overlay-pane') ? new DOMRect(0, 0, 160, 26) : new DOMRect();
      });
    };

    afterEach(() => {
      vi.restoreAllMocks();
      Reflect.deleteProperty(doc, 'clientWidth');
      Reflect.deleteProperty(doc, 'clientHeight');
    });

    it('points at the hovered day from above, not at its week', () => {
      layout('2025-08-13', 500, 300);
      move(cellFor('2025-08-13'));

      expect(pane().classList).toContain('wr-tooltip-overlay--top');
      // Above the square's top edge, centred on the square.
      expect(768 - box().bottom).toBeCloseTo(300, 3);
      expect(box().left + box().width / 2).toBeCloseTo(505.5, 3);
    });

    it('points at the square it lays out, not at the one its hover scale draws', () => {
      // Part way through the `:hover` growth. A rect read now would move the chip by
      // whatever fraction of the transition had run when it was measured.
      layout('2025-08-13', 500, 300, 1.4);
      move(cellFor('2025-08-13'));

      expect(768 - box().bottom).toBeCloseTo(300, 3);
      expect(box().left + box().width / 2).toBeCloseTo(505.5, 3);
    });

    it('flips below a day with no room above it', () => {
      layout('2025-08-10', 500, 4);
      move(cellFor('2025-08-10'));

      expect(pane().classList).toContain('wr-tooltip-overlay--bottom');
      expect(box().top).toBeCloseTo(15, 3);
    });
  });
});
