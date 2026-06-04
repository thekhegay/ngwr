/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the FuzzyText effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/text-animations/fuzzy-text
 *
 * Renders text to an offscreen 2D canvas, then redraws it onto the
 * visible canvas one row (or column) at a time with random horizontal /
 * vertical offsets. Intensity reacts to hover / click / glitch state.
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import type { ElementRef } from '@angular/core';
import {
  Component,
  DestroyRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';

const num =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

/**
 * Canvas-rendered "fuzzy" text — each row/column of glyphs is offset by
 * a random amount per frame, giving the text a TV-static or motion-blur
 * appearance. Intensity ramps up on hover, click, and during periodic
 * glitch bursts (configurable).
 *
 * @example
 * ```html
 * <wr-fuzzy-text text="404" />
 * <wr-fuzzy-text
 *   text="HELLO"
 *   color="#0ea5e9"
 *   [fuzzRange]="50"
 *   [hoverIntensity]="0.8"
 *   [glitchMode]="true"
 * />
 * ```
 *
 * @see https://www.reactbits.dev/text-animations/fuzzy-text
 */
@Component({
  selector: 'wr-fuzzy-text',
  template: '<canvas #canvas></canvas>',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-fuzzy-text' },
})
export class WrFuzzyText {
  /** Text to render. */
  readonly text = input.required<string>();

  /** Font size as CSS length (`'4rem'`, `'72px'`, …) or px number. @default 'clamp(2rem, 10vw, 10rem)' */
  readonly fontSize = input<string | number>('clamp(2rem, 10vw, 10rem)');

  /** Font weight. @default 900 */
  readonly fontWeight = input<number | string>(900);

  /** Font family. `'inherit'` reads the canvas's computed style. @default 'inherit' */
  readonly fontFamily = input('inherit');

  /** Text colour. Ignored if `[gradient]` is set. @default '#fff' */
  readonly color = input('#fff');

  /** Optional horizontal gradient stops. */
  readonly gradient = input<readonly string[] | null>(null);

  /** Enable hover / touch reactivity. @default true */
  readonly enableHover = input(true, { transform: coerceBooleanProperty });

  /** Base intensity (0..1) when idle. @default 0.18 */
  readonly baseIntensity = input(0.18, { transform: num(0.18) });

  /** Intensity (0..1) while the pointer hovers the text. @default 0.5 */
  readonly hoverIntensity = input(0.5, { transform: num(0.5) });

  /** Max pixel displacement per row/column at intensity 1. @default 30 */
  readonly fuzzRange = input(30, { transform: num(30) });

  /** Frame rate cap. @default 60 */
  readonly fps = input(60, { transform: num(60) });

  /** Fuzz direction. @default 'horizontal' */
  readonly direction = input<WrFuzzyTextDirection>('horizontal');

  /** Ms to ease intensity toward target. `0` snaps. @default 0 */
  readonly transitionDuration = input(0, { transform: num(0) });

  /** Spike to full intensity briefly on click. @default false */
  readonly clickEffect = input(false, { transform: coerceBooleanProperty });

  /** Periodic "glitch" bursts at full intensity. @default false */
  readonly glitchMode = input(false, { transform: coerceBooleanProperty });

  /** Ms between glitch bursts. @default 2000 */
  readonly glitchInterval = input(2000, { transform: num(2000) });

  /** Ms a glitch burst lasts. @default 200 */
  readonly glitchDuration = input(200, { transform: num(200) });

  /** Extra pixels between glyphs. @default 0 */
  readonly letterSpacing = input(0, { transform: num(0) });

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private teardown: (() => void) | undefined;

  constructor() {
    if (!this.isBrowser) return;

    afterNextRender(() => {
      void this.init();
    });

    // Re-init whenever any input that affects the offscreen rendering changes.
    effect(() => {
      this.text();
      this.fontSize();
      this.fontWeight();
      this.fontFamily();
      this.color();
      this.gradient();
      this.letterSpacing();
      this.direction();
      this.fuzzRange();
      this.fps();
      this.glitchMode();
      this.glitchInterval();
      this.glitchDuration();
      // Skip if we haven't booted yet.
      if (!this.teardown) return;
      this.teardown();
      this.teardown = undefined;
      queueMicrotask(() => {
        void this.init();
      });
    });

    this.destroyRef.onDestroy(() => this.teardown?.());
  }

  // ───────── Init / loop ─────────

  private async init(): Promise<void> {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fontFamily =
      this.fontFamily() === 'inherit' ? window.getComputedStyle(canvas).fontFamily || 'sans-serif' : this.fontFamily();
    const fontSize = this.fontSize();
    const fontSizeStr = typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
    const fontWeight = this.fontWeight();
    const fontString = `${fontWeight} ${fontSizeStr} ${fontFamily}`;

    try {
      await document.fonts.load(fontString);
    } catch {
      await document.fonts.ready;
    }

    // Numeric font size for buffer maths.
    let numericFontSize: number;
    if (typeof fontSize === 'number') {
      numericFontSize = fontSize;
    } else {
      const tmp = document.createElement('span');
      tmp.style.fontSize = fontSize;
      document.body.appendChild(tmp);
      numericFontSize = Number.parseFloat(window.getComputedStyle(tmp).fontSize);
      document.body.removeChild(tmp);
    }

    const text = this.text();
    const letterSpacing = this.letterSpacing();
    const fuzzRange = this.fuzzRange();
    const direction = this.direction();

    // Offscreen canvas with the laid-out text.
    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;
    offCtx.font = fontString;
    offCtx.textBaseline = 'alphabetic';

    let totalWidth = 0;
    if (letterSpacing !== 0) {
      for (const ch of text) totalWidth += offCtx.measureText(ch).width + letterSpacing;
      totalWidth -= letterSpacing;
    } else {
      totalWidth = offCtx.measureText(text).width;
    }
    const m = offCtx.measureText(text);
    const actualLeft = m.actualBoundingBoxLeft ?? 0;
    const actualRight = letterSpacing !== 0 ? totalWidth : (m.actualBoundingBoxRight ?? m.width);
    const actualAscent = m.actualBoundingBoxAscent ?? numericFontSize;
    const actualDescent = m.actualBoundingBoxDescent ?? numericFontSize * 0.2;
    const textBoundingWidth = Math.ceil(letterSpacing !== 0 ? totalWidth : actualLeft + actualRight);
    const tightHeight = Math.ceil(actualAscent + actualDescent);

    const extraWidthBuffer = 10;
    const offscreenWidth = textBoundingWidth + extraWidthBuffer;
    offscreen.width = offscreenWidth;
    offscreen.height = tightHeight;
    const xOffset = extraWidthBuffer / 2;

    offCtx.font = fontString;
    offCtx.textBaseline = 'alphabetic';

    const gradient = this.gradient();
    if (gradient && gradient.length >= 2) {
      const g = offCtx.createLinearGradient(0, 0, offscreenWidth, 0);
      gradient.forEach((c, i) => g.addColorStop(i / (gradient.length - 1), c));
      offCtx.fillStyle = g;
    } else {
      offCtx.fillStyle = this.color();
    }

    if (letterSpacing !== 0) {
      let xPos = xOffset;
      for (const ch of text) {
        offCtx.fillText(ch, xPos, actualAscent);
        xPos += offCtx.measureText(ch).width + letterSpacing;
      }
    } else {
      offCtx.fillText(text, xOffset - actualLeft, actualAscent);
    }

    // Size the visible canvas, leaving room for the max horizontal fuzz.
    const horizontalMargin = fuzzRange + 20;
    const verticalMargin = 0;
    canvas.width = offscreenWidth + horizontalMargin * 2;
    canvas.height = tightHeight + verticalMargin * 2;
    ctx.translate(horizontalMargin, verticalMargin);

    const interactiveLeft = horizontalMargin + xOffset;
    const interactiveTop = verticalMargin;
    const interactiveRight = interactiveLeft + textBoundingWidth;
    const interactiveBottom = interactiveTop + tightHeight;

    let isHovering = false;
    let isClicking = false;
    let isGlitching = false;
    let currentIntensity = this.baseIntensity();
    let targetIntensity = currentIntensity;
    let lastFrame = 0;
    const frameDuration = 1000 / this.fps();

    let rafId = 0;
    let glitchOnTimer: ReturnType<typeof setTimeout> | undefined;
    let glitchOffTimer: ReturnType<typeof setTimeout> | undefined;
    let clickTimer: ReturnType<typeof setTimeout> | undefined;

    const startGlitchLoop = (): void => {
      if (!this.glitchMode()) return;
      glitchOnTimer = setTimeout(() => {
        isGlitching = true;
        glitchOffTimer = setTimeout(() => {
          isGlitching = false;
          startGlitchLoop();
        }, this.glitchDuration());
      }, this.glitchInterval());
    };
    if (this.glitchMode()) startGlitchLoop();

    const run = (ts: number): void => {
      if (ts - lastFrame < frameDuration) {
        rafId = requestAnimationFrame(run);
        return;
      }
      lastFrame = ts;

      ctx.clearRect(
        -fuzzRange - 20,
        -fuzzRange - 10,
        offscreenWidth + 2 * (fuzzRange + 20),
        tightHeight + 2 * (fuzzRange + 10)
      );

      if (isClicking) targetIntensity = 1;
      else if (isGlitching) targetIntensity = 1;
      else if (isHovering) targetIntensity = this.hoverIntensity();
      else targetIntensity = this.baseIntensity();

      const td = this.transitionDuration();
      if (td > 0) {
        const step = 1 / (td / frameDuration);
        if (currentIntensity < targetIntensity) currentIntensity = Math.min(currentIntensity + step, targetIntensity);
        else if (currentIntensity > targetIntensity)
          currentIntensity = Math.max(currentIntensity - step, targetIntensity);
      } else {
        currentIntensity = targetIntensity;
      }

      if (direction === 'horizontal') {
        for (let j = 0; j < tightHeight; j++) {
          const dx = Math.floor(currentIntensity * (Math.random() - 0.5) * fuzzRange);
          ctx.drawImage(offscreen, 0, j, offscreenWidth, 1, dx, j, offscreenWidth, 1);
        }
      } else if (direction === 'vertical') {
        for (let i = 0; i < offscreenWidth; i++) {
          const dy = Math.floor(currentIntensity * (Math.random() - 0.5) * fuzzRange);
          ctx.drawImage(offscreen, i, 0, 1, tightHeight, i, dy, 1, tightHeight);
        }
      } else {
        // both: horizontal pass then vertical pass on the result
        for (let j = 0; j < tightHeight; j++) {
          const dx = Math.floor(currentIntensity * (Math.random() - 0.5) * fuzzRange);
          ctx.drawImage(offscreen, 0, j, offscreenWidth, 1, dx, j, offscreenWidth, 1);
        }
        const w = offscreenWidth + fuzzRange;
        const h = tightHeight + fuzzRange;
        const data = ctx.getImageData(0, 0, w, h);
        ctx.clearRect(
          -fuzzRange - 20,
          -fuzzRange - 10,
          offscreenWidth + 2 * (fuzzRange + 20),
          tightHeight + 2 * (fuzzRange + 10)
        );
        ctx.putImageData(data, 0, 0);
        for (let i = 0; i < w; i++) {
          const dy = Math.floor(currentIntensity * (Math.random() - 0.5) * fuzzRange * 0.5);
          const col = ctx.getImageData(i, 0, 1, h);
          ctx.clearRect(i, -fuzzRange, 1, tightHeight + 2 * fuzzRange);
          ctx.putImageData(col, i, dy);
        }
      }

      rafId = requestAnimationFrame(run);
    };
    rafId = requestAnimationFrame(run);

    const isInsideText = (x: number, y: number): boolean =>
      x >= interactiveLeft && x <= interactiveRight && y >= interactiveTop && y <= interactiveBottom;

    const onMouseMove = (e: MouseEvent): void => {
      if (!this.enableHover()) return;
      const rect = canvas.getBoundingClientRect();
      isHovering = isInsideText(e.clientX - rect.left, e.clientY - rect.top);
    };
    const onMouseLeave = (): void => {
      isHovering = false;
    };
    const onTouchMove = (e: TouchEvent): void => {
      if (!this.enableHover()) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      isHovering = isInsideText(t.clientX - rect.left, t.clientY - rect.top);
    };
    const onTouchEnd = (): void => {
      isHovering = false;
    };
    const onClick = (): void => {
      if (!this.clickEffect()) return;
      isClicking = true;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        isClicking = false;
      }, 150);
    };

    if (this.enableHover()) {
      canvas.addEventListener('mousemove', onMouseMove);
      canvas.addEventListener('mouseleave', onMouseLeave);
      canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      canvas.addEventListener('touchend', onTouchEnd);
    }
    if (this.clickEffect()) canvas.addEventListener('click', onClick);

    this.teardown = (): void => {
      cancelAnimationFrame(rafId);
      clearTimeout(glitchOnTimer);
      clearTimeout(glitchOffTimer);
      clearTimeout(clickTimer);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('click', onClick);
    };
  }
}

export type WrFuzzyTextDirection = 'horizontal' | 'vertical' | 'both';
