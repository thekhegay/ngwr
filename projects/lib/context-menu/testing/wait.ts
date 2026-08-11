/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** How long the waiters poll before giving up, in ms. Generous next to the 500ms hold. */
const DEFAULT_TIMEOUT = 1000;

/** How often they re-check, in ms. */
const POLL_STEP = 10;

/**
 * The real `setTimeout`, captured at module load — before a spec can install
 * fake timers.
 *
 * Every delay in this component family is wall-clock: a plain `setTimeout` inside
 * the directive for the 500ms long-press hold, the 120ms submenu hover and the
 * 220ms exit animation the pane is held alive through, and a `performance.now()`
 * comparison for the 200ms window in which outside presses are ignored — no timer
 * behind that one, just elapsed time. Under zoneless change detection `whenStable()` resolves
 * without waiting for a macrotask, so the waiters have to let REAL time pass —
 * reading a faked global instead would mean the sleep never fires at all, and
 * the harness would hang where it should fail with the message it prepared.
 */
const realSetTimeout = globalThis.setTimeout;

/** Let real time pass, whatever a spec has done to the global clock. */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    realSetTimeout(resolve, ms);
  });
}

export { DEFAULT_TIMEOUT, POLL_STEP, sleep };
