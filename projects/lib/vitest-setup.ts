/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrCreateMemoryStorage } from 'ngwr/storage';

/**
 * Give the DOM environment a `localStorage` when the Node it runs on has taken
 * the name and left it empty.
 *
 * Node 25 unflagged the Web Storage API, and Node 26 turned it into a global
 * that is `undefined` unless `--localstorage-file` is passed. Either way the
 * KEY exists on `globalThis` before the test environment installs jsdom, and
 * vitest skips window keys that are already there — so jsdom's own
 * `localStorage` is never copied across and every read of it answers
 * `undefined`. Forty-six specs failed on Node 26 for that single reason, in six
 * files that have nothing else in common.
 *
 * **The library itself is unaffected**, which is worth stating because it is
 * what keeps this a scaffolding fix rather than a product one:
 * `storage-engine.ts` already reads `typeof localStorage === 'undefined'` and
 * falls back to memory, so an app on Node 26 renders correctly. What broke was
 * the specs, which call `localStorage.clear()` directly to keep a persisted
 * locale or theme out of the next test.
 *
 * **Why not `--no-webstorage`.** That flag removes Node's global at the source
 * and is what the Node 25 reports recommended — but it does not exist on Node
 * 24 and is refused inside `NODE_OPTIONS` there, so a repository whose
 * `engines` accepts both cannot set it statically. This file is version-blind
 * instead: on a Node that supplies a working `localStorage` it does nothing at
 * all. Upstream is not coming — vitest closed the fix for this collision as not
 * planned (vitest-dev/vitest#10867).
 *
 * The storage is the library's OWN `wrCreateMemoryStorage()`, not a second
 * implementation written for tests: it is a complete `Storage`, it is exported
 * for exactly this purpose, and it already has specs of its own.
 *
 * `sessionStorage` needs none of this. Node defines no global of that name, so
 * jsdom's survives untouched — which is also the check that this diagnosis is
 * right rather than a guess about the environment.
 */
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: wrCreateMemoryStorage(),
    configurable: true,
    writable: true,
  });
}

/**
 * A frame per call, on whichever `setTimeout` is current.
 *
 * jsdom runs its frames on ONE `setInterval`, created when the first frame is
 * asked for and cleared when none is left. A spec that fakes `setInterval` but
 * not `requestAnimationFrame` (and Angular asks for a frame on every scheduled
 * change detection) gets that interval on the fake clock; a frame still pending
 * when the spec restores real timers leaves jsdom counting one outstanding
 * frame that will never run, so it never starts a new interval. The builder
 * runs spec files unisolated, so every later file in that worker waits for a
 * frame that never comes: a `textarea` harness spec timed out in CI behind the
 * countdown specs that way. A timeout per frame cannot strand like that.
 */
const frames = new Map<number, ReturnType<typeof setTimeout>>();
let lastFrame = 0;
const requestFrame = (callback: FrameRequestCallback): number => {
  const id = ++lastFrame;
  frames.set(
    id,
    setTimeout(() => {
      frames.delete(id);
      callback(performance.now());
    }, 16)
  );
  return id;
};
const cancelFrame = (id: number): void => {
  clearTimeout(frames.get(id));
  frames.delete(id);
};
for (const scope of [globalThis, typeof window === 'undefined' ? undefined : window]) {
  if (!scope) continue;
  scope.requestAnimationFrame = requestFrame;
  scope.cancelAnimationFrame = cancelFrame;
}
