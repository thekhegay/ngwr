import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * ⚠️ This guards the RULE, not the behaviour.
 *
 * The defect it stands for is a layout one: the component the service mounts
 * sits between `.wr-dialog-panel` and the dialog's parts, and as a plain block
 * it keeps `min-height: auto` — whose automatic minimum size under flexbox is
 * its content height — so it refuses to shrink, the panel clips it, and
 * `[wrDialogContent]` never becomes a scroll area.
 *
 * jsdom cannot see any of that: it lays nothing out, so `getBoundingClientRect()`
 * is zeros and `scrollHeight` never differs from `clientHeight`. A spec here
 * shaped like "the content scrolls" would pass before the fix as well as after
 * — a false signature on a repair.
 *
 * So the behaviour was verified in a real Chromium instead, over CSS compiled
 * from this folder, at an 883px viewport:
 *
 *              | before | after
 *   panel      |    842 |  842
 *   host       |   1732 |  842
 *   scrolls    |  false | true
 *   footer bot |   1741 |  851   (viewport 883)
 *
 * plus the narrow-viewport sheet path, a dialog with neither title nor footer, a
 * dialog shorter than the screen (which must NOT stretch), and a consumer's own
 * `:host` background / padding / border surviving intact.
 *
 * What is left for a unit test is the thing a refactor can silently take away:
 * the rule's existence. Comments are stripped first, so the assertions cannot be
 * satisfied by the prose above the rule.
 */
describe('the dialog panel stylesheet', () => {
  const source = readFileSync(join(process.cwd(), 'projects/lib/dialog/styles/_index.scss'), 'utf8');

  /** Code only — a `//` line that mentions `min-height: 0` must not count. */
  const code = source
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  it('still constrains the host the service mounts between panel and content', () => {
    expect(code).toMatch(/>\s*\*:not\(\.wr-dialog__close\)\s*\{/);
  });

  it('still lets that host shrink below its content', () => {
    // The half that makes the panel's `max-height` reach the content at all.
    const rule = /> \*:not\(\.wr-dialog__close\)\s*\{([^}]*)\}/.exec(code)?.[1] ?? '';
    expect(rule).toMatch(/min-height:\s*0/);
  });

  it('still makes that host a flex column', () => {
    // The other half: `min-height: 0` alone leaves a block host whose children
    // overflow visibly — measured, footer 861px past the fold.
    const rule = /> \*:not\(\.wr-dialog__close\)\s*\{([^}]*)\}/.exec(code)?.[1] ?? '';
    expect(rule).toMatch(/display:\s*flex/);
    expect(rule).toMatch(/flex-direction:\s*column/);
  });

  it('still exempts the built-in dismiss button', () => {
    // It is a panel child too, and absolutely positioned: the flex properties
    // would skip it anyway, but `display: flex` would re-lay-out its icon.
    expect(code).not.toMatch(/>\s*\*\s*\{/);
  });

  it('still bounds the panel, clips it, and stacks it as a column', () => {
    // The rule above only matters because the panel caps its own height — and
    // the panel has to be a flex column itself, or its child is not a flex item
    // and `min-height: 0` has nothing to act on.
    expect(code).toMatch(/max-height:\s*calc\(100dvh/);
    expect(code).toMatch(/overflow:\s*hidden/);

    const panelRule = /\.wr-dialog-panel\s*\{([\s\S]*?)\n\s+>/.exec(code)?.[1] ?? '';
    expect(panelRule).toMatch(/display:\s*flex/);
    expect(panelRule).toMatch(/flex-direction:\s*column/);
  });

  it('still gives the content its own scroll area', () => {
    expect(code).toMatch(/&__content\s*\{[^}]*overflow:\s*auto/);
  });
});
