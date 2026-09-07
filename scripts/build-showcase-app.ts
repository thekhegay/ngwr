/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Builds the showcase and fails when prerendering reported an error.
 *
 * Why this wrapper exists: under `outputMode: 'static'` the builder renders
 * every route in Node at build time, but a route that throws does NOT fail the
 * build. It logs the error, still emits that route's HTML, prints
 * "Prerendered N static routes" plus "Application bundle generation complete",
 * and exits 0. CI would stay green while pages silently degraded — the exact
 * failure this project prerenders to avoid (missing text, missing nav links).
 *
 * There is no builder option for this: `@angular/build`'s application schema
 * has no fail-on-prerender-error flag, and route count is not a usable signal
 * because failing routes still produce a file. The only reliable marker is the
 * worker forwarding the app's console output, which surfaces as a line
 * starting with `ERROR` — e.g.
 *
 *   ERROR ReferenceError: getComputedStyle is not defined
 *   ERROR Error: NotYetImplemented
 *
 * so this scans the build log for those and exits non-zero. Output is streamed
 * through unchanged, so the build looks and behaves exactly as before.
 *
 * Wired into `build:showcase`, which means local builds, `ci.yml` and
 * `deploy.yml` are all covered without duplicating a grep per workflow.
 * Extra CLI args are forwarded to `ng build showcase`.
 */

import { spawn } from 'node:child_process';

/** A prerender worker forwards app console errors as `ERROR <message>`. */
const PRERENDER_ERROR = /^ERROR\b.*$/gm;

const args = process.argv.slice(2);
const child = spawn('pnpm', ['exec', 'ng', 'build', 'showcase', ...args], {
  stdio: ['inherit', 'pipe', 'pipe'],
});

let log = '';

child.stdout.on('data', (chunk: Buffer) => {
  log += chunk.toString();
  process.stdout.write(chunk);
});

child.stderr.on('data', (chunk: Buffer) => {
  log += chunk.toString();
  process.stderr.write(chunk);
});

child.on('close', code => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  const errors = log.match(PRERENDER_ERROR);
  if (!errors) return;

  const unique = [...new Set(errors.map(e => e.trim()))];
  const list = unique.map(e => `    ${e}`).join('\n');
  process.stderr.write(
    `
✘ Prerendering reported ${unique.length} error(s). The bundle "succeeded", but these
  routes rendered incorrectly — fix them, or guard the code for the server:

${list}

  Usually a browser API touched during server render. Defer it to
  afterNextRender(), or guard with isPlatformBrowser(inject(PLATFORM_ID)).
`
  );
  process.exit(1);
});
