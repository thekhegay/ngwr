import { Component, LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type WrI18nCatalog, provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrBulletChart } from './bullet-chart';

@Component({
  imports: [WrBulletChart],
  template: `
    <wr-bullet-chart
      [value]="value()"
      [target]="target()"
      [ranges]="ranges()"
      [max]="max()"
      [label]="label()"
      [subLabel]="subLabel()"
      [ariaLabel]="ariaLabel()"
      [showScale]="showScale()"
      [tooltip]="tooltip()"
      [valueFormat]="valueFormat()"
    />
  `,
})
class Host {
  readonly value = signal<number | null>(270);
  readonly target = signal<number | null>(250);
  readonly ranges = signal<readonly number[]>([150, 225, 300]);
  readonly max = signal(0);
  readonly label = signal<string | null>('Revenue');
  readonly subLabel = signal<string | null>('USD, thousands');
  readonly ariaLabel = signal<string | null>(null);
  readonly showScale = signal(true);
  readonly tooltip = signal(true);
  readonly valueFormat = signal<((value: number) => string) | null>(null);
}

/** A custom property the component wrote on an element, read off its `style` attribute. */
function written(el: Element | null, name: string): number | null {
  const match = new RegExp(`--wr-bullet-chart-${name}:\\s*([^;]+)`).exec(el?.getAttribute('style') ?? '');
  return match ? Number.parseFloat(match[1]) : null;
}

