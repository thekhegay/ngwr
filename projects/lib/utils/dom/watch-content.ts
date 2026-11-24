/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DestroyRef, inject } from '@angular/core';

/**
 * Re-reads what a host projects only when its subtree changed. Returns a
 * `flush` for `afterEveryRender`: it runs `sync` on the first call and on a
 * pass that follows a mutation, and costs one `takeRecords()` on every other
 * pass. Mutations outside a render pass reach `sync` through the observer.
 * Without `MutationObserver` (SSR) `flush` runs `sync` every time.
 *
 * Call in an injection context.
 *
 * @internal
 */
export function wrWatchContent(host: Element, sync: () => void): () => void {
  if (typeof MutationObserver === 'undefined') return sync;
  let seeded = false;
  const observer = new MutationObserver(sync);
  observer.observe(host, { childList: true, characterData: true, subtree: true });
  inject(DestroyRef).onDestroy(() => observer.disconnect());
  return () => {
    const changed = observer.takeRecords().length > 0;
    if (changed || !seeded) {
      seeded = true;
      sync();
    }
  };
}
