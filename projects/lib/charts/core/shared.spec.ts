import { Component, type ElementRef, LOCALE_ID, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type WrI18nCatalog, provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WrChartState, useChartState } from './chart-state';
import { useChartHover, useChartSize, wrChartDim, wrChartObserveSize } from './interaction';
import { wrChartLabelStep, wrChartLongest } from './labels';
import { useChartNumbers, wrChartNumberFormat } from './numbers';
import { wrChartRound } from './round';

describe('wrChartNumberFormat', () => {
  const Original = Intl.NumberFormat;
  let built = 0;

  /** Counts every formatter built while a case runs; the real one is put back after it. */
  const count = (): void => {
    built = 0;
    class Counted extends Original {
      constructor(locales?: string | string[], options?: Intl.NumberFormatOptions) {
        super(locales, options);
        built++;
      }
    }
    Intl.NumberFormat = Counted as typeof Intl.NumberFormat;
  };

  afterEach(() => {
    Intl.NumberFormat = Original;
  });

  it('builds one formatter per locale and options, and hands the same one back', () => {
    count();

    // A locale and options nothing else in the suite asks for, so the cache is cold.
    const first = wrChartNumberFormat('fi', { maximumFractionDigits: 7 });
    expect(built).toBe(1);
    expect(wrChartNumberFormat('fi', { maximumFractionDigits: 7 })).toBe(first);
    expect(built).toBe(1);

    expect(wrChartNumberFormat('fi', { maximumFractionDigits: 8 })).not.toBe(first);
    expect(wrChartNumberFormat('fi')).not.toBe(first);
    expect(built).toBe(3);
    expect(first.format(1.23456789)).toBe('1,2345679');
  });

  it('builds nothing on a second pass over the same axis', () => {
    // `ticks` built a formatter for the axis and one more per non-zero tick on EVERY
    // call: about six constructions, 0.4 to 0.8 ms, each time an axis recomputed.
    const numbers = TestBed.runInInjectionContext(() => useChartNumbers(signal(null), 'nb'));
    const axis = [40_000, 30_000, 20_000, 10_000, 0];
    const written = numbers.ticks(axis, 10_000);
    numbers.exact(1.25, 2);

    count();
    expect(numbers.ticks(axis, 10_000)).toEqual(written);
    expect(numbers.value(1234.5)).toBeTruthy();
    expect(numbers.label(1_200_000)).toBeTruthy();
    expect(numbers.exact(1.25, 2)).toBeTruthy();
    expect(built).toBe(0);
  });

  it('shares its formatters between two charts in one locale', () => {
    const one = TestBed.runInInjectionContext(() => useChartNumbers(signal(null), 'da'));
    one.value(1);
    one.label(5000);

    count();
    const two = TestBed.runInInjectionContext(() => useChartNumbers(signal(null), 'da'));
    two.value(2);
    two.label(6000);
    expect(built).toBe(0);
  });

  it('still follows LOCALE_ID by default', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de' }] });
    const numbers = TestBed.runInInjectionContext(() => useChartNumbers(signal(null)));
    expect(numbers.value(1234.5)).toBe('1.234,5');
  });
});

describe('wrChartRound', () => {
  it('rounds to four decimals by default, and to as many as asked', () => {
    expect(wrChartRound(1 / 3)).toBe(0.3333);
    expect(wrChartRound(2 / 3, 2)).toBe(0.67);
    expect(wrChartRound(12.3456, 0)).toBe(12);
  });

  it('never writes a negative zero', () => {
    expect(Object.is(wrChartRound(-0.00001), 0)).toBe(true);
    expect(Object.is(wrChartRound(-0), 0)).toBe(true);
    expect(String(wrChartRound(-1e-9, 2))).toBe('0');
  });
});

