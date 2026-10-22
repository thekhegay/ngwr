import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrColor } from 'ngwr/theme';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSkeleton } from './skeleton';

@Component({
  imports: [WrSkeleton],
  template: `<wr-skeleton [color]="color()" [animated]="animated()" />`,
})
class Host {
  readonly color = signal<WrColor | null>(null);
  readonly animated = signal(true);
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
    // that is not there yet.
    expect(host().childNodes.length).toBe(0);
  });
});

/**
 * What the stylesheet promises that jsdom cannot show — it has no cascade from a
 * sheet and no forced-colors mode — held against the COMPILED CSS. That each rule
 * then paints what it says was measured in Chromium with `forcedColors: 'active'`.
 * `sass` is resolved through `@angular/build`, as `theme/sass-entry.spec.ts` does.
 */
describe('WrSkeleton under forced colors', () => {
  interface Sass {
    compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
  }
  const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;
  const css = sass
    .compileString("@use 'skeleton/styles';", { loadPaths: [join(process.cwd(), 'projects/lib')], style: 'expanded' })
    .css.replace(/\/\*[\s\S]*?\*\//g, '');
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
});
