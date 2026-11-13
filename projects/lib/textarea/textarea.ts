/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { WR_FORM_FIELD, useFormFieldAria } from 'ngwr/form';
import { useI18nText } from 'ngwr/i18n';
import { WrSpinner } from 'ngwr/spinner';
import { wrCheckStyles } from 'ngwr/utils';

/**
 * Multi-line text input.
 *
 * A signal-forms native control: it implements `FormValueControl<string>`, so
 * `[formField]` binds straight to its `value` model — no
 * `ControlValueAccessor` in between. `[(value)]` works standalone.
 *
 * Optional `autosize` grows the textarea with its content, capped at
 * `maxRows` if provided.
 *
 * @example
 * ```html
 * <!-- signal forms -->
 * <wr-textarea placeholder="Notes" [formField]="form.notes" />
 *
 * <!-- standalone two-way binding -->
 * <wr-textarea autosize [maxRows]="6" [(value)]="text" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/textarea
 */
export type WrTextareaSize = 'sm' | 'md' | 'lg';

export type WrTextareaResize = 'none' | 'vertical' | 'horizontal' | 'both';

@Component({
  selector: 'wr-textarea',
  templateUrl: './textarea.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-textarea', '[class]': 'classes()' },
  imports: [WrSpinner],
})
export class WrTextarea implements FormValueControl<string> {
  /** Native placeholder text. @default '' */
  readonly placeholder = input<string>('');

  /**
   * Accessible name for the field. Falls back to the placeholder — the native
   * `<textarea>` lives inside the component, so a `<label for>` outside cannot
   * reach it.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = computed(() => {
    // Not `??`: an empty placeholder is no name at all, so it must fall through.
    const explicit = this.ariaLabel();
    if (explicit) return explicit;
    const placeholder = this.placeholder();
    return placeholder ? placeholder : null;
  });

  /** Control size — shares the `--wr-control-*` contract. @default 'md' */
  readonly size = input<WrTextareaSize>('md');

  /**
   * Round the corners to match a row of pill fields. The radius stops at half
   * the height of a one-row field, so a taller box keeps straight sides.
   * @default false
   */
  readonly rounded = input(false, { transform: coerceBooleanProperty });

  /** Visible row count. @default 3 */
  readonly rows = input(3, { transform: (v: unknown): number => coerceNumberProperty(v, 3) });

  /** Allow user resize via the corner grip. @default true */
  readonly resizable = input(true, { transform: coerceBooleanProperty });

  /** Resize direction of the corner grip (the grip icon adapts). @default 'vertical' */
  readonly resize = input<WrTextareaResize>('vertical');

  /** Read-only state. @default false */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  /** Grow the textarea to fit its content. @default false */
  readonly autosize = input(false, { transform: coerceBooleanProperty });

  /** Cap autosize at this many rows. Ignored when `autosize` is false. */
  readonly maxRows = input<number | null>(null);

  /**
   * Show a clear (×) button while the field holds text and is neither disabled
   * nor read-only. Clearing sets `value` to `''`, emits `touch` and puts focus
   * back in the field. It is a pointer control: from the keyboard, emptying the
   * field clears the value. @default false
   */
  readonly clearable = input(false, { transform: coerceBooleanProperty });

  /** Clear (×) button aria-label. Falls back to `common.clear`. */
  readonly clearLabel = input<string | null>(null);

  protected readonly resolvedClear = useI18nText(this.clearLabel, 'common.clear', 'Clear');

  /**
   * Show a spinner in the field's corner and mark the field `aria-busy`. The
   * field stays editable. @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /**
   * Disable the textarea. Bound automatically from the field's disabled state
   * when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** The edited text. Bound by `[formField]`, or two-way via `[(value)]`. */
  readonly value = model<string>('');

  /** Emitted on blur, and by the clear (×) button, so a bound field can mark itself touched. */
  readonly touch = output<void>();

  protected readonly clearShown = computed(
    () => this.clearable() && this.value() !== '' && !this.disabled() && !this.readonly()
  );

  protected readonly focused = signal(false);

  protected readonly native = viewChild.required<ElementRef<HTMLTextAreaElement>>('native');

  /** Resize direction, gated by `resizable` (false → 'none'). */
  protected readonly effectiveResize = computed<WrTextareaResize>(() => (this.resizable() ? this.resize() : 'none'));

  /** The surrounding `<wr-form-field>`'s error state. @internal */
  protected readonly fieldAria = useFormFieldAria();
  /**
   * The field's own label, when it renders one — `null` otherwise, and `null`
   * when `[ariaLabel]` was set deliberately.
   *
   * `aria-label` outranks a `<label for>` in the accname order, so a control
   * inside `<wr-form-field label="Delivery notes">` with a placeholder of its
   * own announced the PLACEHOLDER and the visible label reached nobody.
   * Nothing catches it: the control has a name, so axe is satisfied, and the
   * name is plausible, so a reader is too — it fails WCAG 2.5.3, where the
   * visible label has to be IN the accessible name.
   */
  protected readonly labelledBy = computed(() => (this.ariaLabel() ? null : this.fieldAria.labelledBy()));

