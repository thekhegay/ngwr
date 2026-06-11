/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the LogoLoop effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/animations/logo-loop
 *
 * Renamed `wr-marquee` in ngwr — same rAF-driven infinite carousel,
 * supports image + template items, optional fade/scale/pause-on-hover.
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import type { TemplateRef } from '@angular/core';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

const SMOOTH_TAU = 0.25;
const MIN_COPIES = 2;
const COPY_HEADROOM = 2;

function isNode(item: WrMarqueeItem): item is WrMarqueeNode {
  return 'node' in item;
}

const num =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

/**
 * Endless horizontal marquee. Auto-duplicates the items list until it
 * covers the container width, then animates the track with a smooth
 * rAF-driven scroll. Optional edge fades, scale-on-hover, and pause /
 * variable-speed hover behaviour.
 *
 * @example
 * ```html
 * <wr-marquee
 *   [items]="logos"
 *   [speed]="80"
 *   [gap]="48"
 *   [itemHeight]="36"
 *   [fadeOut]="true"
 *   [scaleOnHover]="true"
 *   [pauseOnHover]="true"
 * />
 * ```
 *
 * @see https://www.reactbits.dev/animations/logo-loop
 */
@Component({
  selector: 'wr-marquee',
  templateUrl: './marquee.html',
  styleUrl: './marquee.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  host: {
    class: 'wr-marquee',
    '[class.wr-marquee--fade]': 'fadeOut()',
    '[class.wr-marquee--scale-hover]': 'scaleOnHover()',
    '[style.--wr-marquee-gap.px]': 'gap()',
    '[style.--wr-marquee-height.px]': 'itemHeight()',
    '[style.--wr-marquee-fade-color]': 'fadeOutColor() || null',
    '[attr.role]': '"region"',
    '[attr.aria-label]': 'ariaLabel()',
  },
})
export class WrMarquee {
  /** Items to display. Each entry is either an image source or a TemplateRef node. */
  readonly items = input.required<readonly WrMarqueeItem[]>();

  /** Scroll speed in pixels per second. Negative reverses direction. @default 120 */
  readonly speed = input(120, { transform: num(120) });

  /** Track direction. @default 'left' */
  readonly direction = input<'left' | 'right'>('left');

  /** Item height in pixels. @default 28 */
  readonly itemHeight = input(28, { transform: num(28) });

  /** Gap between items in pixels. @default 32 */
  readonly gap = input(32, { transform: num(32) });

  /** Pause the loop on hover. @default false */
  readonly pauseOnHover = input(false, { transform: coerceBooleanProperty });

  /** Custom speed (px/s) when hovered. Overrides `pauseOnHover`. */
  readonly hoverSpeed = input<number | undefined>(undefined, {
    transform: (v: unknown): number | undefined => (v == null || v === '' ? undefined : coerceNumberProperty(v, 0)),
  });

  /** Apply edge fade-out gradients. @default false */
  readonly fadeOut = input(false, { transform: coerceBooleanProperty });

  /** CSS colour for the fade-out gradient. Defaults to the page background. */
  readonly fadeOutColor = input<string>('');

  /** Scale individual items up on hover. @default false */
  readonly scaleOnHover = input(false, { transform: coerceBooleanProperty });

  /** Accessible label for the carousel region. @default 'Marquee' */
  readonly ariaLabel = input('Marquee');

  private readonly trackEl = viewChild.required<ElementRef<HTMLElement>>('track');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly seqWidth = signal(0);
  protected readonly copyCount = signal(MIN_COPIES);
  protected readonly isHovered = signal(false);

  protected readonly copyIndices = computed(() => Array.from({ length: this.copyCount() }, (_, i) => i));

  /** Resolved hover speed: `hoverSpeed` overrides, else 0 when `pauseOnHover`, else live. */
  private readonly effectiveHoverSpeed = computed<number | undefined>(() => {
    const explicit = this.hoverSpeed();
    if (explicit !== undefined) return explicit;
    return this.pauseOnHover() ? 0 : undefined;
  });

  /** Target velocity in px/s, sign baked in. */
  private readonly targetVelocity = computed(() => {
    const s = this.speed();
    const sign = this.direction() === 'left' ? 1 : -1;
    return Math.abs(s) * sign * (s < 0 ? -1 : 1);
  });