describe('WrBulletChart', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-bullet-chart')!;
  const drawing = (): HTMLElement => root().querySelector<HTMLElement>('.wr-bullet-chart__track')!;
  const bar = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-bullet-chart__bar');
  const marker = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-bullet-chart__target');
  const bands = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-bullet-chart__range')];
  const ticks = (): string[] =>
    [...root().querySelectorAll('.wr-bullet-chart__tick-label')].map(tick => tick.textContent.trim());
  const name = (): string | null => drawing().getAttribute('aria-label');

  const set = (change: (host: Host) => void): void => {
    change(fixture.componentInstance);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  describe('the scale', () => {
    it('ends at the largest of the value, the target and the ranges by default', () => {
      // 300, the last range limit: the bar ends at 270 of it and the marker at 250.
      expect(written(bar(), 'start')).toBe(0);
      expect(written(bar(), 'size')).toBe(0.9);
      expect(written(marker(), 'at')).toBeCloseTo(250 / 300, 4);

      // A value past every limit moves the end to itself, and the bands keep their place.
      set(host => host.value.set(400));
      expect(written(bar(), 'size')).toBe(1);
      expect(written(marker(), 'at')).toBe(0.625);
      expect(written(bands()[2], 'start') ?? 0).toBeCloseTo(225 / 400, 4);
    });

    it('takes a fixed `max`, drawing a value past it to the end and announcing it as itself', () => {
      set(host => {
        host.max.set(250);
        host.target.set(null);
      });

      expect(written(bar(), 'size')).toBe(1);
      expect(name()).toBe('Revenue: 270');
      // The band from 225 to 300 is cut at the end; nothing past it is drawn.
      expect(bands().map(band => written(band, 'size'))).toEqual([0.6, 0.3, 0.1]);
    });

    it('starts below zero for a negative value, the bar running from the value up to zero', () => {
      set(host => {
        host.value.set(-100);
        host.target.set(100);
        host.ranges.set([0, 200]);
      });

      // -100 to 200: zero sits a third of the way along.
      expect(written(bar(), 'start')).toBe(0);
      expect(written(bar(), 'size')).toBeCloseTo(1 / 3, 4);
      expect(bar()!.classList).toContain('wr-bullet-chart__bar--negative');
      // The first band runs from the scale's start, so the negative value sits inside it.
      expect(written(bands()[0], 'start')).toBe(0);
      expect(written(bands()[0], 'size')).toBeCloseTo(1 / 3, 4);
    });

    it('draws a zero value as a bar of no length rather than as no bar', () => {
      set(host => host.value.set(0));

      expect(bar()).not.toBeNull();
      expect(written(bar(), 'size')).toBe(0);
      expect(name()).toBe('Revenue: 0 of target 250');
    });

    it('falls back to the empty 0 to 1 frame when there is nothing above zero to reach', () => {
      set(host => {
        host.value.set(0);
        host.target.set(null);
        host.ranges.set([]);
      });

      expect(ticks()).toEqual(['0', '0.25', '0.5', '0.75', '1']);
    });
  });

  describe('the bands', () => {
    it('sorts the limits, drops the ones that are not numbers, and draws each from the one before', () => {
      set(host => host.ranges.set([300, Number.NaN, 150, 225, 150]));

      expect(bands().map(band => [written(band, 'start'), written(band, 'size')])).toEqual([
        [0, 0.5],
        [0.5, 0.25],
        [0.75, 0.25],
      ]);
    });

    it('steps each band from the strongest grey at zero to the faintest at the last limit', () => {
      expect(bands().map(band => band.style.getPropertyValue('--wr-bullet-chart-range-mix'))).toEqual([
        '0%',
        '50%',
        '100%',
      ]);

      set(host => host.ranges.set([100, 200, 250, 300]));
      expect(bands().map(band => band.style.getPropertyValue('--wr-bullet-chart-range-mix'))).toEqual([
        '0%',
        '33.33%',
        '66.67%',
        '100%',
      ]);
    });

    it('keeps the shade of a band the scale has no room for off the bands that fit', () => {
      // A fixed 200 leaves the third band out; the two that fit keep the shades of three.
      set(host => {
        host.max.set(200);
        host.value.set(100);
      });

      expect(bands().map(band => band.dataset['index'])).toEqual(['0', '1']);
      expect(bands().map(band => band.style.getPropertyValue('--wr-bullet-chart-range-mix'))).toEqual(['0%', '50%']);
    });

    it('ends the last band exactly at the end of a scale it reaches, and short of one that runs on past it', () => {
      // The rule marking the last band's end is drawn just past it and clipped by the track,
      // so a last band reaching the end has to end at exactly 1, not a rounding short of it.
      set(host => host.ranges.set([100, 200, 300]));
      const end = (): number => {
        const last = bands().at(-1)!;
        return (written(last, 'start') ?? 0) + (written(last, 'size') ?? 0);
      };
      set(host => host.value.set(210));
      expect(end()).toBe(1);

      // 350 runs on past the last limit: the band ends at 300 of 350.
      set(host => host.value.set(350));
      expect(end()).toBeCloseTo(300 / 350, 4);
    });

    it('draws no first band when a negative first limit is where the scale starts', () => {
      // Nothing is below -10, so the band below it has no room: the drawing opens with the
      // second band, at its own paler shade.
      set(host => {
        host.value.set(20);
        host.target.set(25);
        host.ranges.set([-10, 10, 30]);
      });

      expect(bands().map(band => band.dataset['index'])).toEqual(['1', '2']);
      expect(bands().map(band => band.style.getPropertyValue('--wr-bullet-chart-range-mix'))).toEqual(['50%', '100%']);
      expect(written(bands()[0], 'start')).toBe(0);

      // A value below it gives the first band room again.
      set(host => host.value.set(-20));
      expect(bands().map(band => band.dataset['index'])).toEqual(['0', '1', '2']);
    });

    it('draws none with no ranges, leaving the track as the frame', () => {
      set(host => host.ranges.set([]));

      expect(bands()).toEqual([]);
      expect(root().querySelector('.wr-bullet-chart__ranges')).not.toBeNull();
      // The scale ends at the larger of the value and the target.
      expect(written(bar(), 'size')).toBe(1);
    });
  });

  describe('the value and the target', () => {
    it('draws no bar for a value that is not a number, and says so', () => {
      set(host => host.value.set(Number.NaN));

      expect(bar()).toBeNull();
      expect(marker()).not.toBeNull();
      expect(name()).toBe('Revenue: no value, target 250');

      set(host => host.target.set(null));
      expect(name()).toBe('Revenue: no value');
    });

    it('draws no marker without a target, and leaves it out of the name', () => {
      set(host => host.target.set(null));

      expect(marker()).toBeNull();
      expect(name()).toBe('Revenue: 270');
    });
  });

  describe('what a screen reader gets', () => {
    it('names the drawing with a sentence of the label, the value and the target', () => {
      expect(drawing().getAttribute('role')).toBe('img');
      expect(name()).toBe('Revenue: 270 of target 250');
    });

    it("opens the sentence with the chart's own name when there is no label", () => {
      set(host => host.label.set(null));

      expect(name()).toBe('Bullet chart: 270 of target 250');
    });

    it('takes `ariaLabel` in place of the sentence', () => {
      set(host => host.ariaLabel.set('Revenue is good: 270 against 250'));

      expect(name()).toBe('Revenue is good: 270 against 250');
    });

    it('is described by the sub-label, and hides the labels it already carries', () => {
      const labels = root().querySelector('.wr-bullet-chart__labels')!;
      const id = drawing().getAttribute('aria-describedby')!;

      expect(labels.getAttribute('aria-hidden')).toBe('true');
      expect(document.getElementById(id)?.textContent.trim()).toBe('USD, thousands');

      set(host => host.subLabel.set(null));
      expect(drawing().hasAttribute('aria-describedby')).toBe(false);
    });

    it('hides the scale, whose numbers the sentence does not need', () => {
      expect(root().querySelector('.wr-bullet-chart__scale')!.getAttribute('aria-hidden')).toBe('true');
    });

    it('takes no tab stop', () => {
      expect(root().querySelectorAll('[tabindex], button, a, input')).toHaveLength(0);
    });
  });

  describe('the labels', () => {
    it('draws the label column only when there is a label or a sub-label', () => {
      expect(chart().classList).toContain('wr-bullet-chart--labelled');
      expect(root().querySelector('.wr-bullet-chart__label')!.textContent.trim()).toBe('Revenue');

      set(host => host.label.set(null));
      expect(root().querySelector('.wr-bullet-chart__label')).toBeNull();
      expect(chart().classList).toContain('wr-bullet-chart--labelled');

      set(host => host.subLabel.set(null));
      expect(root().querySelector('.wr-bullet-chart__labels')).toBeNull();
      expect(chart().classList).not.toContain('wr-bullet-chart--labelled');
    });
  });

  describe('the scale ticks', () => {
    it('labels round steps from zero and stops at the end of the scale', () => {
      expect(ticks()).toEqual(['0', '100', '200', '300']);
      const at = [...root().querySelectorAll('.wr-bullet-chart__tick')].map(tick => written(tick, 'at'));
      expect(at[0]).toBe(0);
      expect(at.at(-1)).toBe(1);
    });

    it('aligns the ticks on either end inwards', () => {
      const all = [...root().querySelectorAll('.wr-bullet-chart__tick')];

      expect(all[0].classList).toContain('wr-bullet-chart__tick--start');
      expect(all.at(-1)!.classList).toContain('wr-bullet-chart__tick--end');
      expect(all.slice(1, -1).every(tick => tick.className === 'wr-bullet-chart__tick')).toBe(true);
    });

    it('leaves out a round step past an end that is not one', () => {
      // 0 to 270: the 300 the axis would round up to is past the end.
      set(host => {
        host.ranges.set([]);
        host.target.set(null);
      });

      expect(ticks()).toEqual(['0', '100', '200']);
    });

    it('draws none with `showScale` off', () => {
      set(host => host.showScale.set(false));

      expect(root().querySelector('.wr-bullet-chart__scale')).toBeNull();
    });
  });
});

