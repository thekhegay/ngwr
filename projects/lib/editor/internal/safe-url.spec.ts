import { describe, expect, it } from 'vitest';

import { safeUrl } from './safe-url';

/**
 * The URL policy on its own, as plain strings. Where it is applied — the link
 * panel, a paste, a bound value — is the editor's and the codec's spec; this is
 * what it allows.
 */
describe('safeUrl', () => {
  it('allows the schemes a document legitimately links to', () => {
    for (const url of ['https://a.b', 'http://a.b', 'mailto:a@b.co', 'tel:+123', 'ftp://a.b']) {
      expect(safeUrl(url, 'link')).toBe(url);
    }
  });

  it('allows relative destinations, which have no scheme to check', () => {
    for (const url of ['/a/b', './a', '#anchor', '?q=1', '//cdn.example/a.png']) {
      expect(safeUrl(url, 'link')).toBe(url);
    }
  });

  it('refuses a script URL', () => {
    expect(safeUrl('javascript:alert(1)', 'link')).toBeNull();
    expect(safeUrl('JaVaScRiPt:alert(1)', 'link')).toBeNull();
    expect(safeUrl('vbscript:msgbox', 'link')).toBeNull();
  });

  it('refuses a script URL hidden behind whitespace or a control character', () => {
    // A browser strips these before resolving the scheme, so a check that reads
    // the raw string sees a relative path and waves it through.
    expect(safeUrl('java\tscript:alert(1)', 'link')).toBeNull();
    expect(safeUrl('java\nscript:alert(1)', 'link')).toBeNull();
    expect(safeUrl(' javascript:alert(1)', 'link')).toBeNull();
  });

  it('refuses a script URL whose colon or letters are character references', () => {
    // An HTML attribute or a markdown destination decodes references, so
    // wherever a stored value is rendered next it reads `javascript:` — the
    // check has to as well.
    for (const url of [
      'javascript&colon;alert(1)',
      'javascript&#58;alert(1)',
      'javascript&#x3A;alert(1)',
      'javascript&#0058alert(1)',
      '&#106;avascript:alert(1)',
      'java&Tab;script:alert(1)',
      'data&colon;text/html,x',
    ]) {
      expect(safeUrl(url, 'link')).toBeNull();
    }
    expect(safeUrl('data&colon;image/png;base64,iVBORw0KGgo=', 'image')).toBeNull();
    // An allowed scheme, or none, is still returned exactly as written.
    expect(safeUrl('https&colon;//a.b', 'link')).toBe('https&colon;//a.b');
    expect(safeUrl('/search?a=1&amp;b=2', 'link')).toBe('/search?a=1&amp;b=2');
  });

  it('keeps hyphens in a host name', () => {
    // The character class doing the stripping is easy to get wrong in a way that
    // silently rewrites real URLs rather than failing loudly.
    expect(safeUrl('https://my-site.co.uk/a-b', 'link')).toBe('https://my-site.co.uk/a-b');
  });

  it('allows a raster data image and refuses everything else data can carry', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';

    expect(safeUrl(png, 'image')).toBe(png);
    // SVG can carry script, `text/html` is a document, and neither belongs in an
    // image a stranger wrote. A data URL is never a link destination.
    expect(safeUrl('data:image/svg+xml;base64,PHN2Zz4=', 'image')).toBeNull();
    expect(safeUrl('data:text/html;base64,PHNjcmlwdD4=', 'image')).toBeNull();
    expect(safeUrl(png, 'link')).toBeNull();
  });
});
