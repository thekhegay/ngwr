/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The third a11y gate, and the one that covers what the other two structurally
 * cannot: a state the user has to CREATE.
 *
 * `check:a11y` reads prerendered HTML. `check:contrast` drives a real browser
 * but measures a page at REST. Between them they never reach a hover, a focus
 * ring, or anything inside an overlay — and that is where most of this library
 * lives. Seven real AA colour failures were found by hand in those states, every
 * one while both gates were green: five had been shipped for majors
 * (`wr-option--selected`, `wr-tree__row--selected`, `wr-cascader__opt--active`,
 * the command-palette option, `wr-segmented__option:hover`, all 4.17–4.19:1 in
 * the LIGHT theme), and the seventh was a `<kbd>` whose translucent background
 * composited over a tint the muted role was never calibrated against.
 *
 * Colour was where it started and not where it ended. The STRUCTURAL rules had
 * never run inside an overlay either, for the same reason: `nested-interactive`
 * never saw the window taskbar's close button — a `role="button"` span with
 * `tabindex="0"` inside the tab's own `<button>` — because a tab exists only
 * while a window is minimized. That one was found by reading a template. This
 * gate now runs the full rule set in every state it drives, which costs nothing:
 * the state is already open and already settled.
 *
 * The design follows from the way those audits went wrong before they went
 * right:
 *
 * - **A state that did not paint must fail, not pass.** A clean axe run over an
 *   element that never rendered is indistinguishable from a clean axe run over
 *   one that did. Every entry names a `target`, and the target is asserted
 *   visible with a real box before anything is measured. `.wr-context-menu-item
 *   :focus-visible` is why: items carry `tabindex="-1"` and the menu focuses its
 *   own host, so that selector can never match, and an audit that "checked" it
 *   was reporting on nothing.
 * - **The baseline is keyed by NODE, not by count.** `check:contrast` gates on
 *   how many ROUTES a rule appears on, so a brand-new violation on a route that
 *   was already failing passes silently — that is not hypothetical, it is how
 *   `wr-calendar__day--today` slipped through at 4.06:1. Here every allowed
 *   failure is listed by its own axe target, and anything not listed is new.
 * - **Both themes.** `-ink` is a `color-mix` toward `--wr-color-dark`, which
 *   flips per theme; one theme is half the surface.
 * - **`:hover` is forced through CDP, not the mouse.** A real pointer has one
 *   position, so a hover state under another overlay, off-screen, or behind a
 *   scroll is unreachable — and moving the mouse to reach it changes what else
 *   is hovered. `CSS.forcePseudoState` sets the flag on the one node and leaves
 *   the rest of the page alone.
 *
 * What it does NOT do: enumerate states automatically. The list is curated, and
 * a curated list rots quietly, so the run finishes by reading the library's own
 * SCSS for state-dependent colour rules and printing which classes it never
 * painted. That number is the honest measure of this gate's reach.
 *
 * Nightly, like `check:contrast`, and for the same reason: it needs a browser.
 *
 * Usage:
 *   pnpm check:state-a11y                 # after build:showcase
 *   pnpm check:state-a11y --theme=dark    # one theme
 *   pnpm check:state-a11y --filter=select # only states whose id matches
 *   pnpm check:state-a11y --verbose       # every node, plus the coverage list
 *   pnpm check:state-a11y --probe         # report every unreachable state instead of the first
 */

import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { exit } from 'node:process';

import type { AxeResults, ImpactValue } from 'axe-core';
import { chromium, type Browser, type CDPSession, type Page } from 'playwright';

import { err } from './lib/log/err';
import { info } from './lib/log/info';
import { ROOT_PATH } from './lib/paths/root';
import { STATES, type State, type Step } from './lib/state-a11y/states';

const DIST = resolve(ROOT_PATH, 'dist/showcase');
const BASELINE_PATH = resolve(ROOT_PATH, 'scripts/state-a11y-baseline.json');

/**
 * Everything axe knows, minus one.
 *
 * It started as the two rules `check:contrast` owns, on the theory that colour
 * was the gap. It is not: `check:a11y` reads PRERENDERED HTML, so no structural
 * rule has ever run inside an overlay either — `nested-interactive` never saw
 * the window taskbar's close button, a `role="button"` span with `tabindex="0"`
 * inside the tab's own `<button>`, because a tab exists only while a window is
 * minimized. That was found by reading the template. Running the full set here
 * costs nothing extra: the state is already open and already settled.
 *
 * `color-contrast-enhanced` is AAA and this library targets AA, so it is off for
 * the same reason `check:a11y` turns it off.
 */
