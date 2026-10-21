/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * What every generator under `scripts/gen` shares about the file it writes:
 * where it goes, how it opens, and how `--check` compares it with the
 * committed copy.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { exit } from 'node:process';

import { err } from './log/err';
import { out } from './log/out';
import { ROOT_PATH } from './paths/root';

const LICENSE = `/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */`;

/** The showcase's `_core/generated` folder. */
export const GENERATED_DIR = resolve(ROOT_PATH, 'projects/showcase/app/_core/generated');

/** The license block and the eslint-disable line, then `doc` verbatim, comment delimiters included. */
export function generatedHeader(doc: string): string {
  return `${LICENSE}\n\n/* eslint-disable */\n${doc}`;
}

export interface EmitGeneratedOptions {
  /** Absolute path of the generated file. */
  readonly file: string;
  readonly content: string;
  /** The script that regenerates it, as `pnpm` names it: `gen:selectors`. */
  readonly command: string;
  /** Compares with the file on disk instead of writing it, and exits 1 when they differ. */
  readonly check?: boolean;
  /** What a stale file is out of date with, when the message names it: `projects/lib`. */
  readonly against?: string;
  /** The summary after `✓ <path> — ` once the file is written. */
  readonly written: string;
  /** The summary before `, up to date` when a check passes; defaults to `written`. */
  readonly upToDate?: string;
}

/** Writes a generated file, or with `check` exits 1 when the committed copy is stale or missing. */
export function emitGenerated(options: EmitGeneratedOptions): void {
  const path = relative(ROOT_PATH, options.file);

  if (options.check) {
    const current = existsSync(options.file) ? readFileSync(options.file, 'utf8') : '';
    if (current !== options.content) {
      const against = options.against ? ` with ${options.against}` : '';
      err(`\n✘ ${path} is out of date${against}. Run \`pnpm ${options.command}\` and commit the result.\n`);
      exit(1);
    }
    out(`✓ ${path} — ${options.upToDate ?? options.written}, up to date\n`);
    return;
  }

  mkdirSync(dirname(options.file), { recursive: true });
  writeFileSync(options.file, options.content);
  out(`✓ ${path} — ${options.written}\n`);
}

export interface LineDiffOptions {
  /** The most lines printed per side; the rest are counted on one line. */
  readonly cap?: number;
  /** Prints each differing line once, both sides interleaved, instead of removed then added lines. */
  readonly distinct?: boolean;
}

/**
 * The `  - …` / `  + …` lines between a fresh text and the committed one,
 * compared as multisets of lines. A pure reorder gets one line naming the first
 * line that moved.
 */
export function lineDiff(fresh: string, committed: string, options: LineDiffOptions = {}): string[] {
  const freshLines = fresh.split('\n');
  const committedLines = committed.split('\n');
  const counts = new Map<string, number>();
  for (const line of freshLines) counts.set(line, (counts.get(line) ?? 0) + 1);
  for (const line of committedLines) counts.set(line, (counts.get(line) ?? 0) - 1);

  const lines: string[] = [];
  if (options.distinct) {
    for (const [line, n] of counts) {
      if (n > 0) lines.push(`  + ${line.trim()}`);
      if (n < 0) lines.push(`  - ${line.trim()}`);
    }
  } else {
    const added: string[] = [];
    const removed: string[] = [];
    for (const [line, n] of counts) {
      for (let i = 0; i < n; i++) added.push(line);
      for (let i = 0; i < -n; i++) removed.push(line);
    }
    const cap = options.cap ?? Infinity;
    for (const line of removed.slice(0, cap)) lines.push(`  - ${line.trim()}`);
    if (removed.length > cap) lines.push(`  - … and ${removed.length - cap} more line(s) only in the file`);
    for (const line of added.slice(0, cap)) lines.push(`  + ${line.trim()}`);
    if (added.length > cap) lines.push(`  + … and ${added.length - cap} more line(s) only in the source`);
  }

  if (lines.length === 0 && fresh !== committed) {
    const at = freshLines.findIndex((line, i) => line !== committedLines[i]);
    lines.push(`  the same lines in a different order, first at line ${at + 1}`);
  }
  return lines;
}
