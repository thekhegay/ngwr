import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CHART_MARKERS, type WrChartMarkerShape } from 'ngwr/charts/core';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrChartLegend } from './chart-legend';
import { WR_CHART_LEGEND_BLOCK } from './tokens';
import type { WrChartLegendItem, WrChartLegendToggle, WrChartMarker } from './types';

const ITEMS: readonly WrChartLegendItem[] = [
  { label: 'Visits', color: 'var(--wr-color-primary)', value: '1,204' },
  { label: 'Signups', color: 'rgb(18, 52, 86)', value: '86' },
  { label: 'Churn', color: 'var(--wr-color-danger)' },
];

@Component({
  imports: [WrChartLegend],
  template: `
    <ul
      wr-chart-legend
      class="demo-legend"
      [items]="items()"
      [toggleable]="toggleable()"
      [ariaLabel]="ariaLabel()"
      [(hiddenSeries)]="hidden"
      (toggled)="events.push($event)"
    ></ul>
  `,
})
class Host {
  readonly items = signal<readonly WrChartLegendItem[]>(ITEMS);
  readonly toggleable = signal(false);
  readonly ariaLabel = signal<string | null>(null);
  readonly hidden = signal<readonly number[]>([]);
  readonly events: WrChartLegendToggle[] = [];
}

/**
 * Everything here is read off the rendered DOM: the rows, their keys and their text, and
 * in a `toggleable` legend the button each row becomes, its `aria-pressed` and the
 * struck-through class. The list is the consumer's element, so its own class stays on it.
 */
