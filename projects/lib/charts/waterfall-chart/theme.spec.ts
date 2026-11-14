import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import type { WrWaterfallStep } from './types';
import { WrWaterfallChart } from './waterfall-chart';

/** Running totals 400 / 700 / 600 / 400 / 400 on an axis from 0 to 800. */
const STEPS: readonly WrWaterfallStep[] = [
  { label: 'Opening', value: 400, total: true },
  { label: 'Sales', value: 300 },
  { label: 'Refunds', value: -100 },
  { label: 'Payroll', value: -200 },
  { label: 'Closing', value: 400, total: true },
];

@Component({
  imports: [WrWaterfallChart],
  template: `
    <wr-waterfall-chart
      [steps]="steps()"
      [showGrid]="showGrid()"
      [showAxis]="showAxis()"
      [showValues]="showValues()"
      [loading]="loading()"
      [error]="error()"
      [emptyLabel]="emptyLabel()"
      [loadingLabel]="loadingLabel()"
      [errorLabel]="errorLabel()"
      [dataTable]="dataTable()"
    />
  `,
})
class Host {
  readonly steps = signal<readonly WrWaterfallStep[]>(STEPS);
  readonly showGrid = signal(true);
  readonly showAxis = signal(true);
  readonly showValues = signal(false);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly emptyLabel = signal<string | null>(null);
  readonly loadingLabel = signal<string | null>(null);
  readonly errorLabel = signal<string | null>(null);
  readonly dataTable = signal(false);
}

@Component({ imports: [WrWaterfallChart], template: `<wr-waterfall-chart [steps]="steps" />` })
class DefaultHost {
  readonly steps = STEPS;
}

/**
 * The chart on the shared chart theme: the grid and the scale as two inputs, the figures
 * on request, the three states, one hover listener, and the DOM a bar is drawn with.
 * jsdom lays nothing out, so what is held here is the markup and the numbers handed to
 * the stylesheet; the rules themselves are read off the compiled sheet in the block after.
 */