describe('wrChartLongest', () => {
  it('keeps the few longest strings, each once, longest first', () => {
    expect(wrChartLongest(['1', '22', '333', '4444', '22', '55555'], 3)).toEqual(['55555', '4444', '333']);
    expect(wrChartLongest(['a', 'a', 'a'])).toEqual(['a']);
    expect(wrChartLongest([])).toEqual([]);
  });

  it('keeps the first of several equally long, in their own order', () => {
    expect(wrChartLongest(['10', '20', '-4', '30'], 3)).toEqual(['10', '20', '-4']);
  });

  it('measures three by default, however many there are', () => {
    const labels = Array.from({ length: 10_000 }, (_, index) => String(index));
    expect(wrChartLongest(labels)).toHaveLength(3);
    expect(wrChartLongest(labels).every(label => label.length === 4)).toBe(true);
  });
});

describe('wrChartLabelStep', () => {
  it('prints every label while the longest fits its own band', () => {
    // Ten bands of 60px; a 40px label and 8px between two of them fit one band.
    expect(wrChartLabelStep(10, 600, 40)).toBe(1);
    expect(wrChartLabelStep(10, 600, 52)).toBe(1);
  });

  it('prints every second, third, nth label once it does not', () => {
    expect(wrChartLabelStep(10, 600, 53)).toBe(2);
    expect(wrChartLabelStep(40, 600, 40)).toBe(4);
    expect(wrChartLabelStep(40, 600, 40, 20)).toBe(4);
    expect(wrChartLabelStep(40, 600, 41, 20)).toBe(5);
  });

  it('never skips past the whole axis, and prints all with nothing measured', () => {
    expect(wrChartLabelStep(3, 30, 500)).toBe(3);
    expect(wrChartLabelStep(10, 0, 40)).toBe(1);
    expect(wrChartLabelStep(10, 600, 0)).toBe(1);
    expect(wrChartLabelStep(1, 600, 900)).toBe(1);
  });
});

@Component({
  template: `
    <ul>
      <li data-wr-series="0" id="row-a">A</li>
      <li data-wr-series="1" id="row-b">B</li>
    </ul>
    <div data-wr-index="0" id="first">
      <i data-wr-series="0" id="a0"></i>
      <i data-wr-series="1" id="b0"></i>
    </div>
    <div data-wr-index="1" id="second">
      <i data-wr-series="0" id="a1"></i>
      <i data-wr-series="1" id="b1"><b id="deep"></b></i>
    </div>
    <p id="gutter"></p>
  `,
})
class HoverHost {
  readonly entered: number[] = [];
  readonly left: MouseEvent[] = [];

  constructor() {
    useChartHover({ enter: index => this.entered.push(index), leave: event => this.left.push(event) });
  }
}

describe('useChartHover', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<HoverHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const el = (id: string): HTMLElement => root().querySelector<HTMLElement>(`#${id}`)!;
  const over = (id: string): boolean => el(id).dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  const on = (): string[] => [...root().querySelectorAll('.wr-chart-mark--on')].map(mark => mark.id);
  const create = (): void => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(HoverHost);
    fixture.detectChanges();
  };

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('listens on the host alone, however many sections it draws', () => {
    const added = vi.spyOn(EventTarget.prototype, 'addEventListener');
    create();

    const ours = added.mock.calls.filter(([type]) => type === 'mouseover' || type === 'mouseleave');
    expect(ours.map(([type]) => type).sort()).toEqual(['mouseleave', 'mouseover']);
    expect(added.mock.contexts.filter((_, index) => ours.includes(added.mock.calls[index]))).toEqual([root(), root()]);
  });

  it('reports the section under the pointer once, by its data-wr-index, from any depth', () => {
    create();

    over('a0');
    over('b0');
    expect(fixture.componentInstance.entered).toEqual([0]);

    over('deep');
    expect(fixture.componentInstance.entered).toEqual([0, 1]);
    expect(fixture.componentInstance.left).toEqual([]);
  });

  it('says the pointer left when it moves onto a part that is no section, or off the chart', () => {
    create();

    over('first');
    over('gutter');
    expect(fixture.componentInstance.left).toHaveLength(1);

    over('second');
    root().dispatchEvent(new MouseEvent('mouseleave'));
    expect(fixture.componentInstance.left).toHaveLength(2);
    expect(fixture.componentInstance.entered).toEqual([0, 1]);
  });

  it('dims everything but the series under the pointer, its legend row included', () => {
    create();

    over('a1');
    expect(root().classList).toContain('wr-chart--dim');
    expect(on()).toEqual(['row-a', 'a0', 'a1']);

    // A legend row carries the same attribute, so hovering it dims the chart the same way.
    over('row-b');
    expect(on()).toEqual(['row-b', 'b0', 'b1']);

    over('gutter');
    expect(root().classList).not.toContain('wr-chart--dim');
    expect(on()).toEqual([]);

    over('b1');
    root().dispatchEvent(new MouseEvent('mouseleave'));
    expect(root().classList).not.toContain('wr-chart--dim');
    expect(on()).toEqual([]);
  });

  it('stops listening when the chart is destroyed', () => {
    create();
    const host = root();
    const instance = fixture.componentInstance;
    fixture.destroy();

    host.querySelector('#a0')!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(instance.entered).toEqual([]);
    create();
  });
});

