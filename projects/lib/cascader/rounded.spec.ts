import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrCascader } from 'ngwr/cascader';
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
  .compileString(`@use 'cascader/styles';`, { loadPaths: [join(process.cwd(), 'projects/lib')], style: 'expanded' })
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
  imports: [WrCascader],
  template: `
    <wr-cascader [rounded]="rounded()" [options]="[]" />
    <wr-cascader rounded [options]="[]" />
  `,
})
class Host {
  readonly rounded = signal(false);
}

describe('WrCascader rounded', () => {
  const mount = (): { host: Host; at: (index: number) => HTMLElement; detectChanges: () => void } => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const all = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('wr-cascader');
    return { host: fixture.componentInstance, at: index => all[index], detectChanges: () => fixture.detectChanges() };
  };

  it('is square by default, with no modifier', () => {
    const { at } = mount();

    expect(at(0).className).toBe('wr-cascader');
  });

  it('turns a bound `rounded` into the modifier, and drops it again', () => {
    const { host, at, detectChanges } = mount();
    host.rounded.set(true);
    detectChanges();
    expect(at(0).className).toBe('wr-cascader wr-cascader--rounded');

    host.rounded.set(false);
    detectChanges();
    expect(at(0).className).toBe('wr-cascader');
  });

  it('reads a bare `rounded` attribute as true', () => {
    const { at } = mount();

    expect(at(1).classList.contains('wr-cascader--rounded')).toBe(true);
  });

  it('resolves the radius hook to the pill, after every size', () => {
    const base = declared('.wr-cascader', '--wr-cascader-radius');
    const rounded = declared('.wr-cascader--rounded', '--wr-cascader-radius');

    expect(base.value).toBe('var(--wr-control-radius-md)');
    expect(rounded.value).toBe('var(--wr-border-radius-pill)');
    expect(rounded.at).toBeGreaterThan(declared('.wr-cascader--lg', '--wr-cascader-radius').at);
    // The trigger is the box that draws it.
    expect(declared('.wr-cascader__trigger', 'border-radius').value).toBe('var(--wr-cascader-radius)');
  });
});
