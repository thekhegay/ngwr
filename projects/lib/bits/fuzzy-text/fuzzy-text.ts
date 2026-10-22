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

import { coerceBooleanProperty } from '@angular/cdk/coercion';
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

import { WrPlatform } from 'ngwr/platform';
import { numAttr, resolveCssColor } from 'ngwr/utils';

import type { WrFuzzyTextDirection } from './types';

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
  // The text is drawn into the canvas as PIXELS, so without the first span there is
  // nothing for a screen reader to read at all — the same layer `wr-rotating-text`
  // and `wr-decrypt-text` carry. Hidden inline rather than through a class: this
  // entry point ships no stylesheet, and a consumer who imported none would
  // otherwise see the text twice.
  //
  // BOUND, not a static `style="…"` attribute. A real attribute is refused under
  // `style-src 'self'`, and what is lost there is not a colour: the span drops
  // every visual-hiding declaration and the word renders on screen beside the
  // canvas that already draws it. A binding goes through `style.setProperty`,
  // which is CSSOM and outside CSP's reach.
  template:
    '<span class="wr-fuzzy-text__sr-only" [style]="srOnly">{{ text() }}</span>' +
    '<canvas #canvas aria-hidden="true" [style]="fit"></canvas>',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-fuzzy-text', '[style.color]': "'var(--wr-color-on-surface)'" },
})
export class WrFuzzyText {
  /**
   * Visual-hiding declarations for the screen-reader copy of the text. A stable
   * object literal, so the binding is written once rather than on every pass.
   */
  protected readonly srOnly: Readonly<Record<string, string>> = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    'clip-path': 'inset(50%)',
    'white-space': 'nowrap',
  };

  /**
   * The canvas is as wide as the text it draws, and text cannot wrap, so a long
   * string or a narrow screen pushed it past its container and clipped it. Scaled
   * down to fit instead, keeping its aspect ratio; the pointer maths below reads
   * the drawn size back. Bound for the reason `srOnly` is.
   */
  protected readonly fit: Readonly<Record<string, string>> = { 'max-width': '100%', height: 'auto' };

  /** Text to render. */
  readonly text = input.required<string>();

  /** Font size as CSS length (`'4rem'`, `'72px'`, …) or px number. @default 'clamp(2rem, 10vw, 10rem)' */
  readonly fontSize = input<string | number>('clamp(2rem, 10vw, 10rem)');

  /** Font weight. @default 900 */
  readonly fontWeight = input<number | string>(900);

  /** Font family. `'inherit'` reads the canvas's computed style. @default 'inherit' */
  readonly fontFamily = input('inherit');

  /**
   * Text colour, any CSS colour — `var()` and `light-dark()` included, resolved
   * against the canvas. `'inherit'` follows the canvas's computed colour. Both are
   * re-read while the text animates, so a colour-scheme change lands on the next
   * frame. Ignored if `[gradient]` is set. @default 'inherit'
   */
  readonly color = input('inherit');

  /** Optional horizontal gradient stops, each resolved the way `color` is. */
  readonly gradient = input<readonly string[] | null>(null);

  /** Enable hover / touch reactivity. @default true */
  readonly enableHover = input(true, { transform: coerceBooleanProperty });

  /** Base intensity (0..1) when idle. @default 0.18 */
  readonly baseIntensity = input(0.18, { transform: numAttr(0.18) });

  /** Intensity (0..1) while the pointer hovers the text. @default 0.5 */
  readonly hoverIntensity = input(0.5, { transform: numAttr(0.5) });

  /** Max pixel displacement per row/column at intensity 1. @default 30 */
  readonly fuzzRange = input(30, { transform: numAttr(30) });

  /** Frame rate cap. @default 60 */
  readonly fps = input(60, { transform: numAttr(60) });

  /** Fuzz direction. @default 'horizontal' */
  readonly direction = input<WrFuzzyTextDirection>('horizontal');

  /** Ms to ease intensity toward target. `0` snaps. @default 0 */
  readonly transitionDuration = input(0, { transform: numAttr(0) });

  /** Spike to full intensity briefly on click. @default false */
  readonly clickEffect = input(false, { transform: coerceBooleanProperty });

  /** Periodic "glitch" bursts at full intensity. @default false */
  readonly glitchMode = input(false, { transform: coerceBooleanProperty });

  /** Ms between glitch bursts. @default 2000 */
  readonly glitchInterval = input(2000, { transform: numAttr(2000) });

  /** Ms a glitch burst lasts. @default 200 */
  readonly glitchDuration = input(200, { transform: numAttr(200) });

  /** Extra pixels between glyphs. @default 0 */
  readonly letterSpacing = input(0, { transform: numAttr(0) });

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly platform = inject(WrPlatform);

  private teardown: (() => void) | undefined;

  /**
   * `init()` suspends on font loading, so the component can be destroyed while
   * it is awaiting. At that moment `teardown` is still undefined, so the
   * destroy hook has nothing to call — and everything the rest of `init()`
   * starts (the rAF loop, the glitch timers, canvas listeners) would run for
   * the life of the page. This flag lets the continuation bail out.
   */
  private destroyed = false;

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
      // Read live: `init()` chooses between the still copy and the loop, so a
      // preference switched while the page is open needs a fresh one.
      this.platform.prefersReducedMotion();
      this.restart();
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.teardown?.();
    });
  }

  // Init / loop

  /** Tear the running instance down and boot a fresh one. A no-op before the first boot. */
  private restart(): void {
    if (!this.teardown) return;
    this.teardown();
    this.teardown = undefined;
    queueMicrotask(() => {
      void this.init();
    });
  }

  /**
   * The fill, as computed colours: one entry for `color`, or one per gradient stop.
   * A canvas reads neither a custom property nor `light-dark()` — `fillStyle` keeps
   * its previous value and `addColorStop` throws — so each goes through the cascade
   * first, falling back to the canvas's own computed colour.
   */
  private resolveFill(canvas: HTMLCanvasElement): string[] {
    const inherited = window.getComputedStyle(canvas).color || '#fff';
    const gradient = this.gradient();
    if (gradient && gradient.length >= 2) return gradient.map(stop => resolveCssColor(canvas, stop, inherited));
    const color = this.color();
    return [color === 'inherit' ? inherited : resolveCssColor(canvas, color, inherited)];
  }

  /**
   * CSS font size in pixels, resolved where the canvas would resolve it: inside the
   * canvas, whose fallback content is never painted, so `em` and `%` follow the
   * host's own font size.
   */
  private measureFontSize(fontSize: string | number, canvas: HTMLCanvasElement): number {
    if (typeof fontSize === 'number') return fontSize;
    const tmp = document.createElement('span');
    tmp.style.fontSize = fontSize;
    canvas.appendChild(tmp);
    const px = Number.parseFloat(window.getComputedStyle(tmp).fontSize);
    tmp.remove();
    return px;
  }

  private async init(): Promise<void> {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fontFamily =
      this.fontFamily() === 'inherit' ? window.getComputedStyle(canvas).fontFamily || 'sans-serif' : this.fontFamily();
    const fontSize = this.fontSize();
    // Numeric font size for buffer maths — and for the font string itself. The canvas
    // was handed the raw CSS, and Chromium caches a parsed font by its string, so a
    // `clamp(2rem, 10vw, 10rem)` kept the pixel size of the viewport it was first
    // parsed at however often the canvas was rebuilt after a resize.
    const numericFontSize = this.measureFontSize(fontSize, canvas);
    const fontSizeStr =
      typeof fontSize === 'number'
        ? `${fontSize}px`
        : Number.isFinite(numericFontSize)
          ? `${numericFontSize}px`
          : fontSize;
    const fontWeight = this.fontWeight();
    const fontString = `${fontWeight} ${fontSizeStr} ${fontFamily}`;

    try {
      await document.fonts.load(fontString);
    } catch {
      await document.fonts.ready;
    }

    // Destroyed while the fonts were loading — nothing below may start.
    if (this.destroyed) return;

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

    // The text is baked into the offscreen canvas in the colours resolved now, and
    // re-baked whenever they resolve differently (see `refill` in the loop).
    const bake = (fills: readonly string[]): void => {
      offCtx.font = fontString;
      offCtx.textBaseline = 'alphabetic';
      if (fills.length >= 2) {
        const g = offCtx.createLinearGradient(0, 0, offscreenWidth, 0);
        fills.forEach((c, i) => g.addColorStop(i / (fills.length - 1), c));
        offCtx.fillStyle = g;
      } else {
        offCtx.fillStyle = fills[0];
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
    };
    let fillKey = '';
    /** Re-resolve the fill; re-bake and report `true` when it changed. */
    const refill = (): boolean => {
      const fills = this.resolveFill(canvas);
      const key = fills.join('|');
      if (key === fillKey) return false;
      if (fillKey) offCtx.clearRect(0, 0, offscreenWidth, tightHeight);
      fillKey = key;
      bake(fills);
      return true;
    };
    refill();

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

    // A viewport-relative size (the default is `clamp(2rem, 10vw, 10rem)`) is
    // measured into the bitmap once, so a rotated phone or a resized window kept
    // the old size until a reload. Re-measured on resize, and rebuilt only when
    // the pixel size actually moved.
    const onResize = (): void => {
      if (!Object.is(this.measureFontSize(this.fontSize(), canvas), numericFontSize)) this.restart();
    };
    window.addEventListener('resize', onResize);

    // Reduced motion: paint the text once, clean — no fuzz loop, no
    // glitch bursts, no pointer reactivity. Teardown must still be set
    // so the re-init effect keeps redrawing on input changes.
    if (this.platform.prefersReducedMotion()) {
      ctx.drawImage(offscreen, 0, 0);
      this.teardown = (): void => window.removeEventListener('resize', onResize);
      return;
    }

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

      // A colour scheme switched under a running loop lands here: the text is
      // re-baked in whatever its colours now resolve to.
      refill();

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
        // both: horizontal pass, then a vertical pass over what it drew.
        for (let j = 0; j < tightHeight; j++) {
          const dx = Math.floor(currentIntensity * (Math.random() - 0.5) * fuzzRange);
          ctx.drawImage(offscreen, 0, j, offscreenWidth, 1, dx, j, offscreenWidth, 1);
        }

        // The second pass runs in DEVICE space, with the transform off.
        //
        // `getImageData` and `putImageData` are specified to ignore the
        // current transformation matrix; `drawImage` and `clearRect` honour
        // it. The context carries `translate(horizontalMargin, …)`, so the
        // two halves of this branch were addressing pixels two different
        // ways: the read started at device x=0, a whole margin to the LEFT of
        // what the horizontal pass had drawn, and the write put it back
        // there — shifting the text off its own box every frame. Resetting
        // the matrix for the duration is what makes the four calls agree.
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Wide enough for the fuzz the first pass may have thrown either way,
        // and clamped to the canvas so no read runs off the edge.
        const readX = Math.max(0, horizontalMargin - fuzzRange);
        const readW = Math.min(canvas.width - readX, offscreenWidth + fuzzRange * 2);
        const readY = verticalMargin;
        const readH = Math.min(canvas.height - readY, tightHeight);

        const data = ctx.getImageData(readX, readY, readW, readH);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(data, readX, readY);

        for (let i = 0; i < readW; i++) {
          const dy = Math.floor(currentIntensity * (Math.random() - 0.5) * fuzzRange * 0.5);
          if (dy === 0) continue;
          const col = ctx.getImageData(readX + i, readY, 1, readH);
          // `putImageData` REPLACES rather than composites, so the column has
          // to be cleared before it is written back at its offset.
          ctx.clearRect(readX + i, 0, 1, canvas.height);
          ctx.putImageData(col, readX + i, readY + dy);
        }

        ctx.restore();
      }

      rafId = requestAnimationFrame(run);
    };

    // Off screen the loop stops asking for frames, the way `wr-waves` does: it is
    // decoration, and every frame out of sight still redrew one slice per row.
    // Without an observer (jsdom) it simply runs.
    const resume = (): void => {
      if (rafId === 0) rafId = requestAnimationFrame(run);
    };
    const park = (): void => {
      cancelAnimationFrame(rafId);
      rafId = 0;
    };
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(entries => (entries[entries.length - 1].isIntersecting ? resume() : park()));
    if (io) io.observe(canvas);
    else resume();

    const isInsideText = (x: number, y: number): boolean =>
      x >= interactiveLeft && x <= interactiveRight && y >= interactiveTop && y <= interactiveBottom;

    /**
     * A client point in canvas pixels. The canvas may be drawn smaller than its
     * bitmap (`fit`), so the offset is scaled back up; a box with no size (jsdom)
     * is taken as unscaled.
     */
    const isOverText = (clientX: number, clientY: number): boolean => {
      const rect = canvas.getBoundingClientRect();
      const scale = rect.width > 0 ? canvas.width / rect.width : 1;
      return isInsideText((clientX - rect.left) * scale, (clientY - rect.top) * scale);
    };

    const onMouseMove = (e: MouseEvent): void => {
      if (!this.enableHover()) return;
      isHovering = isOverText(e.clientX, e.clientY);
    };
    const onMouseLeave = (): void => {
      isHovering = false;
    };
    // Passive, and it never cancels: the text is decoration, and a swipe that
    // starts on it has to scroll the page like a swipe anywhere else. It used to
    // `preventDefault()`, which turned the whole canvas into a scroll dead zone on
    // every touch screen.
    const onTouchMove = (e: TouchEvent): void => {
      if (!this.enableHover()) return;
      const t = e.touches[0];
      isHovering = isOverText(t.clientX, t.clientY);
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

    // Attached unconditionally, and gated inside the three handlers that can SET a
    // reactive state instead. `enableHover` and `clickEffect` are not in the re-init
    // effect's dependency list, so an attach conditional on them read the value at
    // boot and never again: a `[clickEffect]` bound to a signal that starts `false` —
    // the default, so the ordinary case — stayed dead after it flipped true. Adding
    // them to that list would restart the rAF loop and the glitch timers just to
    // toggle a listener, which is visible; the guards are not.
    //
    // `onMouseLeave` / `onTouchEnd` stay ungated deliberately: they only ever CLEAR
    // toward the idle state, and gating them would strand `isHovering` on for good
    // when hover is switched off mid-hover.
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('click', onClick);

    this.teardown = (): void => {
      park();
      io?.disconnect();
      window.removeEventListener('resize', onResize);
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

export type { WrFuzzyTextDirection } from './types';
