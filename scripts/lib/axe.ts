/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * axe-core for the a11y gates: its source, the failing impacts, a Playwright
 * runner, a per-rule tally and a one-line account of a measured node.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import type { AxeResults, ImpactValue, NodeResult, Result, RuleObject, RunOptions } from 'axe-core';
import type { Page } from 'playwright';

/**
 * axe-core's source, to evaluate inside a page or a JSDOM window. Importing it
 * into Node does not work: axe captures `window` / `document` at module load.
 */
const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve('axe-core'), 'utf8');

/** The impacts a gate fails on. `minor` and `moderate` are reported but do not fail. */
const FAILING_IMPACTS: readonly ImpactValue[] = ['serious', 'critical'];

/** Whether a violation of this impact fails a gate. A missing impact never does. */
function isFailingImpact(impact: ImpactValue | undefined): boolean {
  return FAILING_IMPACTS.includes(impact ?? 'minor');
}

/** The `axe` global that `AXE_SOURCE` defines. */
interface AxeRunner {
  readonly run: (context: unknown, options?: unknown) => Promise<AxeResults>;
}

/** A window that `AXE_SOURCE` has been evaluated in. */
interface AxeWindow {
  readonly axe: AxeRunner;
}

/** Where `runAxe` looks; it has to be serializable into the page. */
type AxeContext = string | { readonly include: readonly string[] };

/**
 * Runs axe inside a Playwright page, injecting `AXE_SOURCE` once per document.
 * A `null` context runs on the whole document.
 */
async function runAxe(page: Page, context: AxeContext | null, options: RunOptions): Promise<AxeResults> {
  const loaded = await page.evaluate(() => typeof (window as unknown as Partial<AxeWindow>).axe?.run === 'function');
  if (!loaded) await page.addScriptTag({ content: AXE_SOURCE });

  // No named function inside: esbuild's keep-names adds a `__name` call the page lacks.
  return page.evaluate(
    async arg => {
      const runner = (window as unknown as AxeWindow).axe;
      return arg.context === null ? runner.run(arg.options) : runner.run(arg.context, arg.options);
    },
    { context, options }
  );
}

/** An axe `rules` map turning `off` off and `on` on. An id in both ends up on. */
function ruleToggles(off: readonly string[], on: readonly string[] = []): RuleObject {
  return {
    ...Object.fromEntries(off.map(id => [id, { enabled: false }])),
    ...Object.fromEntries(on.map(id => [id, { enabled: true }])),
  };
}

/** One rule across a sweep: the routes it failed on and a few of its nodes, printed. */
interface Finding {
  readonly rule: string;
  readonly impact: ImpactValue | undefined;
  readonly help: string;
  readonly helpUrl: string;
  readonly routes: Set<string>;
  readonly nodes: string[];
}

/** How `recordViolation` keeps nodes and words its help. */
interface RecordOptions {
  /** Prints one node; `route` is the page it failed on. */
  readonly format: (node: NodeResult, route: string) => string;
  /** Nodes taken from each violation. Default 1. */
  readonly perViolation?: number;
  /** Nodes kept per finding in all. Default unlimited. */
  readonly max?: number;
  /** Take nodes only from the violation that opened the finding. */
  readonly firstOnly?: boolean;
  /** Put in front of axe's help as `prefix: help`. */
  readonly prefix?: string;
}

/**
 * Files one axe violation under `key`, the finding's `rule`. The first one under
 * a key sets impact, help and URL; later ones add their route and nodes.
 */
function recordViolation(
  into: Map<string, Finding>,
  key: string,
  violation: Result,
  route: string,
  options: RecordOptions
): void {
  const { format, perViolation = 1, max = Infinity, firstOnly = false, prefix = '' } = options;
  const known = into.get(key);
  const found = known ?? {
    rule: key,
    impact: violation.impact,
    help: prefix ? `${prefix}: ${violation.help}` : violation.help,
    helpUrl: violation.helpUrl,
    routes: new Set<string>(),
    nodes: [],
  };
  found.routes.add(route);
  if (!known || !firstOnly) {
    for (const node of violation.nodes.slice(0, perViolation)) {
      if (found.nodes.length < max) found.nodes.push(format(node, route));
    }
  }
  into.set(key, found);
}

/** The part of an axe node `describeAxeNode` reads. */
interface AxeNodeChecks {
  readonly any?: readonly { readonly data?: unknown }[];
}

/** What axe's `color-contrast` and `target-size` checks put in `data`. */
interface AxeCheckData {
  readonly fgColor?: string;
  readonly bgColor?: string;
  readonly contrastRatio?: number;
  readonly expectedContrastRatio?: string;
  readonly fontSize?: string;
  readonly fontWeight?: string;
  readonly minSize?: number;
  readonly width?: number;
  readonly height?: number;
}

/**
 * What axe measured on a failing node, in one line, from axe's own numbers: a
 * `color-mix` colour is `color(srgb …)` with 0–1 channels, so never re-derive.
 * `'bracketed'` is ` [ratio, wants, colours, font]`, for contrast nodes only.
 */
function describeAxeNode(node: AxeNodeChecks, form: 'inline' | 'bracketed' = 'inline'): string {
  const data = node.any?.find(c => c.data && typeof c.data === 'object')?.data as AxeCheckData | undefined;
  if (form === 'bracketed') {
    if (!data?.contrastRatio) return '';
    return ` [${data.contrastRatio}:1, wants ${data.expectedContrastRatio ?? '?'}, ${data.fgColor ?? '?'} on ${data.bgColor ?? '?'}, ${data.fontSize ?? ''} ${data.fontWeight ?? ''}]`;
  }
  if (!data) return '';
  if (data.contrastRatio) {
    return `${data.contrastRatio}:1 (wants ${data.expectedContrastRatio ?? '?'}) ${data.fgColor ?? '?'} on ${data.bgColor ?? '?'}`;
  }
  if (data.width && data.height) return `${data.width}×${data.height}px (wants ${data.minSize ?? 24})`;
  return '';
}

export { AXE_SOURCE, describeAxeNode, isFailingImpact, recordViolation, ruleToggles, runAxe };
export type { AxeContext, AxeNodeChecks, AxeRunner, AxeWindow, Finding, RecordOptions };
