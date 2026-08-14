/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { DecimalPipe } from '@angular/common';
import { Component, ViewEncapsulation, computed, effect, input, model, output, signal } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';
import { clamp } from 'ngwr/utils';

import {
  formatColor,
  hslToRgb,
  hsvToRgb,
  parseColor,
  parseHex,
  rgbToHsl,
  rgbToHsv,
  toHex,
  type WrHsl,
  type WrRgb,
} from './color';
import type { WrColorFormat } from './interfaces';

type Tab = 'hex' | 'rgb' | 'hsl';

type Edges = 'sv' | 'hue' | 'alpha';

/** Whether a hex string carries its own alpha (`#rgba` or `#rrggbbaa`). */
function hasAlphaDigits(hex: string): boolean {
  const digits = hex.trim().replace(/^#/, '').length;
  return digits === 4 || digits === 8;
}

/**
 * Inline colour picker — HSV canvas, hue slider, optional alpha slider, HEX
 * input.
 *
 * A signal-forms native control: it implements `FormValueControl<string>`, so
 * `[formField]` binds straight to its `value` model — no
 * `ControlValueAccessor` in between. `[(value)]` works standalone. Output is
 * always a hex string.
 *
 * @example
 * ```html
 * <!-- signal forms -->
 * <wr-color-picker [formField]="form.brandColor" />
 *
 * <!-- standalone two-way binding -->
 * <wr-color-picker [(value)]="brandColor" [alpha]="false" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/color-picker
 */
@Component({
  selector: 'wr-color-picker',
  templateUrl: './color-picker.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[style.--wr-color-picker-hue]': 'hueCss()',
    '[style.--wr-color-picker-rgb]': 'rgbCss()',
  },
  imports: [DecimalPipe, WrSegmented],
})
export class WrColorPicker implements FormValueControl<string> {
  /** Render the alpha slider and emit 8-digit hex / `rgba()`. @default true */
  readonly alpha = input(true, { transform: coerceBooleanProperty });

  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Format the control writes into `value`. See {@link WrColorFormat} — all
   * three are accepted on the way in whichever one is set. @default 'hex'
   */
  readonly format = input<WrColorFormat>('hex');

  /** Preset hex colours rendered as a clickable row beneath the inputs. Empty = no row. @default [] */
  readonly swatches = input<readonly string[]>([]);

  /** The selected colour as a string. Bound by `[formField]`, or two-way via `[(value)]`. */
  readonly value = model<string>('');

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  // Source of truth: HSV + alpha

  protected readonly h = signal(0);
  protected readonly s = signal(0);
  protected readonly v = signal(0);
  protected readonly a = signal(1);

  // Derived values

  /** RGB view of the current colour, computed lazily. */
  protected readonly rgb = computed<WrRgb>(() => hsvToRgb({ h: this.h(), s: this.s(), v: this.v(), a: this.a() }));

  /** Canonical hex — what the HEX field shows, whatever `format` emits. */
  protected readonly hex = computed(() => toHex(this.rgb(), this.alpha()));

  /** The colour as the consumer asked for it; this is what `value` receives. */
  protected readonly formatted = computed(() => formatColor(this.rgb(), this.format(), this.alpha()));

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

  /** Active tab in the input switcher. */
  protected readonly activeTab = signal<Tab>('hex');

  /** HSL view of the current colour, computed lazily. */
  protected readonly hslView = computed<WrHsl>(() => rgbToHsl(this.rgb()));

  /** Alpha as integer percent for display in numeric tabs. */
  protected readonly alphaPercent = computed(() => Math.round(this.a() * 100));

  protected readonly tabOptions: readonly WrSegmentedOption<Tab>[] = [
    { value: 'hex', label: 'HEX' },
    { value: 'rgb', label: 'RGB' },
    { value: 'hsl', label: 'HSL' },
  ];

  protected readonly classes = computed(() => {
    const parts = ['wr-color-picker'];
    if (this.alpha()) parts.push('wr-color-picker--alpha');
    if (this.disabled()) parts.push('wr-color-picker--disabled');
    return parts.join(' ');
  });

