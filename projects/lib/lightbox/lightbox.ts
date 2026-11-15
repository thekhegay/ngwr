/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type ConfigurableFocusTrap, ConfigurableFocusTrapFactory, FocusMonitor } from '@angular/cdk/a11y';
import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { type OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { isPlatformBrowser } from '@angular/common';
import type { Signal, TemplateRef } from '@angular/core';
import {
  Component,
  DestroyRef,
  ElementRef,
  EnvironmentInjector,
  Injector,
  PLATFORM_ID,
  ViewContainerRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { WR_OVERLAY, type WrOverlayAutoFocus, wrFocusOverlay, wrFollowDirection } from 'ngwr/overlay';
import { wrToClassList, type WrClassInput, wrRestoreFocus } from 'ngwr/utils';

import { WrLightboxGroups } from './lightbox-groups';

/** How far a horizontal swipe travels before it turns the page. */
const SWIPE_STEP_PX = 48;

let viewerUid = 0;

/**
 * Image with click-to-zoom lightbox. The thumbnail is a plain `<img>`
 * with whatever sizing/`object-fit` you give it; clicking opens a CDK
 * overlay showing the full image, with Escape + close button + backdrop
 * to dismiss.
 *
 * Lightboxes that share a `group` form a gallery in document order: the viewer
 * gains previous and next buttons, a counter and the arrow keys.
 *
 * @example
 * ```html
 * <wr-lightbox
 *   src="/photo.jpg"
 *   alt="Mountain"
 *   style="width: 16rem; height: 10rem; object-fit: cover"
 * />
 * ```
 *
 * @see https://ngwr.dev/reference/components/lightbox
 */
@Component({
  selector: 'wr-lightbox',
  templateUrl: './lightbox.html',
  styleUrl: './lightbox.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-lightbox',
    '[class]': 'classes()',
    '[style.aspect-ratio]': 'aspectRatio()',
  },
})
export class WrLightbox {
  /** Accessible name of the thumbnail button. Falls back to `alt`, then `image.open`. */
  readonly openLabel = input<string | null>(null);

  /** Accessible name of the viewer's close button. Falls back to `image.close`, then `'Close preview'`. */
  readonly closeLabel = input<string | null>(null);

  protected readonly resolvedCloseLabel = useI18nText(this.closeLabel, 'image.close', 'Close preview');

  /** Image source. */
  readonly src = input.required<string>();

  /** Alt text. Required for a11y; falls back to an empty string. @default '' */
  readonly alt = input<string>('');

  /**
   * Lighter source for the THUMBNAIL — a small or blurred copy, so the grid does not
   * pull full-size images. The viewer always shows `src`; the thumbnail does not swap
   * to it later.
   */
  readonly preview = input<string | null>(null);

  // Both of these were hard-coded English literals in the template, next to a catalog
  // that already carried `image.open` translated and unread. `useI18nText` already
  // does the whole chain — a non-empty binding wins, then the catalog, then the
  // English default — so the alt text (which describes the actual picture) is what
  // gets forwarded, with `openLabel` ahead of it as the explicit override.
  protected readonly resolvedOpenLabel = useI18nText(
    computed(() => {
      // Not `??`: an empty `openLabel` is no label at all, so it has to fall through
      // to the alt text rather than winning as an empty string.
      const explicit = this.openLabel();
      if (explicit) return explicit;
      return this.alt();
    }),
    'image.open',
    'Open preview'
  );

  protected readonly resolvedViewerLabel = useI18nText(
    computed(() => this.shown().alt()),
    'image.viewer',
    'Image preview'
  );

  /** Disable the click-to-zoom lightbox. @default false */
  readonly disablePreview = input(false, { transform: coerceBooleanProperty });

  /** Caption shown under the full image in the lightbox. */
  readonly caption = input<string>('');

  /**
   * Reserve space before the image resolves by fixing the thumbnail's
   * `aspect-ratio` (e.g. `'16 / 9'`, `'4 / 3'`, or a number like `1.5`).
   * Prevents the layout jump when the intrinsic image size isn't known up
   * front — pair it with a `width` and the box keeps its height from first
   * paint. @default null
   */
  readonly aspectRatio = input<string | number | null>(null);

  /**
   * Where focus goes when the viewer opens. `'dialog'` puts it on the viewer
   * itself, with no ring, so the keyboard is inside and no button is lit;
   * `'first-tabbable'` puts it on the Close button; `false` leaves it on the
   * thumbnail. The viewer traps Tab in every mode, and closing returns focus to
   * the thumbnail.
   * @default 'dialog'
   */
  readonly autoFocus = input<WrOverlayAutoFocus>('dialog');

  /**
   * Extra CSS classes for the viewer's overlay pane.
   *
   * The pane is appended to the overlay container, not to this component, so
   * nothing in the consumer's own template encloses it and no descendant rule
   * written around the trigger can reach it. This input is the only per-instance
   * handle on it. A space-separated string works as well as an array.
   */
  readonly panelClass = input<WrClassInput>(null);

  /**
   * Gallery name. Every `wr-lightbox` with the same group, in document order,
   * can be paged through from whichever one was opened. A lightbox with
   * `disablePreview` stays out of it. @default null
   */
  readonly group = input<string | null>(null);

  /** Wrap from the last image of the group to the first, and back. @default false */
  readonly loop = input(false, { transform: coerceBooleanProperty });

  /** Accessible name of the viewer's previous button. Falls back to `common.previous`. */
  readonly previousLabel = input<string | null>(null);

  /** Accessible name of the viewer's next button. Falls back to `common.next`. */
  readonly nextLabel = input<string | null>(null);

  protected readonly resolvedPreviousLabel = useI18nText(this.previousLabel, 'common.previous', 'Previous');
  protected readonly resolvedNextLabel = useI18nText(this.nextLabel, 'common.next', 'Next');
  private readonly counterText = useI18nFormatter('image.counter', '{{current}} / {{total}}');
  private readonly positionText = useI18nFormatter('image.position', 'Image {{current}} of {{total}}');

  protected readonly open = signal(false);
  protected readonly loaded = signal(false);

  /**
   * Id the trigger's `aria-controls` points at while the viewer is open.
   *
   * @internal Public so the host bindings can read it.
   */
  protected readonly viewerId = `wr-lightbox-viewer-${++viewerUid}`;

  protected readonly classes = computed(() => {
    const parts: string[] = [];
    if (this.open()) parts.push('wr-lightbox--open');
    if (!this.loaded()) parts.push('wr-lightbox--loading');
    return parts.join(' ');
  });

  // Query by name — `@if` blocks register their own TemplateRefs, so an
  // unqualified TemplateRef query would grab the thumbnail branch instead.
  protected readonly panelTpl = viewChild.required<TemplateRef<unknown>>('viewerTpl');

  private readonly groups = inject(WrLightboxGroups);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly focusTrapFactory = inject(ConfigurableFocusTrapFactory);
  /**
   * The reading direction the open viewer has to keep up with, resolved off the
   * ENVIRONMENT injector rather than this component's — the same instance the
   * CDK read when it stamped the overlay, since `createOverlayRef` takes
   * `Directionality` from the `Overlay`'s injector and no node-level `[dir]` is
   * in that chain. The viewer is appended to the overlay container on `<body>`,
   * not into whatever region the thumbnail sits in, so reading the node
   * injector would rewrite a correctly-stamped panel to an island's direction
   * one pass after it opened rather than follow the application at all.
   *
   * `null` never happens in an app — `Directionality` is root-provided — but a
   * bare `TestBed` should still get a viewer that opens.
   */
  private readonly dir = inject(EnvironmentInjector).get(Directionality, null);
  private focusTrap: ConfigurableFocusTrap | null = null;
  private previouslyFocused: HTMLElement | null = null;
  private overlayRef: OverlayRef | null = null;

  /** The gallery this lightbox pages through; empty when it stands alone. */
  protected readonly gallery: Signal<readonly WrLightbox[]> = computed(() => {
    const group = this.group();
    if (!group) return [];
    const members = this.groups.members(group).filter(member => !member.disablePreview());
    return members.length > 1 && members.includes(this) ? members : [];
  });

  private readonly target = signal<WrLightbox | null>(null);
  private lastIndex = 0;

  /** The lightbox whose image the viewer is showing. */
  protected readonly shown: Signal<WrLightbox> = computed(() => {
    const target = this.target();
    return target && this.gallery().includes(target) ? target : this;
  });

  protected readonly index = computed(() => this.gallery().indexOf(this.shown()));
  protected readonly canPrevious = computed(() => this.loop() || this.index() > 0);
  protected readonly canNext = computed(() => this.loop() || this.index() < this.gallery().length - 1);

  protected readonly counter = computed(() => this.counterText(this.place()));

  protected readonly announcement = computed(() => {
    const alt = this.shown().alt();
    const position = this.positionText(this.place());
    return alt ? `${position}, ${alt}` : position;
  });

  private readonly preloaded = new Set<string>();

  constructor() {
    // Destroying the component while the viewer is open removes the projected
    // content (the portal uses this component's ViewContainerRef) but leaves the
    // overlay pane and its full-screen backdrop behind, with page scroll still
    // blocked. Dispose the overlay explicitly.
    this.destroyRef.onDestroy(() => this.closeOverlay());

    effect(() => {
      if (this.open()) this.openOverlay();
      else this.closeOverlay();
    });

    effect(onCleanup => {
      const group = this.group();
      if (!group) return;
      this.groups.add(group, this, this.host);
      onCleanup(() => this.groups.remove(group, this));
    });

    // The image on screen left the group: stay at its place in the order
    // instead of jumping back to the one that was opened.
    effect(() => {
      const target = this.target();
      if (!target) return;
      const gallery = this.gallery();
      const index = gallery.indexOf(target);
      if (index >= 0) {
        this.lastIndex = index;
        return;
      }
      untracked(() => this.target.set(gallery[Math.min(this.lastIndex, gallery.length - 1)] ?? null));
    });

    effect(() => {
      if (!this.isBrowser || !this.open()) return;
      const gallery = this.gallery();
      // The viewer's own <img> fetches this one.
      this.preloaded.add(this.shown().src());
      for (const delta of [-1, 1]) {
        const neighbour = gallery[this.wrap(this.index() + delta)];
        if (neighbour) this.preload(neighbour.src());
      }
    });
  }

  protected onClick(): void {
    if (this.disablePreview()) return;
    const group = this.group();
    if (group) this.groups.refresh(group);
    this.target.set(this);
    this.open.set(true);
  }

  /** Move through the gallery by one image; a no-op at an end unless `loop` is set. */
  protected step(delta: -1 | 1): void {
    this.show(this.wrap(this.index() + delta));
  }

  private show(index: number): void {
    const member = this.gallery()[index];
    if (member) this.target.set(member);
  }

  private wrap(index: number): number {
    const total = this.gallery().length;
    return this.loop() && total ? (index + total) % total : index;
  }

  private place(): { current: number; total: number } {
    return { current: this.index() + 1, total: this.gallery().length };
  }

  private preload(src: string): void {
    if (this.preloaded.has(src)) return;
    this.preloaded.add(src);
    new Image().src = src;
  }

  protected onClose(): void {
    this.open.set(false);
  }

  // Swipe-down-to-dismiss on the open viewer. The image follows the finger and
  // fades; releasing past ~20% of the viewer height closes it.
  private viewerStartX = 0;
  private viewerStartY = 0;
  private viewerSwiping = false;

  protected onViewerSwipeStart(event: TouchEvent): void {
    const touch = event.touches[0];
    if (!touch) return;
    this.viewerStartX = touch.clientX;
    this.viewerStartY = touch.clientY;
    this.viewerSwiping = true;
  }

  protected onViewerSwipeMove(event: TouchEvent, viewer: HTMLElement): void {
    if (!this.viewerSwiping) return;
    const touch = event.touches[0];
    if (!touch) return;
    const dy = touch.clientY - this.viewerStartY;
    if (dy <= 0 || this.isSideways(touch.clientX - this.viewerStartX, dy)) {
      viewer.style.transform = '';
      viewer.style.opacity = '';
      return;
    }
    event.preventDefault();
    viewer.style.transition = 'none';
    viewer.style.transform = `translateY(${dy}px)`;
    viewer.style.opacity = String(Math.max(0.3, 1 - dy / (viewer.offsetHeight || 1)));
  }

  protected onViewerSwipeEnd(event: TouchEvent, viewer: HTMLElement): void {
    if (!this.viewerSwiping) return;
    this.viewerSwiping = false;
    const touch = event.changedTouches[0];
    const dx = touch ? touch.clientX - this.viewerStartX : 0;
    const dy = touch ? touch.clientY - this.viewerStartY : 0;
    if (this.isSideways(dx, dy)) {
      if (Math.abs(dx) >= SWIPE_STEP_PX) this.step(dx < 0 !== this.isRtl() ? 1 : -1);
    } else if (dy > (viewer.offsetHeight || 0) * 0.2) {
      this.onClose();
    } else {
      viewer.style.transition = '';
      viewer.style.transform = '';
      viewer.style.opacity = '';
    }
  }

  /** A drag that belongs to the gallery rather than to swipe-down-to-dismiss. */
  private isSideways(dx: number, dy: number): boolean {
    return this.gallery().length > 0 && Math.abs(dx) > Math.abs(dy);
  }

  private isRtl(): boolean {
    return this.dir?.value === 'rtl';
  }

  /**
   * The thumbnail has settled, one way or the other. A failure counts: `--loading`
   * animates a shimmer AND sets `opacity: 0` on the image, so a broken `src` with no
   * error path left an invisible box shimmering for ever instead of showing its alt
   * text.
   */
  protected onSettled(): void {
    this.loaded.set(true);
  }

  // Overlay

  private openOverlay(): void {
    if (this.overlayRef) return;

    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'wr-lightbox-backdrop',
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
      panelClass: wrToClassList('wr-lightbox-overlay', this.panelClass()),
    });

    // Centred on both axes, so no geometry rides on the direction — but the
    // viewer's own chrome does. The ✕ is placed with `inset-inline-end` and the
    // caption reads as prose, both against the `dir` the CDK froze at create, so
    // a flip while the viewer is open leaves the button on the wrong corner.
    wrFollowDirection(this.overlayRef, this.dir, this.injector);

    const portal = new TemplatePortal(this.panelTpl(), this.vcr);
    this.overlayRef.attach(portal);

    // The viewer declares role="dialog" + aria-modal="true", which promises the
    // rest of the page is inert. Without a focus trap that promise is a lie:
    // Tab walks straight out of the viewer into the page behind the backdrop.
    const active = document.activeElement;
    this.previouslyFocused = active instanceof HTMLElement ? active : null;
    const pane = this.overlayRef.overlayElement;
    this.focusTrap = this.focusTrapFactory.create(pane);
    // Onto the viewer itself by default, the element that carries the dialog
    // role: the keyboard is inside and the Close button is not lit.
    wrFocusOverlay(
      pane.querySelector<HTMLElement>('.wr-lightbox-viewer') ?? pane,
      this.focusTrap,
      this.autoFocus(),
      this.injector
    );

    this.overlayRef
      .backdropClick()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.open.set(false));

    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.open.set(false);
        } else {
          this.onGalleryKey(event);
        }
      });
  }

  private onGalleryKey(event: KeyboardEvent): void {
    const total = this.gallery().length;
    if (!total || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

    switch (event.key) {
      case 'ArrowLeft':
        this.step(this.isRtl() ? 1 : -1);
        break;
      case 'ArrowRight':
        this.step(this.isRtl() ? -1 : 1);
        break;
      case 'Home':
        this.show(0);
        break;
      case 'End':
        this.show(total - 1);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private closeOverlay(): void {
    if (!this.overlayRef) return;
    this.focusTrap?.destroy();
    this.focusTrap = null;
    const restore = this.previouslyFocused;
    this.previouslyFocused = null;
    this.overlayRef.dispose();
    this.overlayRef = null;
    // Send focus back where it came from, or it lands on <body> and the user
    // has to tab from the top of the page again.
    if (restore && typeof restore.focus === 'function') wrRestoreFocus(restore, this.focusMonitor);
  }
}
