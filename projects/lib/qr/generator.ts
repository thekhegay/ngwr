/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import qrcodegen from './qrcodegen';
import type { WrQrErrorLevel } from './types';

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

  const code = qrcodegen.QrCode.encodeText(options.value, ERROR_LEVEL_MAP[options.level]);
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
