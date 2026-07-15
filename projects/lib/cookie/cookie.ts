/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT } from '@angular/common';
import { Service, inject } from '@angular/core';

import type { WrCookieOptions } from './interfaces';

const DEFAULT_OPTS: Required<Pick<WrCookieOptions, 'path' | 'sameSite'>> = {
  path: '/',
  sameSite: 'Lax',
};

/**
 * Thin, SSR-safe `document.cookie` wrapper modelled after {@link WrStorage}.
 *
 * - Read/write/delete cookies through a typed API.
 * - `set()` serialises `expires` as either an HTTP-date or `Max-Age`.
 * - Every method short-circuits when there's no DOM (SSR / unit tests
 *   without a document) — reads return the fallback, writes are no-ops.
 *
 * @example
 * ```ts
 * const cookies = inject(WrCookie);
 *
 * cookies.set('theme', 'dark', { expires: 60 * 60 * 24 * 30 });  // 30 days
 * cookies.get('theme');                                          // 'dark'
 * cookies.has('theme');                                          // true
 * cookies.remove('theme');
 * cookies.keys();                                                // readonly string[]
 * ```
 *
 * @see https://ngwr.dev/services/cookie
 */
@Service()
export class WrCookie {
  private readonly doc = inject(DOCUMENT);

  /**
   * `document.cookie`, or `''` when it cannot be read. Mirrors the guard on
   * `set()`: under SSR the server DOM has no cookie support and throws on the
   * getter, and sandboxed iframes reject access too.
   */
  private read(): string {
    try {
      return this.doc.cookie;
    } catch {
      return '';
    }
  }

  /** Is `key` present (regardless of value)? */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /** Read `key`. Returns `fallback` (default `null`) when the key is missing. */
  get(key: string, fallback: string | null = null): string | null {
    const raw = this.read();
    if (!raw) return fallback;
    const needle = `${encodeURIComponent(key)}=`;
    for (const part of raw.split(';')) {
      const trimmed = part.trim();
      if (trimmed.startsWith(needle)) {
        try {
          return decodeURIComponent(trimmed.slice(needle.length));
        } catch {
          return trimmed.slice(needle.length);
        }
      }
    }
    return fallback;
  }

  /** Write `key=value` with optional attributes. */
  set(key: string, value: string, options?: WrCookieOptions): void {
    const opts = { ...DEFAULT_OPTS, ...options };
    const parts: string[] = [`${encodeURIComponent(key)}=${encodeURIComponent(value)}`];

    if (opts.expires !== undefined) {
      if (opts.expires instanceof Date) {
        parts.push(`expires=${opts.expires.toUTCString()}`);
      } else {
        parts.push(`max-age=${Math.max(0, Math.floor(opts.expires))}`);
      }
    }

    parts.push(`path=${opts.path}`);
    if (opts.domain) parts.push(`domain=${opts.domain}`);
    if (opts.secure) parts.push('secure');
    parts.push(`samesite=${opts.sameSite}`);

    try {
      this.doc.cookie = parts.join('; ');
    } catch {
      // SSR / sandboxed iframes: silently no-op.
    }
  }

  /** Remove `key`. Path / domain must match what was used in `set()`. */
  remove(key: string, options?: Pick<WrCookieOptions, 'path' | 'domain'>): void {
    this.set(key, '', { ...options, expires: new Date(0) });
  }

  /** Every cookie key visible to this document. */
  keys(): readonly string[] {
    const raw = this.read();
    if (!raw) return [];
    const out: string[] = [];
    for (const part of raw.split(';')) {
      const trimmed = part.trim();
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      try {
        out.push(decodeURIComponent(trimmed.slice(0, eq)));
      } catch {
        out.push(trimmed.slice(0, eq));
      }
    }
    return out;
  }

  /** Remove every cookie visible to this document. Uses `path: '/'`. */
  clear(): void {
    for (const k of this.keys()) this.remove(k);
  }
}

export type { WrCookieOptions } from './interfaces';
