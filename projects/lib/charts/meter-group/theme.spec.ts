import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrChartLegendPosition } from 'ngwr/charts/chart-legend';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { WrMeterGroup } from './meter-group';
import type { WrMeterSegment } from './types';

const SEGMENTS: readonly WrMeterSegment[] = [
  { label: 'Apps', value: 30 },
  { label: 'Media', value: 50 },
  { label: 'Free', value: 20 },
];

@Component({
  imports: [WrMeterGroup],
  template: `
    <wr-meter-group
      [segments]="segments()"
      [max]="max()"
      [showLegend]="showLegend()"
      [legendPosition]="legendPosition()"
      [loading]="loading()"
      [error]="error()"
      [emptyLabel]="emptyLabel()"
    />
  `,
})
class Host {
  readonly segments = signal<readonly WrMeterSegment[]>(SEGMENTS);
  readonly max = signal(0);
  readonly showLegend = signal<boolean | 'auto'>(true);
  readonly legendPosition = signal<WrChartLegendPosition>('bottom');
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly emptyLabel = signal<string | null>(null);
}

/**
 * The meter on the shared chart theme: the palette, bands whose length is a transform,
 * the one hover listener, the legend's position and the three states. The rules
 * themselves are read off the compiled sheet in the block after.
 */
describe('WrMeterGroup on the chart theme', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-meter-group')!;
  const bar = (): HTMLElement => root().querySelector<HTMLElement>('.wr-meter-group__bar')!;
  const bands = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-meter-group__slice')];
  const legend = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-meter-group__legend');
  const prop = (name: string): string[] => bands().map(band => band.style.getPropertyValue(name));
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

  it('paints each segment solid in the next colour of the chart palette', () => {
    expect(bands().map(band => band.style.background)).toEqual([
      'var(--wr-chart-1)',
      'var(--wr-chart-2)',
      'var(--wr-chart-3)',
    ]);
  });

  it('writes a band as where it ends and its share, never as a width, and piles the first on top', () => {
    expect(prop('--wr-meter-group-slice-size')).toEqual(['0.3', '0.5', '0.2']);
    expect(prop('--wr-meter-group-slice-end')).toEqual(['0.3', '0.8', '1']);
    expect(bands().map(band => band.style.width)).toEqual(['', '', '']);
    expect(bands().map(band => band.style.zIndex)).toEqual(['3', '2', '1']);

    // Against a capacity the bands end short of the bar, and the rest is track.
    set(h => h.max.set(200));
    expect(prop('--wr-meter-group-slice-end')).toEqual(['0.15', '0.4', '0.5']);
  });

  describe('hover', () => {
    it('listens once for the whole meter, not on every band', () => {
      const added = vi.spyOn(EventTarget.prototype, 'addEventListener');
      const plain = TestBed.createComponent(Host);
      plain.detectChanges();

      const el = (plain.nativeElement as HTMLElement).querySelector('wr-meter-group')!;
      const pointer = added.mock.calls
        .map(([type], index) => [type, added.mock.contexts[index] as EventTarget] as const)
        .filter(([type, target]) => type.startsWith('mouse') && target instanceof Node && el.contains(target));
      expect(pointer.map(([type]) => type).sort()).toEqual(['mouseleave', 'mouseover']);
      expect(pointer.every(([, target]) => target === el)).toBe(true);
      plain.destroy();
    });

    it('dims the other bands from a band or from its legend row', () => {
      bands()[1].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      expect(chart().classList).toContain('wr-chart--dim');
      expect(bands().map(band => band.classList.contains('wr-chart-mark--on'))).toEqual([false, true, false]);

      root()
        .querySelectorAll('.wr-chart-legend__item')[2]
        .dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      expect(bands().map(band => band.classList.contains('wr-chart-mark--on'))).toEqual([false, false, true]);

      chart().dispatchEvent(new MouseEvent('mouseleave'));
      expect(chart().classList).not.toContain('wr-chart--dim');
    });

    it('points the tooltip at the part of the bar a band shows, not at its whole box', () => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        return this.classList.contains('cdk-overlay-pane') ? new DOMRect(0, 0, 80, 40) : new DOMRect(100, 50, 400, 10);
      });
      bands()[1].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      fixture.detectChanges();

      // The bar is 400 px from x 100, and Media runs from 30% to 80% of it: 220 to 420.
      const pane = document.querySelector<HTMLElement>('.cdk-overlay-pane')!;
      expect(document.querySelector('.wr-chart-tooltip__label')!.textContent.trim()).toBe('Media');
      expect(Number.parseFloat(pane.style.left) + 40).toBeCloseTo(320, 3);
    });
  });

  describe('legend', () => {
    it('sits below the bar by default, after it in the DOM', () => {
      expect(chart().classList).toContain('wr-chart--legend');
      expect(legend()!.classList).toContain('wr-chart-legend--bottom');
      expect(legend()!.previousElementSibling).toBe(bar());
    });

    it('moves with `legendPosition`, beside the bar at start and end', () => {
      set(h => h.legendPosition.set('top'));
      expect(legend()!.nextElementSibling).toBe(bar());
      expect(chart().classList).not.toContain('wr-chart--legend-side');

      set(h => h.legendPosition.set('end'));
      expect(legend()!.previousElementSibling).toBe(bar());
      expect(chart().classList).toContain('wr-chart--legend-side');

      set(h => h.legendPosition.set('none'));
      expect(legend()).toBeNull();
    });

    it('keeps the legend for one segment, and leaves it out under `auto`', () => {
      set(h => h.segments.set([{ label: 'Used', value: 60 }]));
      expect(legend()).not.toBeNull();

      set(h => h.showLegend.set('auto'));
      expect(legend()).toBeNull();
    });
  });

  describe('empty, loading and error', () => {
    const state = (): HTMLElement | null => root().querySelector('wr-chart-state');

    it('shows nothing of the kind while there are segments to draw', () => {
      expect(state()).toBeNull();
    });

    it('keeps the empty track and says "No data" under it when there is no segment', () => {
      set(h => h.segments.set([]));
      expect(bar()).not.toBeNull();
      expect(bands()).toHaveLength(0);
      expect(state()!.textContent.trim()).toBe('No data');
      expect(state()!.parentElement!.classList).toContain('wr-meter-group__status');

      set(h => h.emptyLabel.set('Nothing stored'));
      expect(state()!.textContent.trim()).toBe('Nothing stored');
    });

    it('empties the bar for the loading message, and for a failed load as an alert', () => {
      set(h => h.loading.set(true));
      expect(bands()).toHaveLength(0);
      expect(legend()).toBeNull();
      expect(state()!.getAttribute('role')).toBe('status');

      set(h => {
        h.loading.set(false);
        h.error.set(true);
      });
      expect(state()!.getAttribute('role')).toBe('alert');
    });
  });
});

