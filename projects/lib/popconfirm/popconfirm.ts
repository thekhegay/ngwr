/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  ViewContainerRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { useI18nText } from 'ngwr/i18n';
import { WR_OVERLAY, WrOutsideClick, wrFollowDirection, wrMirrorOffsets } from 'ngwr/overlay';
import type { WrColor } from 'ngwr/theme';
import { toClassList, type WrClassInput } from 'ngwr/utils';

import { WrPopconfirmPanel } from './popconfirm-panel';
import { type WrPopconfirmPosition, wrPopconfirmPositions } from './types';

/**
 * How close, in px, `withPush` may park the panel to the viewport edge — the
 * `--wr-space-sm` step, and the value `wr-popover` uses.
 */
const VIEWPORT_MARGIN = 8;

/**
 * Small "Are you sure?" panel anchored to its trigger. Fires `confirmed`
 * or `cancelled` and closes automatically. Built on CDK Overlay.
 *
 * @example
 * ```html
 * <wr-btn
 *   color="danger"
 *   [wrPopconfirm]="'Delete this item?'"
 *   confirmColor="danger"
 *   confirmText="Delete"
 *   (confirmed)="remove()"
 * >Delete</wr-btn>
 * ```
 *
 * @see https://ngwr.dev/reference/components/popconfirm
 */
let popconfirmUid = 0;

@Directive({
  selector: '[wrPopconfirm]',
  exportAs: 'wrPopconfirm',
  host: {
    // Marks the trigger the way `[wrPopover]` and `[wrDropdown]` mark theirs. The
    // question is normally BOUND (`[wrPopconfirm]="question"`), which leaves no
    // attribute in the DOM at all, so without this there is nothing to find a
    // trigger by once the panel is shut.
    class: 'wr-popconfirm-trigger',
    '(click)': 'toggle($event)',
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'isOpen()',
    // Names the dialog this trigger opened, as every other overlay trigger in the
    // catalog does. `aria-haspopup="dialog"` promises a dialog and `aria-expanded`
    // says it is showing; without the id, which one is left to guess.
    '[attr.aria-controls]': 'isOpen() ? panelId : null',
  },
})
export class WrPopconfirm {
  /** Confirmation message. */
  readonly message = input.required<string>({ alias: 'wrPopconfirm' });

  /** Anchor side; the panel flips to another side when this one has no room. @default 'top' */
  readonly position = input<WrPopconfirmPosition>('top');

  /** Label for the confirm button. @default 'Confirm' */
  /** Confirm button text. Falls back to `popconfirm.confirm`. */
  readonly confirmText = input<string | null>(null);

  /** Label for the cancel button. @default 'Cancel' */
  /** Cancel button text. Falls back to `popconfirm.cancel`. */
  readonly cancelText = input<string | null>(null);

  /**
   * Accessible name of the confirmation dialog. `role="dialog"` with no name
   * announces as a bare "dialog". Falls back to `popconfirm.label`.
   */
  readonly ariaLabel = input<string | null>(null);

