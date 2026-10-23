import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The shared focus ring against the markup it is keyed on.
 *
 * `theme/styles/_focus.scss` names the library's focusables by class, and a
 * class nothing renders is a ring that never paints: rename `__step` in a
 * template and the stepper buttons go back to the browser's outline — or to
 * nothing, where the component clears it — with no build, console or gate to
 * say so. jsdom applies no stylesheet, so the ring itself is out of reach here
 * (`styles.spec.ts` gives the reason); what a source scan can hold is that every
 * class the file rings is one the library still writes.
 *
 * It cannot hold the other direction — a focusable the file does not list —
 * and that is the defect a browser sweep found for eleven of them at once.
 */
const LIB = join(process.cwd(), 'projects/lib');
const FOCUS = join(LIB, 'theme/styles/_focus.scss');

/** Comments stripped, so a class named in prose is not a class written. */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/[^\n]*/g, '$1');
}

/**
 * Every template and component source a class can be written in. Specs and
 * harnesses are left out — both QUERY classes rather than render them — and so
 * is `schematics/`, whose codemod tables name old vocabulary on purpose.
 */
function sources(dir: string): string[] {
  const out: string[] = [];
  const walk = (at: string): void => {
    for (const name of readdirSync(at)) {
      if (name === 'node_modules' || name === 'schematics' || name === 'testing') continue;
      const full = join(at, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(html|ts)$/.test(full) && !full.endsWith('.spec.ts')) out.push(full);
    }
  };
  walk(dir);
  return out;
}

/** The `.wr-*` classes in the file's `:focus-visible` selectors. */
function ringedClasses(): string[] {
  const selectors = [...code(FOCUS).matchAll(/([^{};]+)\{/g)]
    .map(m => m[1].trim())
    .filter(selector => selector.includes(':focus-visible'));
  return [...new Set(selectors.flatMap(selector => [...selector.matchAll(/\.(wr-[a-z0-9_-]+)/g)].map(m => m[1])))];
}

describe('the shared focus ring', () => {
  const classes = ringedClasses();
  const written = sources(LIB).map(code);

  it('rings only classes the library renders', () => {
    const dead = classes.filter(name => {
      const token = new RegExp(`(^|[^a-z0-9_-])${name}(?![a-z0-9_-])`);
      return !written.some(text => token.test(text));
    });

    expect(dead, 'ringed in _focus.scss, written by no template or host binding').toEqual([]);
  });

  it('finds the selectors it judges', () => {
    // A parse that matched nothing would pass the check above on zero classes.
    expect(classes).toEqual(expect.arrayContaining(['wr-btn', 'wr-tabs__panel', 'wr-input-number__step']));
    expect(written.length).toBeGreaterThanOrEqual(200);
  });
});
