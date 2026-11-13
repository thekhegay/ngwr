import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrInputOtp } from 'ngwr/input-otp';
import { describe, expect, it } from 'vitest';

import { compileSass } from '../spec-sass';

/**
 * `rounded`: the modifier class off the rendered DOM, and the radius it resolves
 * to off the COMPILED sheet, since jsdom applies no stylesheet. `sass` is resolved
 * through `@angular/build`, as `input/border-width.spec.ts` does.
 */
const css = compileSass(`@use 'input-otp/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');

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
  imports: [WrInputOtp],
  template: `
    <wr-input-otp [rounded]="rounded()" length="4" />
    <wr-input-otp rounded length="4" />
  `,
})
class Host {
  readonly rounded = signal(false);
}

describe('WrInputOtp rounded', () => {
  const mount = (): { host: Host; at: (index: number) => HTMLElement; detectChanges: () => void } => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const all = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('wr-input-otp');
    return { host: fixture.componentInstance, at: index => all[index], detectChanges: () => fixture.detectChanges() };
  };

  it('is square by default, with no modifier', () => {
    const { at } = mount();

    expect(at(0).className).toBe('wr-input-otp');
  });

  it('turns a bound `rounded` into the modifier, and drops it again', () => {
    const { host, at, detectChanges } = mount();
    host.rounded.set(true);
    detectChanges();
    expect(at(0).className).toBe('wr-input-otp wr-input-otp--rounded');

    host.rounded.set(false);
    detectChanges();
    expect(at(0).className).toBe('wr-input-otp');
  });

  it('reads a bare `rounded` attribute as true', () => {
    const { at } = mount();

    expect(at(1).classList.contains('wr-input-otp--rounded')).toBe(true);
  });

  it('leaves the boxes without a class of their own: all of them follow the host', () => {
    const { at } = mount();
    const boxes = [...at(1).querySelectorAll('input')];

    expect(boxes).toHaveLength(4);
    expect(boxes.every(box => box.className === 'wr-input-otp__cell')).toBe(true);
  });

  it('resolves the radius hook to the pill for every box, after every size', () => {
    const base = declared('.wr-input-otp', '--wr-input-otp-radius');
    const rounded = declared('.wr-input-otp--rounded', '--wr-input-otp-radius');

    expect(base.value).toBe('var(--wr-control-radius-md)');
    expect(rounded.value).toBe('var(--wr-border-radius-pill)');
    expect(rounded.at).toBeGreaterThan(declared('.wr-input-otp--lg', '--wr-input-otp-radius').at);
    expect(declared('.wr-input-otp__cell', 'border-radius').value).toBe('var(--wr-input-otp-radius)');
    // `corner-shape` does not inherit, so the reset is on the box and not on the host.
    expect(declared('.wr-input-otp--rounded .wr-input-otp__cell', 'corner-shape').value).toBe('round');
  });
});
