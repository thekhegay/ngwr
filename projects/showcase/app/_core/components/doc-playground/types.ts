import type { WritableSignal } from '@angular/core';

/** Common fields on every control chip. */
interface ControlBase {
  /** Visible label on the chip. */
  readonly label: string;
}

/** Dropdown bound to a string signal. */
export interface DocSelectControl<T extends string = string> extends ControlBase {
  readonly kind: 'select';
  readonly signal: WritableSignal<T>;
  readonly options: readonly T[];
}

/** Range slider bound to a number signal. */
export interface DocSliderControl extends ControlBase {
  readonly kind: 'slider';
  readonly signal: WritableSignal<number>;
  readonly min: number;
  readonly max: number;
  /** @default 1 (or 0.1 if `precision > 0`) */
  readonly step?: number;
  /** Suffix shown after the value — `'s'`, `'ms'`, `'°'`, `'px'`. */
  readonly unit?: string;
  /** Decimal places when rendering the value. @default 0 */
  readonly precision?: number;
}

/** Pill switch bound to a boolean signal. */
export interface DocToggleControl extends ControlBase {
  readonly kind: 'toggle';
  readonly signal: WritableSignal<boolean>;
}

/** Free-text input bound to a string signal. */
export interface DocTextControl extends ControlBase {
  readonly kind: 'text';
  readonly signal: WritableSignal<string>;
  readonly placeholder?: string;
}

/** Union of all control descriptors a `<ngwr-doc-playground>` can render. */
export type DocControl = DocSelectControl | DocSliderControl | DocToggleControl | DocTextControl;