  /** `null` once `aria-labelledby` is carrying the name — see {@link labelledBy}. */
  protected readonly nameLabel = computed(() => (this.labelledBy() ? null : this.resolvedAriaLabel()));

  private readonly field = inject(WR_FORM_FIELD, { optional: true });

  /**
   * Id the surrounding `<wr-form-field>`'s `<label for>` points at.
   *
   * The field renders its label before it can see what was projected into it, so
   * the id travels the other way and the control adopts it, exactly as
   * `[wrInput]` and `wr-select` do. Without it the `for` named an element that
   * was nowhere in the document: clicking the label did nothing, and the field
   * was, to a screen reader, an unlabelled block.
   *
   * It lands on the native `<textarea>` rather than on the host, because only a
   * labelable element can be a label's target and `<wr-textarea>` is not one.
   *
   * What it does NOT change is the NAME: `aria-label` outranks a `<label>` in
   * the accname order and `resolvedAriaLabel()` still wins, the same call
   * `wr-select` and `wr-slider` make — the field renders a label only when its
   * `label` input is set, so it cannot promise a name to fall back on. Set
   * `[ariaLabel]` to the field's label where the two should read alike.
   */
  protected readonly controlId = computed(() => this.field?.controlId() ?? null);

  protected readonly classes = computed(() => {
    const parts: string[] = [];
    const size = this.size();
    if (size !== 'md') parts.push(`wr-textarea--${size}`);
    if (this.rounded()) parts.push('wr-textarea--rounded');
    if (this.autosize()) parts.push('wr-textarea--no-resize');
    const resize = this.effectiveResize();
    if (resize === 'horizontal' || resize === 'both') parts.push('wr-textarea--resize-x');
    if (this.focused()) parts.push('wr-textarea--focused');
    if (this.disabled()) parts.push('wr-textarea--disabled');
    // Read-only has to LOOK different, or it is a box that silently refuses
    // what is typed into it. `readonly` reached the native element and
    // produced no class and no rule, so a read-only textarea was identical to
    // an editable one: same fill, same border, same text cursor. The library's
    // own contract for a value control is a `wr-<x>--readonly` class with a
    // non-editable cue, which `.wr-input[readonly]` already draws.
    if (this.readonly()) parts.push('wr-textarea--readonly');
    if (this.clearable()) parts.push('wr-textarea--clearable');
    if (this.loading()) parts.push('wr-textarea--loading');
    return parts.join(' ');
  });

  /** Show the corner grip (hidden when direction is 'none' / autosize / disabled). */
  protected readonly showHandle = computed(
    () => this.effectiveResize() !== 'none' && !this.autosize() && !this.disabled()
  );

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Ambient reading direction, read by the horizontal half of the resize drag.
   *
   * Optional so a bare `TestBed` — or any consumer that never set a direction —
   * needs no provider; `Directionality` is root-provided, so `null` only ever
   * means "nobody asked", which is LTR. Read inside the handler rather than
   * cached, so a runtime flip needs no subscription to `Directionality.change`.
   */
  private readonly dir = inject(Directionality, { optional: true });

  // Custom resize-grip drag state (replaces the native corner handle).
  private resizing = false;
  private resizeStartY = 0;
  private resizeStartX = 0;
  private resizeStartHeight = 0;
  private resizeStartWidth = 0;
  private resizeMinHeight = 36;
  private resizeMaxWidth = Number.POSITIVE_INFINITY;

