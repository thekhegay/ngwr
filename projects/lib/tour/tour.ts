/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type ConfigurableFocusTrap, ConfigurableFocusTrapFactory } from '@angular/cdk/a11y';
import { Directionality } from '@angular/cdk/bidi';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { isPlatformBrowser } from '@angular/common';
import {
  DOCUMENT,
  DestroyRef,
  EnvironmentInjector,
  Injector,
  PLATFORM_ID,
  Service,
  computed,
  inject,
  signal,
} from '@angular/core';

import { WR_OVERLAY, wrMirrorOffsets } from 'ngwr/overlay';

import type { WrTourPlacement, WrTourStep } from './interfaces';
import { WR_TOUR_STEP, WrTourPopup } from './tour-popup';

/** Fallback order per preferred side — the opposite side first, then the sides. */
const FALLBACKS: Record<WrTourPlacement, readonly WrTourPlacement[]> = {
  bottom: ['bottom', 'top', 'right', 'left'],
  top: ['top', 'bottom', 'right', 'left'],
  left: ['left', 'right', 'bottom', 'top'],
  right: ['right', 'left', 'bottom', 'top'],
};

const CONNECTED: Record<
  WrTourPlacement,
  {
    originX: 'start' | 'center' | 'end';
    originY: 'top' | 'center' | 'bottom';
    overlayX: 'start' | 'center' | 'end';
    overlayY: 'top' | 'center' | 'bottom';
  }
