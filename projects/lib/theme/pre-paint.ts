/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DEFAULT_WR_THEME_CONFIG, type WrThemeMode } from './wr-theme-config';

/** Options for {@link wrThemePrePaintScript}. All optional — defaults mirror the services. */
export interface WrThemePrePaintOptions {
  /**
   * The key {@link WrTheme} persists the mode under — `storageKey` in
   * `WR_THEME_CONFIG`.
   * @default 'wr-theme'
   */
  readonly storageKey?: string;
  /**
   * What to apply when nothing is persisted — `defaultMode` in `WR_THEME_CONFIG`.
   * @default 'auto'
   */
  readonly defaultMode?: WrThemeMode;
  /**
   * `WrStorage`'s key prefix — `provideWrStorage({ prefix })`. The script reads
   * the raw key, so a prefixed app has to pass the same string here.
   * @default ''
   */
  readonly storagePrefix?: string;
  /**
   * Whether `WrStorage` wraps values in its JSON envelope —
   * `provideWrStorage({ json })`. The emitted reader accepts both shapes either
   * way; this only decides which one it tries first, and is here so the option
   * cannot be silently forgotten when an app turns the envelope off.
   * @default true
   */
  readonly json?: boolean;
}

/**
 * Source of the blocking script that applies a persisted theme BEFORE first
 * paint.
 *
 * `auto` needs no script: the stylesheet declares `color-scheme: light dark`, so
 * a page follows the OS from its first frame. What a server cannot know is a
 * CHOICE — it has no `localStorage` — so a visitor who picked dark on a light OS
 * sees a light page until the client bundle boots and {@link WrTheme}'s effect
 * writes the scheme. That window is milliseconds on localhost and seconds on a
 * slow connection, and it is not something the service can close from inside
 * the application: by the time Angular runs, the paint has happened.
 *
 * The only fix is a script that runs before the first paint, and the only thing
 * it needs to know is how {@link WrTheme} and `WrStorage` agree to spell the
 * persisted mode. That agreement — the key, the prefix, the JSON envelope
 * `{ v, e }`, the expiry, the default-mode fallback — is what this function
 * writes out, so an app never has to re-derive it from the bundle and never has
 * to keep a hand-copied version in step with a library upgrade. What it writes is
 * what the service writes: `color-scheme` inline on `<html>` for `light` or
 * `dark`, and nothing for `auto`.
 *
 * Returns the JS source WITHOUT a `<script>` wrapper, so it can be inlined into
 * `index.html`, emitted from an SSR template, or hashed for a CSP
 * `script-src 'sha256-…'`. It is plain ES5 with no dependency on the app bundle,
 * and every step is wrapped so a blocked `localStorage` (private mode, a
 * sandboxed iframe) leaves the page on the OS scheme rather than throwing
 * before anything has rendered.
 *
 * Pass the same values the app gives `WR_THEME_CONFIG` / `provideWrStorage()`;
 * the defaults here are the defaults there.
 *
 * @example
 * ```ts
 * // Build step / SSR template:
 * const html = template.replace('<!--theme-->', `<script>${wrThemePrePaintScript()}</script>`);
 *
 * // Or paste the output straight into <head>, above every stylesheet:
 * // <script>(function(){ … })();</script>
 * ```
 *
 * @see https://ngwr.dev/reference/services/theme
 */
export function wrThemePrePaintScript(options: WrThemePrePaintOptions = {}): string {
  const key = (options.storagePrefix ?? '') + (options.storageKey ?? DEFAULT_WR_THEME_CONFIG.storageKey ?? 'wr-theme');
  const defaultMode = options.defaultMode ?? DEFAULT_WR_THEME_CONFIG.defaultMode;
  const json = options.json ?? true;

  // Every interpolated value goes through JSON.stringify rather than into a
  // quoted literal: a key is a configuration string, and a hand-rolled `'${x}'`
  // turns an apostrophe in one into a syntax error at best.
  const k = JSON.stringify(key);
  const d = JSON.stringify(defaultMode);

  // Reading the envelope mirrors `WrStorage.get`, including its fall-throughs:
  // an unparseable string is returned verbatim (that is what `json: false`
  // writes), a parsed non-envelope is the value itself, and an envelope past its
  // `e` expiry counts as absent. `json: false` skips the parse entirely, which
  // is the same answer by a shorter path.
  const read = json
    ? `try{var p=JSON.parse(r);` +
      `if(p!==null&&typeof p==="object"&&"v" in p){if(p.e===undefined||p.e>=Date.now())m=p.v;}` +
      `else{m=p;}}catch(e){m=r;}`
    : `m=r;`;

  return (
    `(function(){try{` +
    `var m=null,r=null;` +
    `try{r=window.localStorage.getItem(${k});}catch(e){}` +
    `if(r!==null){${read}}` +
    `if(m!=="light"&&m!=="dark"&&m!=="auto")m=${d};` +
    `if(m==="light"||m==="dark")document.documentElement.style.colorScheme=m;` +
    `}catch(e){}})();`
  );
}
