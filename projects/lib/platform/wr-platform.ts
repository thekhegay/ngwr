/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Service, PLATFORM_ID, type Signal, inject, signal } from '@angular/core';

/**
 * SSR-safe environment probes. Use to gate browser-only code paths and
 * react to user preferences without scattering `matchMedia` calls around.
 *
 * - `isBrowser` / `isServer` — synchronous platform check.
 * - `userAgent` — `navigator.userAgent` or `null` on the server.
 * - `prefersDark` — signal mirroring `(prefers-color-scheme: dark)`.
 * - `prefersReducedMotion` — signal mirroring `(prefers-reduced-motion: reduce)`.
 *
 * @example
 * ```ts
 * private readonly platform = inject(WrPlatform);
 * if (this.platform.isBrowser) {
 *   localStorage.setItem('theme', 'dark');
 * }
 *
 * protected readonly dark = this.platform.prefersDark;
 * ```
 *
 * @see https://ngwr.dev/docs/core/services
 */
@Service()
export class WrPlatform {
  private readonly destroyRef = inject(DestroyRef);
  private readonly doc = inject(DOCUMENT);

  readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly isServer = !this.isBrowser;
  readonly userAgent: string | null = this.isBrowser ? (this.doc.defaultView?.navigator?.userAgent ?? null) : null;

  readonly prefersDark: Signal<boolean> = this.mediaSignal('(prefers-color-scheme: dark)');
  readonly prefersReducedMotion: Signal<boolean> = this.mediaSignal('(prefers-reduced-motion: reduce)');

  private mediaSignal(query: string): Signal<boolean> {
    if (!this.isBrowser || !this.doc.defaultView?.matchMedia) return signal(false).asReadonly();
    const mql = this.doc.defaultView.matchMedia(query);
    const sig = signal(mql.matches);
    const handler = (event: MediaQueryListEvent): void => sig.set(event.matches);
    mql.addEventListener('change', handler);
    this.destroyRef.onDestroy(() => mql.removeEventListener('change', handler));
    return sig.asReadonly();
  }
}
