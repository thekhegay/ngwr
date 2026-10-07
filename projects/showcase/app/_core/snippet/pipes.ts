import type { SelectorRef } from '#core/generated/selectors';

/**
 * Pipes a snippet may reach for, keyed by the name that appears after the `|`.
 *
 * Hand-written, and the reason is worth recording: `SELECTORS` is generated
 * from `@Component` / `@Directive` only, so a `@Pipe` is invisible to it. That
 * makes this the one table in the sandbox that can drift — a renamed pipe
 * shows up as an unresolved name and drops the snippet to the source fallback,
 * which is the safe direction to fail, but it is still a silent downgrade.
 * There are eight pipes in `projects/lib` (`grep -rn '@Pipe({' projects/lib`);
 * if that count moves, this list has to move with it.
 */
const NGWR_PIPES: Readonly<Record<string, SelectorRef>> = {
  wrBytes: { symbol: 'WrBytes', path: 'ngwr/pipes' },
  wrDate: { symbol: 'WrDate', path: 'ngwr/pipes' },
  wrMark: { symbol: 'WrMark', path: 'ngwr/pipes' },
  wrNumber: { symbol: 'WrNumber', path: 'ngwr/pipes' },
  wrPlural: { symbol: 'WrPlural', path: 'ngwr/pipes' },
  wrRange: { symbol: 'WrRange', path: 'ngwr/pipes' },
  wrTruncate: { symbol: 'WrTruncate', path: 'ngwr/pipes' },
  wrT: { symbol: 'WrTPipe', path: 'ngwr/i18n' },
};

/**
 * The `@angular/common` pipes, which are stable public Angular API and so
 * cannot drift the way the ngwr table above can.
 */
const COMMON_PIPES: Readonly<Record<string, SelectorRef>> = {
  async: { symbol: 'AsyncPipe', path: '@angular/common' },
  currency: { symbol: 'CurrencyPipe', path: '@angular/common' },
  date: { symbol: 'DatePipe', path: '@angular/common' },
  json: { symbol: 'JsonPipe', path: '@angular/common' },
  keyvalue: { symbol: 'KeyValuePipe', path: '@angular/common' },
  lowercase: { symbol: 'LowerCasePipe', path: '@angular/common' },
  number: { symbol: 'DecimalPipe', path: '@angular/common' },
  percent: { symbol: 'PercentPipe', path: '@angular/common' },
  slice: { symbol: 'SlicePipe', path: '@angular/common' },
  titlecase: { symbol: 'TitleCasePipe', path: '@angular/common' },
  uppercase: { symbol: 'UpperCasePipe', path: '@angular/common' },
};

const PIPES: Readonly<Record<string, SelectorRef>> = { ...COMMON_PIPES, ...NGWR_PIPES };

export { PIPES };