describe('wrChartDim', () => {
  it('marks one series by its key and clears the last one', () => {
    const host = document.createElement('div');
    host.innerHTML = '<i data-wr-series="c1"></i><i data-wr-series="c2"></i>';
    const [one, two] = [...host.children];

    wrChartDim(host, 'c2');
    expect([one.className, two.className, host.className]).toEqual(['', 'wr-chart-mark--on', 'wr-chart--dim']);

    wrChartDim(host, 'c1');
    expect([one.className, two.className]).toEqual(['wr-chart-mark--on', '']);

    wrChartDim(host, null);
    expect([one.className, two.className, host.className]).toEqual(['', '', '']);
  });
});

describe('wrChartObserveSize', () => {
  type Deliver = (entries: { target: Element; contentRect: { width: number; height: number } }[]) => void;

  /** Every observer built, with what it watches: the page should build one. */
  class FakeObserver {
    static built: FakeObserver[] = [];
    readonly targets = new Set<Element>();

    readonly deliver: Deliver;

    constructor(deliver: Deliver) {
      this.deliver = deliver;
      FakeObserver.built.push(this);
    }

    observe(target: Element): void {
      this.targets.add(target);
    }

    unobserve(target: Element): void {
      this.targets.delete(target);
    }

    disconnect(): void {
      this.targets.clear();
    }
  }

  const original = globalThis.ResizeObserver;

  afterEach(() => {
    globalThis.ResizeObserver = original;
  });

  it('watches every chart through one observer, and tells each its own size', () => {
    globalThis.ResizeObserver = FakeObserver as unknown as typeof ResizeObserver;
    const a = document.createElement('div');
    const b = document.createElement('div');
    const sizes: string[] = [];

    const stopA = wrChartObserveSize(a, size => sizes.push(`a ${size.width}x${size.height}`));
    const stopB = wrChartObserveSize(b, size => sizes.push(`b ${size.width}x${size.height}`));

    // Two charts, one observer.
    expect(FakeObserver.built).toHaveLength(1);
    const shared = FakeObserver.built[0];
    expect([...shared.targets]).toEqual([a, b]);

    shared.deliver([
      { target: b, contentRect: { width: 300, height: 120 } },
      { target: a, contentRect: { width: 640, height: 200 } },
    ]);
    expect(sizes).toEqual(['b 300x120', 'a 640x200']);

    stopA();
    expect([...shared.targets]).toEqual([b]);
    shared.deliver([{ target: a, contentRect: { width: 1, height: 1 } }]);
    expect(sizes).toHaveLength(2);
    stopB();
    expect(shared.targets.size).toBe(0);
  });
});

@Component({
  template: `
    @if (shown()) {
      <div #box></div>
    }
  `,
})
class SizeHost {
  readonly shown = signal(true);
  readonly box = viewChild<ElementRef<HTMLElement>>('box');
  readonly size = useChartSize(this.box);
}

