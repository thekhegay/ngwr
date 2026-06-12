/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Service, PLATFORM_ID, type Signal, computed, inject, signal } from '@angular/core';

import { WR_BREAKPOINTS, type WrBreakpoint } from './wr-breakpoints';

/**
 * Reactive viewport queries backed by signals.
 *
 * Each query subscribes lazily — `matches(...)` caches its signal so
 * repeated calls with the same query share a single `matchMedia` listener.
 * SSR-safe: on the server every signal stays `false`.
 *
 * @example
 * ```ts
 * private readonly media = inject(WrMedia);
 * protected readonly isMd = this.media.matches('md');
 * protected readonly isWide = this.media.matches('(min-width: 1200px)');
 * ```
 *
 * @see https://ngwr.dev/services/media
 */
@Service()
export class WrMedia {
  private readonly breakpoints = inject(WR_BREAKPOINTS);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Cache of query → signal so we share `matchMedia` listeners. */
  private readonly cache = new Map<string, Signal<boolean>>();

  /** Active breakpoint key — `xs` / `sm` / `md` / `lg` / `xl` / `xxl`. */
  readonly current = computed<WrBreakpoint>(() => {
    // Walk from largest to smallest, return the first one that matches.
    const ordered: readonly WrBreakpoint[] = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'];
    for (const key of ordered) {
      if (this.matches(key)()) return key;
    }
    return 'xs';
  });

  /**
   * Returns a signal that tracks the given query.
   *
   * - Named breakpoint (`'md'`) → `(min-width: <px>)`.
   * - Raw query (`'(prefers-color-scheme: dark)'`) → passed through unchanged.
   */
  matches(query: WrBreakpoint | (string & {})): Signal<boolean> {
    const resolved = this.resolveQuery(query);
    const cached = this.cache.get(resolved);
    if (cached) return cached;
    const sig = this.createSignal(resolved);
    this.cache.set(resolved, sig);
    return sig;
  }

  private resolveQuery(query: WrBreakpoint | (string & {})): string {
    if (query in this.breakpoints) {
      const px = this.breakpoints[query as WrBreakpoint];
      return px === 0 ? '(min-width: 0px)' : `(min-width: ${px}px)`;
    }
    return query;
  }

  private createSignal(query: string): Signal<boolean> {
    if (!this.isBrowser) return signal(false).asReadonly();
    const mql = window.matchMedia(query);
    const sig = signal(mql.matches);
    const handler = (event: MediaQueryListEvent): void => sig.set(event.matches);
    mql.addEventListener('change', handler);
    this.destroyRef.onDestroy(() => mql.removeEventListener('change', handler));
    return sig.asReadonly();
  }
}