describe('WrWaterfallChart on the chart theme', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-waterfall-chart')!;
  const all = <T extends Element = HTMLElement>(selector: string, from: ParentNode = root()): T[] => [
    ...from.querySelectorAll<T>(selector),
  ];
  const steps = (): HTMLElement[] => all('.wr-waterfall-chart__step');
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

  describe('grid, axis and values', () => {
    it('draws a grid and a scale by default, and prints no figure', () => {
      const plain = TestBed.createComponent(DefaultHost);
      plain.detectChanges();
      const el = plain.nativeElement as HTMLElement;

      expect(el.querySelectorAll('.wr-waterfall-chart__grid-line')).toHaveLength(5);
      expect(el.querySelectorAll('.wr-waterfall-chart__tick')).toHaveLength(5);
      expect(el.querySelectorAll('.wr-waterfall-chart__value')).toHaveLength(0);
      const classes = el.querySelector('wr-waterfall-chart')!.classList;
      expect(classes).toContain('wr-waterfall-chart--axis');
      expect(classes).not.toContain('wr-waterfall-chart--values');
      plain.destroy();
    });

    it('drops the grid and the scale each on its own, and keeps the zero line', () => {
      set(h => h.showGrid.set(false));
      expect(all('.wr-waterfall-chart__grid-line')).toHaveLength(0);
      expect(all('.wr-waterfall-chart__tick')).toHaveLength(5);
      expect(chart().classList).toContain('wr-waterfall-chart--axis');

      set(h => {
        h.showGrid.set(true);
        h.showAxis.set(false);
      });
      expect(all('.wr-waterfall-chart__grid-line')).toHaveLength(5);
      expect(root().querySelector('.wr-waterfall-chart__y-axis')).toBeNull();
      expect(chart().classList).not.toContain('wr-waterfall-chart--axis');
      expect(all('.wr-waterfall-chart__baseline')).toHaveLength(1);
    });

    it('prints the figures on request, each in a slot that carries it to the end of its bar', () => {
      set(h => h.showValues.set(true));

      expect(chart().classList).toContain('wr-waterfall-chart--values');
      expect(all('.wr-waterfall-chart__value-text').map(el => el.textContent.trim())).toEqual([
        '400',
        '+300',
        '−100',
        '−200',
        '400',
      ]);
      const slots = all('.wr-waterfall-chart__value-slot');
      expect(slots.map(slot => slot.classList.contains('wr-waterfall-chart__value-slot--below'))).toEqual([
        false,
        false,
        true,
        true,
        false,
      ]);
      // The line is the slot's only child, and the slot the step's.
      expect(slots.every(slot => slot.parentElement!.classList.contains('wr-waterfall-chart__step'))).toBe(true);
      expect(slots.every(slot => slot.firstElementChild!.classList.contains('wr-waterfall-chart__value'))).toBe(true);
    });
  });

  describe('the bars', () => {
    it('paints a total in the first palette colour, and a change in its status role', () => {
      expect(all('.wr-waterfall-chart__bar').map(bar => bar.style.background)).toEqual([
        'var(--wr-chart-1)',
        'var(--wr-color-success)',
        'var(--wr-color-danger)',
        'var(--wr-color-danger)',
        'var(--wr-chart-1)',
      ]);
    });

    it('draws a bar as a painted box inside the clip that cuts it, both in the step', () => {
      for (const step of steps()) {
        const clip = step.querySelector('.wr-waterfall-chart__clip')!;
        expect(clip.parentElement).toBe(step);
        expect(clip.children).toHaveLength(1);
        expect(clip.firstElementChild!.classList).toContain('wr-waterfall-chart__bar');
      }
    });

    it('writes the two ends of a rise, a fall and a total as shares of the drawing', () => {
      const ends = steps().map(step => [
        step.style.getPropertyValue('--wr-waterfall-chart-lo'),
        step.style.getPropertyValue('--wr-waterfall-chart-hi'),
      ]);
      expect(ends).toEqual([
        ['0', '50'],
        ['50', '87.5'],
        ['75', '87.5'],
        ['50', '75'],
        ['0', '50'],
      ]);
    });

    it('gives a step its kind, and the way it runs, in one class attribute', () => {
      const modifiers = (): string[] =>
        steps().map(step =>
          [...step.classList]
            .filter(name => name.startsWith('wr-waterfall-chart__step--'))
            .map(name => name.replace('wr-waterfall-chart__step--', ''))
            // A reused view keeps the classes it had in the order it got them.
            .sort((x, y) => Number(x === 'down') - Number(y === 'down'))
            .join(' ')
        );
      expect(modifiers()).toEqual(['total', 'increase', 'decrease down', 'decrease down', 'total']);
      expect(steps().every(step => step.classList.contains('wr-waterfall-chart__step'))).toBe(true);

      // A total below zero hangs from the zero line, so its rounded end is the lower one.
      set(h =>
        h.steps.set([
          { label: 'Up', value: 100 },
          { label: 'Down', value: -300 },
          { label: 'End', value: -200, total: true },
        ])
      );
      expect(modifiers()).toEqual(['increase', 'decrease down', 'total down']);
    });

    it('carries the running totals as one attribute, and none of the old ones', () => {
      expect(steps().map(step => step.getAttribute('data-step'))).toEqual([
        '0 400',
        '400 700',
        '700 600',
        '600 400',
        '400 400',
      ]);
      for (const step of steps()) {
        expect(step.hasAttribute('data-start')).toBe(false);
        expect(step.hasAttribute('data-end')).toBe(false);
      }
    });
  });

  describe('hover', () => {
    it('listens once for the whole chart, not on every step', () => {
      const added = vi.spyOn(EventTarget.prototype, 'addEventListener');
      const plain = TestBed.createComponent(DefaultHost);
      plain.detectChanges();

      const pointer = added.mock.calls
        .map(([type], index) => [type, added.mock.contexts[index]] as const)
        .filter(([type]) => type.startsWith('mouse'));
      const el = (plain.nativeElement as HTMLElement).querySelector('wr-waterfall-chart');
      expect(pointer.map(([type]) => type).sort()).toEqual(['mouseleave', 'mouseover']);
      expect(pointer.every(([, target]) => target === el)).toBe(true);
      plain.destroy();
    });

    it('tags every step with its index, which the one listener reads', () => {
      expect(steps().map(step => step.getAttribute('data-wr-index'))).toEqual(['0', '1', '2', '3', '4']);
    });

    it('marks the step under the pointer from anywhere inside it, and clears it on leaving the chart', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] });
      try {
        steps()[2]
          .querySelector('.wr-waterfall-chart__bar')!
          .dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        fixture.detectChanges();
        expect(steps().map(step => step.classList.contains('wr-waterfall-chart__step--active'))).toEqual([
          false,
          false,
          true,
          false,
          false,
        ]);
        // Still its kind: the one class binding holds both.
        expect(steps()[2].classList).toContain('wr-waterfall-chart__step--decrease');

        chart().dispatchEvent(new MouseEvent('mouseleave'));
        vi.advanceTimersByTime(500);
        fixture.detectChanges();
        expect(all('.wr-waterfall-chart__step--active')).toEqual([]);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('empty, loading and error', () => {
    const state = (): HTMLElement | null => root().querySelector('wr-chart-state');
    const frame = (): number[] => [
      all('.wr-waterfall-chart__grid-line').length,
      all('.wr-waterfall-chart__tick').length,
      all('.wr-waterfall-chart__baseline').length,
    ];

    it('shows nothing of the kind while there are steps to draw', () => {
      expect(state()).toBeNull();
    });

    it('keeps the frame and says "No data" with no step', () => {
      set(h => h.steps.set([]));

      expect(state()!.textContent.trim()).toBe('No data');
      expect(state()!.classList).toContain('wr-chart-state--empty');
      expect(state()!.parentElement!.classList).toContain('wr-waterfall-chart__track');
      expect(frame()).toEqual([5, 5, 1]);
      expect(root().querySelector<HTMLElement>('.wr-waterfall-chart__plot')!.style.height).toBe('240px');

      set(h => h.emptyLabel.set('No movements this quarter'));
      expect(state()!.textContent.trim()).toBe('No movements this quarter');
    });

    it('gives the bars way to the loading message, over the axis the chart had', () => {
      set(h => h.loading.set(true));

      expect(state()!.textContent.trim()).toBe('Loading…');
      expect(state()!.classList).toContain('wr-chart-state--loading');
      expect(steps()).toEqual([]);
      // The data's own axis, 0 to 800, and the names under it stay.
      expect(frame()).toEqual([5, 5, 1]);
      expect(all('.wr-waterfall-chart__tick')[0].textContent.trim()).toBe('800');
      expect(all('.wr-waterfall-chart__label')).toHaveLength(5);

      set(h => h.loadingLabel.set('Fetching the bridge'));
      expect(state()!.textContent.trim()).toBe('Fetching the bridge');

      set(h => h.loading.set(false));
      expect(state()).toBeNull();
      expect(steps()).toHaveLength(5);
    });

    it('says a load failed, as an alert, and puts loading over it', () => {
      set(h => h.error.set(true));

      expect(state()!.textContent.trim()).toBe('Could not load');
      expect(state()!.getAttribute('role')).toBe('alert');
      expect(steps()).toEqual([]);

      set(h => h.errorLabel.set('The bridge is unavailable'));
      expect(state()!.textContent.trim()).toBe('The bridge is unavailable');

      set(h => h.loading.set(true));
      expect(state()!.classList).toContain('wr-chart-state--loading');
    });

    it('draws no data table and opens no tooltip under a state', () => {
      set(h => h.dataTable.set(true));
      expect(all('.wr-chart-table')).toHaveLength(1);

      set(h => h.loading.set(true));
      expect(all('.wr-chart-table')).toEqual([]);
      expect(document.querySelector('.wr-chart-tooltip')).toBeNull();
    });
  });
});

