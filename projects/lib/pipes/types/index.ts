import type { WrParseDateOptions } from 'ngwr/date';

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
 * What `wrList` joins with: "and" (`conjunction`), "or" (`disjunction`), or
 * neither, for a compound unit such as `5 kg, 200 g` (`unit`).
 */
type WrListType = 'conjunction' | 'disjunction' | 'unit';

/**
 * Options of `wrRelativeTime` and `wrFormatRelativeTime`. The keys of
 * `WrParseDateOptions` say how the value is read, as the last argument of
 * `wrFormatDate` does: `epochUnit` for a number, `zonelessIn` and `timeZone`
 * for a date-time string with no offset.
 */
interface WrRelativeTimeOptions extends WrParseDateOptions {
  /** The instant the value is measured from: a `Date` or epoch milliseconds. @default the current time */
  readonly now?: Date | number;
  /** `'auto'` lets the language say "yesterday", "tomorrow" and "now"; `'always'` keeps the number. @default 'auto' */
  readonly numeric?: Intl.RelativeTimeFormatNumeric;
  /** How much of the unit is written: "5 minutes ago", "5 min. ago", "5m ago". @default 'long' */
  readonly style?: Intl.RelativeTimeFormatStyle;
}

/**
 * How `wrDuration` writes a span: digits and colons (`1:30:00`), units
 * (`1 hr 30 min`), or a timer's fixed `HH:mm:ss` (`01:30:00`).
 */
type WrDurationStyle = 'clock' | 'units' | 'timer';

/** The units a span of milliseconds splits into, largest first. */
type WrDurationUnit = 'day' | 'hour' | 'minute' | 'second' | 'millisecond';

export type {
  WrPluralForms,
  WrPluralOptions,
  WrListType,
  WrNumberStyle,
  WrRelativeTimeOptions,
  WrDurationStyle,
  WrDurationUnit,
};
