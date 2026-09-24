/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { FocusMonitor } from '@angular/cdk/a11y';
import { Directionality } from '@angular/cdk/bidi';
import { type BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal, TemplatePortal } from '@angular/cdk/portal';
import type { ComponentRef, TemplateRef } from '@angular/core';
import {
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  ViewContainerRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { useI18nText } from 'ngwr/i18n';
import {
  WR_OVERLAY,
  WR_RESPONSIVE_OVERLAYS,
  WrOutsideClick,
  wrFollowDirection,
  wrMirrorOffsets,
  wrPresentAsSheet,
} from 'ngwr/overlay';
import { KEYS, numAttr, toClassList, type WrClassInput } from 'ngwr/utils';

import { type WrPopoverPosition, wrPopoverPositions } from './interfaces';
import { WrCurrentKeystroke } from './internal/keystroke';
import { WrPopoverTextPanel } from './internal/text-panel';

/**
 * Keys the USER moves focus with: Tab through the page, the arrows / Home /
 * End through a composite that roves its own tabindex.
 *
 * A roving arrow move is a script `.focus()` call too — the difference from a
 * dismissal is not who called `focus()` but whether the keystroke was a
 * NAVIGATION or an action. Anything absent from this list (Escape, Enter,
 * Space, a character) does something else for a living, so focus that lands
 * during one of them was placed by a script and a tooltip stays shut.
 */
const NAVIGATION_KEYS = new Set<string>([
  KEYS.TAB,
  KEYS.ARROW_UP,
  KEYS.ARROW_DOWN,
  KEYS.ARROW_LEFT,
  KEYS.ARROW_RIGHT,
  KEYS.HOME,
  KEYS.END,
  KEYS.PAGE_UP,
  KEYS.PAGE_DOWN,
]);

/**
 * Anchored content panel. The same directive covers two shapes:
 *
 * - **Popover** (default, `mode="popover"`) — `[wrPopover]` takes a
 *   `TemplateRef`. Opens on click or hover. Use for rich anchored content:
 *   forms, summaries, menus.
 *
 * - **Tooltip** (`mode="tooltip"`) — `[wrPopover]` takes a plain string.
 *   Shown on hover and when the KEYBOARD puts focus on the trigger — never for
 *   a `.focus()` call, which is what a dialog or drawer does when it hands
 *   focus back. Dismissed when focus leaves / on pointer-leave / Escape. Uses
 *   `aria-describedby` instead of `aria-haspopup` and is rendered into a small
 *   dark text panel.
 *
 * Built on CDK Overlay so it auto-flips, closes on outside-click and Escape.
 *
 * @example
 * ```html
 * <!-- Popover with template content -->
 * <button wr-btn [wrPopover]="info">Details</button>
 * <ng-template #info>
 *   <div style="padding: 1rem; max-width: 18rem">Anything you can render.</div>
 * </ng-template>
 *
 * <!-- Tooltip with plain text -->
 * <button wr-btn [wrPopover]="'Save changes'" mode="tooltip" position="top">
 *   Save
 * </button>
 * ```
 *
 * @see https://ngwr.dev/reference/components/popover
 */
let popoverUid = 0;

@Directive({
  selector: '[wrPopover]',
  exportAs: 'wrPopover',
  host: {
    // Marks the trigger the way `[wrDropdown]` marks its own. Popover-mode
    // content is a `TemplateRef`, so it is always bound as `[wrPopover]="…"`,
    // which leaves no attribute in the DOM at all, and a closed tooltip
    // publishes no ARIA either — so without this there is nothing to find a
    // trigger by. (Only the static string form, `wrPopover="text"`, would be.)
    class: 'wr-popover-trigger',
    '[attr.aria-haspopup]': 'isTooltip() ? null : "dialog"',
    '[attr.aria-expanded]': 'isTooltip() ? null : isOpen()',
    '[attr.aria-controls]': '!isTooltip() && isOpen() ? panelId : null',
    '[attr.aria-describedby]': 'isTooltip() && isOpen() ? panelId : null',
    '(click)': 'onClick($event)',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave($event)',
    // No `(focus)` / `(blur)` here: a tooltip answers the KEYBOARD, and a plain
    // focus event cannot say where the focus came from. `FocusMonitor` can — see
    // the constructor.
    '(keydown.escape)': 'onEscape()',
  },
})
export class WrPopover {
  /**
   * Content to render inside the panel.
   * - In **popover** mode (default): pass a `TemplateRef`.
   * - In **tooltip** mode: pass a plain string.
   */
  readonly content = input.required<TemplateRef<unknown> | string>({ alias: 'wrPopover' });

  /**
   * Shape preset.
   *
   * - `'popover'` (default) — template content, click trigger, dialog
   *   semantics.
   * - `'tooltip'` — text content, hover / keyboard-focus trigger,
   *   `role="tooltip"`, `aria-describedby` on the host.
   */
  readonly mode = input<'popover' | 'tooltip'>('popover');

  /**
   * How the popover opens. Ignored in tooltip mode — a tooltip is always hover
   * plus keyboard focus. @default 'click'
   */
  readonly trigger = input<'click' | 'hover'>('click');

  /** Anchor side. @default 'bottom' for popover, 'top' for tooltip */
  readonly position = input<WrPopoverPosition | null>(null);

  /** Tooltip only — delay before showing, in ms. @default 120 */
  readonly showDelay = input(120, { transform: numAttr(120) });

  /** Tooltip only — delay before hiding, in ms. @default 60 */
  readonly hideDelay = input(60, { transform: numAttr(60) });

  /**
   * Popover mode only — present the panel as a full-width bottom-sheet on
   * small viewports instead of an anchored panel. `undefined` follows the
   * app-wide `provideWrResponsiveOverlays()` setting; `true`/`false`
   * overrides it. Tooltips never become sheets. @default undefined
   */
  readonly responsive = input<boolean | undefined, BooleanInput>(undefined, {
    transform: (v: BooleanInput): boolean | undefined => (v == null ? undefined : coerceBooleanProperty(v)),
  });

  /**
   * Popover mode only — accessible name of the panel. `role="dialog"` with no
   * name announces as a bare "dialog", so the catalog's `popover.label` is used
   * when nothing is given. A popover has no universal name; whenever the panel
   * has a heading or a purpose, pass it.
   */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Extra CSS classes for the popover's (or tooltip's) overlay pane.
   *
   * The pane is appended to the overlay container, not to this component, so
   * nothing in the consumer's own template encloses it and no descendant rule
   * written around the trigger can reach it. This input is the only per-instance
   * handle on it. A space-separated string works as well as an array.
   */
  readonly panelClass = input<WrClassInput>(null);

  /** Fires after the panel opens. */
  readonly opened = output<void>();

  /** Fires after the panel closes. */
  readonly closed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly keystroke = inject(WrCurrentKeystroke);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly dir = inject(Directionality, { optional: true });
  private readonly outsideClick = inject(WrOutsideClick);
  private readonly responsiveConfig = inject(WR_RESPONSIVE_OVERLAYS);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  /** @internal */
  readonly isOpen = signal(false);

  /** @internal */
  protected readonly isTooltip = computed(() => this.mode() === 'tooltip');

  /** Auto-generated id for `aria-controls` / `aria-describedby`. */
  protected readonly panelId = `wr-popover-${++popoverUid}`;

  private readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'popover.label', 'Popover');

  private readonly resolvedPosition = computed<WrPopoverPosition>(
    () => this.position() ?? (this.isTooltip() ? 'top' : 'bottom')
  );

  private overlayRef: OverlayRef | null = null;
  private textPanelRef: ComponentRef<WrPopoverTextPanel> | null = null;
  /** Whether the HOST itself holds focus — not a descendant of it. */
  private hostFocused = false;
  private hoverCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.openOverlay();
      } else {
        this.closeOverlay();
      }
    });
    // The tooltip string is pushed into the panel when the panel is created, and
    // `openOverlay()` returns early while one is already up — so a `content()`
    // change with the tooltip on screen never reached it and the label stayed on
    // the string it opened with (hover a Copy button, click it, it still reads
    // "Copy"). Keeping the ref and pushing from an effect is how `wr-date-picker`
    // feeds its own panel refs.
    effect(() => {
      const content = this.content();
      this.textPanelRef?.setInput('text', typeof content === 'string' ? content : '');
    });
    // A tooltip answers the USER'S KEYBOARD, not every focus there is.
    //
    // `(focus)` fired for a programmatic one too, and something hands focus back
    // to a trigger constantly: `WrDrawer` and `WrDialog` restore the element that
    // was active when they opened, this directive does the same for its own
    // popover, and any app may call `.focus()`. So closing a drawer opened from a
    // button with a tooltip re-showed that tooltip with NOTHING left to dismiss
    // it — the pointer is elsewhere, so no `mouseleave`, and focus stays on the
    // button, so no blur. A pane stranded under the trigger, reported from a real
    // app. The event alone cannot tell those apart; `FocusMonitor` is the CDK's
    // answer to where a focus came from, and it is what Material's tooltip reads
    // for the same reason. Mouse and touch origins are deliberately ignored:
    // hover already drives both, and acting on them would show the tooltip twice
    // over.
    //
    // The origin alone is NOT enough, though, and reading it as if it were leaves
    // the reported bug half open: the CDK's `keyboard` means "a key went down
    // within the last millisecond", and the dismissal that hands focus back is
    // itself a keystroke — Escape on a drawer, Enter on its ✕. See
    // `WrCurrentKeystroke` for the key that tells a navigation from a dismissal.
    //
    // Monitored in EVERY mode rather than only under `mode="tooltip"` — the mode
    // is an input and may flip after this runs, and a subscription that only
    // half-exists is the failure this fix is about. The handler asks instead. The
    // cost is the CDK's own `cdk-*-focused` classes on the host, which nothing in
    // ngwr styles.
    //
    // `afterNextRender` because monitoring binds document listeners: there is no
    // DOM to bind them to on the server.
    afterNextRender(() => {
      this.focusMonitor
        .monitor(this.host)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(origin => {
          if (origin) {
            this.hostFocused = true;
            if (this.isTooltip() && origin === 'keyboard' && this.fromNavigationKey()) this.scheduleShow();
            return;
          }
          // A null origin is a blur, and the CDK reports one for a DESCENDANT
          // too: `_onFocus` bails when the event target is not the monitored
          // element, `_onBlur` has no such guard. The old `(blur)` binding never
          // bubbled, so hiding on one is new — hover a wrapper, click the button
          // inside it, tab away, and the tooltip the POINTER opened vanished
          // while the pointer never moved. Only the host's own focus counts.
          if (!this.hostFocused) return;
          this.hostFocused = false;
          if (this.isTooltip()) this.scheduleHide();
        });
    });
    this.destroyRef.onDestroy(() => {
      this.clearTimers();
      this.closeOverlay(false);
      // Completes the subject `monitor()` handed out and drops the global
      // listeners it registered for this element; the pipe above unsubscribes
      // either way, but the CDK's own bookkeeping only clears from here.
      this.focusMonitor.stopMonitoring(this.host);
    });
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    this.isOpen.update(v => !v);
  }

  // Host listeners

  /** @internal */
  protected onClick(event: MouseEvent): void {
    if (this.isTooltip() || this.trigger() !== 'click') return;
    event.stopPropagation();
    this.toggle();
  }

  /** @internal */
  protected onMouseEnter(): void {
    if (this.isTooltip()) {
      this.scheduleShow();
      return;
    }
    if (this.trigger() !== 'hover') return;
    this.clearHoverClose();
    this.isOpen.set(true);
  }

  /** @internal */
  protected onMouseLeave(event: MouseEvent): void {
    const related = event.relatedTarget as Node | null;
    if (this.isTooltip()) {
      // Crossing straight from the trigger onto the panel does not even arm the
      // hide, the same bail-out the popover arm below has had. The panel's own
      // `mouseenter` would cancel it a moment later anyway; not arming it is
      // what removes the race.
      if (related && this.overlayRef?.overlayElement.contains(related)) return;
      this.scheduleHide();
      return;
    }
    if (this.trigger() !== 'hover') return;
    if (related && this.overlayRef?.overlayElement.contains(related)) return;
    // Delay so the pointer can cross the gap between trigger and panel —
    // entering the panel cancels the close (see attach listeners).
    this.scheduleHoverClose();
  }

  /** @internal */
  protected onEscape(): void {
    if (!this.isTooltip()) return;
    this.clearTimers();
    this.isOpen.set(false);
  }

  /**
   * Whether the keystroke in flight is one the user moves focus with.
   *
   * Asked only of a `keyboard` origin, which the CDK grants to any focus landing
   * within a millisecond of a keydown — including the hand-back a drawer
   * performs while Escape is still being handled. That is the reported bug's
   * keyboard half, and the origin cannot see it.
   *
   * NO key on record answers `true`, and that polarity is chosen rather than
   * inherited: a keyboard modality with no keystroke behind it is a screen
   * reader's virtual cursor (the CDK reads its synthetic mousedown as
   * `keyboard`) or a deliberate `focusVia(el, 'keyboard')`, and both are the
   * user. Refusing wants positive evidence of a key that does something other
   * than navigate — silence must not cost an AT user the hint. The two windows
   * are aligned so that "keyboard origin, no key" cannot mean "the key just
   * expired"; what it does still admit is a `FocusMonitorDetectionMode.EVENTUAL`
   * app, where the CDK never expires an origin at all.
   */
  private fromNavigationKey(): boolean {
    const key = this.keystroke.key;
    return key === null || NAVIGATION_KEYS.has(key);
  }

  // Tooltip timers

  private scheduleShow(): void {
    if (this.isOpen()) {
      this.clearTimers();
      return;
    }
    const text = this.content();
    if (typeof text === 'string' && !text) return;
    this.clearTimers();
    this.showTimer = setTimeout(() => this.isOpen.set(true), this.showDelay());
  }

  private scheduleHide(): void {
    this.clearTimers();
    this.hideTimer = setTimeout(() => this.isOpen.set(false), this.hideDelay());
  }

  private clearTimers(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  // Overlay

  private openOverlay(): void {
    if (this.overlayRef) return;

    const tooltip = this.isTooltip();
    const position = this.resolvedPosition();

    // Sheet presentation is popover-only — tooltips are transient labels and
    // never dock to the bottom. On small viewports (when opted in) detach
    // from the trigger and slide the panel up from the bottom edge.
    const asSheet = !tooltip && wrPresentAsSheet(this.responsive(), this.responsiveConfig);
    const paneClass = tooltip ? 'wr-tooltip-overlay' : 'wr-popover-overlay';

    // Kept as its own binding rather than inlined into the ternary: it is the
    // half a direction flip has to rebuild, and a sheet — anchored to nothing —
    // has no list at all, which is what `null` says here.
    const connected = asSheet
      ? null
      : this.overlay
          .position()
          .flexibleConnectedTo(this.host)
          .withPositions(wrMirrorOffsets(wrPopoverPositions(position, paneClass), this.isRtl()))
          .withPush(true);

    const positionStrategy = connected ?? this.overlay.position().global().centerHorizontally().bottom('0');

    // The `--<placement>` half is no longer set here: each fallback position
    // carries its own, so the pane names the placement it landed on instead of
    // the one that was requested, and the arrow follows a flip. A sheet has no
    // anchor and so no placement class at all.
    const overlayClass = toClassList(paneClass, asSheet && 'wr-overlay-sheet', this.panelClass());

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: asSheet ? this.scrollStrategies.block() : this.scrollStrategies.reposition(),
      width: asSheet ? '100%' : undefined,
      hasBackdrop: asSheet,
      backdropClass: asSheet ? 'wr-overlay-backdrop' : undefined,
      panelClass: overlayClass,
    });

    // The CDK read the direction once, just now, and will never look again — so
    // an app that flips while this panel is up mirrors the page around a pane
    // still rendering `ltr`, with `wr-segmented` and friends inside it already
    // laying themselves out the other way. Rebuilding the list matters as much
    // as the attribute: `wrMirrorOffsets` turned the 8px gap around at open, and
    // an unmirrored offset puts a side-placed panel back on top of its trigger.
    // A sheet has no list, and `connected?.` is what says so — the arguments are
    // never evaluated for one.
    wrFollowDirection(this.overlayRef, this.dir, this.injector, direction =>
      connected?.withPositions(wrMirrorOffsets(wrPopoverPositions(position, paneClass), direction === 'rtl'))
    );

    if (asSheet) {
      this.overlayRef
        .backdropClick()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.isOpen.set(false));
    }

    const content = this.content();

    if (tooltip) {
      // Text content rendered via the internal text panel — accepts a
      // string and wraps it in the `.wr-tooltip` shell.
      const text = typeof content === 'string' ? content : '';
      const ref = this.overlayRef.attach(new ComponentPortal(WrPopoverTextPanel, this.vcr));
      ref.setInput('text', text);
      this.textPanelRef = ref;
      // The pane is the element `aria-describedby` points at (it carries
      // `panelId`), so this is the role that has to be `tooltip` — the inner
      // `wr-popover-text` host deliberately carries none, or the description
      // would be a tooltip nested inside a tooltip.
      this.overlayRef.overlayElement.setAttribute('role', 'tooltip');
    } else if (typeof content !== 'string') {
      const view = this.overlayRef.attach(new TemplatePortal(content, this.vcr));
      const pane = this.overlayRef.overlayElement;
      // Popover mode is a non-modal dialog: the docstring promised dialog
      // semantics but nothing ever set a role, so a screen reader met an
      // unnamed generic container. `aria-modal="false"` is explicit — focus is
      // deliberately NOT trapped, the panel closes on outside click / Escape.
      pane.setAttribute('role', 'dialog');
      pane.setAttribute('aria-modal', 'false');
      // A named dialog: `role="dialog"` with no name announces as a bare
      // "dialog" and trips axe's `aria-dialog-name`.
      pane.setAttribute('aria-label', this.resolvedAriaLabel());

      if (this.trigger() === 'click') {
        // Render the projected content before focus moves, the way
        // `wr-popconfirm` does — a reader announcing the dialog reads what is in
        // it, and on an empty pane that is nothing.
        view.detectChanges();
        // Focus has to ENTER the panel. The overlay container sits at the end of
        // `<body>`, so Tab from the trigger went to the next control on the page
        // and left the dialog stranded behind it (WCAG F85). The pane takes it
        // rather than the first control inside: a popover's content is
        // arbitrary, and landing on a text field would raise the on-screen
        // keyboard and skip whatever the panel says above it. Tab from the pane
        // reaches that first control anyway, since the pane precedes its own
        // content in document order.
        //
        // Click-triggered only — a hover popover must not pull the caret out of
        // what the user is typing in, and `scheduleHoverClose()` would then
        // dispose the pane out from under the focused element.
        pane.tabIndex = -1;
        pane.focus();
      }
    }
    this.overlayRef.overlayElement.id = this.panelId;

    this.outsideClick
      .outsidePointerEvents(this.overlayRef)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (this.host.nativeElement.contains(event.target as Node)) return;
        this.isOpen.set(false);
      });

    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.isOpen.set(false);
        }
      });

    // Both hover shapes keep the panel up while the pointer is on it: for a
    // popover so the pointer can cross the gap, for a tooltip because WCAG
    // 1.4.13 requires it (Hoverable).
    if (tooltip || this.trigger() === 'hover') {
      this.overlayRef.overlayElement.addEventListener('mouseenter', this.onOverlayEnter);
      this.overlayRef.overlayElement.addEventListener('mouseleave', this.onOverlayLeave);
    }

    this.opened.emit();
  }

  /**
   * Tear the overlay down, and tell the host — unless the host is going away
   * with it.
   *
   * `notify: false` is the DESTROY path, and it is not a nicety. An `output()`
   * belongs to the view that declares it, so emitting from `onDestroy` is
   * refused: Angular logs `NG0953: Unexpected emit for destroyed OutputRef` and
   * the listener never runs. Measured — a `(closed)` handler on a dropdown whose
   * host view is removed while the menu is open fired zero times and left a
   * console error behind. There is nobody to notify at that point, because the
   * consumer's own view is being torn down in the same pass; `wr-popconfirm`
   * already disposes without emitting, and this brings the other two into line.
   *
   * The focus hand-back is skipped for the same reason — the host element is on
   * its way out of the document.
   */
  private closeOverlay(notify = true): void {
    if (!this.overlayRef) return;
    if (this.isTooltip() || this.trigger() === 'hover') {
      this.overlayRef.overlayElement.removeEventListener('mouseenter', this.onOverlayEnter);
      this.overlayRef.overlayElement.removeEventListener('mouseleave', this.onOverlayLeave);
    }
    this.clearHoverClose();
    // Take the focus back before the pane goes, and only if it was in there.
    //
    // A popover is not a tooltip: it attaches a `TemplatePortal` under
    // `role="dialog"`, so a form or a menu inside it is the point, and Escape
    // arrives through the overlay's `keydownEvents()` no matter where the caret
    // is. Disposing with focus inside dropped it on `<body>`, and the next Tab
    // restarted from the top of the document. `wr-date-picker` and
    // `wr-popconfirm` already guard it exactly this way; leaving focus alone
    // when it had already moved is what stops the close from fighting the user
    // for the caret.
    const pane = this.overlayRef.overlayElement;
    const focusWasInside = pane.contains(this.host.nativeElement.ownerDocument.activeElement);
    this.overlayRef.dispose();
    this.overlayRef = null;
    // Disposing destroys the panel component; a retained ref would pin its view.
    this.textPanelRef = null;
    if (notify) {
      if (focusWasInside) this.host.nativeElement.focus();
      this.closed.emit();
    }
  }

  private readonly onOverlayLeave = (event: MouseEvent): void => {
    const related = event.relatedTarget as Node | null;
    if (related && this.host.nativeElement.contains(related)) return;
    // A tooltip leaves on its own `hideDelay`, the same one the trigger uses; a
    // hover popover has the longer grace period for crossing the gap back.
    if (this.isTooltip()) this.scheduleHide();
    else this.scheduleHoverClose();
  };

  private readonly onOverlayEnter = (): void => {
    // Two different timers can be in flight: `hideTimer`, armed by the trigger's
    // own `mouseleave` in tooltip mode, and `hoverCloseTimer` in popover mode.
    // Cancelling only the second would leave a tooltip disappearing `hideDelay`
    // after the pointer arrived on it.
    this.clearTimers();
    this.clearHoverClose();
  };

  private scheduleHoverClose(): void {
    this.clearHoverClose();
    this.hoverCloseTimer = setTimeout(() => this.isOpen.set(false), 120);
  }

  private clearHoverClose(): void {
    if (this.hoverCloseTimer) {
      clearTimeout(this.hoverCloseTimer);
      this.hoverCloseTimer = null;
    }
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
