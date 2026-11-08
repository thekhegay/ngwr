import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, PLATFORM_ID, afterNextRender, inject } from '@angular/core';

/** The modifier the directive puts on the host while a pointer is over it. */
const ON = 'ngwr-spotlight--on';

/** The custom properties the directive writes on the host: the pointer, in px from the host's top left corner. */
const X = '--ngwr-spotlight-x';
const Y = '--ngwr-spotlight-y';

/**
 * A soft circle of light sits under the pointer on a card's surface and
 * follows it, and the card's border brightens a little near it. When the
 * pointer leaves, the light fades out where it was.
 *
 * The directive feeds two numbers and one state; the stylesheet paints. On
 * each `pointermove` the client point is kept and one animation frame is
 * asked for; the frame writes the point as `--ngwr-spotlight-x` / `-y`, in px
 * from the host's border box, so a burst of moves costs one style write. The
 * host's rect is read once on `pointerenter` and again on a window `scroll` or
 * `resize` while the pointer is inside, never per move. The `--on` modifier
 * goes on at enter and off at leave; the point stays, so the stylesheet's
 * opacity fade plays where the light was.
 *
 * A touch pointer is ignored: it has no hover, and a tap would leave a lit
 * card behind. Keyboard focus inside the card is the stylesheet's own
 * `:focus-within` rule, a calm glow at the centre, with no script. Under
 * `forced-colors: active` nothing listens, since the stylesheet paints
 * nothing. Reduced motion changes nothing here: the light is a pointer
 * response, not motion, and the stylesheet drops only the fade. Nothing runs
 * on the server. Styles: `spotlight.scss`, loaded by `styles.scss`.
 */
@Directive({
  selector: '[ngwrSpotlight]',
  host: { class: 'ngwr-spotlight' },
})
export class Spotlight {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly doc = inject(DOCUMENT);
  private listeners: AbortController | null = null;
  /** Window `scroll` and `resize`, alive only while the pointer is inside. */
  private tracking: AbortController | null = null;
  /** The host's border box, measured at enter; `null` while no pointer is inside. */
  private rect: DOMRect | null = null;
  /** The last client point seen, written at the next frame. */
  private clientX = 0;
  private clientY = 0;
  /** The pending frame's id, `0` when none is pending. */
  private frame = 0;

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      // The stylesheet paints no light under forced colours: nothing to listen for.
      if (this.doc.defaultView?.matchMedia?.('(forced-colors: active)').matches) return;
      const host = this.host.nativeElement;
      this.listeners = new AbortController();
      const options = { signal: this.listeners.signal, passive: true };
      host.addEventListener('pointerenter', event => this.follow(event), options);
      host.addEventListener('pointermove', event => this.follow(event), options);
      host.addEventListener('pointerleave', () => this.off(), options);
    });

    inject(DestroyRef).onDestroy(() => {
      this.listeners?.abort();
      this.listeners = null;
      this.off();
      const style = this.host.nativeElement.style;
      style.removeProperty(X);
      style.removeProperty(Y);
    });
  }

  /**
   * A hovering pointer, entering or moving. The first one measures the host
   * and turns the light on; every one keeps the point for the next frame. A
   * move with no enter before it (the directive attached under a resting
   * pointer) starts the same way.
   */
  private follow(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    if (this.rect === null) this.on();
    this.clientX = event.clientX;
    this.clientY = event.clientY;
    this.schedule();
  }

  private on(): void {
    const host = this.host.nativeElement;
    this.rect = host.getBoundingClientRect();
    host.classList.add(ON);

    const view = this.doc.defaultView;
    if (!view) return;
    this.tracking = new AbortController();
    const options = { signal: this.tracking.signal, passive: true };
    // The card moved under a still pointer: measure again and re-place the light.
    const refresh = (): void => {
      this.rect = host.getBoundingClientRect();
      this.schedule();
    };
    view.addEventListener('scroll', refresh, { ...options, capture: true });
    view.addEventListener('resize', refresh, options);
  }

  /** The pointer left: stop following, leave the point where it is, and let the stylesheet fade. */
  private off(): void {
    this.tracking?.abort();
    this.tracking = null;
    this.rect = null;
    if (this.frame !== 0) {
      this.doc.defaultView?.cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
    this.host.nativeElement.classList.remove(ON);
  }

  /** One frame for any number of moves. */
  private schedule(): void {
    if (this.frame !== 0) return;
    const view = this.doc.defaultView;
    if (!view) return;
    this.frame = view.requestAnimationFrame(() => this.write());
  }

  /** The point, relative to the host's border box, so the stylesheet's `inset` layers can place it. */
  private write(): void {
    this.frame = 0;
    if (this.rect === null) return;
    const style = this.host.nativeElement.style;
    style.setProperty(X, `${this.clientX - this.rect.left}px`);
    style.setProperty(Y, `${this.clientY - this.rect.top}px`);
  }
}

export { ON as SPOTLIGHT_ON, X as SPOTLIGHT_X, Y as SPOTLIGHT_Y };