  /**
   * The one write we just made, held only until the sync effect has seen it.
   *
   * It exists so a drag keeps its continuous HSV values instead of being
   * re-quantised through its own hex round-trip. It used to be set and never
   * cleared, which turned "ignore this write" into "ignore this STRING,
   * forever": after the picker emitted `#ff0000` once, an app writing
   * `#ff0000` back — a reset button, a form patch, an undo — was silently
   * dropped for the rest of the component's life, and the surface kept
   * whatever colour the user had dragged to.
   */
  private lastEmitted: string | null = null;

  constructor() {
    // External writes (via `[formField]` / `[(value)]`) flow the incoming hex
    // string back into the HSV source of truth. Our own emits are skipped via
    // `lastEmitted` so dragging keeps its continuous (unquantised) values.
    effect(() => {
      const value = this.value();
      if (value === this.lastEmitted) {
        // Ours, and now observed. Release the guard so the NEXT write of the
        // same string — which can only come from outside — is honoured.
        this.lastEmitted = null;
        return;
      }
      const rgb = parseColor(value) ?? { r: 0, g: 0, b: 0, a: 1 };
      const hsv = rgbToHsv(rgb);
      this.h.set(hsv.h);
      this.s.set(hsv.s);
      this.v.set(hsv.v);
      this.a.set(hsv.a);
      this.hexInput.set(toHex(rgb, this.alpha()));
    });
  }

  // Drag handlers

  protected onPointerDown(event: PointerEvent, surface: Edges): void {
    if (this.disabled()) return;
    // Primary button, primary pointer: a right-click used to open the context
    // menu AND start a drag, and a second finger used to fight the first one.
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    const update = (e: PointerEvent): void => this.updateFromEvent(e, target, surface);
    const cleanup = (e: PointerEvent): void => {
      target.releasePointerCapture(e.pointerId);
      target.removeEventListener('pointermove', update);
      target.removeEventListener('pointerup', cleanup);
      target.removeEventListener('pointercancel', cleanup);
      this.touch.emit();
    };

    target.addEventListener('pointermove', update);
    target.addEventListener('pointerup', cleanup);
    // `pointercancel` never sends a `pointerup` after it, so without this the
    // move listener outlived the drag: a cancelled gesture left the surface
    // repainting the colour under a pointer that was only hovering.
    target.addEventListener('pointercancel', cleanup);
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

  // Hex input handlers

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
    this.touch.emit();
  }

  // Emission

  private emit(): void {
    this.emitWithoutHexSync();
    this.hexInput.set(this.hex());
  }

  private emitWithoutHexSync(): void {
    const next = this.formatted();
    this.lastEmitted = next;
    this.value.set(next);
  }

  // Tab + channel handlers

  protected onTabChange(tab: Tab | null): void {
    if (tab) this.activeTab.set(tab);
  }

  protected onRgbChannel(channel: 'r' | 'g' | 'b', event: Event): void {
    const n = clamp(Number((event.target as HTMLInputElement).value), 0, 255);
    if (Number.isNaN(n)) return;
    const current = this.rgb();
    const next: WrRgb = { ...current, [channel]: n };
    this.applyRgb(next);
  }

  protected onHslChannel(channel: 'h' | 's' | 'l', event: Event): void {
    const n = Number((event.target as HTMLInputElement).value);
    if (Number.isNaN(n)) return;
    const current = this.hslView();
    const next: WrHsl =
      channel === 'h' ? { ...current, h: clamp(n, 0, 360) } : { ...current, [channel]: clamp(n, 0, 100) / 100 };
    this.applyRgb(hslToRgb(next));
  }

  protected onAlphaPercent(event: Event): void {
    const n = clamp(Number((event.target as HTMLInputElement).value), 0, 100);
    if (Number.isNaN(n)) return;
    this.a.set(n / 100);
    this.emit();
  }

  protected onSwatchClick(hex: string): void {
    if (this.disabled()) return;
    const rgb = parseHex(hex);
    if (!rgb) return;
    // A 6-digit swatch says nothing about alpha, and `parseHex` reports the
    // absence as `1` — so picking a preset used to silently snap a translucent
    // colour back to fully opaque.
    this.applyRgb(hasAlphaDigits(hex) ? rgb : { ...rgb, a: this.a() });
  }

  /** Push an RGB triple into the HSV source of truth. */
  private applyRgb(rgb: WrRgb): void {
    const hsv = rgbToHsv(rgb);
    this.h.set(hsv.h);
    this.s.set(hsv.s);
    this.v.set(hsv.v);
    this.a.set(hsv.a);
    this.emit();
  }
}
