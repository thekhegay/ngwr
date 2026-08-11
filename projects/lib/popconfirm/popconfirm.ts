/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { DestroyRef, Directive, ElementRef, ViewContainerRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { useI18nText } from 'ngwr/i18n';
import { WR_OVERLAY, WrOutsideClick, wrMirrorOffsets } from 'ngwr/overlay';
import type { WrColor } from 'ngwr/theme';

import { WR_POPCONFIRM_POSITIONS, type WrPopconfirmPosition } from './interfaces';
import { WrPopconfirmPanel } from './popconfirm-panel';

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

  /** Anchor side. @default 'top' */
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

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.host)
      .withPositions(wrMirrorOffsets(WR_POPCONFIRM_POSITIONS[this.position()], this.isRtl()))
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.reposition(),
      panelClass: ['wr-popconfirm-overlay', `wr-popconfirm-overlay--${this.position()}`],
    });

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
    const returnFocus = this.overlayRef.overlayElement.contains(document.activeElement);
    this.overlayRef.dispose();
    this.overlayRef = null;
    this.isOpen.set(false);
    if (returnFocus) this.host.nativeElement.focus();
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
