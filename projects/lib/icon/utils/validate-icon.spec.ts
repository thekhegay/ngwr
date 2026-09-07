/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type MockInstance, afterEach, describe, expect, it, vi } from 'vitest';

import { validateIcon } from './validate-icon';

/**
 * A RENDERING check, and the spec is here to keep it read that way.
 *
 * `icon-security.spec.ts` next door covers what actually keeps hostile markup
 * out of the DOM — `sanitizeIcon`, which runs on every render in every build.
 * This function runs only under `isDevMode()` and reads the string with two
 * regexes, so the last assertion below is the important one: it must warn about
 * nothing that `sanitizeIcon` is responsible for, or a reader takes a green
 * console for a safety guarantee it never made.
 */
describe('validateIcon', () => {
  const warn = (): MockInstance<(...args: unknown[]) => void> =>
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

  afterEach(() => vi.restoreAllMocks());

  it('says nothing about a well-formed icon', () => {
    const spy = warn();
    validateIcon({ name: 'ok', data: '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('names the icon when there is no <svg> root, and stops there', () => {
    const spy = warn();
    validateIcon({ name: 'broken', data: '<div>not an icon</div>' });

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('"broken"');
    expect(spy.mock.calls[0][0]).toContain('<svg> root');
  });

  it('warns about a missing viewBox separately, because the glyph still renders', () => {
    // The two failures are different: no root means nothing draws, no viewBox
    // means it draws at a fixed size and ignores the host. Reporting them as one
    // message would send an author looking for the wrong thing.
    const spy = warn();
    validateIcon({ name: 'unscaled', data: '<svg width="24" height="24"><path d="M0 0"/></svg>' });

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('"unscaled"');
    expect(spy.mock.calls[0][0]).toContain('viewBox');
  });

  it('accepts the spellings real icon sets ship', () => {
    const spy = warn();
    for (const data of [
      '<SVG VIEWBOX="0 0 24 24"></SVG>',
      "<svg viewBox='0 0 24 24'></svg>",
      '<svg\n  xmlns="http://www.w3.org/2000/svg"\n  viewBox = "0 0 24 24"\n></svg>',
      '<?xml version="1.0"?><svg viewBox="0 0 16 16"></svg>',
    ]) {
      validateIcon({ name: 'set', data });
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it('is silent about the markup only the sanitizer refuses', () => {
    // Every one of these carries an <svg> root with a viewBox, so this function
    // has nothing to say — and that is correct rather than a hole. It is why its
    // own JSDoc calls it "explicitly not a security control": a payload passes
    // here and is rebuilt out of existence at render.
    const spy = warn();
    for (const data of [
      '<svg viewBox="0 0 24 24" onload="alert(1)"></svg>',
      '<svg viewBox="0 0 24 24"><script>alert(1)</script></svg>',
      '<svg viewBox="0 0 24 24"><foreignObject><img src=x onerror="alert(1)"></foreignObject></svg>',
      '<svg viewBox="0 0 24 24"></svg><img src=x onerror="alert(1)">',
    ]) {
      validateIcon({ name: 'hostile', data });
    }
    expect(spy).not.toHaveBeenCalled();
  });
});