  // The catalog has carried these translated for as long as the component has
  // existed; the labels were hard-coded English defaults, so a localized app got
  // English buttons with the right strings sitting one file away.
  private readonly resolvedConfirm = useI18nText(this.confirmText, 'popconfirm.confirm', 'Confirm');
  private readonly resolvedCancel = useI18nText(this.cancelText, 'popconfirm.cancel', 'Cancel');
  private readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'popconfirm.label', 'Confirm action');

  /** Color of the confirm button. @default 'primary' */
  readonly confirmColor = input<WrColor>('primary');

  /**
   * Extra CSS classes for the confirmation bubble's overlay pane.
   *
   * The pane is appended to the overlay container, not to this component, so
   * nothing in the consumer's own template encloses it and no descendant rule
   * written around the trigger can reach it. This input is the only per-instance
   * handle on it. A space-separated string works as well as an array.
   */
  readonly panelClass = input<WrClassInput>(null);

  /** Fires when the user clicks confirm. */
  readonly confirmed = output<void>();

  /** Fires when the user clicks cancel or dismisses the overlay. */
  readonly cancelled = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly dir = inject(Directionality, { optional: true });
  private readonly outsideClick = inject(WrOutsideClick);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** @internal Public so the host bindings can read it. */
  readonly isOpen = signal(false);

  private overlayRef: OverlayRef | null = null;

  private readonly uid = ++popconfirmUid;

  /** @internal Public so the host binding can read it. */
  protected readonly panelId = `wr-popconfirm-${this.uid}`;

  private readonly messageId = `wr-popconfirm-message-${this.uid}`;

  constructor() {
    this.destroyRef.onDestroy(() => this.dispose());
  }

  /** @internal */
  protected toggle(event: MouseEvent): void {
    event.stopPropagation();
    if (this.overlayRef) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.overlayRef) return;

    // Read ONCE, here, and mirror this list rather than the input: the side is
    // chosen at open and a later `position` write moves nothing, so a follower
    // that re-read the signal would let a direction flip quietly adopt a
    // position the panel never opened with.
    //
    // The list is a fallback CHAIN, each link tagged with its own
    // `wr-popconfirm-overlay--<side>` class, so the panel flips when the side
    // asked for has no room and the arrow names the side it landed on. The
    // viewport margin is `wr-popover`'s, for the same reason: without it a pushed
    // panel parks its border on the glass.
    const positions = wrPopconfirmPositions(this.position());

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.host)
      .withPositions(wrMirrorOffsets(positions, this.isRtl()))
      .withPush(true)
      .withViewportMargin(VIEWPORT_MARGIN);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.reposition(),
      panelClass: toClassList('wr-popconfirm-overlay', this.panelClass()),
    });

    // `isRtl()` above answered once, at `create()`, and so did the CDK's own
    // capture of the direction — neither is revisited if the app flips while the
    // question is still on screen. Both halves have to move: the `dir` on the
    // host, so `start` / `end` resolve to the other edge, and the mirrored list,
    // because `offsetX` is added to the final PHYSICAL x. Leave the list behind
    // and the 8px gap on `left` / `right` becomes an 8px overlap over the very
    // control the panel is asking about.
    wrFollowDirection(this.overlayRef, this.dir, this.injector, direction =>
      positionStrategy.withPositions(wrMirrorOffsets(positions, direction === 'rtl'))
    );

    // Non-modal by choice, like `wr-popover`: an outside click or Escape closes it,
    // so trapping focus would only make it harder to leave. It still needs a role, a
    // name and the question read out as its description.
    const pane = this.overlayRef.overlayElement;
    pane.id = this.panelId;
    pane.setAttribute('role', 'dialog');
    pane.setAttribute('aria-modal', 'false');
    pane.setAttribute('aria-label', this.resolvedAriaLabel());
    pane.setAttribute('aria-describedby', this.messageId);

    const portal = new ComponentPortal(WrPopconfirmPanel, this.vcr);
    const ref = this.overlayRef.attach(portal);
    ref.setInput('message', this.message());
    ref.setInput('messageId', this.messageId);
    ref.setInput('confirmText', this.resolvedConfirm());
    ref.setInput('cancelText', this.resolvedCancel());
    ref.setInput('confirmColor', this.confirmColor());
    // Render now rather than next frame: the buttons have to exist before focus can
    // move to one, and a deferred focus is the class of bug this repo keeps finding.
    ref.changeDetectorRef.detectChanges();
    // Focus has to enter the panel — the overlay container sits at the end of
    // `<body>`, so Tab from the trigger went to the next thing on the PAGE and the
    // only way to confirm was unreachable. Cancel first: the action being confirmed
    // is usually the destructive one.
    pane.querySelector<HTMLElement>('.wr-popconfirm__actions wr-btn')?.focus();
    // And it has to LEAVE with the panel: Tab past Confirm went on to the end of
    // `<body>` and Shift+Tab before Cancel to the foot of the page, each with the
    // question still on screen and `aria-expanded` still true. See `onPaneKeydown`.
    pane.addEventListener('keydown', this.onPaneKeydown);
    pane.addEventListener('focusout', this.onPaneFocusOut);
    this.isOpen.set(true);

    ref.instance.confirmed.subscribe(() => {
      this.confirmed.emit();
      this.close();
    });
    ref.instance.cancelled.subscribe(() => this.dismiss());

    this.outsideClick
      .outsidePointerEvents(this.overlayRef)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (this.host.nativeElement.contains(event.target as Node)) return;
        this.dismiss();
      });

    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.dismiss();
        }
      });
  }

  close(): void {
    this.dispose();
  }

  private dismiss(): void {
    if (!this.overlayRef) return;
    this.cancelled.emit();
    this.dispose();
  }

  private dispose(): void {
    if (!this.overlayRef) return;
    // Focus lives inside the panel while it is open, and removing the panel would
    // drop it to `<body>` — hand it back to the trigger instead, as `wr-dropdown`
    // does on Escape. Only when focus is still IN there: if the user has already
    // clicked elsewhere, taking it back would be stealing.
    const pane = this.overlayRef.overlayElement;
    const returnFocus = pane.contains(document.activeElement);
    // Before the dispose: Chromium fires `focusout` for a focused node as it is
    // removed, and the pane is about to be.
    pane.removeEventListener('keydown', this.onPaneKeydown);
    pane.removeEventListener('focusout', this.onPaneFocusOut);
    this.overlayRef.dispose();
    this.overlayRef = null;
    this.isOpen.set(false);
    if (returnFocus) this.host.nativeElement.focus();
  }

  /**
   * Tab off either end of the panel dismisses it and takes focus back to the
   * trigger — `wr-popover`'s disclosure behaviour, for a non-modal panel whose
   * DOM sits nowhere near its trigger. Leaving is a dismissal, so `cancelled`
   * fires, as it does for Escape and an outside click.
   *
   * Forward, the trigger is focused WITHOUT `preventDefault`, so the browser's
   * own Tab runs on from there and lands on whatever follows the trigger, where a
   * panel rendered in place would have let it go. Backward, the trigger itself is
   * the destination, so the default is stopped. The panel holds two stops, Cancel
   * and Confirm, in that order.
   */
  private readonly onPaneKeydown = (event: KeyboardEvent): void => {
    const pane = this.overlayRef?.overlayElement;
    if (!pane || event.key !== 'Tab' || event.defaultPrevented) return;
    const stops = [...pane.querySelectorAll<HTMLElement>('.wr-popconfirm__action')];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active !== stops[0]) return;
      event.preventDefault();
    } else if (active !== stops.at(-1)) {
      return;
    }
    this.host.nativeElement.focus();
    this.dismiss();
  };

  /**
   * Focus that leaves the panel by any other road (a click on something
   * focusable elsewhere) dismisses it too, and is left where it went. A `null`
   * destination is the window losing focus or a focused node being removed,
   * neither of which is leaving.
   */
  private readonly onPaneFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget as Node | null;
    if (!next || this.holdsFocus(next)) return;
    this.dismiss();
  };

  /**
   * Whether focus on `node` still belongs to this panel: inside the pane, on the
   * trigger (a press there is about to toggle it), or in an overlay opened AFTER
   * this one — the stacking `wr-popover` and `WrOutsideClick` honour, so a
   * second panel raised by `open()` does not dismiss the first by taking focus.
   */
  private holdsFocus(node: Node): boolean {
    const ref = this.overlayRef;
    if (!ref) return false;
    if (ref.overlayElement.contains(node) || this.host.nativeElement.contains(node)) return true;
    const box = ref.hostElement;
    return (
      (box.parentElement?.contains(node) ?? false) &&
      // eslint-disable-next-line no-bitwise -- compareDocumentPosition answers with a bitmask
      (box.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
    );
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