/**
 * jsdom lays nothing out and has no `ResizeObserver`, so the measurement a browser makes
 * is stood in for: an observer the spec fires by hand, and tick labels 7px a character.
 */
describe('WrBulletChart on a narrow drawing', () => {
  type Callback = (entries: { contentRect: { width: number } }[]) => void;
  let observed: { callback: Callback; disconnected: boolean } | null = null;
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const ticks = (): string[] =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('.wr-bullet-chart__tick-label')].map(tick =>
      tick.textContent.trim()
    );
  const layOut = async (width: number): Promise<void> => {
    observed!.callback([{ contentRect: { width } }]);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    observed = null;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private readonly record: { callback: Callback; disconnected: boolean };
        constructor(callback: Callback) {
          this.record = { callback, disconnected: false };
          observed = this.record;
        }
        observe(): void {
          // The callback is driven by hand below.
        }
        disconnect(): void {
          this.record.disconnected = true;
        }
      }
    );
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const width = this.classList.contains('wr-bullet-chart__tick-label') ? this.textContent.trim().length * 7 : 0;
      return new DOMRect(0, 0, width, 0);
    });
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('draws the usual ticks where they fit', async () => {
    await layOut(400);

    expect(ticks()).toEqual(['0', '100', '200', '300']);
  });

  it('draws fewer once the drawing is too narrow for their labels, and lets go on destroy', async () => {
    // At 96px the labels 100, 200 and 300 would stand 32px apart, 21px wide each.
    await layOut(96);
    expect(ticks()).toEqual(['0', '200']);

    // And the full scale comes back when the drawing widens again.
    await layOut(400);
    expect(ticks()).toEqual(['0', '100', '200', '300']);

    fixture.destroy();
    expect(observed!.disconnected).toBe(true);
  });

  it('measures labels that first appear after the drawing was measured', async () => {
    // Measured with the scale off, there is no label to take a width per character from;
    // switching it on later changes nothing about the drawing's width.
    fixture.componentInstance.showScale.set(false);
    fixture.detectChanges();
    await layOut(96);

    fixture.componentInstance.showScale.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(ticks()).toEqual(['0', '200']);
  });

  it('aligns a tick near an end inwards where its centred label would cross it', async () => {
    // 0 to 205: the tick on 200 sits 2.4% short of the end, and its label, centred, would
    // reach 7px past it at 200px.
    fixture.componentInstance.value.set(205);
    fixture.componentInstance.target.set(null);
    fixture.componentInstance.ranges.set([150, 200]);
    fixture.detectChanges();
    await layOut(200);

    const all = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.wr-bullet-chart__tick')];
    const last = all.at(-1)!;
    expect(last.textContent.trim()).toBe('200');
    expect(written(last, 'at')).toBeLessThan(1);
    expect(last.classList).toContain('wr-bullet-chart__tick--end');
    expect(all.slice(1, -1).every(tick => tick.className === 'wr-bullet-chart__tick')).toBe(true);

    // Wide enough, the same tick is centred on its value again.
    await layOut(900);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.wr-bullet-chart__tick:last-child')!.classList
    ).not.toContain('wr-bullet-chart__tick--end');
  });
});

