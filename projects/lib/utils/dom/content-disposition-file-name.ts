/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** `filename*=charset'language'percent-encoded`, the RFC 8187 form. */
const EXTENDED = /(?:^|;)\s*filename\*\s*=\s*([^;]+)/i;

/** `filename="quoted"` or `filename=token`. `filename*` does not match: the star is not whitespace. */
const PLAIN = /(?:^|;)\s*filename\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^;]*))/i;

function decodeExtended(raw: string): string | null {
  const value = raw.trim().replace(/^"(.*)"$/, '$1');
  const match = /^([^']*)'[^']*'(.*)$/.exec(value);
  if (!match) return null;
  const charset = match[1].toLowerCase();
  const encoded = match[2];
  try {
    if (charset === 'utf-8' || charset === '') return decodeURIComponent(encoded);
    if (charset === 'iso-8859-1' || charset === 'latin1') {
      return encoded.replace(/%([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
    }
  } catch {
    // A malformed percent sequence: fall through to the plain parameter.
  }
  return null;
}

/**
 * Reads the file name a `Content-Disposition` header carries, or `null` when
 * it carries none.
 *
 * `filename*` wins over `filename` when both are present, as RFC 6266 asks;
 * its value is percent-decoded. A `filename*` that cannot be decoded falls back
 * to the plain `filename`. Parameter names are case-insensitive; a quoted
 * `filename` has its backslash escapes removed.
 *
 * @example
 * ```ts
 * wrContentDispositionFileName(response.headers.get('Content-Disposition'));
 *
 * wrContentDispositionFileName('attachment; filename="report.csv"');
 * // 'report.csv'
 * wrContentDispositionFileName("attachment; filename*=UTF-8''%E2%82%AC.csv");
 * // '€.csv'
 * wrContentDispositionFileName('inline');
 * // null
 * ```
 *
 * @param header - The header value, or what `Headers.get()` returned.
 * @returns The file name, or `null`.
 */
export function wrContentDispositionFileName(header: string | null | undefined): string | null {
  if (!header) return null;

  const extended = EXTENDED.exec(header);
  if (extended) {
    const decoded = decodeExtended(extended[1]);
    if (decoded) return decoded;
  }

  const plain = PLAIN.exec(header);
  if (!plain) return null;
  const name = plain[1] !== undefined ? plain[1].replace(/\\(.)/g, '$1') : plain[2].trim();
  return name || null;
}