describe('WrWaterfallChart stylesheet on the chart theme', { timeout: COMPILE_TIMEOUT }, () => {
  const css = (): string => compileSass(`@use 'charts/waterfall-chart/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const pattern = (selector: string): string => selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/, /g, ',\\s*');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)${pattern(selector)}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ?? '';

  it('points every hook that paints the frame at the shared chart token', () => {
    const block = rule('.wr-waterfall-chart');
    for (const [hook, token] of [
      ['grid-color', '--wr-chart-grid'],
      ['baseline-color', '--wr-chart-zero'],
      ['connector-color', '--wr-chart-axis'],
      ['flat-color', '--wr-chart-8'],
      ['tick-color', '--wr-chart-label'],
      ['tick-font-size', '--wr-chart-label-size'],
      ['value-color', '--wr-chart-label'],
      ['value-font-size', '--wr-chart-label-size'],
      ['label-color', '--wr-chart-label'],
      ['label-font-size', '--wr-chart-label-size'],
      ['active-bg', '--wr-chart-band'],
      ['gap', '--wr-chart-gap'],
      ['bar-radius', '--wr-chart-bar-radius'],
      ['duration', '--wr-chart-duration'],
    ]) {
      expect(block, hook).toContain(`--wr-waterfall-chart-${hook}: var(${token});`);
    }
  });

  it('draws the gridlines in the grid hook and the zero line in the stronger one', () => {
    expect(rule('.wr-waterfall-chart__grid-line')).toMatch(
      /border-block-start: 1px solid var\(--wr-waterfall-chart-grid-color\)/
    );
    expect(rule('.wr-waterfall-chart__baseline')).toMatch(
      /border-block-start: 1px solid var\(--wr-waterfall-chart-baseline-color\)/
    );
    expect(rule('.wr-waterfall-chart__step--active')).toMatch(
      /background-color: var\(--wr-waterfall-chart-active-bg\)/
    );
  });

  it('names no palette or status colour of its own: the inputs carry the three', () => {
    const own = css().slice(css().indexOf('.wr-waterfall-chart {'));
    expect(own).not.toMatch(/--wr-color-(success|danger|primary)/);
    expect(own).not.toMatch(/color-mix/);
  });

  it('moves a bar by two transforms, a clip up to its lower end and the paint down to its upper', () => {
    const clip = rule('.wr-waterfall-chart__clip');
    expect(clip).toMatch(/overflow: clip/);
    expect(clip).toMatch(/inset-block: 0/);
    expect(clip).toMatch(/transform: translateY\(calc\(var\(--wr-waterfall-chart-lo, 0\) \* -1%\)\)/);
    expect(clip).toMatch(/pointer-events: none/);

    const bar = rule('.wr-waterfall-chart__bar');
    expect(bar).toMatch(/inset: 0/);
    expect(bar).toMatch(
      /transform: translateY\(calc\(\(100 - \(var\(--wr-waterfall-chart-hi, 0\) - var\(--wr-waterfall-chart-lo, 0\)\)\) \* 1%\)\)/
    );
    expect(bar).toMatch(/forced-color-adjust: none/);
    for (const block of [clip, bar]) {
      expect(block).not.toMatch(/(?:^|\s)(?:height|bottom|top|min-height):/);
      expect(/transition:([^;]*);/.exec(block)?.[1].trim().split(' ')[0]).toBe('transform');
    }
    // A change of zero keeps a hairline, since its two ends are one level.
    expect(rule('.wr-waterfall-chart__step--flat .wr-waterfall-chart__bar')).toMatch(
      /transform: translateY\(calc\(100% - 1px\)\)/
    );
  });

  it('carries the figure and the connector by a transform too', () => {
    expect(rule('.wr-waterfall-chart__value-slot')).toMatch(
      /transform: translateY\(calc\(var\(--wr-waterfall-chart-hi, 0\) \* -1%\)\)/
    );
    expect(rule('.wr-waterfall-chart__value-slot--below')).toMatch(
      /transform: translateY\(calc\(var\(--wr-waterfall-chart-lo, 0\) \* -1%\)\)/
    );
    expect(rule('.wr-waterfall-chart__connector')).toMatch(
      /transform: translateY\(calc\(var\(--wr-waterfall-chart-level, 0\) \* -1% \+ var\(--wr-waterfall-chart-connector-width\) \/ 2\)\)/
    );
    expect(rule('.wr-waterfall-chart__value')).not.toMatch(/transition/);
  });

  it('transitions nothing a layout reads, anywhere in the sheet', () => {
    const transitions = [...css().matchAll(/transition:([^;]*);/g)].map(match => match[1]);
    expect(transitions.length).toBeGreaterThan(3);
    for (const value of transitions) {
      expect(value).not.toMatch(/\b(height|width|flex-grow|top|bottom|inset[a-z-]*|inline-size|block-size)\b/);
    }
    expect(css()).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.wr-waterfall-chart__step,\s*\.wr-waterfall-chart__clip,\s*\.wr-waterfall-chart__bar,\s*\.wr-waterfall-chart__value-slot,\s*\.wr-waterfall-chart__connector \{\s*transition: none;/
    );
  });

  it('rounds a bar on the end it runs to only', () => {
    const up = rule(
      '.wr-waterfall-chart__step--increase .wr-waterfall-chart__bar, .wr-waterfall-chart__step--total:not(.wr-waterfall-chart__step--down) .wr-waterfall-chart__bar'
    );
    expect(up).toMatch(/border-start-start-radius: var\(--wr-waterfall-chart-bar-radius\)/);
    expect(up).toMatch(/border-start-end-radius: var\(--wr-waterfall-chart-bar-radius\)/);
    expect(up).not.toMatch(/border-end-/);

    const down = rule('.wr-waterfall-chart__step--down .wr-waterfall-chart__clip');
    expect(down).toMatch(/border-end-start-radius: var\(--wr-waterfall-chart-bar-radius\)/);
    expect(down).toMatch(/border-end-end-radius: var\(--wr-waterfall-chart-bar-radius\)/);
    expect(down).not.toMatch(/border-start-/);

    expect(rule('.wr-waterfall-chart__bar')).not.toMatch(/border-radius/);
    expect(rule('.wr-waterfall-chart__clip')).not.toMatch(/border-radius/);
  });

  it('keeps room for the top of the scale whatever the tick hooks are set to', () => {
    expect(rule('.wr-waterfall-chart--axis .wr-waterfall-chart__body')).toMatch(
      /padding-block-start: max\(0px, var\(--wr-waterfall-chart-tick-line-height\) \/ 2 - var\(--wr-waterfall-chart-plot-inset-y\)\)/
    );
  });
});
