/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

import { FOCUSABLE, roundTo } from 'ngwr/animations/core';
import { WrPlatform } from 'ngwr/platform';
import { wrNumAttr, wrRandomId, wrCheckStyles } from 'ngwr/utils';

/** How far a pixel of the text may move at full noise, each way, in em: 2.4px on 16px text. */
const DESTRUCT_SHIFT = 0.15;

/**
 * How long one noise field stays before the next replaces it, in ms: about 15
 * fields a second. The displacement eases every frame; only the field steps.
 */
const DESTRUCT_STEP = 66;

/** Time constant of the ease in, in seconds: 63% of the way after this long, 95% after three times it. */
const RISE = 0.12;

/** Time constant of the ease out, in seconds: the calm is slower than the onset. */
const FALL = 0.3;

/** The longest step one frame may integrate, in seconds: a stalled frame eases a little, never jumps. */
const MAX_STEP = 0.1;

/** Closer than this to the target, the intensity is the target. */
const SNAP = 0.01;

/**
 * How many waves of noise fit in one em, across and down. Across, about one:
 * each letter of a short word leans its own way. Down, more: a line of pixels
 * through a glyph shifts apart from the line under it, the tear of a weak
 * signal. In em so a heading and a footnote wobble alike at their own size.
 */
const WAVES_X = 1;
const WAVES_Y = 2;

/** Octaves of the fractal noise: the second adds the fine grain over the sway. */
const OCTAVES = 2;

/** The fallback font size, in px, where the computed style gives none. */
const FONT_SIZE = 16;

const SVG = 'http://www.w3.org/2000/svg';

/**
 * Text that wobbles with a fine, living noise, as if seen through heat haze
 * or over a weak signal, while a pointer is over it or focus is in it, and
 * settles back to crisp, still text when the pointer leaves.
 *
 * The text stays real text: no copy, no canvas. One hidden inline `<svg>`,
 * put beside the host, holds a filter of two primitives, `feTurbulence`
 * (fractal noise) feeding `feDisplacementMap`, and the host wears it through
 * `filter: url(#id)` while the noise is above zero. So selection, copy,
 * find-in-page, a screen reader and the host's own styling see the element
 * as it was. The frequency of the noise is set from the host's font size, so
 * the waves are the same share of a glyph at any size, and the peak shift is
 * `shift` em of it, small enough that the word reads at full noise.
 *
 * One `requestAnimationFrame` loop runs only while the noise is above zero:
 * each frame the intensity eases toward its target (one while a pointer is
 * over the host or its closest focusable ancestor, or focus is in it; zero
 * otherwise) by an exponential step, faster in than out, and the
 * displacement's `scale` follows it. The noise field itself steps to a new
 * seed about fifteen times a second, not every frame: often enough to live,
 * seldom enough to read as haze, not a strobe. When the intensity reaches
 * zero the filter comes off the host entirely, the loop idles, and the text
 * renders exactly as without the effect. A hidden document pauses the loop
 * where it is.
 *
 * Nothing mounts under `prefers-reduced-motion: reduce`, under
 * `forced-colors: active` or on the server, and a preference that flips
 * mid-run clears the filter at once. Destroy removes the `<svg>`, the filter
 * and the listeners, and cancels the loop.
 */
