import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrInputNumber } from './input-number';

/**
 * The ▲ / ▼ column's geometry, held at the source.
 *
 * Two defects, both measured in Chromium over `sm` / `md` / `lg`, square and
 * pill, under the four density presets:
 *
 *   * the chevrons were `10x6` at every size. At `sm` each half-button is 10px
 *     tall (9.1px under `sm` density), so the glyph filled all but 2px of it and
 *     the pair nearly touched; at `lg` the same glyph sat small in a 17px half.
 *     They step with the control size now.
 *
 *     The mark itself was a filled triangle until it became the stroked chevron
 *     `wr-select` and `wr-pagination` draw, so the hook sizes a SQUARE box — the
 *     24-unit viewBox is square — and the visible mark is half its width by a
 *     quarter of its height. Measured in Chromium at `md`: a 14px box, a 7x3.5px
 *     mark, identical to what a select trigger shows beside it, which is the
 *     whole reason the hook now resolves to the control font size rather than to
 *     a length of its own.
 *   * on a pill, the divider between the two buttons ran to the tip of the
 *     rounded end, and with the column's start border it cut the end cap into a
 *     separate square segment, chevrons 7px from the end. The column itself
 *     fitted the curve — its start border sits 26px from the outer end, before a
 *     curve 11–21.5px long, and its own end radius left 0px² outside the pill in
 *     every case. Keeping the dividers means insetting the column by the whole
 *     radius (18px at `lg`, 21.5px at `lg` under `touch`). The pill drops both
 *     dividers and insets the pair instead: the chevrons end 14–16px from the
 *     border in every measured case, where the field's own text starts 13.6–20px
 *     from the other one, at a cost of 7px of minimum width, and the hover /
 *     pressed tints end in a quarter-disc that stays inside the curve.
 *
 * jsdom applies no stylesheet and every rect is 0x0, so none of those numbers
 * is reachable from a rendered fixture. What IS reachable is split in two: the
 * host modifiers the rules key on (asserted from the rendered DOM in
 * `input-number.spec.ts` and below), and the declarations themselves, read
 * here the way `table/table-header-target.spec.ts` reads the table header's. A
 * source read cannot see the cascade — a later rule restoring the dividers
 * would leave it green — which is the limit that file names too.
 */
const STYLES = readFileSync(join(process.cwd(), 'projects/lib/input-number/styles/_index.scss'), 'utf8');

const strip = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');

/**
 * A rule's own declarations — nested rules removed — found by the selector line
 * that opens it, searched from `from` (the start of an enclosing rule), so the
 * same nested selector can be told apart inside two different parents.
 */
function block(selector: string, from = 0): { readonly body: string; readonly start: number } {
  const source = strip(STYLES);
  const opener = new RegExp(`^[ \\t]*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[ \\t]*\\{`, 'm');
  const offset = source.slice(from).search(opener);
  expect(offset, `no \`${selector} {\` in input-number/styles/_index.scss`).toBeGreaterThan(-1);
  const start = from + offset;

  let depth = 0;
  let body = '';
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return { body, start };
    else if (depth === 1) body += ch;
  }
  throw new Error(`\`${selector}\` is never closed`);
}

const hook = (body: string): string | undefined =>
  /--wr-input-number-step-icon-size:\s*([^;]+);/.exec(body)?.[1]?.trim();

describe('WrInputNumber stepper geometry', () => {
  it('sizes the chevron from a hook that steps with the control size', () => {
    // The control font size, which is the box `wr-select` gives its own chevron
    // through `1em` — stated as the same token rather than as a matching length,
    // so the two cannot drift apart by a rem.
    expect(hook(block('.wr-input-number').body)).toBe('var(--wr-control-font-size-md)');
    expect(hook(block('&--sm').body)).toBe('var(--wr-control-font-size-sm)');
    expect(hook(block('&--lg').body)).toBe('var(--wr-control-font-size-lg)');
  });

  it('draws the glyph at that size, in CSS, so it outranks the markup attributes', () => {
    const svg = block('svg', block('&__step').start).body;
    expect(svg).toMatch(/width:\s*var\(--wr-input-number-step-icon-size\)\s*;/);
    // Square, and asserted as such: a non-square box scales the 24-unit viewBox
    // unevenly, which thins the chevron's strokes against the select's.
    expect(svg).toMatch(/height:\s*var\(--wr-input-number-step-icon-size\)\s*;/);
  });

  it('drops both dividers on a pill and insets the pair from its rounded end', () => {
    const rounded = block('&--rounded').start;
    const column = block('.wr-input-number__steppers.wr-input-group__affix', rounded).body;
    expect(column).toMatch(/border-inline-start:\s*0\s*;/);
    expect(column).toMatch(/margin-inline-end:\s*calc\(var\(--wr-input-group-padding-x\)\s*\/\s*2\)\s*;/);

    const second = block('& + .wr-input-number__step', rounded).body;
    expect(second).toMatch(/border-top:\s*0\s*;/);
  });

  it('keeps the hover and pressed tints inside the curve on a pill', () => {
    // Measured, not derived: with the column unclipped, a 5px-cornered tint
    // crossed the curved border at `lg`. The end radius is oversized on purpose
    // and scaled down to the half-button.
    const step = block('.wr-input-number__step', block('&--rounded').start).start;
    expect(block('&:first-child', step).body).toMatch(/border-start-end-radius:\s*999px\s*;/);
    expect(block('&:last-child', step).body).toMatch(/border-end-end-radius:\s*999px\s*;/);
  });

  describe('in the rendered DOM', () => {
    @Component({
      imports: [WrInputNumber],
      template: `<wr-input-number size="sm" rounded [value]="1" />`,
    })
    class Host {}

    let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

    beforeEach(() => {
      TestBed.resetTestingModule();
      fixture = TestBed.createComponent(Host);
      fixture.detectChanges();
    });

    afterEach(() => fixture.destroy());

    it('puts one glyph in each step button, under the host the rules key on', () => {
      const host = (fixture.nativeElement as HTMLElement).querySelector('wr-input-number')!;
      expect(host.classList).toContain('wr-input-number--sm');
      expect(host.classList).toContain('wr-input-number--rounded');

      const steps = [...host.querySelectorAll('.wr-input-number__step')];
      expect(steps).toHaveLength(2);
      for (const step of steps) {
        const glyphs = step.querySelectorAll(':scope > svg');
        expect(glyphs).toHaveLength(1);
        // The unstyled fallback stays: without it an svg with no size draws 300x150.
        // Square, and the `md` box: a page with no stylesheet has no size class
        // to read either, so the fallback can only be one of the three.
        expect(glyphs[0].getAttribute('width')).toBe('14');
        expect(glyphs[0].getAttribute('height')).toBe('14');
        // The mark itself, so a change of glyph cannot pass as a change of size.
        expect(glyphs[0].querySelector('path')?.getAttribute('d')).toMatch(/^m(18 15-6-6-6 6|6 9 6 6 6-6)$/);
      }
    });
  });
});
