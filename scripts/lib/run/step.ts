/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { spawnSync } from 'node:child_process';
import { exit, stderr } from 'node:process';

/**
 * Run one step of a build pipeline, and stop the pipeline if it fails.
 *
 * This replaces an `&&` chain in `package.json`, and length was not the only
 * reason. A chain is a flat list: it cannot say which steps feed the build and
 * which read what the build produced, so the ORDER — the only load-bearing
 * thing about it — is exactly the part it does not express. Nothing enforced it
 * either; the constraint lived in whoever last edited the string.
 *
 * `stdio: 'inherit'` on purpose, so a pipeline looks exactly like the chain it
 * replaces: progress streams live, colour survives, and a step that wants to
 * read its own output (`build-showcase-app.ts` greps for prerender errors)
 * keeps doing that for itself rather than through here.
 */
export function step(label: string, command: string, args: readonly string[]): void {
  const { status, error } = spawnSync(command, [...args], { stdio: 'inherit', shell: false });

  if (error) {
    stderr.write(`\n✘ ${label} could not start: ${error.message}\n`);
    exit(1);
  }
  if (status !== 0) {
    // No summary of what came before: every step already printed its own
    // output, and a wrapper repeating it buries the message that matters.
    stderr.write(`\n✘ ${label} failed (exit ${status ?? 'signal'}).\n`);
    exit(status ?? 1);
  }
}

/** Run a repo script through tsx, which is how every step here is written. */
export function tsx(label: string, script: string, args: readonly string[] = []): void {
  step(label, 'pnpm', ['exec', 'tsx', script, ...args]);
}
