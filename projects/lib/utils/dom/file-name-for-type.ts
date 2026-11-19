/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

const EXTENSIONS: ReadonlyMap<string, string> = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['image/avif', 'avif'],
  ['image/svg+xml', 'svg'],
  ['image/bmp', 'bmp'],
]);

/** Image extensions a name may already carry, the ones replaced rather than kept. */
const IMAGE_EXTENSION = /(?<=.)\.(?:png|apng|jpe?g|jpe|jfif|pjpeg|webp|gif|avif|svg|bmp|ico|tiff?|heic|heif|jp2|jxl)$/i;

/**
 * `name` with the extension of the MIME `type`. An image extension the name
 * already carries is replaced; anything else after a dot is part of the name
 * (`photo.v2`, `John.Smith`), so the extension is appended. A type with no
 * known extension leaves `name` as it is.
 */
export function wrFileNameForType(name: string, type: string): string {
  const extension = EXTENSIONS.get(type.split(';')[0].trim().toLowerCase());
  if (!extension) return name;
  return `${name.replace(IMAGE_EXTENSION, '')}.${extension}`;
}
