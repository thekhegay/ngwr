/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { noop } from 'ngwr/utils';

/**
 * Multi-line text input.
 *
 * Implements `ControlValueAccessor`. Optional `autosize` grows the
 * textarea with its content, capped at `maxRows` if provided.
 *
 * @example
 * ```html
 * <wr-textarea placeholder="Notes" [(ngModel)]="text" />
 * <wr-textarea autosize [maxRows]="6" [(ngModel)]="text" />
 * ```
 *
 * @see https://ngwr.dev/components/textarea
 */
export type WrTextareaSize = 'sm' | 'md' | 'lg';

export type WrTextareaResize = 'none' | 'vertical' | 'horizontal' | 'both';

@Component({
  selector: 'wr-textarea',
  templateUrl: './textarea.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrTextarea),
      multi: true,
    },
  ],
})
export class WrTextarea implements ControlValueAccessor {
  /** Native placeholder text. @default '' */
  readonly placeholder = input<string>('');

  /** Control size — shares the `--wr-control-*` contract. @default 'md' */
  readonly size = input<WrTextareaSize>('md');

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
   * Disable the textarea. Also set by Angular forms via `setDisabledState`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  protected readonly value = signal<string>('');
  protected readonly disabledFromCva = signal(false);
  protected readonly focused = signal(false);

  protected readonly effectiveDisabled = computed(() => this.disabled() || this.disabledFromCva());

  protected readonly native = viewChild.required<ElementRef<HTMLTextAreaElement>>('native');

  /** Resize direction, gated by `resizable` (false → 'none'). */
  protected readonly effectiveResize = computed<WrTextareaResize>(() => (this.resizable() ? this.resize() : 'none'));

  protected readonly classes = computed(() => {
    const parts = ['wr-textarea'];
    const size = this.size();
    if (size !== 'md') parts.push(`wr-textarea--${size}`);
    if (this.autosize()) parts.push('wr-textarea--no-resize');
    const resize = this.effectiveResize();
    if (resize === 'horizontal' || resize === 'both') parts.push('wr-textarea--resize-x');
    if (this.focused()) parts.push('wr-textarea--focused');
    if (this.effectiveDisabled()) parts.push('wr-textarea--disabled');
    return parts.join(' ');
  });

  /** Show the corner grip (hidden when direction is 'none' / autosize / disabled). */
  protected readonly showHandle = computed(
    () => this.effectiveResize() !== 'none' && !this.autosize() && !this.effectiveDisabled()
  );

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  private onChange: (value: string) => void = noop;
  private onTouched: () => void = noop;

  // Custom resize-grip drag state (replaces the native corner handle).
  private resizing = false;
  private resizeStartY = 0;
  private resizeStartX = 0;
  private resizeStartHeight = 0;
  private resizeStartWidth = 0;
  private resizeMinHeight = 36;
  private resizeMaxWidth = Number.POSITIVE_INFINITY;

  constructor() {
    // Autosize: re-fit whenever value or autosize toggles.
    effect(() => {
      if (!this.autosize() || !this.isBrowser) return;
      // Read `value` to register dependency
      this.value();
      requestAnimationFrame(() => this.autofit());
    });
  }

  // ControlValueAccessor

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledFromCva.set(isDisabled);
  }

  // Template handlers

  protected onInput(event: Event): void {
    const next = (event.target as HTMLTextAreaElement).value;
    this.value.set(next);
    this.onChange(next);
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.onTouched();
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
      const w = Math.min(
        this.resizeMaxWidth,
        Math.max(64, this.resizeStartWidth + (event.clientX - this.resizeStartX))
      );
      this.hostEl.nativeElement.style.width = `${w}px`;
    }
  }

  protected endResize(event: PointerEvent): void {
    if (!this.resizing) return;
    this.resizing = false;
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
  }

  private autofit(): void {
    const el = this.native()?.nativeElement;
    if (!el) return;

    el.style.height = 'auto';

    const maxRows = this.maxRows();
    if (maxRows && maxRows > 0) {
      const cs = getComputedStyle(el);
      const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      const cap = lineHeight * maxRows;
      const next = Math.min(el.scrollHeight, cap);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > cap ? 'auto' : 'hidden';
    } else {
      el.style.height = `${el.scrollHeight}px`;
      el.style.overflowY = 'hidden';
    }
  }
}
