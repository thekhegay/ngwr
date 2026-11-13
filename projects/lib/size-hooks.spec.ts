import { createRequire } from 'node:module';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * What a `size` does to the hooks it scales. jsdom has no cascade from a sheet,
 * so this reads the COMPILED CSS, as `static-variant-selectors.spec.ts` does:
 * the hook's value on the base rule, pinned, and on the `sm` and `lg` rules,
 * each resolved through the theme's tokens to a length in rem.
 *
 * The base value is what `md` paints, since `md` adds no class. That the boxes
 * then measure what the hooks say is a browser's to confirm.
 */
interface Sass {
  compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
}

const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;

const sheets = new Map<string, string>();

function sheet(entry: string): string {
  let css = sheets.get(entry);
  if (css === undefined) {
    css = sass
      .compileString(`@use '${entry}/styles';`, { loadPaths: [join(process.cwd(), 'projects/lib')], style: 'expanded' })
      .css.replace(/\/\*[\s\S]*?\*\//g, '');
    sheets.set(entry, css);
  }
  return css;
}

/** The declarations of every rule whose selector list holds exactly `selector`, joined. */
function declarations(entry: string, selector: string): string {
  return [...sheet(entry).matchAll(/(?:^|\n)\s*([^{}@]+)\{([^{}]*)\}/g)]
    .filter(([, list]) => list.split(/,(?![^(]*\))/).some(part => part.trim().replace(/\s+/g, ' ') === selector))
    .map(([, , body]) => body)
    .join('\n');
}

/** The raw value `selector` declares for `hook`, or `null`. */
function declared(entry: string, selector: string, hook: string): string | null {
  const all = [...declarations(entry, selector).matchAll(new RegExp(`(?:^|[\\s;])${hook}:\\s*([^;]+);`, 'g'))];
  return all.at(-1)?.[1].trim() ?? null;
}

/** A hook value as a length in rem, following `var(--wr-…)` to the theme's token. */
function rem(entry: string, value: string | null): number {
  if (value === null) return NaN;
  const token = /^var\((--wr-[\w-]+)\)$/.exec(value);
  if (token) return rem(entry, declared(entry, ':root', token[1]));
  if (value === '0') return 0;
  const length = /^(-?[\d.]+)rem$/.exec(value);
  return length ? Number(length[1]) : NaN;
}

const part = (block: string, size: string, element: string): string =>
  element ? `.${block}--${size} .${block}__${element}` : `.${block}--${size}`;

/** entry, block, the element that declares the hook ('' for the host), hook, the `md` value. */
const HOOKS: [entry: string, block: string, element: string, hook: string, md: string][] = [
  ['badge', 'wr-tag', '', '--wr-tag-min-height', '1.375rem'],
  ['badge', 'wr-tag', '', '--wr-tag-padding-y', '0.125rem'],
  ['badge', 'wr-tag', '', '--wr-tag-padding-x', 'var(--wr-space-sm)'],
  ['badge', 'wr-tag', '', '--wr-tag-font-size', 'var(--wr-text-xs)'],
  ['badge', 'wr-tag', '', '--wr-tag-icon-size', '0.875rem'],
  ['badge', 'wr-tag', '', '--wr-tag-remove-size', '1rem'],
  ['badge', 'wr-tag', '', '--wr-tag-remove-icon-size', '0.75rem'],
  ['progress', 'wr-progress', '', '--wr-progress-height', '0.5rem'],
  ['slider', 'wr-slider', '', '--wr-slider-thumb-size', '1rem'],
  ['slider', 'wr-slider', '', '--wr-slider-track-height', '0.25rem'],
  ['slider', 'wr-slider', '', '--wr-slider-mark-size', 'var(--wr-space-sm)'],
  ['slider', 'wr-slider', '', '--wr-slider-label-font-size', 'var(--wr-text-sm)'],
  ['slider', 'wr-slider', '', '--wr-slider-mark-label-font-size', 'var(--wr-text-xs)'],
  ['color-picker', 'wr-color-picker', '', '--wr-color-picker-width', '17rem'],
  ['color-picker', 'wr-color-picker', '', '--wr-color-picker-sv-height', '10rem'],
  ['color-picker', 'wr-color-picker', '', '--wr-color-picker-thumb-size', '0.875rem'],
  ['color-picker', 'wr-color-picker', '', '--wr-color-picker-padding', 'var(--wr-space-md)'],
  ['file-upload', 'wr-file-upload', 'zone', '--wr-file-upload-zone-padding', 'var(--wr-space-xl)'],
  ['file-upload', 'wr-file-upload', 'zone', '--wr-file-upload-zone-gap', 'var(--wr-space-md)'],
  ['file-upload', 'wr-file-upload', 'icon', '--wr-file-upload-icon-size', '2rem'],
  ['file-upload', 'wr-file-upload', 'hint', '--wr-file-upload-hint-font-size', 'var(--wr-text-sm)'],
  ['file-upload', 'wr-file-upload', 'item', '--wr-file-upload-item-padding-y', 'var(--wr-space-sm)'],
  ['file-upload', 'wr-file-upload', 'item', '--wr-file-upload-item-padding-x', 'var(--wr-space-md)'],
  ['file-upload', 'wr-file-upload', 'item', '--wr-file-upload-item-font-size', 'var(--wr-text-sm)'],
  ['transfer', 'wr-transfer', '', '--wr-transfer-pane-width', '14rem'],
  ['transfer', 'wr-transfer', '', '--wr-transfer-pane-height', '15rem'],
  ['transfer', 'wr-transfer', '', '--wr-transfer-gap', 'var(--wr-space-md)'],
  ['transfer', 'wr-transfer', 'head', '--wr-transfer-head-padding-y', 'var(--wr-space-sm)'],
  ['transfer', 'wr-transfer', 'title', '--wr-transfer-title-font-size', 'var(--wr-text-sm)'],
  ['transfer', 'wr-transfer', 'item', '--wr-transfer-item-padding-x', 'var(--wr-space-sm)'],
];

/** Hooks only `lg` moves: at `sm` the part is already at the smallest target it may be. */
const LG_ONLY: [entry: string, block: string, element: string, hook: string, md: string][] = [
  ['color-picker', 'wr-color-picker', '', '--wr-color-picker-slider-height', '0.75rem'],
  ['transfer', 'wr-transfer', 'item', '--wr-transfer-item-padding-y', 'var(--wr-space-xs)'],
];

describe('a size scales its hooks', () => {
  it.each(HOOKS)('%s: .%s %s %s runs sm < md < lg, md unchanged', (entry, block, element, hook, md) => {
    const base = element ? `.${block}__${element}` : `.${block}`;

    expect(declared(entry, base, hook)).toBe(md);

    const [sm, mid, lg] = [
      rem(entry, declared(entry, part(block, 'sm', element), hook)),
      rem(entry, md),
      rem(entry, declared(entry, part(block, 'lg', element), hook)),
    ];

    expect(sm).toBeLessThan(mid);
    expect(mid).toBeLessThan(lg);
  });

  it.each(LG_ONLY)('%s: .%s %s %s stays at md for sm and grows at lg', (entry, block, element, hook, md) => {
    const base = element ? `.${block}__${element}` : `.${block}`;

    expect(declared(entry, base, hook)).toBe(md);
    expect(declared(entry, part(block, 'sm', element), hook)).toBeNull();
    expect(rem(entry, declared(entry, part(block, 'lg', element), hook))).toBeGreaterThan(rem(entry, md));
  });

  // The tag's block padding is multiplied by the density, and a pill's wider
  // inline padding outranks the size by source order unless each size restates it.
  it('keeps the pill one step wider than the plain tag at every size', () => {
    const padding = (selector: string): number => rem('badge', declared('badge', selector, '--wr-tag-padding-x'));

    expect(padding('.wr-tag--sm.wr-tag--rounded')).toBeGreaterThan(padding('.wr-tag--sm'));
    expect(padding('.wr-tag--rounded')).toBeGreaterThan(padding('.wr-tag'));
    expect(padding('.wr-tag--lg.wr-tag--rounded')).toBeGreaterThan(padding('.wr-tag--lg'));
  });
});
