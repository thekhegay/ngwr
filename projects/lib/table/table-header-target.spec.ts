import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The header's control geometry, held at the SOURCE.
 *
 * Everything this file asserts is a CSS fact, and jsdom applies no stylesheet
 * cascade — a rect read from a rendered fixture is 0x0 and a computed style is
 * the initial value — so a rendered-DOM spec here would pass just as happily on
 * a header whose controls had lost their hit area entirely. `theme/styles.spec.ts`
 * states the same rule for the token layer, and this is the table's version of
 * it: read the stylesheet, hold the declarations that were the defect.
 *
 * Two defects, both reported by a consumer, both invisible to every gate the
 * repo runs on a PR:
 *
 *   * a column that is BOTH sortable and filterable puts two 12px controls
 *     0.375rem apart, which is a 12px pointer target against the 24px WCAG
 *     2.5.8 asks for. No showcase demo built such a column until one was added,
 *     so the nightly `target-size` sweep had never seen it;
 *   * the filter's count pill declared a font-size and no line-height, so under
 *     `ngwr/reset` — whose `font: inherit` on a `<button>` carries the header's
 *     1.25rem down with it — the 16x12 pill rendered 16x20.
 *
 * The first is fixed for a COARSE pointer only, and the shape of that decision
 * is what most of this file pins. A mouse and a trackpad keep the geometry
 * 14.6.0 draws — same 12px caret and funnel, same 0.375rem between them, same
 * header height — measured in Chromium against a build of `origin/main` rather
 * than assumed. That leaves a real `target-size` finding for a fine pointer,
 * which is a DECIDED trade: it is carried in `scripts/contrast-baseline.json`,
 * explained in AGENTS.md beside the `--wr-color-outline` one, and stated on the
 * table's docs page. The cases below are what stop the coarse gate quietly
 * turning back into an every-pointer one, or the other way round.
 *
 * What is NOT here: the painted numbers. Those are measured in a real Chromium
 * by `pnpm check:contrast` (its `target-size` half) and by hand with a coarse
 * pointer emulated; this file only makes sure the declarations that produce
 * them cannot quietly leave.
 *
 * And a limit sharper than that one, because it is the one a reader would not
 * guess: reading a rule BODY says nothing about the cascade. A later rule
 * setting `min-inline-size: 0` on either control would defeat everything here
 * and leave every assertion green — demonstrated, not feared. Resolving it
 * properly means compiling the sheet, which `pnpm check:theme` does for the
 * token layer and which would cost this file a `sass` dependency the workspace
 * does not declare. The cheap half is pinned instead: this stylesheet holds
 * exactly one `(pointer: coarse)` block and exactly two `touch-target`
 * includes, so an override cannot be added silently.
 */
const STYLES = readFileSync(join(process.cwd(), 'projects/lib/table/styles/_index.scss'), 'utf8');

/** The file with its comments removed — the prose below names every property it discusses. */
const CODE = STYLES.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');

/**
 * One rule's body, by the selector that opens it. Comments stripped.
 *
 * Anchored to the start of a line, because a selector here can be a SUBSTRING
 * of another — an `indexOf` would answer for whichever of the two the file
 * happens to declare first, which is exactly the kind of quietly wrong
 * assertion this file exists to replace.
 */
function block(selector: string): string {
  const opener = new RegExp(`^[ \\t]*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[ \\t]*\\{`, 'm');
  const start = STYLES.search(opener);
  expect(start, `no \`${selector} {\` in table/styles/_index.scss`).toBeGreaterThan(-1);

  let depth = 0;
  for (let i = STYLES.indexOf('{', start); i < STYLES.length; i++) {
    if (STYLES[i] === '{') depth++;
    if (STYLES[i] === '}' && --depth === 0) {
      return STYLES.slice(STYLES.indexOf('{', start) + 1, i)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|\s)\/\/[^\n]*/g, '$1');
    }
  }
  throw new Error(`\`${selector}\` is never closed`);
}