describe('useChartSize', () => {
  it('is 0 by 0 until the element is measured, and again once it is gone', () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(SizeHost);
    fixture.detectChanges();
    expect(fixture.componentInstance.size()).toEqual({ width: 0, height: 0 });

    fixture.componentInstance.shown.set(false);
    fixture.detectChanges();
    expect(fixture.componentInstance.size()).toEqual({ width: 0, height: 0 });
    fixture.destroy();
  });
});

@Component({
  imports: [WrChartState],
  template: `
    @if (state(); as shown) {
      <wr-chart-state [kind]="shown.kind" [label]="shown.label" />
    }
  `,
})
class StateHost {
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly empty = signal(false);
  readonly emptyLabel = signal<string | null>(null);
  readonly loadingLabel = signal<string | null>(null);
  readonly errorLabel = signal<string | null>(null);
  readonly state = useChartState(this);
}

describe('useChartState and WrChartState', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<StateHost>>;

  const host = (): StateHost => fixture.componentInstance;
  const shown = (): HTMLElement | null => (fixture.nativeElement as HTMLElement).querySelector('wr-chart-state');
  const set = (change: (h: StateHost) => void): void => {
    change(host());
    fixture.detectChanges();
  };
  const create = (providers: unknown[] = []): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(StateHost);
    fixture.detectChanges();
  };

  afterEach(() => fixture.destroy());

  it('shows nothing while the chart has marks to draw', () => {
    create();
    expect(host().state()).toBeNull();
    expect(shown()).toBeNull();
  });

  it('says no data, loading and could not load, in English with no catalog', () => {
    create();

    set(h => h.empty.set(true));
    expect(shown()!.textContent.trim()).toBe('No data');
    expect(shown()!.className).toBe('wr-chart-state wr-chart-state--empty');
    expect(shown()!.getAttribute('role')).toBe('status');
    expect(shown()!.querySelector('.wr-chart-state__spinner')).toBeNull();

    set(h => h.error.set(true));
    expect(shown()!.textContent.trim()).toBe('Could not load');
    expect(shown()!.className).toBe('wr-chart-state wr-chart-state--error');
    // The one of the three a reader has to act on.
    expect(shown()!.getAttribute('role')).toBe('alert');

    set(h => h.loading.set(true));
    expect(shown()!.textContent.trim()).toBe('Loading…');
    expect(shown()!.className).toBe('wr-chart-state wr-chart-state--loading');
    expect(shown()!.getAttribute('role')).toBe('status');
    expect(shown()!.querySelector('.wr-chart-state__spinner')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('puts loading over an error, and an error over no data', () => {
    create();
    set(h => {
      h.empty.set(true);
      h.error.set(true);
      h.loading.set(true);
    });
    expect(host().state()!.kind).toBe('loading');

    set(h => h.loading.set(false));
    expect(host().state()!.kind).toBe('error');

    set(h => h.error.set(false));
    expect(host().state()!.kind).toBe('empty');
  });

  it('takes each message from its own input over the catalog, and the catalog over English', async () => {
    const catalog: WrI18nCatalog = { chart: { empty: 'Rien', loading: 'Un instant', error: 'Raté' } };
    create([
      provideWrI18n({ defaultLocale: 'xx', availableLocales: ['xx'] }),
      provideWrI18nStaticLoader({ xx: catalog }),
    ]);
    await Promise.resolve();
    await Promise.resolve();
    await fixture.whenStable();

    set(h => h.empty.set(true));
    expect(shown()!.textContent.trim()).toBe('Rien');
    set(h => h.emptyLabel.set('Nothing sold yet'));
    expect(shown()!.textContent.trim()).toBe('Nothing sold yet');

    set(h => h.loading.set(true));
    expect(shown()!.textContent.trim()).toBe('Un instant');
    set(h => h.loadingLabel.set('Fetching sales'));
    expect(shown()!.textContent.trim()).toBe('Fetching sales');

    set(h => {
      h.loading.set(false);
      h.error.set(true);
    });
    expect(shown()!.textContent.trim()).toBe('Raté');
    set(h => h.errorLabel.set('Sales are unavailable'));
    expect(shown()!.textContent.trim()).toBe('Sales are unavailable');
  });
});
