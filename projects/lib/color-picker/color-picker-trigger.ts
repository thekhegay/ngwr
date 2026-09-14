/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
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
  model,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WR_OVERLAY, WrOutsideClick, wrFollowDirection } from 'ngwr/overlay';

import { WrColorPicker } from './color-picker';
import type { WrColorFormat } from './interfaces';

let triggerUid = 0;

/**
 * Opens a `<wr-color-picker>` in an overlay anchored to the host element.
 *
 * Apply to any clickable element (typically a button). Two-way binds the
 * current colour through `[(value)]`; forwards `alpha` / `format` /
 * `swatches` / `disabled` to the inner picker.
 *
 * Same overlay isolation as the rest of the lib — uses {@link WR_OVERLAY},
 * not CDK's root container.
 *
 * @example
 * ```html
 * <button wrColorPickerTrigger
 *         [(value)]="brandColor"
 *         [swatches]="palette">
 *   <span class="swatch" [style.background]="brandColor"></span>
 *   {{ brandColor }}
 * </button>
 * ```
 *
 * @see https://ngwr.dev/reference/components/color-picker
 */
@Directive({
  selector: '[wrColorPickerTrigger]',
  exportAs: 'wrColorPickerTrigger',
  host: {
    '(click)': 'toggle()',
    // The same two attributes `<wr-popover>`'s trigger carries: without them the
    // button gave no hint that it opens anything, and never said it was open.
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'isOpen()',
    // Which panel, and only while there is one — the same pairing `[wrPopconfirm]`
    // publishes. Without it nothing on the page connects the trigger to the picker
    // it opened, so a second trigger's panel is indistinguishable from this one's.
    '[attr.aria-controls]': 'isOpen() ? panelId : null',
    // The directive's own `disabled` never reached the DOM: it gates `toggle()` and
    // is forwarded to the inner picker, so the button looked live to a screen
    // reader and did nothing when pressed.
    '[attr.aria-disabled]': 'disabled() ? true : null',
  },
})
export class WrColorPickerTrigger {
  /** Two-way bindable colour value (hex string). */
  readonly value = model<string>('');

  /** Forwarded to the inner picker. @default true */
  readonly alpha = input(true, { transform: coerceBooleanProperty });

  /** Forwarded to the inner picker. @default 'hex' */
  readonly format = input<WrColorFormat>('hex');

  /** Forwarded to the inner picker. @default [] */
  readonly swatches = input<readonly string[]>([]);

  /** Disable the trigger entirely. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Fires after the picker opens. */
  readonly opened = output<void>();

  /** Fires after the picker closes. */
  readonly closed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly outsideClick = inject(WrOutsideClick);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  /**
   * Ambient reading direction, for the open panel alone — nothing in this
   * directive reads it directly. Optional so a bare `TestBed` needs no
   * provider; `Directionality` is root-provided anyway, and a missing one
   * simply reads as `ltr`.
   */
  private readonly dir = inject(Directionality, { optional: true });

  protected readonly isOpen = signal(false);
  private overlayRef: OverlayRef | null = null;

  /** @internal Public so the host binding can read it. */
  protected readonly panelId = `wr-color-picker-panel-${++triggerUid}`;

  constructor() {
    this.destroyRef.onDestroy(() => this.dispose());
  }

  /** Toggle the picker. Open if closed, close if open. */
  toggle(): void {
    if (this.disabled()) return;
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Open the picker. No-op if already open. */
  open(): void {
    if (this.isOpen() || this.disabled()) return;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.host)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
      ])
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.reposition(),
      panelClass: 'wr-color-picker-overlay',
    });
    this.overlayRef.overlayElement.id = this.panelId;

    // Two of the four fallbacks anchor on `end`, and the CDK resolves start /
    // end against the direction it captured when this ref was created. The
    // `<wr-segmented>` the picker draws its HEX / RGB / HSL tabs with is the
    // visible half: its thumb reads `Directionality` LIVE, so a flip while this
    // panel was open slid the thumb to the other slot inside a pane still drawn
    // `ltr` — parked under the wrong tab, which is the symptom that started all
    // of this.
    wrFollowDirection(this.overlayRef, this.dir, this.injector);

    const portal = new ComponentPortal(WrColorPicker, this.vcr);
    const ref = this.overlayRef.attach(portal);

    ref.setInput('alpha', this.alpha());
    ref.setInput('format', this.format());
    ref.setInput('swatches', this.swatches());
    ref.setInput('disabled', this.disabled());
    ref.setInput('value', this.value());

    // Render now rather than next frame: the picker's surfaces have to exist
    // before focus can move to one, and a deferred focus is the class of bug
    // this repo keeps finding.
    ref.changeDetectorRef.detectChanges();
    // Focus has to ENTER the panel. The overlay container sits at the end of
    // `<body>`, so a Tab from the trigger went to the next thing on the PAGE and
    // the saturation surface and both sliders — all `tabindex="0"`, all
    // `role="slider"` or `role="group"` — were unreachable from the keyboard for
    // as long as the picker was open. The saturation surface is the first stop
    // and the one that carries the colour's two main values.
    //
    // Deliberately NOT a focus trap, matching `wr-popover` / `[wrPopconfirm]`:
    // this popup is non-modal, an outside click or Escape closes it, and
    // trapping would only make it harder to leave.
    this.overlayRef.overlayElement.querySelector<HTMLElement>('.wr-color-picker__sv')?.focus();

    // Bridge the inner picker's `value` model back to our two-way [(value)].
    ref.instance.value.subscribe((next: string) => this.value.set(next));

    // Outside-click → close (the source only filters out the overlay pane, so
    // the re-click on our own trigger still arrives here and has to be ignored).
    this.outsideClick
      .outsidePointerEvents(this.overlayRef)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (this.host.nativeElement.contains(event.target as Node)) return;
        this.close();
      });

    // Escape → close.
    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.close();
        }
      });

    this.isOpen.set(true);
    this.opened.emit();
  }

  /** Close the picker. No-op if already closed. */
  close(): void {
    if (!this.isOpen()) return;
    // Focus lives inside the panel while it is open, and removing the panel
    // would drop it to `<body>` — hand it back to the trigger instead, the way
    // `[wrPopconfirm]` does. Only when focus is still IN there: if the user has
    // already clicked elsewhere, taking it back would be stealing.
    const returnFocus = !!this.overlayRef?.overlayElement.contains(document.activeElement);
    this.dispose();
    this.isOpen.set(false);
    this.closed.emit();
    if (returnFocus) this.host.nativeElement.focus();
  }

  private dispose(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
}