const DISABLED_RULES = ['color-contrast-enhanced'];

/**
 * Rules axe will not run unless asked, and rules this gate must never lose.
 *
 * `target-size` is in `axe.getRules()` and is NOT in a default `axe.run()` — the
 * WCAG 2.2 rules are opt-in. Switching this gate from `runOnly: [color-contrast,
 * target-size]` to the full set therefore SILENTLY dropped it, and the sweep
 * printed four "no longer fails — drop it from the baseline" lines about
 * findings that were still on the page. Nothing distinguishes a rule that passed
 * from one that never ran, which is the same trap as a state that never painted,
 * one level up.
 *
 * So: enable them explicitly, and then verify they appear in the RESULT. The
 * check below is the load-bearing half — the enable list alone is a promise.
 */
const ALWAYS_ON = ['target-size'];
const REQUIRED_RULES = ['color-contrast', 'target-size', 'nested-interactive'];
const FAILING_IMPACTS: readonly ImpactValue[] = ['serious', 'critical'];

const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve('axe-core'), 'utf8');

/** `--probe`: collect unreachable states instead of stopping at the first. */
const PROBE = process.argv.includes('--probe');

const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

/** Same static host as `check-contrast.ts`: `<base href="/">` rules out `file://`. */
function serve(): Promise<{ server: Server; origin: string }> {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let file = join(DIST, decodeURIComponent(url.pathname));

    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) file = join(DIST, 'index.html');

    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });

  return new Promise(done => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      done({ server, origin: `http://127.0.0.1:${port}` });
    });
  });
}

/**
 * `:hover` and `:focus-visible` through the devtools protocol.
 *
 * Playwright can move a real mouse, and for one element on an empty page that
 * works — but a hovered row inside an open overlay, or a state that only exists
 * while another element is hovered, cannot be reached by a pointer that has one
 * position. `CSS.forcePseudoState` flags the node itself. It also survives the
 * scrolling and re-layout that opening an overlay causes, which a coordinate
 * does not.
 */
async function force(cdp: CDPSession, selector: string, classes: readonly string[]): Promise<void> {
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
  // The FIRST match only. Forcing every row hovered at once composites
  // backgrounds no user can produce, and a violation that needs an impossible
  // page is worse than no violation at all.
  const [nodeId] = nodeIds;
  if (nodeId) await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [...classes] });
}

async function drive(page: Page, cdp: CDPSession, step: Step): Promise<void> {
  // A short timeout on purpose: a step that cannot run is a broken entry, and
  // waiting the default thirty seconds to say so makes iterating on the table
  // painful for no information.
  if ('click' in step) await page.locator(step.click).first().click({ force: true, timeout: 5000 });
  else if ('rightClick' in step)
    await page.locator(step.rightClick).first().click({ button: 'right', force: true, timeout: 5000 });
  else if ('hover' in step) await force(cdp, step.hover, ['hover']);
  else if ('focus' in step) {
    await page.locator(step.focus).first().evaluate(el => (el as HTMLElement).focus(), undefined, { timeout: 5000 });
    await force(cdp, step.focus, ['focus', 'focus-visible']);
  } else if ('fill' in step) await page.locator(step.fill[0]).first().fill(step.fill[1], { timeout: 5000 });
  else if ('press' in step) await page.keyboard.press(step.press);
  else if ('wait' in step) await page.waitForTimeout(step.wait);
}

/**
 * Wait for the state to stop moving.
 *
 * `reducedMotion: 'reduce'` is what keeps `check:contrast` honest, and it is not
 * enough here: it sets the media query, and an overlay's enter animation runs
 * anyway. Measured mid-flight, a dialog reports its title at 3.68:1 — `#484a4f`
 * on `#a6a7a8`, which is neither of the colours involved but the composite of a
 * half-transparent panel over a half-transparent backdrop. Those numbers
 * describe a frame nobody sees for longer than 200ms, and reporting them as a
 * design failure is the same mistake in the opposite direction as measuring a
 * state that never painted.
 */
