/** Options for `WrCookie.set` / `WrCookie.remove`. */
interface WrCookieOptions {
  /**
   * Expiry. `Date` is written as an `expires=` attribute; `number` is
   * treated as seconds-from-now and converted to `Max-Age`.
   */
  readonly expires?: Date | number;
  /** Cookie path. @default '/' */
  readonly path?: string;
  /** Cookie domain. */
  readonly domain?: string;
  /** `Secure` flag. */
  readonly secure?: boolean;
  /** `SameSite` policy. @default 'Lax' */
  readonly sameSite?: 'Lax' | 'Strict' | 'None';
}

export type { WrCookieOptions };
