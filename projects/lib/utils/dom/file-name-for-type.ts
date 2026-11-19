/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

const EXTENSIONS: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
};

/**
 * `name` with the extension of the MIME `type`: a trailing extension is replaced, none
 * is appended. A type with no known extension leaves `name` as it is.
 */
export function wrFileNameForType(name: string, type: string): string {
  const extension = EXTENSIONS[type.split(';')[0].trim().toLowerCase()];
  if (!extension) return name;
  return `${name.replace(/(?<=.)\.[a-z0-9]{1,5}$/i, '')}.${extension}`;
}
