/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { describe, expect, it, vi } from 'vitest';

const nextFrame = (): Promise<boolean> =>
  Promise.race([
    new Promise<boolean>(resolve => requestAnimationFrame(() => resolve(true))),
    new Promise<boolean>(resolve => setTimeout(() => resolve(false), 1000)),
  ]);

describe('the test environment', () => {
  it('still gives a frame after a spec faked setInterval and left a frame pending', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    requestAnimationFrame(() => undefined);
    vi.useRealTimers();

    expect(await nextFrame()).toBe(true);
  });

  it('still gives a frame after a spec faked setTimeout and left a frame pending', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    requestAnimationFrame(() => undefined);
    vi.useRealTimers();

    expect(await nextFrame()).toBe(true);
  });
});
