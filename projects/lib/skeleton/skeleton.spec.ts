import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrColor } from 'ngwr/theme';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { compileSass } from '../spec-sass';

import { WrSkeleton } from './skeleton';

@Component({
  imports: [WrSkeleton],
  template: `<wr-skeleton [color]="color()" [animated]="animated()" [lines]="lines()" />`,
})
class Host {
  readonly color = signal<WrColor | null>(null);
  readonly animated = signal(true);
  readonly lines = signal(0);
}

/**
 * A placeholder with no content, so everything it says it says through attributes:
 * `aria-busy` marks the region as loading, and the shimmer is a class the theme
 * animates (and disables under `prefers-reduced-motion`, which lives in the SCSS).
 */
describe('WrSkeleton', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-skeleton')!;
  /** Sorted class set — DOM class order is the binding's diff order, not the
   * order the component wrote. */
  const classes = (): string[] => [...host().classList].sort();

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('announces itself as busy', () => {
    expect(host().getAttribute('aria-busy')).toBe('true');
    expect(host().getAttribute('aria-live')).toBe('polite');
  });

  it('carries the colour and the shimmer by default', () => {
    expect(classes()).toEqual(['wr-skeleton', 'wr-skeleton--animated']);
  });

  it('drops the shimmer when asked', () => {
    fixture.componentInstance.animated.set(false);
    fixture.detectChanges();

    expect(classes()).toEqual(['wr-skeleton']);
  });

  it('names every intent', () => {
    for (const color of ['primary', 'success', 'danger'] as const) {
      fixture.componentInstance.color.set(color);
      fixture.detectChanges();
      expect(host().className).toContain(`wr-skeleton--${color}`);
    }
  });

  it('renders nothing inside itself', () => {
    // The box is the placeholder; anything in it would be read out as content
    // that is not there yet. The one node allowed is the `@for` anchor comment,
    // which `lines` leaves behind and nothing reads.
    expect(host().children.length).toBe(0);
    expect(host().textContent).toBe('');
  });

  it('draws one empty line per `lines`, and says nothing more for it', () => {
    fixture.componentInstance.lines.set(3);
    fixture.detectChanges();

    const lines = host().querySelectorAll('.wr-skeleton__line');
    expect(lines.length).toBe(3);
    expect(classes()).toEqual(['wr-skeleton', 'wr-skeleton--animated', 'wr-skeleton--lines']);
    // The host is the one thing a screen reader hears: every line is an empty
    // box with no role, no live attribute and no text.
    for (const line of lines) {
      expect(line.childNodes.length).toBe(0);
      expect(line.attributes.length).toBe(1);
    }
    expect(host().getAttribute('aria-busy')).toBe('true');
  });

  it('goes back to the one block when `lines` is cleared', () => {
    fixture.componentInstance.lines.set(2);
    fixture.detectChanges();
    fixture.componentInstance.lines.set(0);
    fixture.detectChanges();

    expect(host().children.length).toBe(0);
    expect(classes()).toEqual(['wr-skeleton', 'wr-skeleton--animated']);
  });
});

/**
 * What the stylesheet promises that jsdom cannot show — it has no cascade from a
 * sheet and no forced-colors mode — held against the COMPILED CSS. That each rule
 * then paints what it says was measured in Chromium with `forcedColors: 'active'`.
 * `sass` is resolved through `@angular/build`, as `theme/sass-entry.spec.ts` does.
 */
describe('WrSkeleton under forced colors', () => {
  const css = compileSass("@use 'skeleton/styles';").replace(/\/\*[\s\S]*?\*\//g, '');
  /** The `@media (forced-colors: active)` blocks, joined. */
  const forced = [...css.matchAll(/@media \(forced-colors: active\)\s*\{([\s\S]*?\})\s*\}/g)].map(m => m[1]).join('\n');
  /** The declarations of the rule whose selector is exactly `selector`, in `source`. */
  const rule = (source: string, selector: string): string =>
    new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.()>:]/g, m => `\\${m}`)}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? '';

  it('keeps the placeholder visible, intents included', () => {
    expect(rule(forced, '.wr-skeleton')).toMatch(/background:\s*GrayText/);
    // After every intent modifier, which it ties on specificity.
    expect(css.lastIndexOf('@media (forced-colors: active)')).toBeGreaterThan(css.lastIndexOf('.wr-skeleton--info {'));
  });

  it('keeps every line visible, and paints nothing behind them', () => {
    expect(rule(forced, '.wr-skeleton__line')).toMatch(/background:\s*GrayText/);
    expect(rule(forced, '.wr-skeleton--lines')).toMatch(/background:\s*none/);
  });
});