describe('WrChartLegend', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const list = (): HTMLUListElement => (fixture.nativeElement as HTMLElement).querySelector('ul')!;
  const rows = (): HTMLLIElement[] => [...list().querySelectorAll<HTMLLIElement>(':scope > li')];
  const buttons = (): HTMLButtonElement[] => [...list().querySelectorAll<HTMLButtonElement>('button')];
  const text = (el: Element | null): string => el?.textContent.trim() ?? '';
  const render = (): void => fixture.detectChanges();

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    render();
  });

  afterEach(() => fixture.destroy());

  it('renders one row per item on the list it sits on', () => {
    expect(list().classList).toContain('wr-chart-legend');
    // Safari drops a `list-style: none` list's implicit role, so the role is written out.
    expect(list().getAttribute('role')).toBe('list');
    expect(list().classList).toContain('demo-legend');
    expect(rows().map(row => row.className)).toEqual(Array(3).fill('wr-chart-legend__item'));
    expect(rows().map(row => text(row.querySelector('.wr-chart-legend__label')))).toEqual([
      'Visits',
      'Signups',
      'Churn',
    ]);
  });

  it('prints a value only where one is given, as given', () => {
    expect(rows().map(row => text(row.querySelector('.wr-chart-legend__value')))).toEqual(['1,204', '86', '']);
    expect(rows()[2].querySelector('.wr-chart-legend__value')).toBeNull();
  });

  it('keys a plain row with a dot painted in its colour, hidden from the reader', () => {
    const dot = rows()[1].querySelector<HTMLElement>('.wr-chart-legend__swatch')!;
    expect(dot.tagName).toBe('SPAN');
    expect(dot.classList).toContain('wr-chart-legend__swatch--dot');
    expect(dot.style.background).toBe('rgb(18, 52, 86)');
    expect(dot.getAttribute('aria-hidden')).toBe('true');
  });

  it('keys a dashed series with a line in its own dash, solid for an empty one', () => {
    host().items.set([
      { label: 'Solid', color: 'red', dash: '' },
      { label: 'Dashed', color: 'blue', dash: '7 4' },
    ]);
    render();

    const lines = rows().map(row => row.querySelector('svg.wr-chart-legend__swatch--line line')!);
    expect(lines.map(line => line.getAttribute('stroke'))).toEqual(['red', 'blue']);
    expect(lines.map(line => line.getAttribute('stroke-dasharray'))).toEqual([null, '7 4']);
    expect(rows().every(row => row.querySelector('svg')!.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('keys a marked series with its shape, on its line when it has a dash too', () => {
    host().items.set([
      { label: 'Points', color: 'red', marker: 'diamond' },
      { label: 'Line and points', color: 'blue', marker: 'triangle', dash: '2 3' },
    ]);
    render();

    const [marker, line] = rows().map(row => row.querySelector('svg')!);
    expect(marker.classList).toContain('wr-chart-legend__swatch--marker');
    expect(marker.getAttribute('data-marker')).toBe('diamond');
    expect(marker.querySelector('path')!.getAttribute('fill')).toBe('red');
    expect(marker.querySelector('path')!.getAttribute('d')).toMatch(/^M /);

    expect(line.classList).toContain('wr-chart-legend__swatch--line');
    expect(line.getAttribute('data-marker')).toBe('triangle');
    expect(line.querySelector('path')!.getAttribute('transform')).toBe('translate(8 1)');
  });

  it('accepts every shape the charts hand out', () => {
    // Held both ways: a shape the core adds must be one a legend row can draw.
    const shapes: readonly WrChartMarker[] = CHART_MARKERS;
    const back: readonly WrChartMarkerShape[] = shapes;
    host().items.set(back.map(marker => ({ label: marker, color: 'red', marker })));
    render();
    expect(rows().map(row => row.querySelector('svg')!.getAttribute('data-marker'))).toEqual([...CHART_MARKERS]);
    expect(rows().every(row => row.querySelector('path')!.getAttribute('d') !== '')).toBe(true);
  });

  it('keeps every row in step with its own index when labels repeat', () => {
    host().items.set([
      { label: 'Same', color: 'red' },
      { label: 'Same', color: 'blue' },
    ]);
    render();
    host().items.set([
      { label: 'Same', color: 'green' },
      { label: 'Same', color: 'blue' },
    ]);
    render();
    expect(rows().map(row => row.querySelector<HTMLElement>('.wr-chart-legend__swatch')!.style.background)).toEqual([
      'green',
      'blue',
    ]);
  });

  describe('without toggling', () => {
    it('renders no buttons and no name of its own', () => {
      expect(buttons()).toEqual([]);
      expect(list().classList).not.toContain('wr-chart-legend--toggleable');
      expect(list().hasAttribute('aria-label')).toBe(false);
    });

    it('takes a name when given one', () => {
      host().ariaLabel.set('Traffic sources');
      render();
      expect(list().getAttribute('aria-label')).toBe('Traffic sources');
    });

    it('still shows a series hidden from elsewhere as hidden', () => {
      host().hidden.set([1]);
      render();
      expect(rows().map(row => row.classList.contains('wr-chart-legend__item--hidden'))).toEqual([false, true, false]);
    });

    it('says a hidden row is hidden in words, since the strike-through reaches no screen reader', () => {
      host().hidden.set([1]);
      render();
      // After the name, so the row reads "Signups hidden 86"; the label itself stays the name.
      const note = rows()[1].querySelector('.wr-chart-legend__sr-only');
      expect(text(note)).toBe('hidden');
      expect(note!.previousElementSibling!.classList).toContain('wr-chart-legend__label');
      expect(text(rows()[1].querySelector('.wr-chart-legend__label'))).toBe('Signups');
      expect(rows().map(row => row.querySelector('.wr-chart-legend__sr-only') !== null)).toEqual([false, true, false]);

      host().hidden.set([]);
      render();
      expect(list().querySelector('.wr-chart-legend__sr-only')).toBeNull();
    });
  });

  describe('toggleable', () => {
    beforeEach(() => {
      host().toggleable.set(true);
      render();
    });

    it('makes every row a toggle button, pressed while its series is shown', () => {
      expect(list().classList).toContain('wr-chart-legend--toggleable');
      // Still a list: the rows are toggles, not a toolbar, and the name needs the role.
      expect(list().getAttribute('role')).toBe('list');
      expect(buttons()).toHaveLength(3);
      expect(buttons().map(button => button.getAttribute('type'))).toEqual(['button', 'button', 'button']);
      expect(buttons().map(button => button.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'true']);
      // One tab stop per row: nothing takes a row out of the order.
      expect(buttons().every(button => !button.hasAttribute('tabindex'))).toBe(true);
      // The key, the name and the value are all inside the target, so the name is the button's.
      expect(text(buttons()[0])).toBe('Visits1,204');
      expect(buttons()[0].querySelector('.wr-chart-legend__swatch')).not.toBeNull();
    });

    it('names the list for what its buttons do', () => {
      expect(list().getAttribute('aria-label')).toBe('Toggle series visibility');
      host().ariaLabel.set('Series');
      render();
      expect(list().getAttribute('aria-label')).toBe('Series');
    });

    it('hides a series on a click, says so, and shows it again on the next', () => {
      buttons()[1].click();
      render();

      expect(buttons().map(button => button.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'true']);
      expect(rows()[1].classList).toContain('wr-chart-legend__item--hidden');
      expect(host().hidden()).toEqual([1]);
      expect(host().events).toEqual([{ index: 1, label: 'Signups', hidden: true }]);
      // aria-pressed says it; a second word inside the button would rename the toggle.
      expect(text(buttons()[1])).toBe('Signups86');
      expect(list().querySelector('.wr-chart-legend__sr-only')).toBeNull();

      buttons()[1].click();
      render();
      expect(buttons()[1].getAttribute('aria-pressed')).toBe('true');
      expect(rows()[1].classList).not.toContain('wr-chart-legend__item--hidden');
      expect(host().hidden()).toEqual([]);
      expect(host().events.at(-1)).toEqual({ index: 1, label: 'Signups', hidden: false });
    });

    it('keeps the hidden positions ascending whatever order they were hidden in', () => {
      buttons()[2].click();
      buttons()[0].click();
      render();
      expect(host().hidden()).toEqual([0, 2]);
    });

    it('toggles a row by its position, not its label', () => {
      host().items.set([
        { label: 'Same', color: 'red' },
        { label: 'Same', color: 'blue' },
      ]);
      render();
      buttons()[1].click();
      render();
      expect(buttons().map(button => button.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
      expect(host().events).toEqual([{ index: 1, label: 'Same', hidden: true }]);
    });

    it('follows a hidden list written from outside', () => {
      host().hidden.set([0, 2]);
      render();
      expect(buttons().map(button => button.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
    });

    it('keeps a position past the end of the items and draws nothing for it', () => {
      host().hidden.set([7]);
      render();
      expect(buttons().every(button => button.getAttribute('aria-pressed') === 'true')).toBe(true);
      buttons()[0].click();
      render();
      expect(host().hidden()).toEqual([0, 7]);
    });
  });
});

@Component({
  imports: [WrChartLegend],
  viewProviders: [{ provide: WR_CHART_LEGEND_BLOCK, useValue: 'wr-demo-chart' }],
  template: `<ul wr-chart-legend class="wr-demo-chart__legend" [items]="items"></ul>`,
})
class BlockHost {
  readonly items: readonly WrChartLegendItem[] = [{ label: 'Visits', color: 'red', value: '12' }];
}

@Component({
  selector: 'wr-spec-inner',
  imports: [WrChartLegend],
  template: `<ul wr-chart-legend [items]="items"></ul>`,
})
class Inner {
  readonly items: readonly WrChartLegendItem[] = [{ label: 'Visits', color: 'red', value: '12' }];
}

@Component({
  imports: [Inner],
  viewProviders: [{ provide: WR_CHART_LEGEND_BLOCK, useValue: 'wr-demo-chart' }],
  template: `<wr-spec-inner />`,
})
class OuterHost {}

describe('WrChartLegend inside a chart', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it("keeps the chart's own classes on every part of a row", () => {
    const fixture = TestBed.createComponent(BlockHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect([...root.querySelector('ul')!.classList].sort()).toEqual(['wr-chart-legend', 'wr-demo-chart__legend']);
    const row = root.querySelector('li')!;
    expect(row.classList).toContain('wr-chart-legend__item');
    expect(row.classList).toContain('wr-demo-chart__legend-item');
    expect(row.querySelector('.wr-demo-chart__swatch')!.classList).toContain('wr-chart-legend__swatch');
    expect(row.querySelector('.wr-demo-chart__legend-label')!.textContent.trim()).toBe('Visits');
    expect(row.querySelector('.wr-demo-chart__legend-value')!.textContent.trim()).toBe('12');
    fixture.destroy();
  });

  it("never takes a block from beyond its own host's view", () => {
    const fixture = TestBed.createComponent(OuterHost);
    fixture.detectChanges();
    const row = (fixture.nativeElement as HTMLElement).querySelector('li')!;

    expect(row.className).toBe('wr-chart-legend__item');
    expect(row.querySelector('[class*="wr-demo-chart"]')).toBeNull();
    fixture.destroy();
  });
});

describe('WrChartLegend under a localized catalog', () => {
  it('takes the toggle name from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'de', availableLocales: ['de'] }),
        provideWrI18nStaticLoader({ de: { chartLegend: { toggleLabel: 'Datenreihen ein- und ausblenden' } } }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.toggleable.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const list = (fixture.nativeElement as HTMLElement).querySelector('ul')!;
    expect(list.getAttribute('aria-label')).toBe('Datenreihen ein- und ausblenden');
    fixture.destroy();
  });

  it('takes the hidden word from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'de', availableLocales: ['de'] }),
        provideWrI18nStaticLoader({ de: { chartLegend: { hidden: 'ausgeblendet' } } }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.hidden.set([0]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const note = (fixture.nativeElement as HTMLElement).querySelector('.wr-chart-legend__sr-only')!;
    expect(note.textContent.trim()).toBe('ausgeblendet');
    fixture.destroy();
  });
});
