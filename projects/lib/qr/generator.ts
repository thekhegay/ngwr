/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isDevMode } from '@angular/core';

import type { WrQrErrorLevel } from './interfaces';
import qrcodegen from './qrcodegen';

interface DrawOptionsInternal {
  readonly value: string;
  readonly size: number;
  readonly padding: number;
  readonly color: string;
  readonly bgColor: string;
  readonly level: WrQrErrorLevel;
  readonly iconUrl?: string | null;
  readonly iconSize?: number;
}

const ERROR_LEVEL_MAP: Record<WrQrErrorLevel, qrcodegen.QrCode.Ecc> = {
  L: qrcodegen.QrCode.Ecc.LOW,
  M: qrcodegen.QrCode.Ecc.MEDIUM,
  Q: qrcodegen.QrCode.Ecc.QUARTILE,
  H: qrcodegen.QrCode.Ecc.HIGH,
};

const SCALE = 10;

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, bgColor: string): void {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
}

function drawModules(ctx: CanvasRenderingContext2D, code: qrcodegen.QrCode, padding: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = 0; y < code.size; y++) {
    for (let x = 0; x < code.size; x++) {
      if (code.getModule(x, y)) {
        ctx.fillRect(padding + x * SCALE, padding + y * SCALE, SCALE, SCALE);
      }
    }
  }
}

function overlayIcon(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, options: DrawOptionsInternal): void {
  const iconImg = new Image();
  iconImg.crossOrigin = 'anonymous';
  iconImg.src = options.iconUrl!;

  const ratio = canvas.width / options.size;
  const iconPx = (options.iconSize ?? 42) * ratio;
  const coord = canvas.width / 2 - iconPx / 2;

  iconImg.onload = (): void => {
    ctx.fillStyle = options.bgColor;
    ctx.fillRect(coord, coord, iconPx, iconPx);
    ctx.drawImage(iconImg, coord + 10, coord + 10, iconPx - 20, iconPx - 20);
  };
}

/**
 * Encodes the payload, or reports `null` when it does not fit.
 *
 * A version-40 code tops out around 2953 bytes at level L and 1273 at level H, and the
 * vendored encoder answers a longer one by throwing `RangeError('Data too long')`. That
 * is a value the consumer bound, not a bug — and `WrQr` calls this from an `effect()`,
 * where an exception escapes into `runEffectsInView` and abandons every remaining effect
 * in the view, so one over-long string would stop the OTHER QR codes on the page from
 * repainting. Same policy as `wr-icon` with an unregistered name: reported in dev,
 * never thrown.
 *
 * Only that one RangeError is absorbed. Anything else the encoder raises is a genuine
 * bug in it, and swallowing those would turn a crash into a silently blank code.
 */
function encode(options: DrawOptionsInternal): qrcodegen.QrCode | null {
  try {
    return qrcodegen.QrCode.encodeText(options.value, ERROR_LEVEL_MAP[options.level]);
  } catch (error) {
    if (!(error instanceof RangeError) || error.message !== 'Data too long') throw error;
    if (isDevMode()) {
      // eslint-disable-next-line no-console -- a payload that cannot be encoded must be visible, but must not throw
      console.error(
        `[NGWR] <wr-qr> cannot encode ${options.value.length} characters at error-correction level ` +
          `"${options.level}" — the largest QR code holds about 2953 bytes at level "L" and 1273 at "H", ` +
          `and non-ASCII text costs several bytes per character. Shorten the value, or lower the level.`
      );
    }
    return null;
  }
}

function draw(canvas: HTMLCanvasElement, options: DrawOptionsInternal): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.style.width = `${options.size}px`;
  canvas.style.height = `${options.size}px`;

  if (!options.value) {
    ctx.fillStyle = options.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const code = encode(options);
  if (!code) {
    // Over capacity: leave a blank surface rather than a stale code. Painting the
    // whole bitmap is what clears the previous value — `canvas.width` is only reassigned
    // once an encode succeeds, so the surface still holds the last code's modules.
    drawBackground(ctx, canvas.width, canvas.height, options.bgColor);
    return;
  }

  const padding = options.padding;
  canvas.width = code.size * SCALE + padding * 2;
  canvas.height = code.size * SCALE + padding * 2;

  drawBackground(ctx, canvas.width, canvas.height, options.bgColor);
  drawModules(ctx, code, padding, options.color);

  if (options.iconUrl) {
    overlayIcon(canvas, ctx, options);
  }
}

/** Options accepted by {@link drawQrCode}. @internal */
export type DrawOptions = DrawOptionsInternal;

/**
 * Renders a QR code (with optional center icon) onto the given canvas.
 *
 * @internal
 */
export const drawQrCode = draw;
