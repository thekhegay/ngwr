/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { createMemoryStorage } from 'ngwr/storage';

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
 * The storage is the library's OWN `createMemoryStorage()`, not a second
 * implementation written for tests: it is a complete `Storage`, it is exported
 * for exactly this purpose, and it already has specs of its own.
 *
 * `sessionStorage` needs none of this. Node defines no global of that name, so
 * jsdom's survives untouched — which is also the check that this diagnosis is
 * right rather than a guess about the environment.
 */
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  });
}
