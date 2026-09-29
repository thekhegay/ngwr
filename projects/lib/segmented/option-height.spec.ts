import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * An icon-only strip must stand as tall as a labelled one.
 *
 * `.wr-segmented__option` is a flex container, so its height is its tallest
 * child. A label carries the line box; an icon carries only its own 14px glyph,
 * which is shorter than the line box at every size. So a strip built from
 * `{ value, icon }` options rendered 2 / 6 / 10px shorter than one built from
 * `{ value, label }` at `sm` / `md` / `lg`, and the two read as different
 * controls sitting next to each other.
 *
 * The floor is written as the same formula the file already documents for the
 * track — line-height plus the two option paddings — rather than as a number,
 * so it steps with the size tokens instead of pinning `md`.
 *
 * jsdom applies no stylesheet and every rect is 0x0, so the rendered height is
 * unreachable from a fixture. The declaration is read from the source instead,
 * the way `input-number/stepper-geometry.spec.ts` reads its own. A source read
 * cannot see the cascade, so a later rule overriding the floor would leave this
 * green.
 */
const STYLES = readFileSync(join(process.cwd(), 'projects/lib/segmented/styles/_index.scss'), 'utf8');

const strip = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');

/** A rule's own declarations, nested rules removed. */
function block(selector: string): string {
  const source = strip(STYLES);
  const opener = new RegExp(`^[ \\t]*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[ \\t]*\\{`, 'm');
  const start = source.search(opener);
  expect(start, `no \`${selector} {\` in segmented/styles/_index.scss`).toBeGreaterThan(-1);

  let depth = 0;
  let body = '';
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return body;
    else if (depth === 1) body += ch;
  }
  throw new Error(`\`${selector}\` is never closed`);
}

describe('WrSegmented option height', () => {
  const option = block('&__option');

  it('floors the option so an icon-only strip keeps the track height', () => {
    const declared = /min-height:\s*([^;]+);/.exec(option)?.[1]?.trim();

    expect(declared, '`&__option` declares no `min-height`').toBeDefined();
    expect(declared).toContain('var(--wr-segmented-line-height)');
    expect(declared).toContain('var(--wr-segmented-option-py)');
  });

  it('does not pin the floor to a length of its own', () => {
    const declared = /min-height:\s*([^;]+);/.exec(option)?.[1] ?? '';

    // A `rem` or `px` literal would hold `md` and break the other two sizes,
    // which is the whole reason the track height is a formula.
    expect(declared).not.toMatch(/\d*\.?\d+(rem|px|em)/);
  });

  it('keeps the icon a hook rather than a hard-coded glyph box', () => {
    // The icon is deliberately smaller than the line box; the floor is what
    // makes that safe, so the two have to stay separate declarations.
    expect(block('&__icon')).toContain('--wr-icon-size');
  });
});
