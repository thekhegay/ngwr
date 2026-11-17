import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrDatePicker, WrDateRangePicker } from 'ngwr/date-picker';
import { describe, expect, it } from 'vitest';

import { compileSass } from '../spec-sass';

/**
 * `block`: the modifier class off the rendered DOM, and the width it sets off
 * the COMPILED sheet, since jsdom lays nothing out.
 */
const css = compileSass(`@use 'date-picker/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations of the rule whose selector list holds `selector`. */
const rule = (selector: string): string =>
  [...css.matchAll(/(?:^|\n)([^\s{}@][^{}]*?)\s*\{([^{}]*)\}/g)].find(m =>
    m[1].split(/,(?![^()]*\))/).some(part => part.trim() === selector)
  )?.[2] ?? '';

@Component({
  imports: [WrDatePicker, WrDateRangePicker],
  template: `
    <wr-date-picker [block]="block()" />
    <wr-date-picker block />
    <wr-date-range-picker [block]="block()" />
    <wr-date-range-picker block />
  `,
})
class Host {
  readonly block = signal(false);
}

describe.each([
  ['WrDatePicker', 'wr-date-picker'],
  ['WrDateRangePicker', 'wr-date-range-picker'],
])('%s block', (_, block) => {
  const mount = (): { host: Host; at: (index: number) => HTMLElement; detectChanges: () => void } => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const all = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(block);
    return { host: fixture.componentInstance, at: index => all[index], detectChanges: () => fixture.detectChanges() };
  };
  const modifier = `${block}--block`;

  it('sizes to its content by default, with no modifier', () => {
    const { at } = mount();

    expect(at(0).classList.contains(modifier)).toBe(false);
  });

  it('turns a bound `block` into the modifier, and drops it again', () => {
    const { host, at, detectChanges } = mount();
    host.block.set(true);
    detectChanges();
    expect(at(0).classList.contains(modifier)).toBe(true);

    host.block.set(false);
    detectChanges();
    expect(at(0).classList.contains(modifier)).toBe(false);
  });

  it('reads a bare `block` attribute as true', () => {
    const { at } = mount();

    expect(at(1).classList.contains(modifier)).toBe(true);
  });

  it('fills the container as a block-level box, by class and by static attribute', () => {
    const declarations = rule(`.${modifier}`);

    expect(declarations).toMatch(/display: block;/);
    expect(declarations).toMatch(/width: 100%;/);
    expect(rule(`.${block}:where([block]:not([block=false]))`)).toBe(declarations);
  });

  it('keeps the group as wide as the host', () => {
    expect(rule(`.${block} > .wr-input-group`)).toMatch(/width: 100%;/);
  });
});
