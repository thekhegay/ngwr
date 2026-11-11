/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  DestroyRef,
  type WritableResource,
  Service,
  assertInInjectionContext,
  effect,
  inject,
  isDevMode,
  untracked,
} from '@angular/core';

import { WrPlatform } from './wr-platform';

interface PollEntry {
  readonly resource: WritableResource<unknown>;
  readonly intervalMs: number;
  /** When the resource last had its turn, due or skipped. */
  last: number;
}

/**
 * The one timer behind every {@link wrPoll}: a `setTimeout` aimed at the
 * earliest due resource, re-aimed after each tick, so two resources on
 * different intervals share it. Cleared while the page is hidden and while
 * nothing polls; never created on the server.
 */
@Service()
class WrPollTicker {
  private readonly platform = inject(WrPlatform);
  private readonly entries = new Set<PollEntry>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (!this.platform.isBrowser) return;
    effect(() => {
      if (this.platform.pageVisible()) untracked(() => this.tick());
      else this.clear();
    });
  }

  add(entry: PollEntry): () => void {
    if (!this.platform.isBrowser) return () => undefined;
    this.entries.add(entry);
    this.schedule();
    return () => {
      this.entries.delete(entry);
      this.schedule();
    };
  }

  private tick(): void {
    const now = Date.now();
    for (const entry of this.entries) {
      if (now - entry.last < entry.intervalMs) continue;
      // A skipped turn is spent too: the resource waits a full interval again.
      entry.last = now;
      if (!untracked(entry.resource.isLoading)) entry.resource.reload();
    }
    this.schedule();
  }

  private schedule(): void {
    this.clear();
    if (this.entries.size === 0 || !untracked(this.platform.pageVisible)) return;
    let due = Infinity;
    for (const entry of this.entries) due = Math.min(due, entry.last + entry.intervalMs);
    this.timer = setTimeout(() => this.tick(), Math.max(0, due - Date.now()));
  }

  private clear(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }
}

/**
 * Reloads a resource every `intervalMs` while the page is visible, on one
 * timer shared by every polled resource in the app. Takes `resource()`,
 * `rxResource()` and `httpResource()` alike.
 *
 * - The tab goes hidden: polling pauses. It comes back: a resource overdue
 *   by its interval reloads once, not once per missed turn.
 * - A resource still loading or reloading is skipped on its turn and waits
 *   a full interval again, so a slow request never piles up.
 * - A resource in the `error` state keeps polling: that is how it recovers.
 * - On the server nothing is scheduled, so prerender never waits on it.
 *
 * Needs an injection context and stops with it.
 *
 * @example
 * ```ts
 * readonly orders = httpResource<Order[]>(() => '/api/orders');
 *
 * constructor() {
 *   wrPoll(this.orders, 15_000);
 * }
 * ```
 *
 * @param resource - The resource to reload.
 * @param intervalMs - How often, in ms. Must be positive and finite: anything
 * else throws in dev mode and polls nothing in production.
 */
export function wrPoll<T>(resource: WritableResource<T>, intervalMs: number): void {
  assertInInjectionContext(wrPoll);
  if (!(intervalMs > 0) || !Number.isFinite(intervalMs)) {
    if (isDevMode()) throw new Error(`wrPoll: intervalMs must be a positive number, got ${String(intervalMs)}`);
    // Never reaches the ticker: its timer would re-arm at 0 ms for ever.
    return;
  }
  const stop = inject(WrPollTicker).add({ resource, intervalMs, last: Date.now() });
  inject(DestroyRef).onDestroy(stop);
}
