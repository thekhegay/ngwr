import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrCascader } from 'ngwr/cascader';
import { describe, expect, it } from 'vitest';

import { compileSass } from '../spec-sass';

/**
 * `block`: the modifier class off the rendered DOM, and the width it sets off
 * the COMPILED sheet, since jsdom lays nothing out.
 */
const css = compileSass(`@use 'cascader/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations of the rule whose selector list holds `selector`. */
const rule = (selector: string): string =>
  [...css.matchAll(/(?:^|\n)([^\s{}@][^{}]*?)\s*\{([^{}]*)\}/g)].find(m =>
    m[1].split(/,(?![^()]*\))/).some(part => part.trim() === selector)
  )?.[2] ?? '';

@Component({
  imports: [WrCascader],
  template: `
    <wr-cascader [block]="block()" [options]="[]" />
    <wr-cascader block [options]="[]" />
  `,
})
class Host {
  readonly block = signal(false);
}

describe('WrCascader block', () => {
  const mount = (): { host: Host; at: (index: number) => HTMLElement; detectChanges: () => void } => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const all = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('wr-cascader');
    return { host: fixture.componentInstance, at: index => all[index], detectChanges: () => fixture.detectChanges() };
  };
  const modifier = `wr-cascader--block`;

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

    expect(declarations).toMatch(/display: grid;/);
    expect(declarations).toMatch(/width: 100%;/);
    expect(rule(`.wr-cascader:where([block]:not([block=false]))`)).toBe(declarations);
  });

  it('keeps the width floor a zero-height spacer that a narrow container caps', () => {
    const spacer = rule('.wr-cascader::after');

    expect(spacer).toMatch(/width: var\(--wr-cascader-min-width\);/);
    expect(spacer).toMatch(/max-width: 100%;/);
  });
});