  /** The pending autosize frame, `0` when none. */
  private frame = 0;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('textarea');
    effect(onCleanup => {
      if (!this.isBrowser || !this.autosize()) return;
      const el = this.native().nativeElement;
      // Width only: the height written by the fit must not call it back. It
      // also fires when a hidden field is shown, which a fit skipped until then.
      let width = -1;
      const observer =
        typeof ResizeObserver === 'undefined'
          ? null
          : new ResizeObserver(([entry]) => {
              if (entry.contentRect.width === width) return;
              width = entry.contentRect.width;
              this.scheduleFit();
            });
      observer?.observe(el);
      onCleanup(() => {
        observer?.disconnect();
        cancelAnimationFrame(this.frame);
        this.frame = 0;
        // Hand the height back. Left behind, the field stays frozen at whatever
        // was last fitted and `rows` silently stops meaning anything, which reads
        // as the input having done nothing.
        el.style.height = '';
        el.style.overflowY = '';
      });
    });
    effect(() => {
      if (!this.isBrowser || !this.autosize()) return;
      this.value();
      this.rows();
      this.maxRows();
      this.scheduleFit();
    });
  }

  /**
   * Focus the textarea — what Signal Forms calls to focus this control. The
   * native `<textarea>` takes it, since the host has no tab stop of its own; a
   * disabled one refuses, as a disabled `<textarea>` always does.
   */
  focus(options?: FocusOptions): void {
    this.native().nativeElement.focus(options);
  }

  // Template handlers

  /** The clear (×) button: the same write an emptied field makes. */
  protected clear(): void {
    if (this.disabled() || this.readonly()) return;
    this.value.set('');
    this.native().nativeElement.focus();
    this.touch.emit();
  }

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLTextAreaElement).value);
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.touch.emit();
  }

  // Custom resize — drag the corner grip; direction comes from `effectiveResize`.
  // Pointer capture keeps move/up on the grip even when the cursor leaves it.
  protected startResize(event: PointerEvent): void {
    const el = this.native()?.nativeElement;
    if (!el) return;
    const host = this.hostEl.nativeElement;
    this.resizing = true;
    this.resizeStartY = event.clientY;
    this.resizeStartX = event.clientX;
    this.resizeStartHeight = el.offsetHeight;
    this.resizeStartWidth = host.offsetWidth;
    // Height floor = fits the current content, so shrinking never opens an
    // overflow scrollbar. Measured once, synchronously (no paint between).
    const borderY = el.offsetHeight - el.clientHeight;
    const prevHeight = el.style.height;
    el.style.height = 'auto';
    this.resizeMinHeight = el.scrollHeight + borderY;
    el.style.height = prevHeight;
    // Width ceiling = parent inner width, so horizontal drag can't overflow.
    this.resizeMaxWidth = host.parentElement?.clientWidth ?? Number.POSITIVE_INFINITY;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  protected onResize(event: PointerEvent): void {
    if (!this.resizing) return;
    const el = this.native()?.nativeElement;
    if (!el) return;
    const dir = this.effectiveResize();
    if (dir === 'vertical' || dir === 'both') {
      const h = Math.max(this.resizeMinHeight, this.resizeStartHeight + (event.clientY - this.resizeStartY));
      el.style.height = `${h}px`;
    }
    if (dir === 'horizontal' || dir === 'both') {
      // The grip sits at the field's INLINE END — physically bottom-right in LTR,
      // bottom-left in RTL, where a block-level box grows because it is anchored
      // at the right edge of its containing block. So the pointer's physical
      // delta means "wider" in one direction and "narrower" in the other, and the
      // sign has to follow the reading direction. It did not, so under `dir="rtl"`
      // the grip sat on the corner the box does NOT extend toward and dragging it
      // outward shrank the field.
      const dx = event.clientX - this.resizeStartX;
      const inline = this.dir?.value === 'rtl' ? -dx : dx;
      const w = Math.min(this.resizeMaxWidth, Math.max(64, this.resizeStartWidth + inline));
      this.hostEl.nativeElement.style.width = `${w}px`;
    }
  }

  protected endResize(event: PointerEvent): void {
    if (!this.resizing) return;
    this.resizing = false;
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
  }

  private scheduleFit(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.autofit();
    });
  }

  private autofit(): void {
    const el = this.native()?.nativeElement;
    if (!el) return;
    // A frame can outlive the reason it was scheduled: toggling `autosize` off
    // between the effect and the frame would otherwise fit a height nobody asked
    // for, and `releaseHeight` has already run by then.
    if (!this.autosize()) return;
    // Not rendered (an ancestor is `display: none`): there is nothing to measure,
    // and a height written now would collapse the field to its borders.
    if (!el.clientWidth || !el.scrollHeight) return;
    el.style.height = 'auto';

    // `scrollHeight` is the content PLUS the vertical padding, and the height it is
    // turned into has to be in the box the field is sized by. The cap was the rows
    // alone, compared against that padded figure — so `maxRows="6"` on a field with
    // 8px of padding a side stopped at 5.2 rows, the top one half cut off.
    const cs = getComputedStyle(el);
    const paddingY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const borderY = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
    const toHeight = (scroll: number): number =>
      cs.boxSizing === 'border-box' ? scroll + borderY : Math.max(0, scroll - paddingY);

    const maxRows = this.maxRows();
    if (maxRows && maxRows > 0) {
      const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      const cap = lineHeight * maxRows + paddingY;
      el.style.height = `${toHeight(Math.min(el.scrollHeight, cap))}px`;
      el.style.overflowY = el.scrollHeight > cap ? 'auto' : 'hidden';
    } else {
      el.style.height = `${toHeight(el.scrollHeight)}px`;
      el.style.overflowY = 'hidden';
    }
  }
}
