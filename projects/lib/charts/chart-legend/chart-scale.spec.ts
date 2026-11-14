import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { WrChartScale } from './chart-scale';
import type { WrChartLegendPosition } from './types';

@Component({
  imports: [WrChartScale],
  template: `
    <wr-chart-scale [steps]="steps()" [minLabel]="min()" [maxLabel]="max()" [position]="position()" [block]="block()">
      <span class="extra">No data</span>
    </wr-chart-scale>
  `,
})
class Host {
  readonly steps = signal<readonly string[]>([
    'var(--wr-chart-seq-1)',
    'var(--wr-chart-seq-3)',
    'var(--wr-chart-seq-5)',
  ]);
  readonly min = signal<string | null>('0');
  readonly max = signal<string | null>('120');
  readonly position = signal<WrChartLegendPosition>('bottom');
  readonly block = signal<string | null>(null);
}

/** The key of a colour scale, which the heatmap and the calendar heatmap draw in a legend's place. */
describe('WrChartScale', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const key = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-chart-scale')!;
  const steps = (): HTMLElement[] => [...key().querySelectorAll<HTMLElement>('.wr-chart-scale__step')];
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

  it('draws the steps lowest first between the two ends, then whatever the chart adds', () => {
    expect([...key().children].map(child => child.className)).toEqual([
      'wr-chart-scale__label',
      'wr-chart-scale__ramp',
      'wr-chart-scale__label',
      'extra',
    ]);
    expect(steps().map(step => step.style.background)).toEqual([
      'var(--wr-chart-seq-1)',
      'var(--wr-chart-seq-3)',
      'var(--wr-chart-seq-5)',
    ]);
    expect([...key().querySelectorAll('.wr-chart-scale__label')].map(label => label.textContent.trim())).toEqual([
      '0',
      '120',
    ]);
  });

  it('writes no label for an end with none, and no ramp with no step', () => {
    set(h => {
      h.max.set(null);
      h.steps.set([]);
    });
    expect([...key().children].map(child => child.className)).toEqual(['wr-chart-scale__label', 'extra']);
  });

  it('takes the position a legend takes', () => {
    expect(key().classList).toContain('wr-chart-scale--bottom');
    set(h => h.position.set('end'));
    expect([...key().classList].sort()).toEqual(['wr-chart-scale', 'wr-chart-scale--end']);
    set(h => h.position.set('none'));
    expect(key().classList).toContain('wr-chart-scale--none');
  });

  it("adds the host chart's own classes to its parts on request", () => {
    expect(steps()[0].className).toBe('wr-chart-scale__step');
    set(h => h.block.set('wr-demo-chart'));
    expect(steps()[0].classList).toContain('wr-demo-chart__swatch');
    expect(key().querySelector('.wr-chart-scale__ramp')!.classList).toContain('wr-demo-chart__scale');
    expect(key().querySelector('.wr-chart-scale__label')!.classList).toContain('wr-demo-chart__legend-label');
  });
});

describe('WrChartScale stylesheet', { timeout: COMPILE_TIMEOUT }, () => {
  const css = (): string => compileSass(`@use 'charts/chart-legend/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ??
    '';

  it('keeps a step its paint under forced colors, and edges it so a faint step still reads', () => {
    const step = rule('.wr-chart-scale__step');
    expect(step).toMatch(/forced-color-adjust: none/);
    expect(step).toMatch(/box-shadow: inset 0 0 0 1px var\(--wr-chart-scale-step-edge\)/);
    expect(step).toMatch(/border-radius: var\(--wr-chart-scale-step-radius\)/);
  });

  it('keeps the room a legend keeps from its chart, on whichever side it sits', () => {
    expect(rule(':where(.wr-chart--legend) > .wr-chart-scale--bottom')).toMatch(
      /margin-block-start: var\(--wr-chart-legend-space, var\(--wr-space-md\)\)/
    );
    expect(rule(':where(.wr-chart--legend) > .wr-chart-scale--end')).toMatch(/margin-inline-start:/);
    expect(rule('.wr-chart-scale--none')).toMatch(/display: none/);
  });
});
