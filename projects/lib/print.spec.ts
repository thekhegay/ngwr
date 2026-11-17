import { describe, expect, it } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from './spec-sass';

/**
 * What each sheet does on paper, read from the compiled CSS: jsdom applies no
 * media query, so a rendered-DOM spec would see none of it.
 */

/** The bodies of every at-rule of a compiled sheet whose prelude is exactly `query`. */
function media(css: string, query: string): string {
  const out: string[] = [];
  const head = `@media ${query} {`;
  for (let at = css.indexOf(head); at !== -1; at = css.indexOf(head, at + 1)) {
    let depth = 0;
    for (let i = at + head.length - 1; i < css.length; i++) {
      if (css[i] === '{') depth++;
      if (css[i] === '}' && --depth === 0) {
        out.push(css.slice(at + head.length, i));
        break;
      }
    }
  }
  return out.join('\n');
}

/** The declarations of the rule whose selector list holds `selector`. */
function rule(css: string, selector: string): string | undefined {
  for (const [, list, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (list.split(',').some(part => part.trim() === selector)) return body.trim();
  }
  return undefined;
}

const HIDDEN: readonly (readonly [sheet: string, selectors: readonly string[]])[] = [
  ['layout/styles', ['.wr-layout-header', '.wr-layout-sider']],
  ['sidebar/styles', ['.wr-sidebar']],
  ['back-top/styles', ['.wr-back-top']],
  ['speed-dial/styles', ['.wr-speed-dial']],
  ['toast/styles', ['.wr-toast-host', '.wr-toast-outlet']],
  ['loading-bar/styles', ['.wr-loading-bar']],
  ['tour/styles', ['.wr-tour__spotlight', '.wr-tour-overlay']],
  ['popover/styles', ['.wr-tooltip-overlay']],
];

describe('print rules', { timeout: COMPILE_TIMEOUT }, () => {
  for (const [sheet, selectors] of HIDDEN) {
    it(`${sheet} hides ${selectors.join(', ')}`, () => {
      const print = media(compileSass(`@use '${sheet}';`), 'print');
      for (const selector of selectors) expect(rule(print, selector), selector).toBe('display: none;');
    });
  }

  it('the layout prints its content and its footer', () => {
    const print = media(compileSass("@use 'layout/styles';"), 'print');
    expect(print).not.toContain('.wr-layout-content');
    expect(print).not.toContain('.wr-layout-footer');
  });

  it('the loading bar hides through its styleUrl sheet too', () => {
    const print = media(compileSass("@use 'loading-bar/loading-bar';"), 'print');
    expect(rule(print, '.wr-loading-bar')).toBe('display: none;');
  });

  it('a sticky page header is back in the flow', () => {
    const print = media(compileSass("@use 'page-header/styles';"), 'print');
    expect(rule(print, '.wr-page-header--sticky')).toBe('position: static;');
  });

  it('the theme ships .wr-no-print and .wr-print-only', () => {
    const css = compileSass("@use 'theme';");
    expect(rule(media(css, 'print'), '.wr-no-print')).toBe('display: none !important;');
    expect(rule(media(css, 'not print'), '.wr-print-only')).toBe('display: none !important;');
  });

  it('emits the utilities once when a component sheet is loaded too', () => {
    const css = compileSass("@use 'theme'; @use 'layout/styles';");
    expect(css.match(/\.wr-no-print/g)).toHaveLength(1);
  });
});
