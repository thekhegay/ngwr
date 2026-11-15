import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { WrBulletChart } from './bullet-chart';

@Component({
  imports: [WrBulletChart],
  template: `
    <wr-bullet-chart
      label="Revenue"
      [value]="value()"
      [target]="target()"
      [ranges]="[150, 225, 300]"
      [loading]="loading()"
      [error]="error()"
      [emptyLabel]="emptyLabel()"
    />
  `,
})
class Host {
  readonly value = signal<number | null>(270);
  readonly target = signal<number | null>(250);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly emptyLabel = signal<string | null>(null);
}

/**
 * The bullet on the shared chart theme: the one hover listener, the shared size observer
 * and the three states. The rules themselves are read off the compiled sheet in the block
 * after.
 */
describe('WrBulletChart on the chart theme', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const track = (): HTMLElement => root().querySelector<HTMLElement>('.wr-bullet-chart__track')!;
  const marks = (): number[] => [
    root().querySelectorAll('.wr-bullet-chart__range').length,
    root().querySelectorAll('.wr-bullet-chart__bar').length,
    root().querySelectorAll('.wr-bullet-chart__target').length,
  ];
  const state = (): HTMLElement | null => root().querySelector('wr-chart-state');
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
    vi.unstubAllGlobals();
  });

  it('listens for the pointer once, on the host, and reports the drawing as its one section', () => {
    const added = vi.spyOn(EventTarget.prototype, 'addEventListener');
    const plain = TestBed.createComponent(Host);
    plain.detectChanges();

    const el = (plain.nativeElement as HTMLElement).querySelector('wr-bullet-chart')!;
    const pointer = added.mock.calls
      .map(([type], index) => [type, added.mock.contexts[index] as EventTarget] as const)
      .filter(([type, target]) => type.startsWith('mouse') && target instanceof Node && el.contains(target));
    expect(pointer.map(([type]) => type).sort()).toEqual(['mouseleave', 'mouseover']);
    expect(pointer.every(([, target]) => target === el)).toBe(true);
    expect(track().getAttribute('data-wr-index')).toBe('0');
    plain.destroy();
  });

  it('measures every bullet on the page through one observer', async () => {
    const observers: Set<Element>[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private readonly targets = new Set<Element>();
        constructor() {
          observers.push(this.targets);
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
    );
    const fixtures = [TestBed.createComponent(Host), TestBed.createComponent(Host), TestBed.createComponent(Host)];
    for (const each of fixtures) {
      each.detectChanges();
      await each.whenStable();
    }

    // A table of bullets was an observer a row; the charts share one.
    expect(observers).toHaveLength(1);
    expect(observers[0].size).toBe(3);
    for (const each of fixtures) each.destroy();
    expect(observers[0].size).toBe(0);
  });

  describe('empty, loading and error', () => {
    it('shows nothing of the kind while there is a value or a target', () => {
      expect(state()).toBeNull();
      expect(marks()).toEqual([3, 1, 1]);

      // A missing value beside a target is still a reading: the marker and the bands stay.
      set(h => h.value.set(null));
      expect(state()).toBeNull();
      expect(marks()).toEqual([3, 0, 1]);
    });

    it('empties the track and says "No data" with neither a value nor a target', () => {
      set(h => {
        h.value.set(null);
        h.target.set(null);
      });
      expect(marks()).toEqual([0, 0, 0]);
      expect(state()!.textContent.trim()).toBe('No data');
      // Beside the image, never inside it: an `img` hides what it holds from a reader.
      expect(track().contains(state())).toBe(false);
      expect(state()!.parentElement!.classList).toContain('wr-bullet-chart__status');

      set(h => h.emptyLabel.set('Not reported'));
      expect(state()!.textContent.trim()).toBe('Not reported');
    });

    it('gives the marks way to the loading message, and to a failed load as an alert', () => {
      set(h => h.loading.set(true));
      expect(marks()).toEqual([0, 0, 0]);
      expect(state()!.getAttribute('role')).toBe('status');
      expect(state()!.textContent.trim()).toBe('Loading…');

      set(h => {
        h.loading.set(false);
        h.error.set(true);
      });
      expect(state()!.getAttribute('role')).toBe('alert');
    });
  });
});

describe('WrBulletChart stylesheet on the chart theme', { timeout: COMPILE_TIMEOUT }, () => {
  const css = (): string => compileSass(`@use 'charts/bullet-chart/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ??
    '';

  it('steps the bands down the sequential scale of the palette, on the track of the theme', () => {
    const block = rule('.wr-bullet-chart');
    expect(block).toMatch(/--wr-bullet-chart-range-start: var\(--wr-chart-seq-3\)/);
    expect(block).toMatch(/--wr-bullet-chart-range-end: var\(--wr-chart-seq-1\)/);
    expect(block).toMatch(/--wr-bullet-chart-track-color: var\(--wr-chart-track\)/);
    expect(block).toMatch(/--wr-bullet-chart-track-radius: var\(--wr-chart-bar-radius\)/);
  });

  it('points the labels, the ticks and the motion at the shared chart tokens', () => {
    const block = rule('.wr-bullet-chart');
    expect(block).toMatch(/--wr-bullet-chart-label-font-size: var\(--wr-chart-label-size\)/);
    expect(block).toMatch(/--wr-bullet-chart-sub-label-color: var\(--wr-chart-label\)/);
    expect(block).toMatch(/--wr-bullet-chart-tick-color: var\(--wr-chart-label\)/);
    expect(block).toMatch(/--wr-bullet-chart-tick-mark-color: var\(--wr-chart-axis\)/);
    expect(block).toMatch(/--wr-bullet-chart-duration: var\(--wr-chart-duration\)/);
  });

  it('parts two bands with a line in the separator', () => {
    expect(rule('.wr-bullet-chart')).toMatch(/--wr-bullet-chart-separator: var\(--wr-chart-separator\)/);
    expect(rule('.wr-bullet-chart__range:not(:last-child)')).toMatch(
      /border-inline-end: 1px solid var\(--wr-bullet-chart-separator\)/
    );
  });

  it('moves the bar and the marker by a transform, mirrored by hand under RTL', () => {
    const bar = rule('.wr-bullet-chart__bar');
    expect(bar).toMatch(
      /transform: translateX\(calc\(var\(--wr-bullet-chart-start, 0\) \* 100% \* var\(--wr-bullet-chart-dir\)\)\)\s+scaleX\(max\(var\(--wr-bullet-chart-size, 0\), 0\.004\)\)/
    );
    expect(bar).toMatch(/transition: transform var\(--wr-bullet-chart-duration\) var\(--wr-bullet-chart-ease\)/);
    expect(rule('.wr-bullet-chart__target')).toMatch(/transition: transform var\(--wr-bullet-chart-duration\)/);
    expect(rule('.wr-bullet-chart:dir(rtl)')).toMatch(/--wr-bullet-chart-dir: -1/);
    expect(rule('.wr-bullet-chart__bar:dir(rtl)')).toMatch(/transform-origin: 100% 50%/);
  });

  it('transitions nothing a layout reads', () => {
    const transitions = [...css().matchAll(/\.wr-bullet-chart[^{]*\{[^}]*transition: ([^;]+);/g)].map(m => m[1]);
    expect(transitions.length).toBeGreaterThan(0);
    for (const transition of transitions) expect(transition).toMatch(/^(transform|opacity) /);
  });
});
