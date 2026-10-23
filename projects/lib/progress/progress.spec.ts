import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import type { WrColor } from 'ngwr/theme';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrProgress } from './progress';

@Component({
  imports: [WrProgress],
  template: `<wr-progress [value]="value()" [color]="color()" [ariaLabel]="ariaLabel()" />`,
})
class Host {
  readonly value = signal(42);
  readonly color = signal<WrColor>('primary');
  readonly ariaLabel = signal<string | null>(null);
}

/**
 * No defect was found here — this pins a contract that was already right, which is worth
 * doing precisely because it is easy to break: the bar's width and `aria-valuenow` are the
 * same number, and a change that clamps one without the other shows a filled bar reading 300.
 */
describe('WrProgress', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-progress')!;
  const bar = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-progress__bar')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('is announced as a named progressbar with a range', () => {
    expect(host().getAttribute('role')).toBe('progressbar');
    expect(host().getAttribute('aria-valuemin')).toBe('0');
    expect(host().getAttribute('aria-valuemax')).toBe('100');
    expect(host().getAttribute('aria-valuenow')).toBe('42');
    expect(host().getAttribute('aria-label')).toBe('Progress');
  });

  it('fills the bar to the same number it announces', () => {
    expect(bar().style.width).toBe('42%');

    fixture.componentInstance.value.set(80);
    fixture.detectChanges();
    expect(bar().style.width).toBe('80%');
    expect(host().getAttribute('aria-valuenow')).toBe('80');
  });

  it('clamps both the width and the announcement to the range', () => {
    fixture.componentInstance.value.set(300);
    fixture.detectChanges();
    expect(bar().style.width).toBe('100%');
    expect(host().getAttribute('aria-valuenow')).toBe('100');

    fixture.componentInstance.value.set(-40);
    fixture.detectChanges();
    expect(bar().style.width).toBe('0%');
    expect(host().getAttribute('aria-valuenow')).toBe('0');
  });

  it('reads a value that is not a number as zero', () => {
    fixture.componentInstance.value.set(Number.NaN);
    fixture.detectChanges();
    expect(host().getAttribute('aria-valuenow')).toBe('0');
    expect(bar().style.width).toBe('0%');
  });

  it('carries the colour into the class list', () => {
    expect(host().className).toBe('wr-progress wr-progress--primary');

    fixture.componentInstance.color.set('success');
    fixture.detectChanges();
    expect(host().className).toBe('wr-progress wr-progress--success');
  });

  it('takes a name from the consumer over the catalog', () => {
    fixture.componentInstance.ariaLabel.set('Upload');
    fixture.detectChanges();
    expect(host().getAttribute('aria-label')).toBe('Upload');
  });
});

describe('WrProgress under a localized catalog', () => {
  it('takes its name from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const host = (fixture.nativeElement as HTMLElement).querySelector('wr-progress')!;
    expect(host.getAttribute('aria-label')).toBeTruthy();
    expect(host.getAttribute('aria-label')).not.toBe('Progress');

    fixture.destroy();
  });
});

/**
 * What the stylesheet promises that jsdom cannot show — it has no cascade from a
 * sheet and no forced-colors mode — held against the COMPILED CSS. That each rule
 * then paints what it says was measured in Chromium with `forcedColors: 'active'`.
 * `sass` is resolved through `@angular/build`, as `theme/sass-entry.spec.ts` does.
 */
describe('WrProgress under forced colors', () => {
  interface Sass {
    compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
  }
  const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;
  const css = sass
    .compileString("@use 'progress/styles';", { loadPaths: [join(process.cwd(), 'projects/lib')], style: 'expanded' })
    .css.replace(/\/\*[\s\S]*?\*\//g, '');
  /** The `@media (forced-colors: active)` blocks, joined. */
  const forced = [...css.matchAll(/@media \(forced-colors: active\)\s*\{([\s\S]*?\})\s*\}/g)].map(m => m[1]).join('\n');
  /** The declarations of the rule whose selector is exactly `selector`, in `source`. */
  const rule = (source: string, selector: string): string =>
    new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.()>:]/g, m => `\\${m}`)}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? '';

  it('keeps the track and the bar visible, where forced colors paints both as the page', () => {
    expect(rule(forced, '.wr-progress')).toMatch(/outline:\s*1px solid CanvasText/);
    expect(rule(forced, '.wr-progress__bar')).toMatch(/background:\s*CanvasText/);
  });
});
