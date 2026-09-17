import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * ⚠️ This guards the RULE, not the painting.
 *
 * `anchored-arrow` draws the arrow `wr-popover`, its tooltip mode, `wr-popconfirm`
 * and `wr-dropdown` hang off their panels, as a `::after` square rotated 45°. Which
 * two borders outline its tip is decided by that rotation, so they are physical,
 * and a panel placed to the SIDE of its trigger under `dir="rtl"` used to keep the
 * LTR pair: the arrow moved to the mirrored edge (its inset is logical) and the
 * outline stayed behind, painting the two faces tucked inside the panel.
 *
 * jsdom loads no stylesheet and the workspace declares no `sass`, so nothing here
 * can compile the mixin or see a border. Measured instead in Chromium against the
 * built showcase, on `wr-popover` at `right-start` with `dir="rtl"`: before, the
 * arrow sat at `right: -4px` with `border-bottom` and `border-left` painted (the
 * two faces pointing into the panel); after, `border-top` and `border-right`, the
 * two pointing out at the trigger — the pair LTR paints for the mirrored placement.
 * What this file pins is the shape of the rule that does it.
 */
describe('the anchored-arrow mixin', () => {
  const code = readFileSync(join(process.cwd(), 'projects/lib/overlay/styles/_arrow.scss'), 'utf8')
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');

  /** The body of the `@if` that emits the RTL outline, or '' when there is none. */
  const rtlBlock =
    /@if \$border != null and \(\$edge == left or \$edge == right\) \{([\s\S]*?)\n {4}\}/.exec(code)?.[1] ?? '';

  it('emits an RTL outline for a bordered panel on a side edge, and only there', () => {
    // Top and bottom are symmetric about the vertical axis; a borderless arrow
    // (tooltip mode) has no outline to mirror.
    expect(rtlBlock).not.toBe('');
  });

  it('paints the mirrored faces, not the ones the placement names', () => {
    expect(rtlBlock).toMatch(/\$mirrored: left;/);
    expect(rtlBlock).toMatch(/@if \$edge == left \{\s*\$mirrored: right;\s*\}/);
    expect(rtlBlock).toMatch(/@include faces\(\$mirrored, \$border\);/);
  });

  it('clears the LTR outline first, since the placement rule has already painted it', () => {
    expect(rtlBlock).toMatch(/border: 0;\s*@include faces\(\$mirrored/);
  });

  it("keys on the direction of the pane's own host rather than on any RTL ancestor", () => {
    // The CDK writes `dir` on the element that directly wraps the pane. A
    // descendant match would outline an overlay created `ltr` inside an `rtl`
    // page as if it were `rtl`.
    expect(rtlBlock).toMatch(/\[dir='rtl'\] > #\{\$pane\}--#\{\$placement\} #\{\$panel\}::after \{/);
  });
});