async function settle(page: Page, selector: string): Promise<{ ok: boolean; reason: string }> {
  const target = page.locator(selector).first();

  // Sampled from NODE, one short evaluate at a time — not one long-running
  // evaluate that loops inside the page. A three-second `setTimeout` loop in
  // the page runs its timers fine and yet observes the very same six
  // transitions "running" the whole way: a headless renderer with nothing
  // asking it for a frame does not advance them, so the wait that was supposed
  // to let the state settle is the reason it never does.
  const deadline = Date.now() + 3000;
  let last = '';
  let same = 0;

  while (Date.now() < deadline && same < 5) {
    await page.waitForTimeout(50);

    let sample: string;
    try {
      sample = await target.evaluate(
        el => {
          let sig = '';
          // ANCESTORS too. An overlay's enter animation runs on the CDK pane,
          // so `.wr-popconfirm` reads `opacity: 1` while the box it sits in is
          // at 0.8 — and axe measures the composite, not the declaration. That
          // was the whole 2.73:1 report: white at 80% over danger at 80%.
          //
          // The signature is compared across TIME rather than against
          // `transform: none`, because every CDK pane carries a permanent
          // positioning translate — `matrix(1, 0, 0, 1, 0, -8)` on the
          // popconfirm — and "settled means no transform" is a condition that
          // can never be met.
          for (let node: HTMLElement | null = el as HTMLElement; node; node = node.parentElement) {
            const s = getComputedStyle(node);
            sig += `${s.opacity}|${s.transform};`;
          }

          // Document-wide, and this is why the dialog reported 3.68:1: axe
          // composites the CDK backdrop into the panel's background even
          // though the panel paints above it, so a backdrop still fading in
          // dims an element that has itself stopped moving.
          //
          // Two filters, and both earn their place. Endless animations do not
          // count — a spinner inside an overlay never finishes, so waiting for
          // one would time out every state that holds one. And only animations
          // that can change a COLOUR count: a toast runs a finite progress bar
          // for its whole dismiss timeout, which moves nothing this gate
          // measures, and counting it means no state containing a toast ever
          // settles.
          const tinting = ['opacity', 'color', 'backgroundColor', 'background', 'filter', 'backdropFilter'];
          let running = 0;
          for (const animation of document.getAnimations()) {
            if (animation.playState !== 'running') continue;
            const duration = animation.effect?.getComputedTiming().activeDuration ?? Infinity;
            if (!Number.isFinite(duration)) continue;

            const properties = new Set<string>();
            const transition = (animation as CSSTransition).transitionProperty;
            if (transition) properties.add(transition.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()));
            const effect = animation.effect;
            if (effect && effect instanceof KeyframeEffect) {
              for (const frame of effect.getKeyframes()) for (const key of Object.keys(frame)) properties.add(key);
            }

            if (tinting.some(p => properties.has(p))) running += 1;
          }
          return `${sig}#${running}`;
        },
        undefined,
        { timeout: 5000 }
      );
    } catch (error) {
      // Never swallow this. A settle that reports success when it could not
      // run hands the next assertion a page nobody looked at — and it is how
      // `__name is not defined`, thrown by every one of these evaluates, went
      // unnoticed through four rounds of "why is the dialog still faded".
      return { ok: false, reason: `could not measure: ${(error as Error).message.split('\n')[0]}` };
    }

    // FIVE consecutive identical samples. An overlay is inserted with its final
    // styles and picks up the enter animation on the NEXT frame, so one check
    // taken the instant it becomes visible reports "settled" about a state that
    // has not started moving yet.
    same = sample === last ? same + 1 : 0;
    last = sample;
  }

  return { ok: same >= 5 && last.endsWith('#0'), reason: last.slice(-140) };
}

/**
 * Strip positional pieces out of an axe target so a baseline entry survives a
 * change of month.
 *
 * axe reports `…__week[role="row"]:nth-child(1) > …__day:nth-child(3)`, and the
 * calendar's out-of-month days sit at different indices in April than in May —
 * a baseline written against the raw selector would expire on its own and
 * report six brand-new failures the morning it did. What identifies the node
 * for this purpose is its classes and its role, not where it sits in the row.
 */
