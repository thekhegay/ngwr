/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DEFAULT_WR_DENSITY_CONFIG, type WrDensityValue } from './density-config';

/**
 * Every density the script accepts, written as a record so that a value added to
 * {@link WrDensityValue} fails to compile here instead of being refused by the
 * script in silence.
 */
const DENSITIES = Object.keys({ sm: true, md: true, lg: true, touch: true } satisfies Record<WrDensityValue, true>);

/** Options for {@link wrDensityPrePaintScript}. All optional — defaults mirror the services. */
export interface WrDensityPrePaintOptions {
  /**
   * The key {@link WrDensity} persists the density under — `storageKey` in
   * `withDensity()`. `null` reads nothing, as `withDensity({ storageKey: null })`
   * persists nothing, and the script writes `defaultDensity`.
   * @default 'wr-density'
   */
  readonly storageKey?: string | null;
  /**
   * What to apply when nothing is persisted — `defaultDensity` in
   * `withDensity()`.
   * @default 'md'
   */
  readonly defaultDensity?: WrDensityValue;
  /**
   * The attribute written on `<html>` — `attribute` in `withDensity()`.
   * @default 'data-wr-density'
   */
  readonly attribute?: string;
  /**
   * `WrStorage`'s key prefix — `withStorage({ prefix })`. The script reads
   * the raw key, so a prefixed app has to pass the same string here.
   * @default ''
   */
  readonly storagePrefix?: string;
  /**
   * Whether `WrStorage` wraps values in its JSON envelope —
   * `withStorage({ json })`. The emitted reader accepts both shapes either
   * way; this only decides which one it tries first.
   * @default true
   */
  readonly json?: boolean;
}

/**
 * Source of the blocking script that applies a persisted density BEFORE first
 * paint.
 *
 * {@link WrDensity} writes `[data-wr-density]` on `<html>` from an effect, so
 * on a prerendered or server-rendered page a stored `touch` or `sm` lands only
 * once the client bundle has booted: every control is drawn at the server's
 * density first and then jumps to the visitor's. A server cannot know the
 * choice — it has no `localStorage` — and nothing inside the application can
 * act before that paint. A script in `<head>` can, and this writes it out, so
 * an app never re-derives how {@link WrDensity} and `WrStorage` spell the
 * persisted value: the key, the prefix, the JSON envelope `{ v, e }`, the
 * expiry and the default.
 *
 * It writes what the service writes: the attribute, set to the stored density
 * or else to `defaultDensity`, every time — the service never leaves it unset.
 *
 * Returns the JS source WITHOUT a `<script>` wrapper, so it can be inlined into
 * `index.html`, emitted from an SSR template, or hashed for a CSP
 * `script-src 'sha256-…'`. Plain ES5 with no dependency on the app bundle, and
 * every step is wrapped so a blocked `localStorage` (private mode, a sandboxed
 * iframe) leaves the default density rather than throwing before anything has
 * rendered.
 *
 * Pass the same values the app gives `withDensity()` / `withStorage()`; the
 * defaults here are the defaults there. It pairs with `wrThemePrePaintScript()`
 * from `ngwr/theme`, which does the same for a chosen colour scheme.
 *
 * @example
 * ```ts
 * // Build step / SSR template:
 * const html = template.replace('<!--density-->', `<script>${wrDensityPrePaintScript()}</script>`);
 *
 * // Or paste the output straight into <head>, above every stylesheet:
 * // <script>(function(){ … })();</script>
 * ```
 *
 * @see https://ngwr.dev/reference/services/density
 */
export function wrDensityPrePaintScript(options: WrDensityPrePaintOptions = {}): string {
  const storageKey = options.storageKey === undefined ? DEFAULT_WR_DENSITY_CONFIG.storageKey : options.storageKey;
  const key = storageKey === null ? null : (options.storagePrefix ?? '') + storageKey;
  const defaultDensity = options.defaultDensity ?? DEFAULT_WR_DENSITY_CONFIG.defaultDensity;
  const attribute = options.attribute ?? DEFAULT_WR_DENSITY_CONFIG.attribute;
  const json = options.json ?? true;

  // Every interpolated value goes through JSON.stringify rather than into a
  // quoted literal, for the reason `wrThemePrePaintScript()` gives.
  const d = JSON.stringify(defaultDensity);
  const a = JSON.stringify(attribute);

  // Reading the envelope mirrors `WrStorage.get`, fall-throughs included: an
  // unparseable string is the value itself (what `json: false` writes), a parsed
  // non-envelope is the value, and an envelope past its `e` expiry is absent.
  const read = json
    ? `try{var p=JSON.parse(r);` +
      `if(p!==null&&typeof p==="object"&&"v" in p){if(p.e===undefined||p.e>=Date.now())m=p.v;}` +
      `else{m=p;}}catch(e){m=r;}`
    : `m=r;`;
  const load =
    key === null ? '' : `try{r=window.localStorage.getItem(${JSON.stringify(key)});}catch(e){}if(r!==null){${read}}`;

  return (
    `(function(){try{` +
    `var m=null,r=null;${load}` +
    `if(${JSON.stringify(DENSITIES)}.indexOf(m)<0)m=${d};` +
    `document.documentElement.setAttribute(${a},m);` +
    `}catch(e){}})();`
  );
}
