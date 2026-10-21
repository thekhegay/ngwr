/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Layout regression, measured rather than photographed.
 *
 * A5 asked for Playwright screenshot diffs. This is that gate, built on numbers
 * instead of pixels, and the three reasons are worth stating because they are
 * the reasons not to switch back:
 *
 *   - **Size.** The showcase is 214 routes; at two themes that is hundreds of
 *     PNGs and tens of megabytes of binaries in a repository whose entire
 *     source is smaller than that.
 *   - **Platform.** Font rasterisation differs between macOS and the ubuntu
 *     runner, so a pixel baseline captured where the work happens never matches
 *     where it is checked. This gate sidesteps that by measuring HEIGHT, which
 *     is padding and line-height — arithmetic, and identical on both. Width is
 *     not: see `width` in the target list, and the night that proved it.
 *   - **Legibility.** An image diff shows a red blob. `height 36 → 40` in a JSON
 *     diff says what changed, is reviewable in a pull request, and can be
 *     approved by editing one number.
 *
 * What it catches: a token, a density multiplier or a padding change silently
 * resizing controls — the class of regression no other gate reports, because
 * `check:contrast` measures colour and `check:state-a11y` measures roles and
 * names.
 *
 * What it does NOT catch, and nothing here pretends otherwise: colour, shadows,
 * border radii, and anything else that changes how a box is painted rather than
 * how big it is.
 *
 *   pnpm check:layout                 # verify against the baseline
 *   pnpm check:layout --update        # re-record it
 *   pnpm check:layout --filter=button # one target while iterating
 */

import { exit } from 'node:process';

import type { Browser } from 'playwright';

import { narrow, parseFlags } from '../lib/args';
import { readBaselineStrict, writeBaseline } from '../lib/baselines';
import { newPinnedContext } from '../lib/browser-context';
import { openInScheme, requireBuiltShowcase, withDistBrowser } from '../lib/dist-site';
import { LAYOUT_TARGETS, type LayoutTarget } from '../lib/layout/targets';
import { err } from '../lib/log/err';
import { info } from '../lib/log/info';

/**
 * How far a box may move before it is a regression.
 *
 * One pixel, for sub-pixel rounding, and it can stay that tight because the
 * thing that is NOT stable across machines — text-driven width — is no longer
 * compared unless a target opts in. Anything a token change causes is larger:
 * the smallest step the density scale can make is two.
 */
const TOLERANCE = 1;

/** `[width, height]`, or `[height]` where width is text-driven and not compared. */
type Box = readonly number[];
type Baseline = Record<string, readonly Box[]>;

async function measure(
  browser: Browser,
  origin: string,
  theme: 'light' | 'dark',
  targets: readonly LayoutTarget[],
  missing: string[]
): Promise<Baseline> {
  // Pinned exactly as `check:state-a11y` pins its context, and for the same
  // reason: a page that renders differently tomorrow, or on another machine,
  // cannot have a baseline. The clock matters here too — the calendar and
  // event-calendar demos size themselves from today's date.
  const context = await newPinnedContext(browser, { colorScheme: theme, pinClock: true, pinUserAgent: true });

  const out: Baseline = {};
  const page = await context.newPage();

  for (const target of targets) {
    // The context's `colorScheme` is the whole theme switch, and the probe is
    // what proves the page obeyed it. Without one a run in the wrong scheme
    // files its boxes under the other key and says nothing — and since the two
    // schemes record identical boxes today, nobody would ever notice.
    await openInScheme(page, origin, target.route, theme, {
      label: 'layout',
      reason: 'refusing to record a theme that was never painted',
    });

    const locator = page.locator(target.selector);
    const count = await locator.count();

    // A target that matches nothing is a broken entry, not a pass. Recording it
    // as an empty array would compare equal to itself forever — the gate would
    // go on reporting success about a component it stopped looking at. Same
    // rule `check:state-a11y` follows for a state that never painted.
    if (count === 0) {
      missing.push(`  ✘ ${target.id} (${theme}) — no "${target.selector}" on ${target.route}`);
      continue;
    }

    // An entry that measures nothing is indistinguishable from one that passes,
    // so a zero-sized box is reported rather than recorded.
    const boxes: Box[] = [];
    for (let i = 0; i < (target.all ? count : 1); i++) {
      const box = await locator.nth(i).boundingBox();
      if (!box || box.width === 0 || box.height === 0) {
        missing.push(`  ✘ ${target.id}[${i}] (${theme}) — matched but has no box`);
        continue;
      }
      boxes.push(target.width ? [Math.round(box.width), Math.round(box.height)] : [Math.round(box.height)]);
    }
    if (boxes.length > 0) out[`${target.id} (${theme})`] = boxes;
  }

  await context.close();
  return out;
}

async function main(): Promise<void> {
  const { update, filter } = parseFlags('check:layout [--update] [--filter=<substring>]', {
    update: { type: 'boolean', default: false },
    filter: { type: 'string', default: '' },
  });

  requireBuiltShowcase('layout');

  const { targets } = narrow(LAYOUT_TARGETS, {
    filter,
    key: t => t.id,
    message: `No layout target matches --filter=${filter}`,
  });

  const missing: string[] = [];
  let measured: Baseline = {};
  await withDistBrowser('404', async ({ browser, origin }) => {
    for (const theme of ['light', 'dark'] as const) {
      info(`  ${theme}: ${targets.length} target(s)`);
      measured = { ...measured, ...(await measure(browser, origin, theme, targets, missing)) };
    }
  });

  if (missing.length > 0) {
    err('');
    missing.forEach(m => err(m));
    err(
      `\n✘ ${missing.length} target(s) measured nothing. Fix the selector — an entry that finds no element is not a pass.`
    );
    exit(1);
  }

  if (update) {
    writeBaseline('layout', { ...readBaselineStrict<Baseline>('layout'), ...measured });
    info(`\n✓ Recorded ${Object.keys(measured).length} entr(ies) into scripts/baselines/layout.json`);
    return;
  }

  const baseline = readBaselineStrict<Baseline>('layout');
  if (!baseline) {
    err('\nNo baseline yet. Run `pnpm check:layout --update` and commit the result.');
    exit(1);
  }

  const problems: string[] = [];

  for (const [key, boxes] of Object.entries(measured)) {
    const before = baseline[key];
    if (!before) {
      problems.push(`  + ${key} — not in the baseline. Re-record with --update.`);
      continue;
    }
    if (before.length !== boxes.length) {
      problems.push(`  ~ ${key} — ${before.length} box(es) recorded, ${boxes.length} measured.`);
      continue;
    }
    boxes.forEach((box, i) => {
      const was = before[i]!;
      if (was.length !== box.length) {
        problems.push(`  ~ ${key}[${i}] — recorded ${was.length} dimension(s), measured ${box.length}.`);
        return;
      }
      if (box.some((n, axis) => Math.abs(n - was[axis]!) > TOLERANCE)) {
        problems.push(`  ✘ ${key}[${i}] — ${was.join('×')} recorded, ${box.join('×')} measured.`);
      }
    });
  }

  info('');
  if (problems.length > 0) {
    problems.forEach(p => err(p));
    err(`\n✘ ${problems.length} layout change(s). Intended? \`pnpm check:layout --update\` and commit the diff.`);
    exit(1);
  }
  info(`✓ No layout drift (${Object.keys(measured).length} entries × ${TOLERANCE}px tolerance).`);
}

await main();
