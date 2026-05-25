/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Crop rectangle in source-image (natural) pixel coordinates. */
export type WrCropRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/** Possible drag handles on the crop overlay. */
export type WrCropHandle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** Supported output MIME types for {@link WrImageCropperComponent.toBlob}. */
export type WrImageOutputType = 'image/png' | 'image/jpeg' | 'image/webp';