  constructor() {
    if (!this.isBrowser) return;

    afterNextRender(() => {
      this.measure();
      this.watchResize();
      this.watchImageLoads();
      this.startLoop();
    });

    // Re-measure on input changes that affect layout (items, gap, height).
    effect(() => {
      this.items();
      this.gap();
      this.itemHeight();
      queueMicrotask(() => this.measure());
    });
  }

  protected onEnter(): void {
    if (this.effectiveHoverSpeed() !== undefined) this.isHovered.set(true);
  }
  protected onLeave(): void {
    if (this.effectiveHoverSpeed() !== undefined) this.isHovered.set(false);
  }
  protected isNodeItem = isNode;

  // Internals

  /** Read first sequence width + decide how many copies cover the viewport. */
  private measure(): void {
    const hostEl = this.host.nativeElement;
    const seqEl = hostEl.querySelector<HTMLElement>('.wr-marquee__list');
    if (!seqEl) return;
    const seqWidth = Math.ceil(seqEl.getBoundingClientRect().width);
    if (seqWidth <= 0) return;
    this.seqWidth.set(seqWidth);
    const containerWidth = hostEl.clientWidth || seqWidth;
    const copies = Math.max(MIN_COPIES, Math.ceil(containerWidth / seqWidth) + COPY_HEADROOM);
    this.copyCount.set(copies);
  }

  private watchResize(): void {
    const hostEl = this.host.nativeElement;
    if (typeof ResizeObserver === 'undefined') {
      const onResize = (): void => this.measure();
      window.addEventListener('resize', onResize);
      this.destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
      return;
    }
    const ro = new ResizeObserver(() => this.measure());
    ro.observe(hostEl);
    const seqEl = hostEl.querySelector<HTMLElement>('.wr-marquee__list');
    if (seqEl) ro.observe(seqEl);
    this.destroyRef.onDestroy(() => ro.disconnect());
  }

  private watchImageLoads(): void {
    const hostEl = this.host.nativeElement;
    const seqEl = hostEl.querySelector<HTMLElement>('.wr-marquee__list');
    if (!seqEl) return;
    const imgs = seqEl.querySelectorAll('img');
    if (imgs.length === 0) return;
    let remaining = imgs.length;
    const onDone = (): void => {
      remaining -= 1;
      if (remaining === 0) this.measure();
    };
    imgs.forEach(img => {
      if (img.complete) onDone();
      else {
        img.addEventListener('load', onDone, { once: true });
        img.addEventListener('error', onDone, { once: true });
      }
    });
  }

  private startLoop(): void {
    const track = this.trackEl().nativeElement;
    let raf = 0;
    let lastTs: number | null = null;
    let offset = 0;
    let velocity = 0;

    const tick = (ts: number): void => {
      lastTs ??= ts;
      const dt = Math.max(0, ts - lastTs) / 1000;
      lastTs = ts;

      const target = this.isHovered() ? (this.effectiveHoverSpeed() ?? this.targetVelocity()) : this.targetVelocity();
      const ease = 1 - Math.exp(-dt / SMOOTH_TAU);
      velocity += (target - velocity) * ease;

      const w = this.seqWidth();
      if (w > 0) {
        offset = (((offset + velocity * dt) % w) + w) % w;
        track.style.transform = `translate3d(${-offset}px, 0, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    this.destroyRef.onDestroy(() => cancelAnimationFrame(raf));
  }
}

/** Image-driven marquee entry. */
export interface WrMarqueeImage {
  readonly src: string;
  readonly alt?: string;
  readonly href?: string;
  readonly title?: string;
  readonly width?: number;
  readonly height?: number;
  readonly srcSet?: string;
  readonly sizes?: string;
}

/** Template-driven marquee entry — `node` is rendered via `*ngTemplateOutlet`. */
export interface WrMarqueeNode {
  readonly node: TemplateRef<unknown>;
  readonly href?: string;
  readonly ariaLabel?: string;
  readonly title?: string;
}

export type WrMarqueeItem = WrMarqueeImage | WrMarqueeNode;
