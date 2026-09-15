/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Crop rectangle in source-image (natural) pixel coordinates. */
export interface WrCropRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Possible drag handles on the crop overlay. */
export type WrCropHandle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** Supported output MIME types for {@link WrImageCropper.toBlob}. */
export type WrImageOutputType = 'image/png' | 'image/jpeg' | 'image/webp';

/**
 * Where the cropper's source stands.
 *
 * - `empty` — no `src`, so the placeholder is showing.
 * - `loading` — a `src` has been handed to the `<img>` and the browser has not
 *   answered yet.
 * - `loaded` — the image decoded. The crop window opens once it also has a
 *   measured size, which in a browser is the same moment.
 * - `failed` — the browser could not decode it (a renamed `.heic`, a truncated
 *   file, a URL that 404s). `(loadError)` fired with the details.
 */
export type WrImageCropperStatus = 'empty' | 'loading' | 'loaded' | 'failed';

/**
 * The payload of `(loadError)` — plain strings and numbers, so it can be logged,
 * sent to an error tracker or put into a store as it is.
 *
 * The browser's `error` event carries no reason at all, so none is invented here:
 * what the source DECLARED is the most a host has to work with, and for the common
 * case (a phone photo in a format this browser cannot decode) `type` and `name`
 * are what tell the two apart from a broken upload.
 */
export interface WrImageLoadError {
  /**
   * The URL the `<img>` was given — the `src` string itself, or the object URL
   * made for a `File` / `Blob`. An object URL is revoked as soon as `src` changes,
   * so it identifies the attempt rather than being something to fetch later.
   */
  readonly url: string;
  /** `File.name` for a `File` source; `null` for a `Blob` or a string. */
  readonly name: string | null;
  /**
   * The MIME type a `File` / `Blob` declares — `''` when it declares none, and
   * `null` for a string source. A `File`'s type comes from its extension, so a
   * renamed file declares the type of the name it was given.
   */
  readonly type: string | null;
  /** Size in bytes for a `File` / `Blob`; `null` for a string source. */
  readonly size: number | null;
}
