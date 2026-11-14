import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { WrFunnelChart } from './funnel-chart';
import type { WrFunnelStage } from './types';

const STAGES: readonly WrFunnelStage[] = [
  { label: 'Visited', value: 1000 },
  { label: 'Signed up', value: 400 },
  { label: 'Paid', value: 0 },
];

@Component({
  imports: [WrFunnelChart],
  template: `
    <wr-funnel-chart
      [stages]="stages()"
      [loading]="loading()"
      [error]="error()"
      [emptyLabel]="emptyLabel()"
      [errorLabel]="errorLabel()"
    />
  `,
})
class Host {
  readonly stages = signal<readonly WrFunnelStage[]>(STAGES);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly emptyLabel = signal<string | null>(null);
  readonly errorLabel = signal<string | null>(null);
}

/**
 * The funnel on the shared chart theme: the palette's first colour, bars whose length is a
 * transform, the one hover listener, and the three states. The rules themselves are read
 * off the compiled sheet in the block after.
 */
describe('WrFunnelChart on the chart theme', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-funnel-chart')!;
  const stages = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-funnel-chart__stage')];
  const bars = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-funnel-chart__bar')];
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

  it('paints every stage in the first colour of the chart palette', () => {
    expect(bars().map(bar => bar.style.background)).toEqual([
      'var(--wr-chart-1)',
      'var(--wr-chart-1)',
      'var(--wr-chart-1)',
    ]);
  });

  it('writes a bar as a share of the track to scale to, never as a width', () => {
    expect(bars().map(bar => bar.style.getPropertyValue('--wr-funnel-chart-bar-scale'))).toEqual(['1', '0.4', '0']);
    expect(bars().map(bar => bar.style.width)).toEqual(['', '', '']);
    // Zero is a hairline of its own, since a scale of nothing draws nothing.
    expect(bars().map(bar => bar.classList.contains('wr-funnel-chart__bar--hairline'))).toEqual([false, false, true]);
  });

  describe('hover', () => {
    it('listens once for the whole chart, not on every stage', () => {
      const added = vi.spyOn(EventTarget.prototype, 'addEventListener');
      const plain = TestBed.createComponent(Host);
      plain.detectChanges();

      const el = (plain.nativeElement as HTMLElement).querySelector('wr-funnel-chart')!;
      const pointer = added.mock.calls
        .map(([type], index) => [type, added.mock.contexts[index] as EventTarget] as const)
        .filter(([type, target]) => type.startsWith('mouse') && target instanceof Node && el.contains(target));
      expect(pointer.map(([type]) => type).sort()).toEqual(['mouseleave', 'mouseover']);
      expect(pointer.every(([, target]) => target === el)).toBe(true);
      plain.destroy();
    });

    it('dims the other stages while the pointer is on one', () => {
      expect(stages().map(stage => stage.getAttribute('data-wr-index'))).toEqual(['0', '1', '2']);
      bars()[1].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      expect(chart().classList).toContain('wr-chart--dim');
      expect(stages().map(stage => stage.classList.contains('wr-chart-mark--on'))).toEqual([false, true, false]);

      chart().dispatchEvent(new MouseEvent('mouseleave'));
      expect(chart().classList).not.toContain('wr-chart--dim');
    });
  });

  describe('empty, loading and error', () => {
    const state = (): HTMLElement | null => root().querySelector('wr-chart-state');
    const plot = (): HTMLElement => root().querySelector<HTMLElement>('.wr-funnel-chart__plot')!;

    it('shows nothing of the kind while there are stages to draw', () => {
      expect(state()).toBeNull();
      expect(plot().classList).not.toContain('wr-funnel-chart__plot--idle');
    });

    it('keeps a box and says "No data" when there is no stage', () => {
      set(h => h.stages.set([]));
      expect(state()!.textContent.trim()).toBe('No data');
      expect(state()!.parentElement).toBe(plot());
      expect(plot().classList).toContain('wr-funnel-chart__plot--idle');

      set(h => h.emptyLabel.set('No visits yet'));
      expect(state()!.textContent.trim()).toBe('No visits yet');
    });

    it('gives the stages way to the loading message, and to a failed load as an alert', () => {
      set(h => h.loading.set(true));
      expect(stages()).toHaveLength(0);
      expect(state()!.getAttribute('role')).toBe('status');

      set(h => {
        h.loading.set(false);
        h.error.set(true);
        h.errorLabel.set('Funnel is unavailable');
      });
      expect(state()!.getAttribute('role')).toBe('alert');
      expect(state()!.textContent.trim()).toBe('Funnel is unavailable');
    });
  });
});

describe('WrFunnelChart stylesheet on the chart theme', { timeout: COMPILE_TIMEOUT }, () => {
  const css = (): string => compileSass(`@use 'charts/funnel-chart/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ??
    '';

  it('points its hooks at the shared chart tokens', () => {
    const block = rule('.wr-funnel-chart');
    expect(block).toMatch(/--wr-funnel-chart-bar-radius: var\(--wr-chart-bar-radius\)/);
    expect(block).toMatch(/--wr-funnel-chart-label-font-size: var\(--wr-chart-label-size\)/);
    expect(block).toMatch(/--wr-funnel-chart-label-color: var\(--wr-chart-label\)/);
    expect(block).toMatch(/--wr-funnel-chart-conversion-color: var\(--wr-chart-label\)/);
    expect(block).toMatch(/--wr-funnel-chart-active-bg: var\(--wr-chart-band\)/);
    expect(block).toMatch(/--wr-funnel-chart-duration: var\(--wr-chart-duration\)/);
  });

  it('fills the band between two bars with the track, whole, and the share on a chip of the surface', () => {
    const block = rule('.wr-funnel-chart');
    expect(block).toMatch(/--wr-funnel-chart-band-bg: var\(--wr-chart-track\)/);
    expect(block).toMatch(/--wr-funnel-chart-band-opacity: 1;/);
    expect(block).toMatch(/--wr-funnel-chart-gap-label-bg: var\(--wr-chart-separator\)/);
    expect(rule('.wr-funnel-chart__band')).toMatch(/background: var\(--wr-funnel-chart-band-bg\)/);
  });

  it('moves a bar by a transform, with corners that keep their round at any length', () => {
    const bar = rule('.wr-funnel-chart__bar');
    expect(bar).toMatch(/transform: scaleX\(max\(var\(--wr-funnel-chart-bar-scale, 1\), 0\.004\)\)/);
    expect(bar).toMatch(/transition: transform var\(--wr-funnel-chart-duration\) var\(--wr-funnel-chart-ease\)/);
    expect(bar).toMatch(
      /border-radius: calc\(var\(--wr-funnel-chart-bar-radius\) \/ max\(var\(--wr-funnel-chart-bar-scale, 1\), 0\.004\)\)/
    );
    expect(css()).toMatch(
      /@starting-style\s*\{\s*\.wr-funnel-chart__bar:not\(\.wr-funnel-chart__bar--hairline\)\s*\{\s*transform: scaleX\(0\)/
    );
  });

  it('transitions nothing a layout reads', () => {
    const transitions = [...css().matchAll(/\.wr-funnel-chart[^{]*\{[^}]*transition: ([^;]+);/g)].map(m => m[1]);
    expect(transitions.length).toBeGreaterThan(0);
    for (const transition of transitions) expect(transition).toMatch(/^(transform|opacity) /);
  });
});
