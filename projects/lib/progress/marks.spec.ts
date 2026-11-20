import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { compileSass } from '../spec-sass';

import { WrProgress } from './progress';
import type { WrProgressMark } from './types';

@Component({
  imports: [WrProgress],
  template: `<div [attr.dir]="dir()">
    <wr-progress [value]="40" [marks]="marks()" [indeterminate]="indeterminate()" />
  </div>`,
})
class Host {
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly indeterminate = signal(false);
  readonly marks = signal<readonly WrProgressMark[]>([
    { value: 25, label: '1 Mar' },
    { value: 50 },
    { value: 75, label: '1 Sep' },
  ]);
}

describe('WrProgress marks', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-progress')!;
  const ticks = (): HTMLElement[] => [...host().querySelectorAll<HTMLElement>('.wr-progress__mark')];
  const labels = (): HTMLElement[] => [...host().querySelectorAll<HTMLElement>('.wr-progress__mark-label')];
  /** A declaration read off the `style` ATTRIBUTE: what the component wrote, not what a sheet resolves. */
  const written = (el: HTMLElement, property: string): string | undefined =>
    new RegExp(`(?:^|;)\\s*${property}:\\s*([^;]+)`).exec(el.getAttribute('style') ?? '')?.[1].trim();

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('draws no mark and no modifier without marks', async () => {
    fixture.componentInstance.marks.set([]);
    await fixture.whenStable();

    expect(ticks()).toHaveLength(0);
    expect(labels()).toHaveLength(0);
    expect(host().className).toBe('wr-progress wr-progress--primary');
  });

  it('places a tick at each value, as a percentage from the inline start', () => {
    expect(ticks().map(tick => written(tick, 'inset-inline-start'))).toEqual(['25%', '50%', '75%']);
    expect(host().classList.contains('wr-progress--marks')).toBe(true);
  });

  it('renders the label of each mark that has one, as text', () => {
    expect(labels().map(label => label.textContent.trim())).toEqual(['1 Mar', '1 Sep']);
    expect(host().classList.contains('wr-progress--mark-labels')).toBe(true);
  });

  it('shares the room beside a label in its mark’s ratio, so it stays inside the bar', () => {
    expect(labels().map(label => written(label, 'grid-template-columns'))).toEqual([
      '25fr auto 75fr',
      '75fr auto 25fr',
    ]);
  });

  it('reserves room for labels only when a mark has one', async () => {
    fixture.componentInstance.marks.set([{ value: 10 }, { value: 90 }]);
    await fixture.whenStable();

    expect(ticks()).toHaveLength(2);
    expect(host().classList.contains('wr-progress--marks')).toBe(true);
    expect(host().classList.contains('wr-progress--mark-labels')).toBe(false);
  });

  it('drops a mark outside the range or with no number, and keeps both ends', async () => {
    fixture.componentInstance.marks.set([
      { value: 120, label: 'after' },
      { value: 100, label: 'end' },
      { value: Number.NaN, label: 'nowhere' },
      { value: -1, label: 'before' },
      { value: 0, label: 'start' },
    ]);
    await fixture.whenStable();

    expect(ticks().map(tick => written(tick, 'inset-inline-start'))).toEqual(['0%', '100%']);
    expect(labels().map(label => label.textContent.trim())).toEqual(['start', 'end']);
  });

  it('draws the marks in value order, whatever order they came in', async () => {
    fixture.componentInstance.marks.set([
      { value: 80, label: 'late' },
      { value: 20, label: 'early' },
    ]);
    await fixture.whenStable();

    expect(labels().map(label => label.textContent.trim())).toEqual(['early', 'late']);
  });

  it('mirrors under RTL by writing logical positions only', async () => {
    fixture.componentInstance.dir.set('rtl');
    await fixture.whenStable();

    expect(ticks().map(tick => written(tick, 'inset-inline-start'))).toEqual(['25%', '50%', '75%']);
    for (const el of [...ticks(), ...labels()]) {
      expect(el.getAttribute('style')).not.toMatch(/(?:^|;)\s*(?:left|right|transform|translate)\s*:/);
    }
  });

  it('leaves what the progressbar announces as it was', () => {
    expect(host().getAttribute('role')).toBe('progressbar');
    expect(host().getAttribute('aria-valuemin')).toBe('0');
    expect(host().getAttribute('aria-valuemax')).toBe('100');
    expect(host().getAttribute('aria-valuenow')).toBe('40');
    expect(host().getAttribute('aria-label')).toBe('Progress');
    expect(host().hasAttribute('aria-valuetext')).toBe(false);
    expect(host().querySelector<HTMLElement>('.wr-progress__bar')!.style.width).toBe('40%');
  });

  it('describes the progressbar with its mark labels, which ARIA would not read as content', () => {
    const ids = host().getAttribute('aria-describedby')!.split(' ');
    expect(ids).toHaveLength(labels().length);
    expect(ids.map(id => document.getElementById(id))).toEqual(labels());
  });

  it('hides the ticks from assistive tech and keeps the labels as plain text', () => {
    expect(ticks().every(tick => tick.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(ticks().length).toBeGreaterThan(0);
    expect(labels().some(label => label.hasAttribute('aria-hidden'))).toBe(false);
  });

  it('draws no marks while the value is unknown', async () => {
    fixture.componentInstance.indeterminate.set(true);
    await fixture.whenStable();

    expect(ticks()).toHaveLength(0);
    expect(labels()).toHaveLength(0);
    expect(host().className).not.toMatch(/wr-progress--mark/);
  });
});

/**
 * jsdom lays nothing out, so every rect is empty and no label is ever hidden above.
 * Here the text of each label is given a rect, which is the one thing the component
 * measures.
 */
describe('WrProgress mark labels that would touch', () => {
  const rects: Record<string, [left: number, right: number]> = {};

  beforeEach(() => {
    for (const key of Object.keys(rects)) delete rects[key];
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const [left, right] = (this.classList.contains('wr-progress__mark-text') && rects[this.textContent]) || [0, 0];
      return { left, right, width: right - left, top: 0, bottom: 0, height: 0, x: left, y: 0 } as DOMRect;
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => vi.restoreAllMocks());

  const hidden = (fixture: { nativeElement: unknown }): string[] =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('.wr-progress__mark-label--hidden')].map(label =>
      label.textContent.trim()
    );

  it('hides the later one, and judges the next against the last label still shown', async () => {
    Object.assign(rects, { a: [0, 40], b: [30, 70], c: [42, 80], d: [60, 100] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.marks.set(
      ['a', 'b', 'c', 'd'].map((label, index) => ({ value: 10 + index * 10, label }))
    );
    await fixture.whenStable();

    // `b` overlaps `a`; `c` is closer than the gap to `a`; `d` clears `a`, the last one shown.
    expect(hidden(fixture)).toEqual(['b', 'c']);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.wr-progress__mark')).toHaveLength(4);

    fixture.destroy();
  });

  it('judges overlap the same way when the labels run from the right', async () => {
    Object.assign(rects, { a: [60, 100], b: [30, 70], c: [0, 40] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.dir.set('rtl');
    fixture.componentInstance.marks.set(['a', 'b', 'c'].map((label, index) => ({ value: 10 + index * 10, label })));
    await fixture.whenStable();

    expect(hidden(fixture)).toEqual(['b']);

    fixture.destroy();
  });

  it('shows a label again once the marks leave it room', async () => {
    Object.assign(rects, { a: [0, 40], b: [30, 70] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.marks.set([
      { value: 10, label: 'a' },
      { value: 20, label: 'b' },
    ]);
    await fixture.whenStable();
    expect(hidden(fixture)).toEqual(['b']);

    fixture.componentInstance.marks.set([{ value: 20, label: 'b' }]);
    await fixture.whenStable();
    expect(hidden(fixture)).toEqual([]);

    fixture.destroy();
  });
});

/** What jsdom cannot show, read off the COMPILED sheet, as the forced-colors block in `progress.spec.ts` does. */
describe('WrProgress marks stylesheet', () => {
  const css = compileSass("@use 'progress/styles';").replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.()>:]/g, m => `\\${m}`)}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';

  it('defaults each mark hook to a role, space or type token', () => {
    const block = rule('.wr-progress');
    expect(block).toMatch(/--wr-progress-mark-color:\s*var\(--wr-color-on-surface\)/);
    expect(block).toMatch(/--wr-progress-mark-width:\s*2px/);
    expect(block).toMatch(/--wr-progress-mark-gap:\s*var\(--wr-space-xs\)/);
    expect(block).toMatch(/--wr-progress-mark-label-color:\s*var\(--wr-color-on-surface-muted\)/);
    expect(block).toMatch(/--wr-progress-mark-label-font-size:\s*var\(--wr-text-xs\)/);
  });

  it('stops clipping only when there are marks, so the sweep stays clipped', () => {
    expect(rule('.wr-progress')).toMatch(/overflow:\s*hidden/);
    expect(rule('.wr-progress--marks')).toMatch(/overflow:\s*visible/);
  });

  it('positions ticks and labels with logical properties only', () => {
    for (const selector of ['.wr-progress__mark', '.wr-progress__mark-label']) {
      expect(rule(selector)).not.toBe('');
      expect(rule(selector)).not.toMatch(/(?:^|[\s;])(?:left|right|margin-left|margin-right|transform)\s*:/);
    }
  });

  it('hides a crowded label without taking it out of the measurement', () => {
    expect(rule('.wr-progress__mark-label--hidden')).toMatch(/visibility:\s*hidden/);
    expect(rule('.wr-progress__mark-label--hidden')).not.toMatch(/display/);
  });

  it('paints the tick with a system colour under forced colors', () => {
    const forced = [...css.matchAll(/@media \(forced-colors: active\)\s*\{([\s\S]*?\})\s*\}/g)]
      .map(m => m[1])
      .join('\n');
    expect(forced).toMatch(/\.wr-progress__mark\s*\{[^}]*background:\s*CanvasText/);
  });
});