@Directive({
  selector: '[wrDestruct]',
  host: { class: 'wr-destruct' },
})
export class WrDestruct {
  /** How far a pixel of the text may move at full noise, each way, in em of the host's font size. @default 0.15 */
  readonly shift = input(DESTRUCT_SHIFT, { transform: wrNumAttr(DESTRUCT_SHIFT) });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private readonly doc = inject(DOCUMENT);
  private readonly id = wrRandomId('wr-destruct');
  private readonly hot = signal(false);
  private listeners: AbortController | null = null;
  private svg: SVGSVGElement | null = null;
  private turbulence: SVGElement | null = null;
  private map: SVGElement | null = null;
  private frame: number | null = null;
  /** The timestamp of the last frame, or `null` when the next one is the first after a start. */
  private last: number | null = null;
  /** When the noise field last stepped, or `null` before the first step of a run. */
  private stepped: number | null = null;
  private seed = 0;
  private intensity = 0;
  /** The peak shift, in px, for the current run. */
  private peak = 0;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/destruct');
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      if (this.platform.prefersReducedMotion()) return;
      // The stylesheet paints no filter under forced colours: nothing to mount.
      if (this.doc.defaultView?.matchMedia?.('(forced-colors: active)').matches) return;
      this.mount();
      this.listen();
    });

    // One place decides what the loop does: reduced motion clears, a hidden
    // page pauses, otherwise a frame is asked for and the tick decides when
    // to idle. `shift` is read so a new peak reaches a run in flight.
    effect(() => {
      const hot = this.hot();
      const visible = this.platform.pageVisible();
      const reduced = this.platform.prefersReducedMotion();
      this.shift();
      untracked(() => {
        if (reduced) this.clear();
        else if (!visible) this.pause();
        else if (hot || this.intensity > 0) this.start();
      });
    });

    inject(DestroyRef).onDestroy(() => {
      this.listeners?.abort();
      this.listeners = null;
      this.clear();
      this.svg?.remove();
      this.svg = null;
      this.turbulence = null;
      this.map = null;
    });
  }

  /**
   * The filter, in a 0 by 0 `<svg>` right after the host: it lives and dies
   * with the host's subtree, and the host's own nodes are not touched. The
   * region is wider than the box by a quarter each way, so a pixel moved
   * off the edge of the glyphs is drawn, not cut.
   */
  private mount(): void {
    const svg = this.doc.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'wr-destruct__filter');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    const filter = this.doc.createElementNS(SVG, 'filter');
    filter.setAttribute('id', this.id);
    filter.setAttribute('x', '-25%');
    filter.setAttribute('y', '-25%');
    filter.setAttribute('width', '150%');
    filter.setAttribute('height', '150%');
    const turbulence = this.doc.createElementNS(SVG, 'feTurbulence');
    turbulence.setAttribute('type', 'fractalNoise');
    turbulence.setAttribute('numOctaves', String(OCTAVES));
    turbulence.setAttribute('seed', String(this.seed));
    turbulence.setAttribute('result', 'noise');
    const map = this.doc.createElementNS(SVG, 'feDisplacementMap');
    map.setAttribute('in', 'SourceGraphic');
    map.setAttribute('in2', 'noise');
    map.setAttribute('scale', '0');
    map.setAttribute('xChannelSelector', 'R');
    map.setAttribute('yChannelSelector', 'G');
    filter.append(turbulence, map);
    svg.append(filter);
    this.host.nativeElement.after(svg);
    this.svg = svg;
    this.turbulence = turbulence;
    this.map = map;
  }

  /** The closest focusable ancestor is what a keyboard reaches, so it is what focus is read on; the pointer is read there too. */
  private listen(): void {
    const host = this.host.nativeElement;
    const source = host.closest<HTMLElement>(FOCUSABLE) ?? host;
    this.listeners = new AbortController();
    const options = { signal: this.listeners.signal, passive: true };
    source.addEventListener('pointerenter', () => this.hot.set(true), options);
    source.addEventListener('pointerleave', () => this.hot.set(false), options);
    source.addEventListener('focusin', () => this.hot.set(true), options);
    source.addEventListener('focusout', () => this.hot.set(false), options);
  }

  /**
   * Ask for a frame, unless one is pending or nothing is mounted. A run that
   * starts from rest measures the host first: the font size may have changed
   * with the viewport since the last one.
   */
  private start(): void {
    if (this.frame !== null || !this.svg) return;
    if (this.intensity === 0) this.measure();
    this.last = null;
    this.frame = requestAnimationFrame(t => this.tick(t));
  }

  /** The peak shift and the noise frequency, from the host's font size, so both scale with the text. */
  private measure(): void {
    const computed = this.doc.defaultView?.getComputedStyle(this.host.nativeElement).fontSize;
    const parsed = computed === undefined ? NaN : parseFloat(computed);
    const size = Number.isFinite(parsed) && parsed > 0 ? parsed : FONT_SIZE;
    this.peak = Math.max(0, this.shift()) * size;
    this.turbulence?.setAttribute('baseFrequency', `${roundTo(WAVES_X / size, 4)} ${roundTo(WAVES_Y / size, 4)}`);
  }

  /** Drop the pending frame. The intensity and the filter stay where they are, so a restart continues from them. */
  private pause(): void {
    if (this.frame === null) return;
    cancelAnimationFrame(this.frame);
    this.frame = null;
    this.last = null;
  }

  /** Off at once: no frame, no filter, intensity zero. */
  private clear(): void {
    this.pause();
    this.intensity = 0;
    this.stepped = null;
    this.paint();
  }

  /**
   * One frame: ease the intensity toward its target, step the noise field
   * when its time has come, paint. The first frame after a start has no
   * length, so a pause of any length moves nothing when the loop resumes.
   */
  private tick(now: number): void {
    const dt = this.last === null ? 0 : Math.min(Math.max(0, now - this.last) / 1000, MAX_STEP);
    this.last = now;
    const target = this.hot() ? 1 : 0;
    const glide = target > this.intensity ? RISE : FALL;
    this.intensity += (target - this.intensity) * (1 - Math.exp(-dt / glide));
    if (Math.abs(target - this.intensity) < SNAP) this.intensity = target;
    if (this.intensity > 0 && (this.stepped === null || now - this.stepped >= DESTRUCT_STEP)) {
      this.stepped = now;
      this.turbulence?.setAttribute('seed', String(++this.seed));
    }
    this.paint();
    if (this.intensity === 0 && target === 0) {
      // Still, and asked to be: no frame until a pointer or focus arrives.
      this.frame = null;
      this.last = null;
      this.stepped = null;
      return;
    }
    this.frame = requestAnimationFrame(t => this.tick(t));
  }

  /**
   * Written to the DOM by hand: a binding would wait for change detection,
   * and this is every frame. At zero the filter comes off the host entirely;
   * above it the displacement's `scale` is twice the shift, since the map
   * moves a pixel by `scale` times the noise's distance from its middle.
   */
  private paint(): void {
    if (!this.map) return;
    const el = this.host.nativeElement;
    if (this.intensity === 0) {
      el.classList.remove('wr-destruct--on');
      el.style.removeProperty('--wr-destruct-filter');
      this.map.setAttribute('scale', '0');
      return;
    }
    this.map.setAttribute('scale', String(roundTo(2 * this.peak * this.intensity, 2)));
    if (!el.classList.contains('wr-destruct--on')) {
      el.style.setProperty('--wr-destruct-filter', `url(#${this.id})`);
      el.classList.add('wr-destruct--on');
    }
  }
}

export { DESTRUCT_SHIFT, DESTRUCT_STEP };
