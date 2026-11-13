import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrTextarea } from 'ngwr/textarea';
import { describe, expect, it } from 'vitest';

/**
 * `rounded`: the modifier class off the rendered DOM, and the radius it resolves
 * to off the COMPILED sheet, since jsdom applies no stylesheet. `sass` is resolved
 * through `@angular/build`, as `input/border-width.spec.ts` does.
 */
const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as {
  compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
};

const css = sass
  .compileString(`@use 'textarea/styles';`, { loadPaths: [join(process.cwd(), 'projects/lib')], style: 'expanded' })
  .css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every unnested rule, in source order: its selector list and its declarations. */
const rules = [...css.matchAll(/(?:^|\n)([^\s{}@][^{}]*?)\s*\{([^{}]*)\}/g)].map(m => ({
  selectors: m[1].split(/,(?![^()]*\))/).map(part => part.trim().replace(/\s+/g, ' ')),
  declarations: new Map(
    [...m[2].matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map(d => [d[1], d[2].trim().replace(/\s+/g, ' ')] as const)
  ),
}));

/** What the last rule listing exactly `selector` and declaring `property` sets it to, and where that rule sits. */
function declared(selector: string, property: string): { value: string | undefined; at: number } {
  const at = rules.map(rule => rule.selectors.includes(selector) && rule.declarations.has(property)).lastIndexOf(true);
  return { value: rules[at]?.declarations.get(property), at };
}

@Component({
  imports: [WrTextarea],
  template: `
    <wr-textarea [rounded]="rounded()" />
    <wr-textarea rounded />
  `,
})
class Host {
  readonly rounded = signal(false);
}

describe('WrTextarea rounded', () => {
  const mount = (): { host: Host; at: (index: number) => HTMLElement; detectChanges: () => void } => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const all = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('wr-textarea');
    return { host: fixture.componentInstance, at: index => all[index], detectChanges: () => fixture.detectChanges() };
  };

  it('is square by default, with no modifier', () => {
    const { at } = mount();

    expect(at(0).className).toBe('wr-textarea');
  });

  it('turns a bound `rounded` into the modifier, and drops it again', () => {
    const { host, at, detectChanges } = mount();
    host.rounded.set(true);
    detectChanges();
    expect(at(0).className).toBe('wr-textarea wr-textarea--rounded');

    host.rounded.set(false);
    detectChanges();
    expect(at(0).className).toBe('wr-textarea');
  });

  it('reads a bare `rounded` attribute as true', () => {
    const { at } = mount();

    expect(at(1).classList.contains('wr-textarea--rounded')).toBe(true);
  });

  it('resolves the radius hook to the pill, capped at half a one-row field, after every size', () => {
    const base = declared('.wr-textarea', '--wr-textarea-radius');
    const rounded = declared('.wr-textarea--rounded', '--wr-textarea-radius');

    expect(base.value).toBe('var(--wr-control-radius-md)');
    // Not the bare pill: on a box several rows tall that is a stadium through the text.
    expect(rounded.value?.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')).toBe(
      'min(var(--wr-border-radius-pill), calc(var(--wr-textarea-line-height) / 2 + var(--wr-textarea-padding-y) * var(--wr-density-y, 1) + 1px))'
    );
    expect(rounded.at).toBeGreaterThan(declared('.wr-textarea--lg', '--wr-textarea-radius').at);
    // The squircle is undone on the host, the element `smooth-br` ran on.
    expect(declared('.wr-textarea--rounded', 'corner-shape').value).toBe('round');
  });

  it('moves the resize grip inside the curve', () => {
    expect(declared('.wr-textarea--rounded .wr-textarea__resize', 'bottom').value).toBe(
      'calc(var(--wr-textarea-radius) * 0.3)'
    );
  });
});
