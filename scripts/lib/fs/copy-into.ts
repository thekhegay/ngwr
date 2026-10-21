/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { copyFileSync, cpSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';

import { err } from '../log/err';
import { info } from '../log/info';

export interface CopyIntoOptions {
  /** What the log lines call the source: `README.md`, `skills/`, `use/schema.json`. */
  readonly label: string;
  /** Skips a missing source with a line on stderr instead of throwing. */
  readonly optional?: boolean;
  /** Appended to the skip line after a dash: `run scripts/gen/ai-assets.ts first.` */
  readonly hint?: string;
}

/**
 * Copies a file, or a directory recursively, to `dst`, creating its parent,
 * and logs `✓ Copied <label> → <dst>`. Returns false when an optional source
 * was missing and nothing was copied.
 *
 * A missing source that is not optional throws from `copyFileSync`, the error
 * every caller already died with.
 */
export function copyInto(src: string, dst: string, options: CopyIntoOptions): boolean {
  const exists = existsSync(src);
  if (!exists && options.optional) {
    err(`Skipping ${options.label}: not found at ${src}${options.hint ? ` — ${options.hint}` : ''}`);
    return false;
  }
  mkdirSync(dirname(dst), { recursive: true });
  if (exists && statSync(src).isDirectory()) cpSync(src, dst, { recursive: true });
  else copyFileSync(src, dst);
  info(`✓ Copied ${options.label} → ${dst}`);
  return true;
}
