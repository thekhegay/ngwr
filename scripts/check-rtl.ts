/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Fails the build when a stylesheet writes a direction-dependent property in
 * PHYSICAL form without saying why.
 *
 * Why this exists: the library was swept to logical properties for RTL (ROADMAP
 * G1). A sweep is a one-time act; the thing that decays is everything written
 * afterwards. `margin-left` is what fingers type, it compiles, it looks correct
 * in every screenshot anyone takes, and it is invisible to every gate the repo
 * has — `pnpm test` does not render, and `check:a11y` runs in JSDOM with no
 * stylesheets at all. Left alone, RTL support rots one convenient declaration at
 * a time and nobody finds out until a user in Riyadh files the issue.
 *
 * What it does NOT do is ban physical properties. Plenty are correct: an
 * animation travels a physical direction, `left: 50%` paired with a physical
 * `translateX(-50%)` must stay a matched pair, and a component whose TypeScript
 * measures `getBoundingClientRect().left` has to agree with its own CSS. The
 * rule is that such a declaration carries a marker naming the reason:
 *
 *     // rtl-ok: centred against a physical translateX, so the pair stays physical
 *     left: 50%;
 *
 * So this is a "say why" gate rather than a "don't" gate — the same shape as the
 * `eslint-disable-next-line` comments already scattered through the templates,
 * and for the same reason: the exceptions are real, so the only thing worth
 * enforcing is that each one was a decision instead of a reflex.
 *
 * The marker must sit within the three lines above the declaration, which is
 * enough for a short explanation without letting one marker cover a whole rule
 * by accident.
 *
 * Wired into `lint` rather than a build, like `check:colors`: `ci.yml`,
 * `deploy.yml` and `publish.yml` all run `pnpm lint` already, so a physical
 * property with no reason fails review, deploy and publish without adding a job
 * to any of them.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const LIB = join(ROOT, 'projects/lib');

/** How far above a declaration the marker may sit. */
const MARKER_REACH = 3;
const MARKER = 'rtl-ok:';

/**
 * Properties whose physical form has a logical counterpart that means the same
 * thing in LTR. `border-*-radius` is deliberately absent: the logical corner
 * names are a poor fit for the pill and squircle shapes this library draws, and
 * every corner rewrite so far has been a judgement call rather than a rename.
 */
const PHYSICAL = new RegExp(
  [
    String.raw`(?:margin|padding)-(?:left|right)`,
    String.raw`border-(?:left|right)(?:-(?:width|color|style))?`,
    String.raw`(?:left|right)`,
    String.raw`text-align`,
    String.raw`float`,
    String.raw`clear`,
  ].join('|')
);

/**
 * Values that need no reason.
 *
 * Two kinds, and conflating them is how this check cries wolf: `center` and
 * `none` carry no direction at all, while `start` / `end` / `inline-start` /
 * `inline-end` ARE the logical answer — `text-align` and `float` are the two
 * properties whose physical form lives in the VALUE rather than in the name, so
 * the property matches the pattern above even after it has been fixed.
 */
const DIRECTIONLESS =
  /^\s*(?:center|justify|start|end|inline-start|inline-end|none|auto|inherit|initial|unset|revert)\b/;

interface Finding {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

function scssFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...scssFiles(path));
    else if (entry.endsWith('.scss')) out.push(path);
  }
  return out;
}

function findings(): Finding[] {
  const found: Finding[] = [];

  for (const file of scssFiles(LIB)) {
    const lines = readFileSync(file, 'utf8').split('\n');

    lines.forEach((line, index) => {
      // A declaration, not a Sass map key or an `@if $edge == left` — those are
      // followed by a value on the same line but are not properties, so anchor
      // on "identifier, colon, value, and something that ends a declaration".
      const match = new RegExp(String.raw`^\s*(${PHYSICAL.source})\s*:\s*([^;{]+);`).exec(line);
      if (!match) return;

      const value = match[2];
      if (DIRECTIONLESS.test(value)) return;
      // `inset-inline-start` etc. never reach here — the pattern is anchored, so
      // only the bare physical names match.

      const context = lines.slice(Math.max(0, index - MARKER_REACH), index + 1).join('\n');
      if (context.includes(MARKER)) return;

      found.push({ file: relative(ROOT, file), line: index + 1, text: line.trim() });
    });
  }

  return found;
}

const found = findings();

if (found.length > 0) {
  console.error(`\n✖ ${found.length} physical CSS ${found.length === 1 ? 'property' : 'properties'} with no reason:\n`);
  for (const { file, line, text } of found) {
    console.error(`  ${file}:${line}`);
    console.error(`    ${text}`);
  }
  console.error(`
  These flip with reading direction, so a hard left/right is a bug under
  \`dir="rtl"\` unless it is deliberate. Either use the logical property —
  \`margin-inline-start\`, \`padding-inline-end\`, \`inset-inline-start\`,
  \`text-align: start\` — or, if the physical one is correct (an animation's
  travel, a centring pair with a physical transform, geometry the TypeScript
  measures), say so above it:

    // rtl-ok: <why this one is physical on purpose>
`);
  process.exit(1);
}

console.log('✓ RTL — every physical CSS property is either logical or explained.');
