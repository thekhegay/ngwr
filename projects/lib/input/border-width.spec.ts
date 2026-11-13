import { describe, expect, it } from 'vitest';

import { compileSass } from '../spec-sass';

/**
 * `--wr-input-border-width`, held against the COMPILED sheet, since jsdom applies
 * no stylesheet and lays nothing out. One field's cascade is rebuilt from the
 * unnested rules that match it, its `var()`s are substituted, and the border and
 * padding are evaluated in px: their sum has to come out the same at every width,
 * so a thicker border grows inward and the content box stays where it was. At the
 * default 1px the padding is the one the field had before the hook existed.
 * `sass` is resolved through `@angular/build`, as `theme/sass-entry.spec.ts` does.
 */
const css = compileSass(`@use 'input/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');

type Scope = Map<string, string>;

/** The declarations of every unnested rule whose selector list holds exactly `selector`, later ones winning. */
function rule(selector: string): Scope {
  const out: Scope = new Map();
  for (const m of css.matchAll(/(?:^|\n)([^\s{}@][^{}]*?)\s*\{([^{}]*)\}/g)) {
    // Split on the commas of the list itself, not on the ones inside `:not(a, b)`.
    if (!m[1].split(/,(?![^()]*\))/).some(part => part.trim() === selector)) continue;
    for (const d of m[2].matchAll(/([\w-]+)\s*:\s*([^;]+);/g)) out.set(d[1], d[2].trim().replace(/\s+/g, ' '));
  }
  return out;
}

const ROOT = rule(':root');
const BASE = rule('.wr-input');
const GROUPED = rule('.wr-input-group .wr-input');

/** The top-level space-separated values of a shorthand. */
function split(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of value) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ' ' && depth === 0) {
      if (current) out.push(current);
      current = '';
    } else current += ch;
  }
  if (current) out.push(current);
  return out;
}

/** `expression` in px, every `var()` read from `scope` or its fallback, 1rem = 16px. */
function px(expression: string, scope: Scope): number {
  let js = expression;
  for (let pass = 0; js.includes('var('); pass++) {
    expect(pass, `${expression} does not resolve`).toBeLessThan(20);
    js = js.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]+))?\)/g, (_, name: string, fallback?: string) => {
      const value = scope.get(name) ?? fallback;
      expect(value, `${name} is not set`).toBeDefined();
      return `(${value})`;
    });
  }
  js = js
    .replace(/calc\(/g, '(')
    .replace(/max\(/g, 'Math.max(')
    .replace(/(\d*\.?\d+)rem/g, '($1*16)')
    .replace(/(\d*\.?\d+)px/g, '$1');
  expect(js).toMatch(/^(?:[\d.\s+\-*/(),]|Math\.max)+$/);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call -- evaluating the compiled calc is the assertion
  return new Function(`return ${js}`)() as number;
}

/** Border width and padding of a field the given rules match, in cascade order, plus the pre-hook padding. */
function box(...rules: Scope[]): { border: number; y: number; x: number; y0: number; x0: number } {
  const scope: Scope = new Map([...ROOT, ...BASE]);
  for (const r of rules) for (const [k, v] of r) scope.set(k, v);
  const [y, x] = split(scope.get('padding')!);
  return {
    border: scope.get('border') === '0' ? 0 : px(split(scope.get('border')!)[0], scope),
    y: px(y, scope),
    x: px(x, scope),
    y0: px('calc(var(--wr-input-padding-y) * var(--wr-density-y, 1))', scope),
    x0: px('calc(var(--wr-input-padding-x) * var(--wr-density-x, 1))', scope),
  };
}

const hook = (width: string): Scope => new Map([['--wr-input-border-width', width]]);

describe('wr-input border width', () => {
  it('declares the hook at 1px and draws the border with it', () => {
    expect(BASE.get('--wr-input-border-width')).toBe('1px');
    expect(split(BASE.get('border')!)[0]).toBe('var(--wr-input-border-width)');
    expect(box().border).toBe(1);
    expect(box(hook('2px')).border).toBe(2);
  });

  it('leaves the default padding as it was', () => {
    const { y, x, y0, x0 } = box();
    expect([y0, x0]).toEqual([4, 12]);
    expect([y, x]).toEqual([y0, x0]);
  });

  it('keeps the content box in place at every size and density', () => {
    const sizes: Scope[] = [
      new Map<string, string>(),
      rule('.wr-input--sm'),
      rule('.wr-input--lg'),
      rule('.wr-input--rounded'),
    ];
    const densities: Scope[] = [
      new Map<string, string>(),
      new Map([
        ['--wr-density-y', '0.55'],
        ['--wr-density-x', '0.85'],
      ]),
      new Map([
        ['--wr-density-y', '1.7'],
        ['--wr-density-x', '1.25'],
      ]),
    ];
    for (const modifier of sizes.slice(1)) expect(modifier.get('--wr-input-padding-x')).toBeDefined();
    for (const size of sizes) {
      for (const density of densities) {
        const base = box(size, density);
        expect(base.border).toBe(1);
        expect([base.y, base.x]).toEqual([base.y0, base.x0]);
        for (const width of ['1.5px', '2px']) {
          const field = box(size, density, hook(width));
          expect(field.border).toBe(parseFloat(width));
          expect(field.y + field.border).toBeCloseTo(base.y + base.border, 6);
          expect(field.x + field.border).toBeCloseTo(base.x + base.border, 6);
        }
      }
    }
  });

  it('moves nothing inside a group, whose border the group draws, whatever a consumer sets', () => {
    expect(GROUPED.get('border')).toBe('0');
    // The consumer's rule lands last: `.wr-form-field--invalid .wr-input` in a
    // component stylesheet outranks the group's own (0,2,0).
    const field = box(GROUPED, hook('2px'));
    expect(field.border).toBe(0);
    expect([field.y, field.x]).toEqual([field.y0, field.x0]);
  });
});
