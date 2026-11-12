/** Word forms keyed by CLDR plural category. Only `other` is required. */
type WrPluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { readonly other: string };

interface WrPluralOptions {
  /** Prefix the formatted count before the word. @default true */
  readonly includeValue?: boolean;
  /** Locale override; defaults to Angular's `LOCALE_ID`. */
  readonly locale?: string;
}

/** Built-in style shortcuts — pick a sensible `Intl.NumberFormat` preset by name. */
type WrNumberStyle = 'decimal' | 'percent' | 'currency';

/**
 * How `wrDuration` writes a span: digits and colons (`1:30:00`), units
 * (`1 hr 30 min`), or a timer's fixed `HH:mm:ss` (`01:30:00`).
 */
type WrDurationStyle = 'clock' | 'units' | 'timer';

/** The units a span of milliseconds splits into, largest first. */
type WrDurationUnit = 'day' | 'hour' | 'minute' | 'second' | 'millisecond';

export type { WrPluralForms, WrPluralOptions, WrNumberStyle, WrDurationStyle, WrDurationUnit };
