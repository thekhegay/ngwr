/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  Component,
  type ComponentRef,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { FormValueControl } from '@angular/forms/signals';

import { WrDateAdapter, type WrDateFormat } from 'ngwr/date-adapter';
import { readI18nText } from 'ngwr/i18n';
import { WrInput, WrInputGroup, WrInputSuffix } from 'ngwr/input';
import { WR_OVERLAY } from 'ngwr/overlay';

import type { WrDateRange } from './interfaces';
import { WrDateRangePanel } from './internal/date-range-panel';

/** Which end of the range an edit applies to. */
type RangeEnd = 0 | 1;

/**
 * Date-range picker — two text inputs sharing one range calendar.
 *
 * Separate from `<wr-date-picker>` because the value is a different type: a
 * range is `[start, end]`, and folding that into the single picker's
 * `Date | null` would break `[formField]` inference for every existing usage.
 * Everything else matches — same input skeleton, same overlay, same
 * {@link WrDateAdapter} formats.
 *
 * - `'date'` (default) — popover renders a range calendar. Picking the second
 *   date closes the overlay.
 * - `'datetime'` — popover adds a time stepper per end. Picking dates does NOT
 *   close, since the user typically sets the times next.
 *
 * A signal-forms native control: it implements
 * `FormValueControl<WrDateRange | null>`, so `[formField]` binds straight to
 * its `value` model. `[(value)]` works standalone, and classic `[(ngModel)]` /
 * reactive forms keep working through Angular's bridge.
 *
 * Either end may be `null` while the range is half-picked. Out-of-order ends
 * are swapped on commit, matching the calendar's own behaviour.
 *
 * @example
 * ```html
 * <!-- signal forms -->
 * <wr-date-range-picker [formField]="form.period" format="dd.MM.yyyy" />
 *
 * <!-- standalone two-way binding -->
 * <wr-date-range-picker [(value)]="period" [minDate]="minDate" />
 *
 * <!-- date + time on both ends -->
 * <wr-date-range-picker mode="datetime" [(value)]="window" timeFormat="24h" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/date-picker
 */
@Component({
  selector: 'wr-date-range-picker',
  templateUrl: './date-range-picker.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrInput, WrInputGroup, WrInputSuffix],
})
export class WrDateRangePicker implements FormValueControl<WrDateRange | null> {
  /** Picker behavior — see class doc. @default 'date' */
  readonly mode = input<'date' | 'datetime'>('date');

  /**
   * Format used for both display and parsing, on both ends. When `null`
   * (default), it is derived from `mode` (`shortDate` / `shortDateTime`). Pass
   * a named key or raw token string to override.
   */
  readonly format = input<WrDateFormat | (string & {}) | null>(null);

  /** Placeholder for the start input. */
  readonly startPlaceholder = input<string>('');

  /** Placeholder for the end input. */
  readonly endPlaceholder = input<string>('');

  /** Glyph rendered between the two inputs. @default '–' */
  readonly separator = input<string>('–');

  // Named `minDate` / `maxDate`, not `min` / `max`: `FormUiControl` reserves
  // those slots for the control's own value type, which here is a range — a
  // `min` typed as a range makes no sense. Matches `WrValidators.minDate`.
  /** Min selectable date, applied to both ends. */
  readonly minDate = input<Date | null>(null);

  /** Max selectable date, applied to both ends. */
  readonly maxDate = input<Date | null>(null);

  /** Predicate to disable specific dates (forwarded to the calendar). */
  readonly dateFilter = input<((date: Date) => boolean) | null>(null);

  /** Time-panel 12 / 24-hour format. Applies in `datetime` mode. @default 'auto' */
  readonly timeFormat = input<'auto' | '12h' | '24h'>('auto');

  /** Render the seconds column. Applies in `datetime` mode. @default false */
  readonly showSeconds = input(false, { transform: coerceBooleanProperty });

