/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

const SCHEME_RE = /^([a-z][a-z0-9+.-]*):/i;
const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto', 'tel', 'ftp']);
const DATA_IMAGE_RE = /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=]+$/i;

/**
 * Whitespace and control characters only: a hyphen has no business being
 * stripped out of a host name. Written as escapes rather than literal bytes — a
 * raw NUL inside a regex literal makes the file binary to every text tool.
 * Stripping control characters is the entire point: a browser ignores them before
 * resolving the scheme, so a check that reads the raw string sees a relative path
 * and waves `java\u0000script:` straight through.
 */
// eslint-disable-next-line no-control-regex
const URL_IGNORED_RE = /[\s\u0000-\u001f\u007f]/g;

/**
 * The character references that can spell a scheme once something decodes them:
 * every numeric one, and the named ones for the colon and for the whitespace a
 * browser strips (`&colon;`, `&Tab;`, `&NewLine;`). Matched without regard to
 * case and with the semicolon optional, which is wider than any HTML or markdown
 * renderer decodes — the net only ever catches a URL nobody writes.
 */
const SCHEME_REFERENCE_RE = /&(?:#x([0-9a-f]+)|#(\d+)|(colon|tab|newline));?/gi;

function decodeSchemeReferences(url: string): string {
  return url.replace(SCHEME_REFERENCE_RE, (_reference, hex?: string, decimal?: string, name?: string) => {
    if (name) return name.toLowerCase() === 'colon' ? ':' : '\n';
    const code = hex ? Number.parseInt(hex, 16) : Number(decimal);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '\ufffd';
  });
}

/**
 * A URL safe to put in a link's `href` or an image's `src`, or `null` where the
 * editor refuses it — the one URL policy behind the link panel, a paste and a
 * bound value.
 *
 * A refusal is never rewritten into something else. Angular's answer to a
 * hostile URL is the string `unsafe:javascript:…` in a live anchor — a link that
 * looks real, is announced as a link, and does nothing — so a pasted link keeps
 * its text and loses the URL instead, the panel says the address cannot be used,
 * and a bound value holding one is refused whole.
 *
 * Whitespace and control characters are stripped before the scheme is read,
 * because `java\nscript:` and `java script:` are the same URL to a browser and
 * different strings to a naive check. So are character references:
 * `javascript&colon;` has no scheme to this check, and the editor's own drawing
 * never decodes it — but a stored value is read again by whatever renders it
 * next, and an HTML attribute or a markdown destination hands a browser
 * `javascript:`. The scheme is read from the decoded form; what comes back is
 * still the URL as written.
 */
function safeUrl(raw: string, kind: 'link' | 'image'): string | null {
  const url = raw.trim();
  const bare = url.replace(URL_IGNORED_RE, '');
  const scheme = SCHEME_RE.exec(decodeSchemeReferences(bare).replace(URL_IGNORED_RE, ''));

  // No scheme at all: relative path, `#anchor`, `//host` — nothing executable.
  if (!scheme) return url;

  const name = scheme[1].toLowerCase();

  // `data:` is an image-only allowance, and only for raster types: an SVG can
  // carry script, and `data:text/html` is a same-origin document.
  if (name === 'data') return kind === 'image' && DATA_IMAGE_RE.test(bare) ? bare : null;

  return ALLOWED_SCHEMES.has(name) ? url : null;
}

export { safeUrl };
