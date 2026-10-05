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
 * @see https://ngwr.dev/reference/services/media
 */
@Service()
export class WrMedia {
  private readonly breakpoints = inject(WR_BREAKPOINTS);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Cache of query → signal so we share `matchMedia` listeners. */
  private readonly cache = new Map<string, Signal<boolean>>();

  /**
   * Active breakpoint key — the largest one the viewport satisfies.
   *
   * The order is DERIVED from the injected map, by descending width, rather
   * than written out. It used to be a hardcoded six, which stopped at `xxl`
   * and could never return `xga`, `fhd` or `rt` — three real breakpoints the
   * map has shipped all along, so a 1600px display reported `xxl` and a
   * `case 'rt':` compiled, type-narrowed and never ran. A custom map through
   * `provideWrMedia` has the same problem the other way round, and this has
   * neither.
   */
  readonly current = computed<WrBreakpoint>(() => {
    const ordered = (Object.keys(this.breakpoints) as WrBreakpoint[]).sort(
      (a, b) => this.breakpoints[b] - this.breakpoints[a]
    );
    for (const key of ordered) {
      if (this.matches(key)()) return key;
    }
    return ordered[ordered.length - 1] ?? 'xs';
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