> = {
  bottom: { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' },
  top: { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom' },
  left: { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center' },
  right: { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center' },
};

/**
 * Guided product tour: a spotlight over one element at a time plus a popup
 * explaining it.
 *
 * Steps are data, not markup — call `start()` with an array and the service owns
 * the overlay, the cut-out, focus and the keyboard. A step whose target is not
 * on the page is skipped rather than shown floating, so a tour survives a
 * feature being hidden behind a flag or a permission.
 *
 * @example
 * ```ts
 * private readonly tour = inject(WrTour);
 *
 * showMeAround(): void {
 *   this.tour.start([
 *     { target: '[data-tour="search"]', title: 'Search', content: 'Find anything by name.' },
 *     { target: '[data-tour="filters"]', content: 'Narrow the list down.', placement: 'right' },
 *   ]);
 * }
 * ```
 *
 * @see https://ngwr.dev/reference/services/tour
 */
@Service()
export class WrTour {
  private readonly overlay = inject(WR_OVERLAY);
  private readonly dir = inject(Directionality, { optional: true });
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly injector = inject(EnvironmentInjector);
  private readonly focusTrapFactory = inject(ConfigurableFocusTrapFactory);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly steps = signal<readonly WrTourStep[]>([]);
  private readonly cursor = signal(-1);

  private overlayRef: OverlayRef | null = null;
  private focusTrap: ConfigurableFocusTrap | null = null;
  private spotlight: HTMLElement | null = null;
  private detachKeydown: (() => void) | null = null;
  private detachReposition: (() => void) | null = null;
  private restoreFocus: HTMLElement | null = null;

  /** Whether a tour is running. */
  readonly active = computed(() => this.cursor() >= 0);

  /** Zero-based index of the current step, `-1` when idle. */
  readonly index = computed(() => this.cursor());

  /** How many steps this tour has. */
  readonly total = computed(() => this.steps().length);

  /** The step being shown, or `null` when idle. */
  readonly step = computed<WrTourStep | null>(() => this.steps()[this.cursor()] ?? null);

  // Whether any step AFTER the current one can actually be shown. Settled once per
  // move, in `goTo`, because reachability is a DOM question and not a signal.
  private readonly noStepAfter = signal(false);

  /**
   * Whether this is the last step the user will see. Not `index() === total() - 1`:
   * a trailing step whose target is missing is skipped, so comparing against the
   * raw count left the primary button reading "Next" on the final card and then
   * ending the tour when it was pressed.
   */
  readonly isLast = computed(() => this.noStepAfter());

  constructor() {
    // Everything this service owns lives OUTSIDE its own injector: a CDK overlay, a
    // div appended to `document.body`, a document keydown listener and two window
    // listeners. Nothing removes them when the injector goes, so a tour running at
    // teardown left its cut-out on the page.
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /**
   * Begin a tour. Restarts if one is already running. A no-op under SSR — a
   * tour is a client-side affordance and there is nothing to spotlight on the
   * server.
   */
  start(steps: readonly WrTourStep[]): void {
    if (!this.isBrowser || steps.length === 0) return;
    this.stop();
    this.steps.set(steps);
    this.restoreFocus = this.document.activeElement as HTMLElement | null;
    this.goTo(0, 1);
  }

  /** Advance; finishes the tour past the last step. */
  next(): void {
    this.goTo(this.cursor() + 1, 1);
  }

  /** Go back; stays put on the first step. */
  prev(): void {
    this.goTo(this.cursor() - 1, -1);
  }

  /** End the tour and return focus where it was. */
  stop(): void {
    this.teardownStep();
    this.steps.set([]);
    this.cursor.set(-1);
    this.restoreFocus?.focus?.();
    this.restoreFocus = null;
  }

  /**
   * Move to `index`, skipping steps whose target is not in the DOM. `direction`
   * says which way to keep skipping, so a missing step never traps the tour
   * between two dead ends.
   */
  private goTo(index: number, direction: 1 | -1): void {
    const steps = this.steps();
    let i = index;
    while (i >= 0 && i < steps.length && this.resolve(steps[i]) === null) i += direction;

    if (i < 0) {
      // Ran off the start while going back — stay where we were.
      return;
    }
    if (i >= steps.length) {
      this.stop();
      return;
    }

    this.teardownStep();
    this.cursor.set(i);
    this.noStepAfter.set(!this.anyResolvableAfter(i));
    this.openStep(steps[i]);
  }

  /** Whether the tour has a step past `index` that can actually be shown. */
  private anyResolvableAfter(index: number): boolean {
    const steps = this.steps();
    for (let i = index + 1; i < steps.length; i += 1) {
      if (this.resolve(steps[i]) !== null) return true;
    }
    return false;
  }

  private resolve(step: WrTourStep): HTMLElement | null {
    if (typeof step.target !== 'string') return step.target.isConnected ? step.target : null;
    return this.document.querySelector<HTMLElement>(step.target);
  }

  private openStep(step: WrTourStep): void {
    const target = this.resolve(step);
    if (!target) return;

    target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });

    // The cut-out is a bare element sized to the target with an enormous spread
    // shadow: everything outside it dims, the target itself stays untouched.
    // Cheaper and far more robust than a clip-path polygon, and it needs no
    // recompute when the page reflows beyond moving the box.
    const spotlight = this.document.createElement('div');
    spotlight.className = 'wr-tour__spotlight';
    spotlight.setAttribute('aria-hidden', 'true');
    this.document.body.appendChild(spotlight);
    this.spotlight = spotlight;
    this.placeSpotlight(target);

    const placement = step.placement ?? 'bottom';
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(target)
      .withPositions(
        wrMirrorOffsets(
          FALLBACKS[placement].map(side => ({
            ...CONNECTED[side],
            offsetY: side === 'bottom' ? 12 : side === 'top' ? -12 : 0,
            offsetX: side === 'right' ? 12 : side === 'left' ? -12 : 0,
          })),
          this.isRtl()
        )
      )
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.reposition(),
      panelClass: 'wr-tour-overlay',
    });

    const portal = new ComponentPortal(
      WrTourPopup,
      null,
      Injector.create({ parent: this.injector, providers: [{ provide: WR_TOUR_STEP, useValue: this }] })
    );
    const ref = this.overlayRef.attach(portal);

    // Kept on the instance, not in a local: a trap registers with CDK's
    // `FocusTrapManager` and installs a capture-phase document focus listener, so an
    // undestroyed one leaks per STEP and every tour left a stack of them behind.
    this.focusTrap = this.focusTrapFactory.create(ref.location.nativeElement as HTMLElement);
    void this.focusTrap.focusInitialElementWhenReady();

    const onKey = (event: KeyboardEvent): void => {
      // The listener is on the document, so a step shown over a dialog would see the
      // Escape that dialog just handled and close the tour too.
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        this.stop();
      }
    };
    this.document.addEventListener('keydown', onKey);
    this.detachKeydown = () => this.document.removeEventListener('keydown', onKey);

    const reposition = (): void => this.placeSpotlight(target);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    this.detachReposition = () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }

  private placeSpotlight(target: HTMLElement): void {
    const el = this.spotlight;
    if (!el) return;
    const r = target.getBoundingClientRect();
    const pad = 6;
    el.style.top = `${r.top - pad}px`;
    el.style.left = `${r.left - pad}px`;
    el.style.width = `${r.width + pad * 2}px`;
    el.style.height = `${r.height + pad * 2}px`;
  }

  private teardownStep(): void {
    this.focusTrap?.destroy();
    this.focusTrap = null;
    this.detachKeydown?.();
    this.detachKeydown = null;
    this.detachReposition?.();
    this.detachReposition = null;
    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.spotlight?.remove();
    this.spotlight = null;
  }

  /**
   * Whether the app reads right-to-left.
   *
   * Optional inject: `Directionality` is root-provided, so this is never null in
   * an app — but a bare `TestBed` that provides nothing should still get a
   * component that works, and defaulting to LTR is the honest fallback.
   */
  private isRtl(): boolean {
    return this.dir?.value === 'rtl';
  }
}
