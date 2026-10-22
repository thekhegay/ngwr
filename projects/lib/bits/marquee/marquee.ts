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

import { useI18nText } from 'ngwr/i18n';
import { WrPlatform } from 'ngwr/platform';
import { numAttr } from 'ngwr/utils';

import type { WrMarqueeNode, WrMarqueeItem } from './types';

const SMOOTH_TAU = 0.25;
const MIN_COPIES = 2;
const COPY_HEADROOM = 2;

function isNode(item: WrMarqueeItem): item is WrMarqueeNode {
  return 'node' in item;
}

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
    '[attr.aria-label]': 'resolvedAriaLabel()',
  },
})
export class WrMarquee {
  /** Items to display. Each entry is either an image source or a TemplateRef node. */
  readonly items = input.required<readonly WrMarqueeItem[]>();

  /** Scroll speed in pixels per second. Negative reverses direction. @default 120 */
  readonly speed = input(120, { transform: numAttr(120) });

  /** Track direction. @default 'left' */
  readonly direction = input<'left' | 'right'>('left');

  /** Item height in pixels. @default 28 */
  readonly itemHeight = input(28, { transform: numAttr(28) });

  /** Gap between items in pixels. @default 32 */
  readonly gap = input(32, { transform: numAttr(32) });

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

  /**
   * Accessible name for the region. Falls back to `marquee.label`, then
   * `'Marquee'`.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'marquee.label', 'Marquee');

  /**
   * Name used for an item that links somewhere but carries no text of its own.
   * Falls back to `marquee.link`, then `'link'` — a bare `'link'` in English was
   * what a screen reader announced for every unlabelled logo in the strip.
   */
  protected readonly resolvedLinkLabel = useI18nText(signal(null).asReadonly(), 'marquee.link', 'link');

  private readonly trackEl = viewChild.required<ElementRef<HTMLElement>>('track');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platform = inject(WrPlatform);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Flips once the first render has been measured — the loop waits for it. */
  private readonly ready = signal(false);
  /** Whether the host is in the viewport; stays `true` without an observer. */
  private readonly onScreen = signal(true);
  /** Loop state, kept across a park so the strip resumes where it stopped. */
  private offset = 0;
  private velocity = 0;

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
      this.watchVisibility();
      this.ready.set(true);
    });

    // The loop runs only while there is something to see: never under
    // `prefers-reduced-motion` (read live — the stylesheet pins the track at
    // 0, so every frame would write a transform nobody sees), and not while
    // the host is off screen.
    effect(onCleanup => {
      if (!this.ready() || !this.onScreen()) return;
      if (this.platform.prefersReducedMotion()) {
        this.trackEl().nativeElement.style.transform = '';
        return;
      }
      onCleanup(this.startLoop());
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

  private watchVisibility(): void {
    // Without an observer (jsdom) the strip simply counts as visible.
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(entries => this.onScreen.set(entries[entries.length - 1].isIntersecting));
    io.observe(this.host.nativeElement);
    this.destroyRef.onDestroy(() => io.disconnect());
  }

  /** Start the frame loop; returns what stops it. */
  private startLoop(): () => void {
    const track = this.trackEl().nativeElement;
    let raf = 0;
    let lastTs: number | null = null;

    const tick = (ts: number): void => {
      lastTs ??= ts;
      const dt = Math.max(0, ts - lastTs) / 1000;
      lastTs = ts;

      const target = this.isHovered() ? (this.effectiveHoverSpeed() ?? this.targetVelocity()) : this.targetVelocity();
      const ease = 1 - Math.exp(-dt / SMOOTH_TAU);
      this.velocity += (target - this.velocity) * ease;

      const w = this.seqWidth();
      if (w > 0) {
        this.offset = (((this.offset + this.velocity * dt) % w) + w) % w;
        track.style.transform = `translate3d(${-this.offset}px, 0, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }
}

export type { WrMarqueeImage, WrMarqueeNode, WrMarqueeItem } from './types';
