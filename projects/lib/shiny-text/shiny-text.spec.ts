import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrShinyText } from './shiny-text';

@Component({
  imports: [WrShinyText],
  template: `
    <wr-shiny-text
      [text]="text()"
      [speed]="speed()"
      [delay]="delay()"
      [disabled]="disabled()"
      [yoyo]="yoyo()"
      [direction]="direction()"
      [pauseOnHover]="pauseOnHover()"
    />
  `,
})
class Host {
  readonly text = signal('Just released');
  readonly speed = signal(2);
  readonly delay = signal(0);
  readonly disabled = signal(false);
  readonly yoyo = signal(false);
  readonly direction = signal<'left' | 'right'>('left');
  readonly pauseOnHover = signal(false);
}

/**
 * One CSS animation whose whole configuration is host bindings. The interesting
 * one is the duration: the pause between sweeps is folded INTO it (the keyframe
 * finishes early and holds), so `speed + delay` is the number that has to appear.
 */
describe('WrShinyText', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-shiny-text')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the text it was given', () => {
    expect(host().textContent).toBe('Just released');
  });

  it('runs for as long as the sweep plus the pause', () => {
    expect(host().style.animationDuration).toBe('2s');

    fixture.componentInstance.delay.set(3);
    fixture.detectChanges();
    expect(host().style.animationDuration).toBe('5s');
  });

  it('paints the sweep as a background gradient', () => {
    expect(host().style.backgroundImage).toContain('gradient');
  });

  it('names each option it was given', () => {
    expect(host().className).toBe('wr-shiny-text');

    fixture.componentInstance.disabled.set(true);
    fixture.componentInstance.yoyo.set(true);
    fixture.componentInstance.pauseOnHover.set(true);
    fixture.componentInstance.direction.set('right');
    fixture.detectChanges();

    for (const modifier of ['paused', 'yoyo', 'pause-on-hover', 'reverse']) {
      expect(host().className, modifier).toContain(`wr-shiny-text--${modifier}`);
    }
  });
});

/**
 * `WrShimmer`'s body is empty: the host class is the whole directive, and the stylesheet
 * its JSDoc names IS the implementation. So the one thing worth asserting is that the
 * entry point the doc sends a consumer to is the entry point that carries the rule. An
 * app importing styles per component follows that line literally, and the wrong one
 * resolves without error and paints nothing — `@use 'ngwr/animations'` compiles fine,
 * the host still gets `class="wr-shimmer"`, and no loaded rule matches it.
 *
 * Resolved through the package's own `sass` exports map, the way a consumer's `@use`
 * resolves it, rather than by guessing at a folder name.
 */
describe('the [wrShimmer] directive', () => {
  const root = process.cwd();

  /** Where `@use '<specifier>'` actually lands, per `projects/lib/package.json`. */
  const sassEntry = (specifier: string): string => {
    const pkg = JSON.parse(readFileSync(join(root, 'projects/lib/package.json'), 'utf8')) as {
      exports: Record<string, { sass?: string }>;
    };
    const target = pkg.exports[specifier.replace(/^ngwr/, '.')]?.sass;
    if (target === undefined) {
      throw new Error(`\`@use '${specifier}'\` has no \`sass\` condition in projects/lib/package.json.`);
    }
    return join(root, 'projects/lib', target);
  };

  /**
   * Everything a consumer's `@use` pulls in, entry file plus the partials it forwards.
   *
   * The entry file is not where the rules live any more: a style entry point that is
   * also a component `styleUrl` forwards them from a sibling `_rules.scss`, so that
   * the component's own compilation can take the rules WITHOUT the emitting theme
   * layer the entry file pulls in for standalone consumers. Reading only the entry
   * would report a missing rule for a stylesheet that delivers it.
   */
  const sassSource = (specifier: string): string => {
    const entry = sassEntry(specifier);
    const text = readFileSync(entry, 'utf8');
    const forwarded = [...text.matchAll(/^@forward '([\w-]+)';/gm)].map(m =>
      readFileSync(join(dirname(entry), `_${m[1]}.scss`), 'utf8')
    );
    return [text, ...forwarded].join('\n');
  };

  it('sends consumers to the stylesheet that actually carries the rule', () => {
    const source = readFileSync(join(root, 'projects/lib/shiny-text/shimmer.ts'), 'utf8');
    const jsdoc = source.slice(0, source.indexOf('@Directive'));
    const specifier = /`@use '(ngwr[\w/-]*)'`/.exec(jsdoc)?.[1];

    expect(specifier, 'the JSDoc names no `@use` path for the styles').toBeDefined();

    const styles = sassSource(specifier!);
    expect(styles).toContain('.wr-shimmer {');
    expect(styles).toContain('@keyframes wr-shimmer');
  });
});
