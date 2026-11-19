/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { describe, expect, it } from 'vitest';

import { wrFileNameForType } from './file-name-for-type';

describe('wrFileNameForType', () => {
  it('appends the extension when the name has none', () => {
    expect(wrFileNameForType('avatar', 'image/png')).toBe('avatar.png');
  });

  it('replaces the extension the name carries', () => {
    expect(wrFileNameForType('avatar.png', 'image/jpeg')).toBe('avatar.jpg');
    expect(wrFileNameForType('a.b.JPG', 'image/webp')).toBe('a.b.webp');
  });

  it('keeps a leading dot as part of the name', () => {
    expect(wrFileNameForType('.avatar', 'image/png')).toBe('.avatar.png');
  });

  it('ignores MIME parameters and case', () => {
    expect(wrFileNameForType('a', 'IMAGE/PNG; charset=x')).toBe('a.png');
  });

  it('leaves the name alone for an unknown type', () => {
    expect(wrFileNameForType('a.txt', 'application/x-unknown')).toBe('a.txt');
  });
});