  /** Minute / second step for the time panels. @default 1 */
  readonly step = input(1, { transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 1)) });

  /**
   * Disable interaction. Bound automatically from the field's disabled state
   * when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Read-only — inputs not typeable, but the trigger icon still opens the overlay. @default false */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  private readonly adapter = inject<WrDateAdapter<Date>>(WrDateAdapter);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly startEl = viewChild.required<ElementRef<HTMLInputElement>>('startInput');

  /** The picked range. Bound by `[formField]`, or two-way via `[(value)]`. */
  readonly value = model<WrDateRange | null>(null);

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  /** Text currently in each input (may be partial / invalid mid-type). */
  protected readonly startText = signal<string>('');
  protected readonly endText = signal<string>('');

  /** Whether the popover is currently open. */
  protected readonly overlayOpen = signal(false);

  /** Resolved format — falls back to a mode-appropriate default. */
  protected readonly resolvedFormat = computed<string>(() =>
    this.format() ? String(this.format()) : this.mode() === 'datetime' ? 'shortDateTime' : 'shortDate'
  );

  protected readonly isDateTime = computed(() => this.mode() === 'datetime');

  protected readonly triggerLabel = readI18nText('datePicker.openRange', 'Open range calendar');
  protected readonly startLabel = readI18nText('datePicker.rangeStart', 'Range start');
  protected readonly endLabel = readI18nText('datePicker.rangeEnd', 'Range end');

  protected readonly classes = computed(() => {
    const parts = ['wr-date-range-picker', `wr-date-range-picker--${this.mode()}`];
    if (this.disabled()) parts.push('wr-date-range-picker--disabled');
    return parts.join(' ');
  });

  private overlayRef: OverlayRef | null = null;

  /** Live panel ref while the popover is open — lets typed edits move the
   * displayed month in real time (not just on reopen). */
  private readonly panelRef = signal<ComponentRef<WrDateRangePanel> | null>(null);

  /** Last range we pushed into the model ourselves, so the sync effect can skip
   * the echo of our own edits and never reformat text mid-type. */
  private lastValue: WrDateRange | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.dispose());

    // Mirror external writes to `value` into the two display texts.
    effect(() => {
      const v = this.value();
      untracked(() => {
        if (this.sameRange(v, this.lastValue)) return;
        this.lastValue = v;
        this.startText.set(this.display(v?.[0] ?? null));
        this.endText.set(this.display(v?.[1] ?? null));
      });
    });

    // Keep the open panel in step with the model.
    effect(() => {
      const ref = this.panelRef();
      if (ref) ref.setInput('value', this.value() ?? [null, null]);
    });
  }

  // Template handlers

  protected onStartInput(event: Event): void {
    this.onRangeInput(event, 0);
  }

  protected onEndInput(event: Event): void {
    this.onRangeInput(event, 1);
  }

  protected onBlur(): void {
    this.touch.emit();
    // Reformat to canonical on blur (cleans up `1/5/25` → `1/5/2025`).
    const [start, end] = this.current();
    this.startText.set(this.display(start));
    this.endText.set(this.display(end));
  }

  /** Called by an input's click — opens the overlay if it isn't open already. */
  protected openOnInput(): void {
    if (this.disabled() || this.overlayRef) return;
    this.openOverlay();
  }

  protected toggleOverlay(): void {
    if (this.disabled()) return;
    if (this.overlayRef) this.closeOverlay();
    else this.openOverlay();
  }

  // Input parsing

  private onRangeInput(event: Event, end: RangeEnd): void {
    const raw = (event.target as HTMLInputElement).value;
    (end === 0 ? this.startText : this.endText).set(raw);

    const [start, finish] = this.current();
    if (!raw) {
      this.commitRange(end === 0 ? [null, finish] : [start, null]);
      return;
    }
    const parsed = this.adapter.parse(raw, this.resolvedFormat());
    if (!parsed || !this.adapter.isValid(parsed) || this.isOutOfBounds(parsed)) return;
    this.commitRange(end === 0 ? [parsed, finish] : [start, parsed]);
  }

  // Overlay

  private openOverlay(): void {
    if (this.overlayRef) return;

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
      panelClass: 'wr-date-picker-overlay',
    });
    this.overlayOpen.set(true);

    const ref = this.overlayRef.attach(new ComponentPortal(WrDateRangePanel));
    ref.setInput('value', this.value() ?? [null, null]);
    ref.setInput('min', this.minDate());
    ref.setInput('max', this.maxDate());
    ref.setInput('dateFilter', this.dateFilter());
    ref.setInput('withTime', this.isDateTime());
    ref.setInput('timeFormat', this.timeFormat());
    ref.setInput('showSeconds', this.showSeconds());
    ref.setInput('step', this.step());
    this.panelRef.set(ref);

    ref.instance.changed.subscribe(next => {
      const committed = this.commitRange(next);
      // A complete date-only range is the end of the interaction; a datetime
      // range still needs its hours, so the panel stays put.
      if (!this.isDateTime() && committed[0] && committed[1]) this.closeOverlay();
    });

    this.overlayRef
      .outsidePointerEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (this.host.nativeElement.contains(event.target as Node)) return;
        this.closeOverlay();
      });

    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.closeOverlay();
          this.startEl().nativeElement.focus();
        }
      });
  }

  private closeOverlay(): void {
    this.dispose();
  }

  private dispose(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
    this.panelRef.set(null);
    this.overlayOpen.set(false);
  }

  // Commit

  /**
   * Normalise (swap out-of-order ends), push to the model and refresh the text
   * of whichever ends changed. Returns what was actually committed.
   */
  private commitRange(next: WrDateRange): WrDateRange {
    const normalised = this.normalise(next);
    this.lastValue = normalised;
    this.value.set(normalised);
    // Only rewrite the text of an end whose date moved out from under it —
    // otherwise a half-typed date would be reformatted on every keystroke.
    if (!this.sameDate(normalised[0], this.parseText(this.startText()))) {
      this.startText.set(this.display(normalised[0]));
    }
    if (!this.sameDate(normalised[1], this.parseText(this.endText()))) {
      this.endText.set(this.display(normalised[1]));
    }
    return normalised;
  }

  // Helpers

  private current(): WrDateRange {
    return this.value() ?? [null, null];
  }

  private display(date: Date | null): string {
    return date && this.adapter.isValid(date) ? this.adapter.format(date, this.resolvedFormat()) : '';
  }

  private parseText(raw: string): Date | null {
    if (!raw) return null;
    const parsed = this.adapter.parse(raw, this.resolvedFormat());
    return parsed && this.adapter.isValid(parsed) ? parsed : null;
  }

  /** Keep `[start, end]` in chronological order once both ends exist. */
  private normalise(range: WrDateRange): WrDateRange {
    const [start, end] = range;
    if (start && end && this.adapter.compareDate(start, end) > 0) return [end, start];
    return [start, end];
  }

  private isOutOfBounds(date: Date): boolean {
    const min = this.minDate();
    if (min && this.adapter.compareDate(date, min) < 0) return true;
    const max = this.maxDate();
    if (max && this.adapter.compareDate(date, max) > 0) return true;
    return false;
  }

  private sameDate(a: Date | null, b: Date | null): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return a.getTime() === b.getTime();
  }

  private sameRange(a: WrDateRange | null, b: WrDateRange | null): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return this.sameDate(a[0], b[0]) && this.sameDate(a[1], b[1]);
  }
}
