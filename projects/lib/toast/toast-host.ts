/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';

import { useI18nText } from 'ngwr/i18n';

import { WrToastItem } from './toast-item';
import type { WrToastConfig, WrToastMode, WrToastOptions, WrToastPosition } from './types';

/** ms before the pointer or focus leaving actually collapses the stack. Buffers
 * the cursor briefly leaving the host as toasts reflow underneath it, and focus
 * hopping between two buttons inside the host. */
const COLLAPSE_DELAY_MS = 120;

/** Send focus back to `origin` when it is still in the page. */
function returnFocus(origin: HTMLElement | null): void {
  if (origin?.isConnected) origin.focus();
}

/**
 * Whether `el`, the focused element, holds focus the keyboard way — the focus a
 * removal would strand.
 *
 * A pointer press on Close focuses the button too, in Chromium, and handing
 * THAT focus on is a regression rather than a fix: focus inside the region
 * holds every countdown, so after one click the rest of the stack stayed up
 * until the reader clicked somewhere else — measured, two toasts still on
 * screen six seconds after the pointer left. Left alone, the removed button's
 * `focusout` releases the hold, as it always did.
 */
function hasKeyboardFocus(el: Element | null | undefined): boolean {
  if (!el) return false;
  try {
    return el.matches(':focus-visible');
  } catch {
    // An engine without the pseudo-class: err on the side of not losing focus.
    return true;
  }
}

/** Active entry pushed by the service — adds the bookkeeping fields the host renders. */
type ActiveToast = WrToastOptions & {
  readonly id: number;
  readonly resolvedDuration: number;
};

/**
 * Internal host that lives inside the toast overlay and renders the
 * active stack. Owned by `WrToast`.
 *
 * @internal
 */
@Component({
  selector: 'wr-toast-host',
  templateUrl: './toast-host.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    role: 'region',
    '[attr.aria-label]': 'regionLabel()',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  imports: [WrToastItem],
})
export class WrToastHost {
  readonly position = input<WrToastPosition>('top-end');
  readonly config = input.required<WrToastConfig>();
  /** Layout mode. @default 'stack' (Sonner-style; hover to fan out) */
  readonly mode = input<WrToastMode>('stack');

  /**
   * Every string this host and its items render, resolved through the catalog.
   *
   * The config value WINS when the consumer sets one, and its default is now
   * `null` — until v11 those defaults were English literals, so the four
   * `toast.*` keys in the shipped catalogs were dead and a Russian app got an
   * English close button. `region` had no key at all: the live region's name
   * was the literal `'Notifications'` in a host binding.
   */
  protected readonly regionLabel = useI18nText(signal(null), 'toast.region', 'Notifications');

  private readonly closeLabel = useI18nText(
    computed(() => this.config().labels.close),
    'toast.close',
    'Close'
  );
  private readonly copyLabel = useI18nText(
    computed(() => this.config().labels.copy),
    'toast.copy',
    'Copy'
  );
  private readonly copiedLabel = useI18nText(
    computed(() => this.config().labels.copied),
    'toast.copied',
    'Copied'
  );
  protected readonly closeAllLabel = useI18nText(
    computed(() => this.config().labels.closeAll),
    'toast.closeAll',
    'Close all'
  );

  /** What `wr-toast-item` receives — resolved, so the item stays presentational. */
  protected readonly labels = computed(() => ({
    close: this.closeLabel(),
    copy: this.copyLabel(),
    copied: this.copiedLabel(),
    closeAll: this.closeAllLabel(),
  }));

  /** @internal — hovering or focusing the stack toggles this in stack mode. */
  protected readonly expanded = signal(false);

  /** Pointer is over the host. */
  private readonly hovered = signal(false);
  /** Focus is somewhere inside the host — keyboard equivalent of hovering, and
   * the only way a keyboard user can reach the "Close all" button. */
  private readonly focusWithin = signal(false);

  private readonly destroyRef = inject(DestroyRef);
  private readonly elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private collapseTimer: ReturnType<typeof setTimeout> | null = null;
  /** The last value `holdChange` emitted. */
  private held = false;

  /** The rendered toasts, in `toasts()` order. */
  private readonly items = viewChildren(WrToastItem, { read: ElementRef });

