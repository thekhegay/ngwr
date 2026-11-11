/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, PLATFORM_ID, afterNextRender, inject, input } from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { wrNumAttr, wrCheckStyles } from 'ngwr/utils';

/** How long one burst lasts, in ms: every stroke flies, shrinks and fades inside it. */
const CLICK_SPARKS_MS = 480;

/** Strokes in one burst, spread evenly round the ring. */
const CLICK_SPARKS_COUNT = 8;

/** Bursts alive at once: a fifth click takes the oldest out before its animation ends. */
const CLICK_SPARKS_MAX = 4;

/**
 * How far the ring turns from one burst to the next, in degrees: the golden
 * angle, so no two consecutive bursts put a stroke in the same place and the
 * pattern never repeats over a handful of clicks.
 */
const CLICK_SPARKS_TURN = 137.5;

/** The `animation-name` of a stroke, as the stylesheet declares it. */
const SPARK = 'wr-click-sparks-fly';

/** One burst: its layer in the body and the fallback that takes it out if no `animationend` comes. */
interface Burst {
  readonly layer: HTMLElement;
  readonly timer: ReturnType<typeof setTimeout>;
}

/**
 * A ring of short spark strokes bursts out from the point a button or link is
 * clicked, flies a short way, shrinks and fades, all within half a second.
 * Several quick clicks make several bursts; at most {@link CLICK_SPARKS_MAX}
 * are alive at once and a newer one takes the oldest out.
 *
 * DOM and CSS, no canvas: a burst is one `aria-hidden` layer of zero size,
 * fixed at the click's client coordinates, holding {@link CLICK_SPARKS_COUNT}
 * spans. Each span is rotated to its angle and animated outward with
 * `transform` and `opacity` only, so the whole burst is composited and never
 * reflows anything. The layer sits in `document.body`, not in the host: a
 * button clips its overflow, and a `position: fixed` box inside a transformed
 * or filtered ancestor (`wrGlowBorder`, a hero that animates) would be
 * measured from that ancestor instead of the viewport. In the body, client
 * coordinates are exactly where the layer goes, and no ancestor can clip it.
 * It is under no pointer and the layer is removed on the first `animationend`
 * of its strokes, or by a timer a little after the burst length if that event
 * never comes (a motion preference flipped mid-burst).
 *
 * The strokes paint in the host's own colour, read at the click, and scale
 * with the host's font size: `--wr-click-sparks-color` on the host (a theme
 * role, say `var(--wr-color-primary)` for a filled button whose text is a
 * `-contrast`) is copied to the layer and overrides the colour; the
 * stylesheet's own hooks set the stroke length, distance and width in `em`.
 *
 * A keyboard activation (`click` with `detail === 0`, from Enter or Space)
 * bursts from the host's centre. The click itself is never touched: the
 * listener is passive, nothing is prevented or stopped, and a `routerLink` or
 * a plain `href` navigates as it did. Nothing plays under
 * `prefers-reduced-motion: reduce`, under `forced-colors: active` or on the
 * server. Styles: `@use 'ngwr/animations/click-sparks'`, which also lists the
 * `--wr-click-sparks-*` hooks.
 */
@Directive({
  selector: '[wrClickSparks]',
})
export class WrClickSparks {
  /**
   * How many strokes one burst has. Written as the directive's own value:
   * `wrClickSparks="10"`. Unset or empty, {@link CLICK_SPARKS_COUNT}.
   */
  readonly count = input(CLICK_SPARKS_COUNT, { alias: 'wrClickSparks', transform: wrNumAttr(CLICK_SPARKS_COUNT) });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private readonly doc = inject(DOCUMENT);
  private listeners: AbortController | null = null;
  private bursts: Burst[] = [];
  /** Bursts made so far: turns the ring a golden angle each time. */
  private made = 0;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/click-sparks');
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      // The stylesheet paints no stroke under forced colours: nothing to listen for.
      if (this.doc.defaultView?.matchMedia?.('(forced-colors: active)').matches) return;
      this.listeners = new AbortController();
      this.host.nativeElement.addEventListener('click', event => this.onClick(event), {
        signal: this.listeners.signal,
        passive: true,
      });
    });

    inject(DestroyRef).onDestroy(() => {
      this.listeners?.abort();
      this.listeners = null;
      while (this.bursts.length > 0) this.remove(this.bursts[0]);
    });
  }

  /** A pointer gives its point; a keyboard gives `detail === 0` and the host's centre stands in. */
  private onClick(event: MouseEvent): void {
    if (this.platform.prefersReducedMotion()) return;
    const host = this.host.nativeElement;
    let x = event.clientX;
    let y = event.clientY;
    if (event.detail === 0) {
      const rect = host.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }
    this.burst(x, y);
  }

  /**
   * One burst at a client point. The layer takes the host's colour and font
   * size inline, so `currentColor` and `em` in the stylesheet mean the host's,
   * not the body's; the hook, when the host sets one, wins over the colour.
   */
  private burst(x: number, y: number): void {
    const host = this.host.nativeElement;
    const doc = host.ownerDocument;
    const style = doc.defaultView?.getComputedStyle(host);
    const count = Math.max(1, Math.round(this.count()));
    const spin = (this.made++ * CLICK_SPARKS_TURN) % 360;

    const layer = doc.createElement('span');
    layer.className = 'wr-click-sparks';
    layer.setAttribute('aria-hidden', 'true');
    layer.style.setProperty('--wr-click-sparks-x', `${x}px`);
    layer.style.setProperty('--wr-click-sparks-y', `${y}px`);
    layer.style.setProperty('--wr-click-sparks-duration', `${CLICK_SPARKS_MS}ms`);
    if (style) {
      const hook = style.getPropertyValue('--wr-click-sparks-color').trim();
      layer.style.color = hook || style.color;
      layer.style.fontSize = style.fontSize;
    }
    for (let i = 0; i < count; i++) {
      const spark = doc.createElement('span');
      spark.className = 'wr-click-sparks__spark';
      spark.style.setProperty('--wr-click-sparks-angle', `${spin + (i * 360) / count}deg`);
      layer.append(spark);
    }

    const burst: Burst = {
      layer,
      timer: setTimeout(() => this.remove(burst), CLICK_SPARKS_MS + 100),
    };
    layer.addEventListener(
      'animationend',
      event => {
        if (event.animationName === SPARK) this.remove(burst);
      },
      { passive: true }
    );

    while (this.bursts.length >= CLICK_SPARKS_MAX) this.remove(this.bursts[0]);
    this.bursts.push(burst);
    doc.body.append(layer);
  }

  /** Take a burst out of the body and the list, and stop its fallback. Idempotent. */
  private remove(burst: Burst): void {
    clearTimeout(burst.timer);
    burst.layer.remove();
    const at = this.bursts.indexOf(burst);
    if (at !== -1) this.bursts.splice(at, 1);
  }
}

export { CLICK_SPARKS_COUNT, CLICK_SPARKS_MAX, CLICK_SPARKS_MS, CLICK_SPARKS_TURN, SPARK as CLICK_SPARKS_FLY };