describe('WrBulletChart number format', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const name = (): string | null => root().querySelector('.wr-bullet-chart__track')!.getAttribute('aria-label');
  const ticks = (): string[] =>
    [...root().querySelectorAll('.wr-bullet-chart__tick-label')].map(tick => tick.textContent.trim());

  const create = (locale?: string): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: locale ? [{ provide: LOCALE_ID, useValue: locale }] : [] });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set(2700.5);
    fixture.componentInstance.target.set(2500);
    fixture.componentInstance.ranges.set([1500, 2250, 3000]);
    fixture.detectChanges();
  };

  afterEach(() => fixture.destroy());

  it("writes the name and the ticks in LOCALE_ID's own convention by default", () => {
    create('de');

    expect(name()).toBe('Revenue: 2.700,5 of target 2.500');
    expect(ticks()).toEqual(['0', '1000', '2000', '3000']);
  });

  it('writes them through `valueFormat` when one is given', () => {
    create();
    fixture.componentInstance.valueFormat.set(value => `$${Math.round(value / 100) / 10}K`);
    fixture.detectChanges();

    expect(name()).toBe('Revenue: $2.7K of target $2.5K');
    expect(ticks()).toEqual(['$0K', '$1K', '$2K', '$3K']);
  });
});

describe('WrBulletChart catalog', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const name = (): string | null =>
    (fixture.nativeElement as HTMLElement).querySelector('.wr-bullet-chart__track')!.getAttribute('aria-label');

  const catalog: WrI18nCatalog = {
    bulletChart: {
      label: 'Diagramme à puces',
      summary: '{{label}} : {{value}} sur un objectif de {{target}}',
      summaryNoTarget: '{{label}} : {{value}}',
      summaryNoValue: '{{label}} : aucune valeur, objectif {{target}}',
      noValue: '{{label}} : aucune valeur',
      target: 'Objectif',
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
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    // The static loader resolves through a promise even for a catalog already in memory.
    await Promise.resolve();
    await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('builds every sentence from the catalog, its placeholders filled', () => {
    expect(name()).toBe('Revenue : 270 sur un objectif de 250');

    fixture.componentInstance.label.set(null);
    fixture.detectChanges();
    expect(name()).toBe('Diagramme à puces : 270 sur un objectif de 250');

    fixture.componentInstance.target.set(null);
    fixture.detectChanges();
    expect(name()).toBe('Diagramme à puces : 270');

    fixture.componentInstance.value.set(null);
    fixture.detectChanges();
    expect(name()).toBe('Diagramme à puces : aucune valeur');

    fixture.componentInstance.target.set(250);
    fixture.detectChanges();
    expect(name()).toBe('Diagramme à puces : aucune valeur, objectif 250');
  });
});

@Component({
  imports: [WrBulletChart],
  template: `<wr-bullet-chart [value]="value()" [target]="target()" [label]="label()" [tooltip]="tooltip()" />`,
})
class TooltipHost {
  readonly value = signal<number | null>(270);
  readonly target = signal<number | null>(250);
  readonly label = signal<string | null>('Revenue');
  readonly tooltip = signal(true);
}

describe('WrBulletChart tooltip', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TooltipHost>>;

  const drawing = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-bullet-chart__track')!;
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const part = (name: string): string | null =>
    chip()?.querySelector(`.wr-chart-tooltip__${name}`)?.textContent.trim() ?? null;

  const hover = (): void => {
    drawing().dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(TooltipHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('heads the chip with the label and the value, and gives the target a row', () => {
    hover();

    expect([part('label'), part('value')]).toEqual(['Revenue', '270']);
    expect([part('row-label'), part('row-value')]).toEqual(['Target', '250']);
  });

  it("keys the value to the bar by the bar's own paint, and draws no swatch for a bar that paints nothing", () => {
    // jsdom loads no stylesheet, so the bar paints nothing until one is written on it.
    hover();
    expect(chip()!.querySelector('.wr-chart-tooltip__swatch')).toBeNull();
    fixture.destroy();

    fixture = TestBed.createComponent(TooltipHost);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-bullet-chart__bar')!.style.background =
      'rgb(1, 2, 3)';
    hover();
    expect(chip()!.querySelector<HTMLElement>('.wr-chart-tooltip__swatch')!.style.background).toBe('rgb(1, 2, 3)');
  });

  it('leaves the label out rather than printing the generic name from the catalog', () => {
    fixture.componentInstance.label.set(null);
    fixture.detectChanges();
    hover();

    expect(part('label')).toBeNull();
    expect(part('value')).toBe('270');
  });

  it('gives no target row without a target', () => {
    fixture.componentInstance.target.set(null);
    fixture.detectChanges();
    hover();

    expect(part('value')).toBe('270');
    expect(chip()!.querySelector('.wr-chart-tooltip__row')).toBeNull();
  });

  it('opens on the target alone when there is no value', () => {
    fixture.componentInstance.value.set(null);
    fixture.detectChanges();
    hover();

    expect(part('value')).toBeNull();
    expect([part('row-label'), part('row-value')]).toEqual(['Target', '250']);
  });

  it('does not open with neither a value nor a target', () => {
    fixture.componentInstance.value.set(null);
    fixture.componentInstance.target.set(null);
    fixture.detectChanges();
    hover();

    expect(chip()).toBeNull();
  });

  it('shows nothing with `tooltip` off', () => {
    fixture.componentInstance.tooltip.set(false);
    fixture.detectChanges();
    hover();

    expect(chip()).toBeNull();
  });
});

@Component({
  imports: [WrBulletChart],
  template: `
    <wr-bullet-chart [value]="1" subLabel="First" />
    <wr-bullet-chart [value]="2" subLabel="Second" />
  `,
})
class PairHost {}

describe('WrBulletChart on a page with another', () => {
  it('describes each drawing by its own sub-label', () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(PairHost);
    fixture.detectChanges();

    const tracks = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.wr-bullet-chart__track')];
    const ids = tracks.map(track => track.getAttribute('aria-describedby')!);

    expect(new Set(ids).size).toBe(2);
    expect(ids.map(id => document.getElementById(id)?.textContent.trim())).toEqual(['First', 'Second']);
    fixture.destroy();
  });
});
