import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrDatePicker, WrDateRangePicker } from 'ngwr/date-picker';
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
  .compileString(`@use 'date-picker/styles';`, { loadPaths: [join(process.cwd(), 'projects/lib')], style: 'expanded' })
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
  imports: [WrDatePicker, WrDateRangePicker],
  template: `
    <wr-date-picker [rounded]="rounded()" />
    <wr-date-picker rounded />
    <wr-date-range-picker [rounded]="rounded()" />
    <wr-date-range-picker rounded />
  `,
})
class Host {
  readonly rounded = signal(false);
}

describe.each([
  ['WrDatePicker', 'wr-date-picker', 1],
  ['WrDateRangePicker', 'wr-date-range-picker', 2],
])('%s rounded', (_, block, fields) => {
  const mount = (): { host: Host; at: (index: number) => HTMLElement; detectChanges: () => void } => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const all = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(block);
    return { host: fixture.componentInstance, at: index => all[index], detectChanges: () => fixture.detectChanges() };
  };

  /** The modifier on each part that draws the field: the host, the group and every input. */
  const shape = (picker: HTMLElement): boolean[] => [
    picker.classList.contains(`${block}--rounded`),
    picker.querySelector('wr-input-group')!.classList.contains('wr-input-group--rounded'),
    ...[...picker.querySelectorAll('input')].map(input => input.classList.contains('wr-input--rounded')),
  ];

  it('is square by default, on the host, the group and every field', () => {
    const { at } = mount();

    expect(shape(at(0))).toEqual(Array.from({ length: fields + 2 }, () => false));
  });

  it('turns a bound `rounded` into the modifier on all of them, and drops it again', () => {
    const { host, at, detectChanges } = mount();
    host.rounded.set(true);
    detectChanges();
    expect(shape(at(0))).toEqual(Array.from({ length: fields + 2 }, () => true));

    host.rounded.set(false);
    detectChanges();
    expect(shape(at(0))).toEqual(Array.from({ length: fields + 2 }, () => false));
  });

  it('reads a bare `rounded` attribute as true', () => {
    const { at } = mount();

    expect(shape(at(1))).toEqual(Array.from({ length: fields + 2 }, () => true));
  });

  it('resolves the group radius to the pill from the host, after every size', () => {
    const group = `.${block}--rounded > .wr-input-group`;
    const rounded = declared(group, '--wr-input-group-radius');

    expect(declared('.wr-input-group', '--wr-input-group-radius').value).toBe('var(--wr-control-radius-md)');
    expect(rounded.value).toBe('var(--wr-border-radius-pill)');
    // A size sets the same hook from the host at the same specificity, so order decides.
    expect(rounded.at).toBeGreaterThan(declared(`.${block}--lg > .wr-input-group`, '--wr-input-group-radius').at);
  });

  it('bends the trigger with the pill, so its focus ring follows the end', () => {
    expect(declared(`.${block}--rounded .wr-date-picker__trigger`, 'border-end-end-radius').value).toBe(
      'calc(var(--wr-input-group-radius) - 1px)'
    );
  });
});