function normalize(target: string): string {
  const stripped = target
    .replace(/:nth-child\(\d+\)/g, '')
    // Angular's per-component attribute. `_ngcontent-ng-c2047152735` is a build
    // hash: it changes whenever the showcase is rebuilt, so a key holding one
    // expires on its own and reports the same finding as brand new.
    .replace(/\[_ng[a-z]+-[a-z0-9-]+="[^"]*"\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // The failing NODE, not the path to it. axe walks up to the doc-section when
  // a scope is wide, and a key carrying six ancestors is one showcase layout
  // change away from being wrong about a rule that has not moved.
  const leaf = stripped.split('>').pop()?.trim() ?? stripped;
  return leaf || stripped;
}

/**
 * A state the run could not reach, which is a FAILURE and not a skip.
 *
 * It stops the run by default, because the alternative is a gate that quietly
 * measures fewer and fewer states as selectors drift. `--probe` collects them
 * instead and reports the lot at the end — the mode for extending the table,
 * where finding one broken entry per full sweep is the difference between an
 * afternoon and twenty minutes.
 */
function unreachableState(state: State, theme: Theme, why: string, into: string[]): readonly Failure[] {
  const line = `"${state.id}" (${theme}) ${why}`;
  if (PROBE) {
    into.push(line);
    return [];
  }
  err(`\n✘ state-a11y: ${line}`);
  err(`  A state this gate cannot reach is not a state it is checking. Fix the steps or drop the entry.`);
  err(`  Extending the table? --probe reports every one of these instead of stopping at the first.\n`);
  exit(1);
}

interface Failure {
  readonly state: string;
  readonly theme: Theme;
  readonly rule: string;
  readonly target: string;
  readonly detail: string;
}

/**
 * axe measured it already; re-deriving is where a `color-mix` result in
 * `color(srgb …)` form quietly turns into nonsense.
 *
 * Both rules, because a report that prints the ratio for one and bare markup
 * for the other makes half the findings unactionable — a `target-size` line
 * without the measured box says only that something is too small.
 */
function describe(node: { any?: readonly { data?: unknown }[] }): string {
  const data = node.any?.find(c => c.data && typeof c.data === 'object')?.data as
    | {
        fgColor?: string;
        bgColor?: string;
        contrastRatio?: number;
        expectedContrastRatio?: string;
        minSize?: number;
        width?: number;
        height?: number;
      }
    | undefined;
  if (!data) return '';
  if (data.contrastRatio) {
    return `${data.contrastRatio}:1 (wants ${data.expectedContrastRatio ?? '?'}) ${data.fgColor ?? '?'} on ${data.bgColor ?? '?'}`;
  }
  if (data.width && data.height) return `${data.width}×${data.height}px (wants ${data.minSize ?? 24})`;
  return '';
}

/**
 * Runs one state, in one theme, and returns what axe objected to inside it —
 * plus every `.wr-*` class the state actually painted, which is what the
 * coverage report at the end is built from.
 */
async function audit(
  page: Page,
  origin: string,
  state: State,
  theme: Theme,
  painted: Set<string>,
  unreachable: string[]
): Promise<readonly Failure[]> {
  await page.goto(`${origin}${state.route}`, { waitUntil: 'networkidle' });

  const applied = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (applied !== theme) {
    err(`\n✘ state-a11y: ${state.route} came up as "${applied ?? 'unset'}" with "${theme}" requested.\n`);
    exit(1);
  }

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');

  // A step that cannot run is the same class of problem as a state that does
  // not paint — the entry is wrong — so it reports the same way rather than
  // taking the whole sweep down with a raw Playwright stack.
  try {
    for (const step of state.steps) await drive(page, cdp, step);
  } catch (error) {
    const why = `could not be driven: ${(error as Error).message.split('\n')[0]}`;
    return unreachableState(state, theme, why, unreachable);
  }

  // THE assertion. Everything below this line is only meaningful because the
  // state is known to be on screen — an axe pass over an element that never
  // rendered looks exactly like an element that renders correctly.
  const target = page.locator(state.target).first();
  try {
    await target.waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    return unreachableState(state, theme, `never painted — no visible "${state.target}" on ${state.route}`, unreachable);
  }

  // A state still in motion measures a frame. Say so rather than reporting the
  // number as a design — the fix is a step, not a token.
  const settled = await settle(page, state.scope ?? state.target);
  if (!settled.ok) {
    const why = `never stopped moving — anything measured here is one frame of an animation. Last sample: ${settled.reason}`;
    return unreachableState(state, theme, why, unreachable);
  }

  const box = await target.boundingBox();
  if (!box || box.width < 2 || box.height < 2) {
    const why = `matched "${state.target}" but it has no box (${JSON.stringify(box)})`;
    return unreachableState(state, theme, why, unreachable);
  }

  const scope = state.scope ?? state.target;
  for (const cls of await page.locator(scope).first().evaluate(el => {
    const seen = new Set<string>();
    for (const node of [el, ...el.querySelectorAll('*')]) {
      for (const c of node.classList) if (c.startsWith('wr-')) seen.add(c);
    }
    return [...seen];
  })) {
    painted.add(cls);
  }

  await page.addScriptTag({ content: AXE_SOURCE });
  const results = (await page.evaluate(
    async ({ sel, off, on }: { sel: string; off: readonly string[]; on: readonly string[] }) => {
      const runner = (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<AxeResults> } }).axe;
      return runner.run(sel, {
        resultTypes: ['violations'],
        rules: {
          ...Object.fromEntries(off.map(id => [id, { enabled: false }])),
          ...Object.fromEntries(on.map(id => [id, { enabled: true }])),
        },
      });
    },
    { sel: scope, off: DISABLED_RULES, on: ALWAYS_ON }
  )) as AxeResults;

  // Did the rules this gate exists for actually execute? A rule that never ran
  // reports exactly like a rule that found nothing.
  const ran = new Set(
    [...results.violations, ...results.passes, ...results.incomplete, ...results.inapplicable].map(r => r.id)
  );
  const missing = REQUIRED_RULES.filter(id => !ran.has(id));
  if (missing.length > 0) {
    err(`\n✘ state-a11y: axe did not run ${missing.join(', ')} on "${state.id}" — the result says nothing about them.\n`);
    exit(1);
  }

  const out: Failure[] = [];
  for (const violation of results.violations) {
    if (!FAILING_IMPACTS.includes(violation.impact ?? 'minor')) continue;
    for (const node of violation.nodes) {
      out.push({
        state: state.id,
        theme,
        rule: violation.id,
        target: normalize(Array.isArray(node.target) ? node.target.join(' ') : String(node.target)),
        detail: describe(node) || node.html.slice(0, 80),
      });
    }
  }
  return out;
}