describe('the header controls grow a 24px target on a coarse pointer', () => {
  /**
   * The mixin, not a hand-rolled box, and the argument is half the assertion.
   *
   * `touch-target` already owns the `@media (pointer: coarse)` gate and the
   * centred `::after`; re-implementing either here would be a second copy of a
   * decision the theme layer makes. The `$size` is what this call has to say
   * for itself: the default is 44px, the halo is CENTRED, and a 44px halo
   * reaches 22px to each side — far enough to swallow the filter trigger 18px
   * away and take its taps. 24px is the criterion's own number and the widest
   * one the pair can carry.
   */
  it('includes `touch-target` at 24px on the sort button', () => {
    expect(block('&__sort-btn')).toMatch(/@include theme\.touch-target\(\$size: 24px\)/);
  });

  it('includes it on the filter TRIGGER, which is the element that owns the click', () => {
    // Never on the `<wr-table-filter>` host: the pseudo-element belongs to
    // whatever element carries it, so a tap on a host-owned halo targets the
    // host and opens no dropdown at all.
    expect(block('&__trigger')).toMatch(/@include theme\.touch-target\(\$size: 24px\)/);
  });

  it('has exactly those two includes, both at 24px', () => {
    const calls = CODE.match(/@include theme\.touch-target\([^)]*\)/g) ?? [];
    expect(calls).toHaveLength(2);
    for (const call of calls) expect(call).toContain('$size: 24px');
  });

  /**
   * A fine pointer sees 14.6.0's geometry, and this is the case that says so.
   *
   * The whole point of routing through the mixin is that nothing outside
   * `@media (pointer: coarse)` moves: no minimum size, no padding, no width or
   * height on either control. Measured in Chromium against a build of
   * `origin/main`, both themes — caret 12x12, funnel 12x12, 6px between them,
   * header row 40.5px — identical to the pixel. An unconditional `min-*-size`
   * here is precisely the change that was refused, so it fails the suite.
   */
  it('adds no unconditional sizing to either control', () => {
    for (const selector of ['&__sort-btn', '&__trigger']) {
      const rule = block(selector);
      expect(rule, selector).not.toMatch(/min-(?:inline|block|width|height)/);
      expect(rule, selector).not.toMatch(/^\s*(?:width|height|min-width|min-height|inline-size|block-size):/m);
    }
  });

  /**
   * The one thing that keeps the two halos from overlapping, and it is
   * arithmetic rather than taste. Each halo is 24px wide and centred on its
   * control, so two of them need 24px between centres; two 12px glyphs give
   * that only at a 12px gap. At the shipped 6px they overlap by 6px and the
   * filter — later in the DOM, so painted on top — takes that strip of the sort
   * button's slack, which would make the promise of a 24px touch target false
   * for the very pair this exists for.
   *
   * It is also the one declaration a browser can hold this fix to. axe reads
   * the control's own 12x12 in both pointer modes and never the halo, so what
   * makes the pair PASS `target-size` under a coarse pointer is this gap and
   * nothing else: 24px between centres, WCAG 2.5.8's spacing exception, zero
   * nodes coarse against two fine — and two again at 0.375rem. This case is the
   * PR-time half of that, since the browser half runs nightly at best.
   */
  it('opens the inner row to 0.75rem under the same media query, and only there', () => {
    const rule = block('&__th-inner');
    expect(rule).toMatch(/gap:\s*0\.375rem/);
    expect(rule).toMatch(/@media \(pointer: coarse\) \{\s*gap:\s*0\.75rem;/);
  });

  /**
   * The gate on the gate: one coarse-pointer block in the whole stylesheet, and
   * it is that one. A second `(pointer: coarse)` block is not by itself wrong,
   * but it is the shape every "while I was here" widening takes, and this file
   * is the only thing standing between the coarse-only decision and an
   * every-pointer one.
   *
   * Only the coarse blocks are counted, and the narrowing is deliberate: this
   * stylesheet happens to hold no other `@media` today, so a count of every
   * query would also fail on a `print` rule or a width breakpoint — neither of
   * which can widen a touch target, and neither of which this case has anything
   * to say about.
   */
  it("keeps that block the stylesheet's only coarse-pointer rule", () => {
    expect(CODE.match(/@media \(pointer: coarse\)/g)).toHaveLength(1);
  });
});

describe('the filter count pill owns its own line box', () => {
  it('declares a line-height beside its font-size', () => {
    const rule = block('&__count');
    expect(rule).toMatch(/font-size:\s*0\.625rem/);
    // Unitless, so a consumer who enlarges the numeral gets a pill that grows
    // with it — and, more to the point, so `font: inherit` from a reset cannot
    // decide the pill's height. 10px x 1.2 is the 12px it always drew without
    // one.
    expect(rule).toMatch(/line-height:\s*1\.2\b/);
  });

  it('keeps the trigger on `font-size` rather than the `font` shorthand', () => {
    // The shorthand would re-introduce the same inherited 1.25rem from the
    // ngwr side, which is the shape of the bug the pill just grew a defence
    // against.
    const rule = block('&__trigger');
    expect(rule).toMatch(/font-size:\s*inherit/);
    expect(rule).not.toMatch(/^\s*font:\s/m);
  });
});
