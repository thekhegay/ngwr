/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Tiny stdio helpers that bypass `console.*`.
 *
 * Lint forbids `console.*` repo-wide. The release scripts still need to print
 * status to stderr (so consumers can pipe stdout cleanly) and write the final
 * version to stdout. These wrappers do exactly that.
 *
 * `process` is a Node global — no explicit `import` is required and adding
 * one would be flagged as an unused import.
 */

/** Print a progress / status line to stderr. */
export function info(message: string): void {
  process.stderr.write(`${message}\n`);
}

/** Print an error line to stderr. */
export function err(message: string): void {
  process.stderr.write(`${message}\n`);
}

/** Write a final value (e.g. the next version) to stdout, no trailing newline added. */
export function out(message: string): void {
  process.stdout.write(message);
}