type Baseline = Record<string, { readonly targets: readonly string[]; readonly note: string }>;

const readBaseline = (): Baseline => {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;
  } catch {
    return {};
  }
};

/**
 * Every `.wr-*` class whose colour depends on a state — read from the library's
 * own stylesheets rather than from a list someone maintains by hand.
 *
 * The point is not to gate on it. It is that a curated state table looks
 * identical whether it covers the catalog or has stopped growing, and this is
 * the only cheap way to tell those apart.
 */
function stateClasses(): ReadonlySet<string> {
  const out = new Set<string>();
  // Read the BUILT stylesheet, not the sources. SCSS nests and interpolates
  // (`&__option--active`), so a full class name barely appears in a `.scss`
  // file — the compiled sheet has every one of them expanded, which is also
  // exactly the set the browser can match.
  const sheets = readdirSync(DIST).filter(f => f.startsWith('styles-') && f.endsWith('.css'));
  const stateish = /:hover|:focus-visible|:focus\b|:active\b|--active|--selected|--current|--checked|--highlighted|--today|\[aria-selected="true"\]/;

  for (const sheet of sheets) {
    const css = readFileSync(join(DIST, sheet), 'utf8');
    for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/(^|[;{\s])(color|background|background-color|border-color|fill|outline-color)\s*:/.test(body)) continue;
      if (!stateish.test(selector)) continue;
      // The SUBJECT of the selector — the element the declaration paints — is
      // the last class in it. An ancestor `.wr-x--active` describes the state,
      // not the thing whose colour is at stake.
      const classes = [...selector.matchAll(/\.(wr-[a-z0-9_-]+)/g)].map(m => m[1]);
      const subject = classes.at(-1);
      if (subject) out.add(subject);
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const only = args.find(a => a.startsWith('--theme='))?.split('=')[1] as Theme | undefined;
  const filter = args.find(a => a.startsWith('--filter='))?.split('=')[1] ?? '';

  if (!existsSync(join(DIST, 'index.html'))) {
    err('\n✘ state-a11y: dist/showcase not found. Run build:showcase first.\n');
    exit(1);
  }

  const themes = only ? THEMES.filter(t => t === only) : THEMES;
  if (only && themes.length === 0) {
    err(`\n✘ state-a11y: unknown theme "${only}". Use light or dark.\n`);
    exit(1);
  }

  const targets = STATES.filter(s => s.id.includes(filter));
  if (targets.length === 0) {
    err(`\n✘ state-a11y: no state matches "${filter}".\n`);
    exit(1);
  }

  const { server, origin } = await serve();
  let browser: Browser | null = null;
  const failures: Failure[] = [];
  const painted = new Set<string>();
  const unreachable: string[] = [];

  try {
    browser = await chromium.launch();
    for (const theme of themes) {
      const context = await browser.newContext({
        colorScheme: theme,
        // Without this an animation caught mid-flight reports a frame rather
        // than a design — and every one of these states is mid-animation the
        // instant it opens.
        reducedMotion: 'reduce',
        viewport: { width: 1280, height: 900 },
      });
      // Seeded BEFORE the first paint, so one load per state is enough: the
      // theme service reads storage on bootstrap and there is nothing to undo.
      await context.addInitScript(t => localStorage.setItem('wr-theme', t), theme);
      const page = await context.newPage();

      info(`  ${theme}: ${targets.length} states`);
      for (const state of targets) failures.push(...(await audit(page, origin, state, theme, painted, unreachable)));

      await context.close();
    }
  } finally {
    await browser?.close();
    server.close();
  }

  const baseline = readBaseline();

  // Grouped by key and then by node. Six cells of one calendar row failing for
  // one reason is one thing to fix, and printing it six times — each with the
  // same paragraph of baseline note attached — buries the line that matters.
  const grouped = new Map<string, Map<string, { count: number; detail: string }>>();
  for (const failure of failures) {
    const key = `${failure.rule} (${failure.theme}) — ${failure.state}`;
    const nodes = grouped.get(key) ?? new Map<string, { count: number; detail: string }>();
    const seen = nodes.get(failure.target) ?? { count: 0, detail: failure.detail };
    nodes.set(failure.target, { count: seen.count + 1, detail: seen.detail });
    grouped.set(key, nodes);
  }

  const unexpected: string[] = [];
  for (const [key, nodes] of grouped) {
    const allowed = baseline[key]?.targets ?? [];
    const fresh = [...nodes.keys()].filter(target => !allowed.includes(target));

    if (fresh.length === 0) {
      info(`  · ${key} — ${nodes.size} node(s), all baselined`);
      if (verbose) info(`      ${baseline[key]?.note ?? ''}`);
      continue;
    }

    err(`  ✘ ${key}`);
    for (const target of fresh) {
      const node = nodes.get(target);
      unexpected.push(`${key}: ${target}`);
      err(`      ${target}${node && node.count > 1 ? ` ×${node.count}` : ''} — ${node?.detail ?? ''}`);
    }
  }

  // A baselined failure that stopped happening is debt someone paid; say so,
  // but only after a FULL sweep — a filtered run has simply not looked.
  if (targets.length === STATES.length && themes.length === THEMES.length) {
    for (const [key, entry] of Object.entries(baseline)) {
      if (!grouped.has(key)) info(`  ✓ ${key} no longer fails — drop it from the baseline (${entry.note})`);
    }

    const classes = stateClasses();
    const covered = [...classes].filter(c => painted.has(c));
    const missing = [...classes].filter(c => !painted.has(c)).sort();
    info(
      `\n  coverage: ${covered.length}/${classes.size} state-dependent classes painted by this gate` +
        ` (${targets.length} states, ${painted.size} classes reached)`
    );
    if (verbose && missing.length > 0) info(`  unpainted: ${missing.join(', ')}`);
  }

  if (unreachable.length > 0) {
    err(`\n✘ ${unreachable.length} state(s) could not be reached:`);
    for (const line of unreachable) err(`  · ${line}`);
    err('');
    exit(1);
  }

  if (unexpected.length > 0) {
    err(`\n✘ ${unexpected.length} accessibility failure(s) in interactive states, not in the baseline.\n`);
    exit(1);
  }

  info(`\n✓ No new interactive-state violations (${targets.length} states × ${themes.length} theme(s)).`);
}

await main();