describe('WrMeterGroup stylesheet on the chart theme', { timeout: COMPILE_TIMEOUT }, () => {
  const css = (): string => compileSass(`@use 'charts/meter-group/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ??
    '';

  it('points its hooks at the shared chart tokens', () => {
    const block = rule('.wr-meter-group');
    expect(block).toMatch(/--wr-meter-group-bar-radius: var\(--wr-chart-bar-radius\)/);
    expect(block).toMatch(/--wr-meter-group-track-bg: var\(--wr-chart-track\)/);
    expect(block).toMatch(/--wr-meter-group-separator: var\(--wr-chart-separator\)/);
    expect(block).toMatch(/--wr-meter-group-slice-gap: 1px/);
    expect(block).toMatch(/--wr-meter-group-duration: var\(--wr-chart-duration\)/);
  });

  it('parts two bands with a line in the separator, on the end edge of each but the last', () => {
    expect(rule('.wr-meter-group__slice')).toMatch(
      /border-inline-end: var\(--wr-meter-group-slice-gap\) solid var\(--wr-meter-group-separator\)/
    );
    expect(rule('.wr-meter-group__slice:last-of-type')).toMatch(/border-inline-end: 0/);
  });

  it('moves a band by a transform, mirrored by hand under RTL since a transform is physical', () => {
    const slice = rule('.wr-meter-group__slice');
    expect(slice).toMatch(
      /transform: translateX\(calc\(\(var\(--wr-meter-group-slice-end, 1\) - 1\) \* 100% \* var\(--wr-meter-group-dir\)\)\)/
    );
    expect(slice).toMatch(/transition: transform var\(--wr-meter-group-duration\) var\(--wr-meter-group-ease\)/);
    expect(rule('.wr-meter-group:dir(rtl)')).toMatch(/--wr-meter-group-dir: -1/);
  });

  it('dims a band with a veil rather than its opacity, which would show the next band through it', () => {
    expect(rule('.wr-meter-group__slice')).toMatch(/opacity: 1/);
    const veil = rule('.wr-chart--dim .wr-meter-group__slice:not(.wr-chart-mark--on)::after');
    expect(veil).toMatch(/opacity: calc\(1 - var\(--wr-chart-dim\)\)/);
  });

  it('transitions nothing a layout reads', () => {
    const transitions = [...css().matchAll(/\.wr-meter-group[^{]*\{[^}]*transition: ([^;]+);/g)].map(m => m[1]);
    expect(transitions.length).toBeGreaterThan(0);
    for (const transition of transitions) expect(transition).toMatch(/^(transform|opacity) /);
  });
});
