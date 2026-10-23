/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  DOCUMENT,
  DestroyRef,
  type Injector,
  PLATFORM_ID,
  type ProviderToken,
  assertInInjectionContext,
  inject,
} from '@angular/core';

/** The query `light dark` resolves through when the page leaves the choice to the OS. */
const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * What one `color-scheme` value resolves to, or `null` when it does not decide:
 * `normal`, empty, or nothing this reads. `light dark` (either order, `only`
 * included) is the OS's call.
 */
function pick(value: string, osDark: boolean): WrColorScheme | null {
  const tokens = value.trim().toLowerCase().split(/\s+/);
  const light = tokens.includes('light');
  const dark = tokens.includes('dark');
  if (light && dark) return osDark ? 'dark' : 'light';
  if (dark) return 'dark';
  if (light) return 'light';
  return null;
}

/**
 * The scheme `<html>` resolves to: its computed `color-scheme` first, which is
 * what an inline write, a class, an attribute selector and the theme's own
 * `light dark` all land on; then `<meta name="color-scheme">`, which is what a
 * computed `normal` defers to; then light, the browser's default.
 */
function resolveScheme(doc: Document, query: MediaQueryList | null): WrColorScheme {
  const osDark = query?.matches ?? false;
  const view = doc.defaultView;
  const declared = view ? view.getComputedStyle(doc.documentElement).getPropertyValue('color-scheme') : '';
  const meta = doc.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content ?? '';
  return pick(declared, osDark) ?? pick(meta, osDark) ?? 'light';
}

/** The colour scheme a page resolves to: what `light-dark()` picks on its root. */
export type WrColorScheme = 'light' | 'dark';

/** Options for {@link watchColorScheme}. */
export interface WatchColorSchemeOptions {
  /**
   * The injector to take `DestroyRef`, `DOCUMENT` and `PLATFORM_ID` from, for
   * a call made outside an injection context — from `afterNextRender`, say.
   * The watch then ends when that injector is destroyed.
   */
  readonly injector?: Injector;
}

/**
 * Calls `callback` with the new scheme whenever the colour scheme the page
 * resolves to changes, and never for a change that leaves it where it was.
 *
 * A canvas or a WebGL uniform cannot take `light-dark()` or a `var()`, so a
 * drawing resolves its colours once, through {@link resolveCssColor}, and holds
 * pixels from then on. A frame loop repaints anyway; a still frame — the one a
 * reduced-motion visitor gets — keeps the old scheme's colours until something
 * asks it to redraw. This is that something.
 *
 * Two sources move the root scheme, and it listens to both: an attribute change
 * on `<html>`, which is where `WrTheme` writes its inline `color-scheme` (and
 * where a class or a `data-` attribute an app themes on lives), and
 * `prefers-color-scheme`, which decides it while the page says `light dark`.
 * Each is read back through the computed `color-scheme`, so a write that does
 * not change the outcome — CDK's scroll blocking styles `<html>` too — calls
 * nothing.
 *
 * It watches the ROOT. A subtree with a `color-scheme` of its own resolves on
 * its own terms, and a stylesheet that arrives later and re-declares the root's
 * scheme is not an attribute change; neither is seen.
 *
 * SSR-safe: on the server it does nothing and returns a no-op. Stops when the
 * injection context it was called in is destroyed, or when the returned
 * function is called.
 *
 * @example
 * ```ts
 * constructor() {
 *   afterNextRender(() => this.draw());
 *   watchColorScheme(() => this.draw());
 * }
 *
 * private draw(): void {
 *   const canvas = this.canvas().nativeElement;
 *   const ctx = canvas.getContext('2d');
 *   if (!ctx) return;
 *   ctx.fillStyle = resolveCssColor(canvas, 'var(--wr-color-primary)', '#3969e2');
 *   ctx.fillRect(0, 0, canvas.width, canvas.height);
 * }
 * ```
 *
 * @param callback - Receives the scheme now in effect on `<html>`.
 * @param options - An injector, for a call outside an injection context.
 * @returns A function that stops watching early.
 */
export function watchColorScheme(
  callback: (scheme: WrColorScheme) => void,
  options: WatchColorSchemeOptions = {}
): () => void {
  if (!options.injector) assertInInjectionContext(watchColorScheme);
  const injector = options.injector;
  const get = <T>(token: ProviderToken<T>): T => (injector ? injector.get(token) : inject(token));

  if (get(PLATFORM_ID) !== 'browser') return () => undefined;
  const doc = get(DOCUMENT);
  const view = doc.defaultView;
  if (!view) return () => undefined;

  const query = typeof view.matchMedia === 'function' ? view.matchMedia(DARK_QUERY) : null;
  let current = resolveScheme(doc, query);
  const check = (): void => {
    const next = resolveScheme(doc, query);
    if (next === current) return;
    current = next;
    callback(next);
  };

  const observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(check);
  observer?.observe(doc.documentElement, { attributes: true });
  query?.addEventListener('change', check);

  let stopped = false;
  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    observer?.disconnect();
    query?.removeEventListener('change', check);
  };
  get(DestroyRef).onDestroy(stop);
  return stop;
}
