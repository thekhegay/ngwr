import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTimeline } from './timeline';
import { WrTimelineItem } from './timeline-item';
import type { WrTimelineColor } from './types';

@Component({
  imports: [WrTimeline, WrTimelineItem],
  template: `
    <wr-timeline [orientation]="orientation()">
      <wr-timeline-item title="Created" time="09:00" [color]="color()">Opened the ticket</wr-timeline-item>
      <wr-timeline-item title="Closed">Shipped</wr-timeline-item>
    </wr-timeline>
  `,
})
class Host {
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly color = signal<WrTimelineColor>('primary');
}

describe('WrTimeline', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-timeline')!;
  const items = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('wr-timeline-item')];

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('carries its orientation, always as a modifier', () => {
    // Both directions are named, unlike most modifiers here: the layout differs
    // enough that neither is a no-op default.
    expect(host().className).toBe('wr-timeline wr-timeline--vertical');

    fixture.componentInstance.orientation.set('horizontal');
    fixture.detectChanges();
    expect(host().className).toBe('wr-timeline wr-timeline--horizontal');
  });

  it('renders each event with its time, title and content', () => {
    const first = items()[0];
    expect(first.querySelector('.wr-timeline-item__time')!.textContent.trim()).toBe('09:00');
    expect(first.querySelector('.wr-timeline-item__title')!.textContent.trim()).toBe('Created');
    expect(first.querySelector('.wr-timeline-item__content')!.textContent.trim()).toBe('Opened the ticket');
  });

  it('drops the header lines it was not given', () => {
    const second = items()[1];
    expect(second.querySelector('.wr-timeline-item__time')).toBeNull();
    expect(second.querySelector('.wr-timeline-item__title')).not.toBeNull();
  });

  it('colours each dot and keeps it out of the accessible tree', () => {
    expect(items()[0].className).toBe('wr-timeline-item wr-timeline-item--primary');
    expect(items()[1].className).toBe('wr-timeline-item wr-timeline-item--primary');

    fixture.componentInstance.color.set('success');
    fixture.detectChanges();
    expect(items()[0].className).toContain('wr-timeline-item--success');

    // The dot is drawn by CSS on an empty span — nothing to announce.
    expect(items()[0].querySelector('.wr-timeline-item__dot')!.getAttribute('aria-hidden')).toBe('true');
  });
});

/**
 * What the stylesheet promises that jsdom cannot show — it has no cascade from a
 * sheet and no forced-colors mode — held against the COMPILED CSS. That each rule
 * then paints what it says was measured in Chromium with `forcedColors: 'active'`.
 * `sass` is resolved through `@angular/build`, as `theme/sass-entry.spec.ts` does.
 */
describe('WrTimeline under forced colors', () => {
  interface Sass {
    compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
  }
  const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;
  const css = sass
    .compileString("@use 'timeline/styles';", { loadPaths: [join(process.cwd(), 'projects/lib')], style: 'expanded' })
    .css.replace(/\/\*[\s\S]*?\*\//g, '');
  /** The `@media (forced-colors: active)` blocks, joined. */
  const forced = [...css.matchAll(/@media \(forced-colors: active\)\s*\{([\s\S]*?\})\s*\}/g)].map(m => m[1]).join('\n');
  /** The declarations of the rule whose selector is exactly `selector`, in `source`. */
  const rule = (source: string, selector: string): string =>
    new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.()>:]/g, m => `\\${m}`)}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? '';

  it('keeps every dot silhouette and the connector, outweighing the rules that paint them', () => {
    // The intents paint the dot from `.wr-timeline-item--x .wr-timeline-item__dot`, so
    // a bare `.wr-timeline-item__dot` would lose to them and the dot would vanish.
    expect(rule(forced, '.wr-timeline-item .wr-timeline-item__dot')).toMatch(/background:\s*CanvasText/);
    // The hollow ring is a box-shadow, which forced colors drops.
    expect(rule(forced, '.wr-timeline-item--neutral .wr-timeline-item__dot')).toMatch(
      /outline:\s*2px solid CanvasText/
    );
    expect(rule(forced, '.wr-timeline .wr-timeline-item::before')).toMatch(/background:\s*CanvasText/);
  });
});
