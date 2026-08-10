import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrCookie } from './cookie';

/**
 * jsdom implements `document.cookie` for real — it stores, merges and expires — so this is
 * one of the few browser APIs that can be exercised here rather than stubbed. What it does
 * NOT do is enforce the rules a browser applies to the attributes, so the serialised string
 * is read back off a fake document wherever an attribute is the thing under test.
 */
describe('WrCookie', () => {
  let cookies: WrCookie;

  const setup = (): WrCookie => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(WrCookie);
  };

  /** A document whose `cookie` setter only records, so attributes can be inspected. */
  const withRecordingDoc = (): { service: WrCookie; written: string[] } => {
    const written: string[] = [];
    const doc = {
      get cookie(): string {
        return '';
      },
      set cookie(value: string) {
        written.push(value);
      },
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: doc }] });
    return { service: TestBed.inject(WrCookie), written };
  };

  beforeEach(() => {
    for (const key of document.cookie.split(';')) {
      const name = key.split('=')[0]?.trim();
      if (name) document.cookie = `${name}=; expires=${new Date(0).toUTCString()}; path=/`;
    }
    cookies = setup();
  });

  afterEach(() => vi.restoreAllMocks());

  it('writes a value and reads it back', () => {
    cookies.set('theme', 'dark');

    expect(cookies.get('theme')).toBe('dark');
    expect(cookies.has('theme')).toBe(true);
  });

  it('returns the fallback for a name that is not there', () => {
    expect(cookies.get('absent')).toBeNull();
    expect(cookies.get('absent', 'default')).toBe('default');
    expect(cookies.has('absent')).toBe(false);
  });

  it('keeps a value that needs encoding intact', () => {
    // `;` and `=` would otherwise end the pair or split it.
    cookies.set('note', 'a=b; c d&e');
    expect(cookies.get('note')).toBe('a=b; c d&e');
  });

  it('encodes the name too, so a space or a semicolon cannot break the jar', () => {
    cookies.set('my name', 'x');
    expect(cookies.get('my name')).toBe('x');
    expect(document.cookie).toContain('my%20name=');
  });

  it('tells an empty value from a missing one', () => {
    cookies.set('empty', '');
    expect(cookies.get('empty')).toBe('');
    expect(cookies.has('empty')).toBe(true);
  });

  it('does not confuse a name with one that starts the same way', () => {
    cookies.set('theme', 'dark');
    cookies.set('theme_variant', 'high-contrast');

    expect(cookies.get('theme')).toBe('dark');
    expect(cookies.get('theme_variant')).toBe('high-contrast');
  });

  it('lists the names it can see, decoded', () => {
    cookies.set('a', '1');
    cookies.set('my name', '2');

    const keys = cookies.keys();
    expect(keys).toContain('a');
    expect(keys).toContain('my name');
  });

  it('removes a single cookie and leaves the rest', () => {
    cookies.set('a', '1');
    cookies.set('b', '2');
    cookies.remove('a');

    expect(cookies.get('a')).toBeNull();
    expect(cookies.get('b')).toBe('2');
  });

  it('clears everything it can see', () => {
    cookies.set('a', '1');
    cookies.set('b', '2');
    cookies.clear();

    expect(cookies.keys()).toEqual([]);
  });

  describe('serialisation', () => {
    it('defaults to the root path and Lax', () => {
      const { service, written } = withRecordingDoc();
      service.set('k', 'v');

      expect(written[0]).toContain('path=/');
      expect(written[0]).toContain('samesite=Lax');
      expect(written[0]).not.toContain('secure');
    });

    it('writes a Date as an HTTP-date and a number as Max-Age', () => {
      const { service, written } = withRecordingDoc();
      service.set('a', '1', { expires: new Date(Date.UTC(2030, 0, 1)) });
      service.set('b', '2', { expires: 3600 });

      expect(written[0]).toContain('expires=Tue, 01 Jan 2030 00:00:00 GMT');
      expect(written[1]).toContain('max-age=3600');
    });

    it('floors a fractional Max-Age and never writes a negative one', () => {
      const { service, written } = withRecordingDoc();
      service.set('a', '1', { expires: 10.9 });
      service.set('b', '2', { expires: -5 });

      expect(written[0]).toContain('max-age=10');
      // `max-age=0` expires the cookie immediately, which is what a negative one meant.
      expect(written[1]).toContain('max-age=0');
    });

    it('passes the path, domain and secure flag through', () => {
      const { service, written } = withRecordingDoc();
      service.set('k', 'v', { path: '/app', domain: 'example.test', secure: true });

      expect(written[0]).toContain('path=/app');
      expect(written[0]).toContain('domain=example.test');
      expect(written[0]).toContain('secure');
    });

    it('sends SameSite=None with Secure, because a browser drops it otherwise', () => {
      // Every modern browser rejects `SameSite=None` unless `Secure` is also set, so the
      // write used to be a silent no-op — the one failure mode a cookie API must not have.
      const { service, written } = withRecordingDoc();
      service.set('k', 'v', { sameSite: 'None' });

      expect(written[0]).toContain('samesite=None');
      expect(written[0]).toContain('secure');
    });

    it('deletes by expiring in 1970 on the same path', () => {
      const { service, written } = withRecordingDoc();
      service.remove('k', { path: '/app' });

      expect(written[0]).toContain('expires=Thu, 01 Jan 1970 00:00:00 GMT');
      expect(written[0]).toContain('path=/app');
    });
  });

  describe('without a usable document', () => {
    /** The SSR shape: reading and writing `cookie` both throw. */
    const hostile = (): WrCookie => {
      const doc = {
        get cookie(): string {
          throw new Error('no cookie support');
        },
        set cookie(_value: string) {
          throw new Error('no cookie support');
        },
      };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: doc }] });
      return TestBed.inject(WrCookie);
    };

    it('reads as empty and writes as a no-op instead of throwing', () => {
      const service = hostile();

      expect(() => service.set('k', 'v')).not.toThrow();
      expect(service.get('k')).toBeNull();
      expect(service.get('k', 'fallback')).toBe('fallback');
      expect(service.has('k')).toBe(false);
      expect(service.keys()).toEqual([]);
      expect(() => service.clear()).not.toThrow();
    });
  });
});
