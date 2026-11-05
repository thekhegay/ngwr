/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Service, PLATFORM_ID, type Signal, inject, signal } from '@angular/core';

/** Options for {@link WrPlatform.onReturn}. */
interface WrReturnOptions {
  /** How long the page must have been hidden, in ms, before coming back counts. Defaults to one minute. */
  readonly after?: number;
}

interface ReturnListener {
  readonly after: number;
  readonly callback: () => void;
}

/** A tab flick is seconds; a real absence is a meeting, a lunch, a closed lid. */
const RETURN_AFTER = 60_000;

/**
 * SSR-safe environment probes. Use to gate browser-only code paths and
 * react to user preferences and page state without scattering `matchMedia`
 * and event listeners around.
 *
 * - `isBrowser` / `isServer`: synchronous platform check.
 * - `userAgent`: `navigator.userAgent` or `null` on the server.
 * - `prefersDark`: signal mirroring `(prefers-color-scheme: dark)`.
 * - `prefersReducedMotion`: signal mirroring `(prefers-reduced-motion: reduce)`.
 * - `pageVisible`: signal following `visibilitychange`; `true` on the server.
 * - `online`: signal following `online` / `offline`; `true` on the server.
 * - `onReturn()`: a callback for the page becoming visible after a real absence.
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
 * @see https://ngwr.dev/reference/services/platform
 */
@Service()
export class WrPlatform {
  private readonly destroyRef = inject(DestroyRef);
  private readonly doc = inject(DOCUMENT);

  readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly isServer = !this.isBrowser;
  readonly userAgent: string | null = this.isBrowser ? (this.doc.defaultView?.navigator?.userAgent ?? null) : null;

  private readonly returnListeners = new Set<ReturnListener>();
  // Above `pageVisible`, whose initializer sets it when the page boots hidden.
  private hiddenSince: number | null = null;

  readonly prefersDark: Signal<boolean> = this.mediaSignal('(prefers-color-scheme: dark)');
  readonly prefersReducedMotion: Signal<boolean> = this.mediaSignal('(prefers-reduced-motion: reduce)');

  /** Whether the page is visible: `document.visibilityState` is not `hidden`. `true` on the server. */
  readonly pageVisible: Signal<boolean> = this.visibilitySignal();
  /** Whether the browser reports a network: `navigator.onLine`. `true` on the server. */
  readonly online: Signal<boolean> = this.onlineSignal();

  /**
   * Calls `callback` when the page becomes visible again after being hidden
   * for at least `after` ms (one minute by default): the user came back from
   * a meeting, a lunch, a closed lid. A quick flick to another tab and back
   * fires nothing. Only visibility counts: a network that comes back while
   * the page stays visible is read from `online`.
   *
   * Needs an injection context and stops with it. Returns a function that
   * stops it early.
   *
   * @example
   * ```ts
   * constructor() {
   *   inject(WrPlatform).onReturn(() => this.users.reload(), { after: 30_000 });
   * }
   * ```
   *
   * @param callback - Runs once per return, after the threshold.
   * @param options - `after`, the threshold in ms.
   * @returns A function that stops listening early.
   */
  onReturn(callback: () => void, options: WrReturnOptions = {}): () => void {
    const owner = inject(DestroyRef);
    const listener: ReturnListener = { after: options.after ?? RETURN_AFTER, callback };
    this.returnListeners.add(listener);
    const stop = (): void => {
      this.returnListeners.delete(listener);
    };
    owner.onDestroy(stop);
    return stop;
  }

  private mediaSignal(query: string): Signal<boolean> {
    if (!this.isBrowser || !this.doc.defaultView?.matchMedia) return signal(false).asReadonly();
    const mql = this.doc.defaultView.matchMedia(query);
    const sig = signal(mql.matches);
    const handler = (event: MediaQueryListEvent): void => sig.set(event.matches);
    mql.addEventListener('change', handler);
    this.destroyRef.onDestroy(() => mql.removeEventListener('change', handler));
    return sig.asReadonly();
  }

  private visibilitySignal(): Signal<boolean> {
    if (!this.isBrowser) return signal(true).asReadonly();
    const visible = (): boolean => this.doc.visibilityState !== 'hidden';
    const sig = signal(visible());
    if (!sig()) this.hiddenSince = Date.now();
    const handler = (): void => {
      const next = visible();
      sig.set(next);
      if (!next) {
        this.hiddenSince ??= Date.now();
        return;
      }
      if (this.hiddenSince === null) return;
      const away = Date.now() - this.hiddenSince;
      this.hiddenSince = null;
      for (const { after, callback } of this.returnListeners) {
        if (away >= after) callback();
      }
    };
    this.doc.addEventListener('visibilitychange', handler);
    this.destroyRef.onDestroy(() => this.doc.removeEventListener('visibilitychange', handler));
    return sig.asReadonly();
  }

  private onlineSignal(): Signal<boolean> {
    const view = this.isBrowser ? this.doc.defaultView : null;
    if (!view) return signal(true).asReadonly();
    const sig = signal(view.navigator?.onLine ?? true);
    const handler = (event: Event): void => sig.set(event.type === 'online');
    view.addEventListener('online', handler);
    view.addEventListener('offline', handler);
    this.destroyRef.onDestroy(() => {
      view.removeEventListener('online', handler);
      view.removeEventListener('offline', handler);
    });
    return sig.asReadonly();
  }
}

export type { WrReturnOptions };
