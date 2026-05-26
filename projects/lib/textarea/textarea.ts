/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
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
 * @see https://ngwr.dev/docs/components/textarea
 */
@Component({
  selector: 'wr-textarea',
  templateUrl: './textarea.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  /** Visible row count. @default 3 */
  readonly rows = input(3, { transform: (v: unknown): number => coerceNumberProperty(v, 3) });

  /** Allow user resize via the native handle. @default true */
  readonly resizable = input(true, { transform: coerceBooleanProperty });

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

  protected readonly classes = computed(() => {
    const parts = ['wr-textarea'];
    if (!this.resizable() || this.autosize()) parts.push('wr-textarea--no-resize');
    if (this.focused()) parts.push('wr-textarea--focused');
    if (this.effectiveDisabled()) parts.push('wr-textarea--disabled');
    return parts.join(' ');
  });

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private onChange: (value: string) => void = noop;
  private onTouched: () => void = noop;

  constructor() {
    // Autosize: re-fit whenever value or autosize toggles.
    effect(() => {
      if (!this.autosize() || !this.isBrowser) return;
      // Read `value` to register dependency
      this.value();
      requestAnimationFrame(() => this.resize());
    });
  }

  // ──────── ControlValueAccessor ────────

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

  // ──────── Template handlers ────────

  protected onInput(event: Event): void {
    const next = (event.target as HTMLTextAreaElement).value;
    this.value.set(next);
    this.onChange(next);
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.onTouched();
  }

  private resize(): void {
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
