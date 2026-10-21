/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The recorded baselines under `scripts/baselines/`, one JSON file per check,
 * each keyed by what the check reports.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ROOT_PATH } from './paths/root';

/** Absolute path of `scripts/baselines/<name>.json`. */
export function baselinePath(name: string): string {
  return resolve(ROOT_PATH, 'scripts/baselines', `${name}.json`);
}

/**
 * A check's baseline, or `{}` when the file is missing or does not parse, so
 * the check runs with no allowance rather than failing to start.
 */
export function readBaseline<T extends object>(name: string): T {
  try {
    return JSON.parse(readFileSync(baselinePath(name), 'utf8')) as T;
  } catch {
    return {} as T;
  }
}

/** A check's baseline, or `undefined` when there is none yet; a file that does not parse throws. */
export function readBaselineStrict<T extends object>(name: string): T | undefined {
  const path = baselinePath(name);
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : undefined;
}

/** Records a baseline with its keys sorted, so a re-record diffs by entry rather than by run order. */
export function writeBaseline(name: string, data: Readonly<Record<string, unknown>>): void {
  const sorted = Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(baselinePath(name), `${JSON.stringify(sorted, null, 2)}\n`);
}