  /**
   * Where focus was before it entered the region, which is where it goes back
   * to when the last toast is closed from inside. Recorded off the `focusin`
   * that crosses INTO the host; a hop between two toasts is not an entry.
   */
  private focusOrigin: HTMLElement | null = null;
  /** True while this host moves focus itself, so the move is not read as an entry. */
  private movingFocus = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearCollapseTimer());
  }

  /** @internal */
  protected onMouseEnter(): void {
    this.hovered.set(true);
    this.syncExpanded();
  }

  /** @internal */
  protected onMouseLeave(): void {
    this.hovered.set(false);
    this.syncExpanded();
  }

  /** @internal */
  protected onFocusIn(event: FocusEvent): void {
    if (!this.focusWithin() && !this.movingFocus) {
      const from = event.relatedTarget;
      this.focusOrigin = from instanceof HTMLElement && !this.elRef.nativeElement.contains(from) ? from : null;
    }
    this.focusWithin.set(true);
    this.syncExpanded();
  }

  /**
   * A toast asked to go — its Close button, or a swipe.
   *
   * When keyboard focus was inside it, the removal would drop focus on
   * `<body>`, so it is handed on: to the Close button of the toast that takes
   * its place (the next one in the stack, a promoted one included), else to the
   * previous one. When no toast is left, focus goes back to where it was before
   * it entered the region. A toast closed while focus was elsewhere, or with a
   * pointer, moves nothing — see `hasKeyboardFocus`.
   *
   * @internal
   */
  protected onItemDismissed(id: number, index: number): void {
    const item = this.items()[index]?.nativeElement as HTMLElement | undefined;
    const active = item?.ownerDocument.activeElement;
    const hadFocus = !!item?.contains(active ?? null) && hasKeyboardFocus(active);
    const origin = this.focusOrigin;
    // Synchronous: the service removes the toast here, and disposes this host
    // when it was the last one.
    this.dismissed.emit(id);
    if (!hadFocus) return;
    if (this.toasts().length === 0) {
      returnFocus(origin);
      return;
    }
    afterNextRender(() => this.focusNeighbour(index), { injector: this.injector });
  }

  /** "Close all" from the keyboard: nothing is left, so focus goes back. @internal */
  protected onCloseAll(): void {
    const host = this.elRef.nativeElement;
    const active = host.ownerDocument.activeElement;
    const hadFocus = host.contains(active) && hasKeyboardFocus(active);
    const origin = this.focusOrigin;
    this.dismissAllRequested.emit();
    if (hadFocus) returnFocus(origin);
  }

  /**
   * Focus the Close button nearest to where the removed toast stood: the one
   * now at its index, then forward, then back. A toast with no Close button
   * (`dismissible: false`) is passed over; with none anywhere, "Close all" if
   * it is showing, else the origin.
   */
  private focusNeighbour(index: number): void {
    const items = this.items().map(ref => ref.nativeElement as HTMLElement);
    const order = [...items.slice(index), ...items.slice(0, index).reverse()];
    const close = order
      .map(el => el.querySelector<HTMLElement>('.wr-toast__action--close'))
      .find((el): el is HTMLElement => !!el);
    const target = close ?? this.elRef.nativeElement.querySelector<HTMLElement>('.wr-toast-host__close-all');
    if (!target) {
      returnFocus(this.focusOrigin);
      return;
    }
    this.movingFocus = true;
    try {
      target.focus();
    } finally {
      this.movingFocus = false;
    }
  }

  /** @internal Focus moving between two buttons inside the host is not leaving it. */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.elRef.nativeElement.contains(next)) return;
    this.focusWithin.set(false);
    this.syncExpanded();
  }

  /** Expand immediately while the pointer or focus is inside, and delay the
   * collapse so a cursor briefly slipping off the host during a layout reflow
   * — or focus moving between two buttons inside it — doesn't cause a flicker. */
  private syncExpanded(): void {
    this.syncHold();
    if (this.hovered() || this.focusWithin()) {
      this.clearCollapseTimer();
      this.expanded.set(true);
      return;
    }
    if (this.collapseTimer !== null) return;
    this.collapseTimer = setTimeout(() => {
      this.collapseTimer = null;
      if (!this.hovered() && !this.focusWithin()) this.expanded.set(false);
    }, COLLAPSE_DELAY_MS);
  }

  /**
   * Hold EVERY countdown while the reader is in the region, not only the toast
   * under the pointer. Per-toast pausing let the others expire around the one
   * being read: in an expanded stack the pointer rested on #2 while #1 and #3
   * ran out, the stack collapsed, and #2 jumped 140px up from under a pointer
   * that never moved — and a gutter between toasts, which keeps the stack
   * expanded, paused nothing at all. Released at once on leaving, with no
   * collapse delay, so the timers and the progress bars (paused by the same
   * `:hover` / `:focus-within` in the stylesheet) agree.
   */
  private syncHold(): void {
    const held = this.hovered() || this.focusWithin();
    if (held === this.held) return;
    this.held = held;
    this.holdChange.emit(held);
  }

  private clearCollapseTimer(): void {
    if (this.collapseTimer !== null) {
      clearTimeout(this.collapseTimer);
      this.collapseTimer = null;
    }
  }

  /** @internal — pushed by the service: the rendered (capped) stack. */
  readonly toasts = signal<readonly ActiveToast[]>([]);

  /** @internal — pushed by the service: count still queued behind the cap. */
  readonly queued = signal(0);

  /** Total outstanding toasts (visible + queued) — what "Close all" clears. */
  protected readonly totalCount = computed(() => this.toasts().length + this.queued());

  /** @internal — service listens to update its internal state. */
  readonly dismissed = output<number>();
  readonly pauseRequested = output<number>();
  readonly resumeRequested = output<number>();
  /** @internal — `true` while the pointer or focus is inside the region. */
  readonly holdChange = output<boolean>();
  readonly dismissAllRequested = output<void>();

  protected readonly classes = computed(() => {
    const parts = ['wr-toast-host', `wr-toast-host--${this.position()}`, `wr-toast-host--${this.mode()}`];
    if (this.mode() === 'stack' && this.expanded()) parts.push('wr-toast-host--expanded');
    return parts.join(' ');
  });

  /** Distance from the front of the stack (0 = newest / fully visible). */
  protected stackIndex(i: number): number {
    return this.toasts().length - 1 - i;
  }

  protected readonly closeAllVisible = computed(() => {
    const cfg = this.config();
    // In stack mode the toasts cascade absolutely while collapsed, which
    // makes the close-all button jump between layout positions on hover
    // (button moves → cursor leaves → host collapses → cycle = blink).
    // Only show it once the stack is expanded — by hover OR by focus entering
    // it, so it stays reachable from the keyboard — or always in list mode.
    if (this.mode() === 'stack' && !this.expanded()) return false;
    return cfg.showCloseAll && this.toasts().length >= cfg.closeAllThreshold;
  });

  protected showProgressFor(t: WrToastOptions): boolean {
    return t.showProgress ?? this.config().showProgress;
  }

  protected showCopyFor(t: WrToastOptions): boolean {
    return t.showCopy ?? this.config().showCopy;
  }
}
