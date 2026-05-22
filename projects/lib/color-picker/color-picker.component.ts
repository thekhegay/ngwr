/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { noop } from 'ngwr/utils';

import { hsvToRgb, parseHex, rgbToHsv, toHex } from './color';
import type { WrColorFormat } from './types';

type Edges = 'sv' | 'hue' | 'alpha';

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Inline colour picker — HSV canvas, hue slider, optional alpha slider, HEX
 * input. Implements `ControlValueAccessor`, so it binds with `[(ngModel)]`,
 * `[formControl]`, or `formControlName`. Output is always a string in the
 * format chosen via `[format]`.
 *
 * @example
 * ```html
 * <wr-color-picker [(ngModel)]="brandColor" />
 * <wr-color-picker [(ngModel)]="brandColor" [alpha]="false" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/color-picker
 */
@Component({
  selector: 'wr-color-picker',
  templateUrl: './color-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[style.--wr-color-picker-hue]': 'hueCss()',
    '[style.--wr-color-picker-rgb]': 'rgbCss()',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrColorPickerComponent),
      multi: true,
    },
  ],
})
export class WrColorPickerComponent implements ControlValueAccessor {
  /** Render the alpha slider and emit 8-digit hex / `rgba()`. @default true */
  readonly alpha = input(true, { transform: coerceBooleanProperty });

  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Output format produced through the CVA. @default 'hex' */
  readonly format = input<WrColorFormat>('hex');

  // ──────── Source of truth: HSV + alpha ────────

  protected readonly h = signal(0);
  protected readonly s = signal(0);
  protected readonly v = signal(0);
  protected readonly a = signal(1);

  private readonly disabledFromCva = signal(false);

  protected readonly effectiveDisabled = computed(() => this.disabled() || this.disabledFromCva());

  // ──────── Derived values ────────

  private readonly rgb = computed(() => hsvToRgb({ h: this.h(), s: this.s(), v: this.v(), a: this.a() }));

  /** Canonical hex (used by the input field and by drag emits). */
  protected readonly hex = computed(() => toHex(this.rgb(), this.alpha()));

  /** SV canvas background colour (full-saturation hue). */
  protected readonly hueCss = computed(() => `hsl(${this.h()}, 100%, 50%)`);

  /** RGB string used for the alpha-slider gradient. */
  protected readonly rgbCss = computed(() => {
    const { r, g, b } = this.rgb();
    return `${r}, ${g}, ${b}`;
  });

  /** Thumb positions in % for each surface. */
  protected readonly svThumbX = computed(() => this.s() * 100);
  protected readonly svThumbY = computed(() => (1 - this.v()) * 100);
  protected readonly hueThumbX = computed(() => (this.h() / 360) * 100);
  protected readonly alphaThumbX = computed(() => this.a() * 100);

  /** Mirror of the canonical hex, edited by the user via the input field. */
  protected readonly hexInput = signal('');

  protected readonly classes = computed(() => {
    const parts = ['wr-color-picker'];
    if (this.alpha()) parts.push('wr-color-picker--alpha');
    if (this.effectiveDisabled()) parts.push('wr-color-picker--disabled');
    return parts.join(' ');
  });

  // ──────── ControlValueAccessor ────────

  private onChange: (value: string) => void = noop;
  private onTouched: () => void = noop;

  writeValue(value: string | null): void {
    const rgb = parseHex(value ?? '') ?? { r: 0, g: 0, b: 0, a: 1 };
    const hsv = rgbToHsv(rgb);
    this.h.set(hsv.h);
    this.s.set(hsv.s);
    this.v.set(hsv.v);
    this.a.set(hsv.a);
    this.hexInput.set(this.hex());
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

  // ──────── Drag handlers ────────

  protected onPointerDown(event: PointerEvent, surface: Edges): void {
    if (this.effectiveDisabled()) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    const update = (e: PointerEvent): void => this.updateFromEvent(e, target, surface);
    const cleanup = (e: PointerEvent): void => {
      target.releasePointerCapture(e.pointerId);
      target.removeEventListener('pointermove', update);
      target.removeEventListener('pointerup', cleanup);
      this.onTouched();
    };

    target.addEventListener('pointermove', update);
    target.addEventListener('pointerup', cleanup);
    this.updateFromEvent(event, target, surface);
  }

  private updateFromEvent(event: PointerEvent, target: HTMLElement, surface: Edges): void {
    const rect = target.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);

    if (surface === 'sv') {
      const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      this.s.set(x);
      this.v.set(1 - y);
    } else if (surface === 'hue') {
      this.h.set(x * 360);
    } else {
      this.a.set(x);
    }
    this.emit();
  }

  // ──────── Hex input handlers ────────

  protected onHexInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.hexInput.set(raw);
    const rgb = parseHex(raw);
    if (!rgb) return;
    const hsv = rgbToHsv(rgb);
    this.h.set(hsv.h);
    this.s.set(hsv.s);
    this.v.set(hsv.v);
    this.a.set(hsv.a);
    this.emitWithoutHexSync();
  }

  protected onHexBlur(): void {
    // Re-sync the input with the canonical value (in case the user typed invalid).
    this.hexInput.set(this.hex());
    this.onTouched();
  }

  // ──────── Emission ────────

  private emit(): void {
    this.emitWithoutHexSync();
    this.hexInput.set(this.hex());
  }

  private emitWithoutHexSync(): void {
    this.onChange(this.hex());
  }
}
