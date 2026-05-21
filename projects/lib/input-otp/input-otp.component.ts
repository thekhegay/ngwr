/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  forwardRef,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { noop } from 'ngwr/utils';

import type { WrInputOtpMode } from './types';

/**
 * Fixed-length one-time-code input. Renders one `<input>` per character,
 * auto-advances focus on typing, handles paste of a full code, and supports
 * masking like a password field.
 *
 * Implements `ControlValueAccessor` — emits the joined string through
 * `[(ngModel)]` / `formControl`. Emits `completed` once all cells are
 * filled (useful for auto-submission).
 *
 * @example
 * ```html
 * <wr-input-otp [(ngModel)]="code" length="6" (completed)="verify($event)" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/input-otp
 */
@Component({
  selector: 'wr-input-otp',
  templateUrl: './input-otp.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrInputOtpComponent),
      multi: true,
    },
  ],
})
export class WrInputOtpComponent implements ControlValueAccessor {
  /** Number of cells to render. Clamped to `[1, 20]`. @default 6 */
  readonly length = input(6, {
    transform: (v: unknown): number => Math.max(1, Math.min(20, coerceNumberProperty(v, 6))),
  });

  /** Character set per cell. @default 'numeric' */
  readonly mode = input<WrInputOtpMode>('numeric');

  /** Mask the typed characters like a password. @default false */
  readonly mask = input(false, { transform: coerceBooleanProperty });

  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Character shown in empty cells. @default '•' */
  readonly placeholder = input<string>('•');

  /** Fires once when every cell holds a character. */
  readonly completed = output<string>();

  protected readonly cells = signal<readonly string[]>(Array.from({ length: 6 }, () => ''));
  private readonly disabledFromCva = signal(false);

  protected readonly effectiveDisabled = computed(() => this.disabled() || this.disabledFromCva());

  protected readonly classes = computed(() => {
    const parts = ['wr-input-otp'];
    if (this.effectiveDisabled()) parts.push('wr-input-otp--disabled');
    return parts.join(' ');
  });

  protected readonly cellType = computed<'password' | 'text'>(() => (this.mask() ? 'password' : 'text'));
  protected readonly cellInputMode = computed(() => (this.mode() === 'numeric' ? 'numeric' : 'text'));

  protected readonly cellRefs = viewChildren<ElementRef<HTMLInputElement>>('cell');

  constructor() {
    // Resize the cell array whenever `length` changes — preserves existing values.
    effect(() => {
      const len = this.length();
      const current = this.cells();
      if (current.length === len) return;
      const next = Array.from({ length: len }, (_, i) => current[i] ?? '');
      this.cells.set(next);
    });
  }

  private onChange: (value: string) => void = noop;
  private onTouched: () => void = noop;

  // ──────── ControlValueAccessor ────────

  writeValue(v: string | null): void {
    const raw = (v ?? '').slice(0, this.length());
    const next = Array.from({ length: this.length() }, (_, i) => this.sanitiseChar(raw[i] ?? ''));
    this.cells.set(next);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledFromCva.set(coerceBooleanProperty(isDisabled));
  }

  // ──────── Template handlers ────────

  protected onInput(event: Event, index: number): void {
    const target = event.target as HTMLInputElement;
    const char = this.sanitiseChar(target.value.slice(-1));
    target.value = char;
    this.update(index, char);
    if (char) this.focusCell(index + 1);
  }

  protected onKeyDown(event: KeyboardEvent, index: number): void {
    const target = event.target as HTMLInputElement;
    switch (event.key) {
      case 'Backspace':
        if (target.value === '') {
          event.preventDefault();
          this.update(index - 1, '');
          this.focusCell(index - 1);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.focusCell(index - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.focusCell(index + 1);
        break;
      case 'Home':
        event.preventDefault();
        this.focusCell(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusCell(this.length() - 1);
        break;
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const chars = text
      .split('')
      .map(c => this.sanitiseChar(c))
      .filter(c => c.length > 0);
    if (chars.length === 0) return;
    const trimmed = chars.slice(0, this.length());
    const next = Array.from({ length: this.length() }, (_, i) => trimmed[i] ?? '');
    this.cells.set(next);
    this.emitChange();
    this.focusCell(Math.min(trimmed.length, this.length() - 1));
  }

  protected onBlur(): void {
    this.onTouched();
  }

  protected trackIndex(index: number): number {
    return index;
  }

  // ──────── Internals ────────

  private update(index: number, char: string): void {
    if (index < 0 || index >= this.length()) return;
    const next = [...this.cells()];
    next[index] = char;
    this.cells.set(next);
    this.emitChange();
  }

  private emitChange(): void {
    const code = this.cells().join('');
    this.onChange(code);
    if (code.length === this.length() && code.split('').every(c => c.length === 1)) {
      this.completed.emit(code);
    }
  }

  private focusCell(i: number): void {
    if (i < 0 || i >= this.length()) return;
    const el = this.cellRefs()[i]?.nativeElement;
    if (!el) return;
    el.focus();
    el.select();
  }

  /** Drop a character that doesn't match the configured mode. */
  private sanitiseChar(c: string): string {
    if (!c) return '';
    const one = c.slice(0, 1);
    switch (this.mode()) {
      case 'numeric':
        return /\d/.test(one) ? one : '';
      case 'alphanumeric':
        return /[a-zA-Z0-9]/.test(one) ? one : '';
      case 'text':
      default:
        return one;
    }
  }
}
