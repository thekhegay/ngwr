/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Fixed-point value: `units / 10^scale`. */
interface Decimal {
  readonly units: bigint;
  readonly scale: number;
}

const DECIMAL_RE = /^([+-])?(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;

/** Past this an exponent is not a number anyone meant; `10n ** 10n ** 9n` would hang the tab. */
const MAX_EXPONENT = 1000;

function parse(value: unknown): Decimal | null {
  let text: string;
  if (typeof value === 'string') text = value.trim();
  else if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    text = String(value);
  } else if (typeof value === 'bigint') text = value.toString();
  else return null;

  const match = DECIMAL_RE.exec(text);
  if (!match) return null;
  const [, sign, int = '', frac = '', exp = '0'] = match;
  if (!int && !frac) return null;
  const exponent = Number(exp);
  if (Math.abs(exponent) > MAX_EXPONENT) return null;

  let units = BigInt(int + frac);
  let scale = frac.length - exponent;
  if (scale < 0) {
    units *= 10n ** BigInt(-scale);
    scale = 0;
  }
  return { units: sign === '-' ? -units : units, scale };
}

function print({ units, scale }: Decimal): string {
  const negative = units < 0n;
  const digits = (negative ? -units : units).toString().padStart(scale + 1, '0');
  const split = digits.length - scale;
  const text = scale ? `${digits.slice(0, split)}.${digits.slice(split)}` : digits;
  return negative ? `-${text}` : text;
}

function align(a: Decimal, b: Decimal): [bigint, bigint, number] {
  const scale = Math.max(a.scale, b.scale);
  return [a.units * 10n ** BigInt(scale - a.scale), b.units * 10n ** BigInt(scale - b.scale), scale];
}

/** Half away from zero, the schoolbook rule. */
function roundedQuotient(num: bigint, den: bigint): bigint {
  let q = num / den;
  const r = num % den;
  const absR = r < 0n ? -r : r;
  const absDen = den < 0n ? -den : den;
  if (absR * 2n >= absDen) q += num < 0n !== den < 0n ? -1n : 1n;
  return q;
}

function rescale(d: Decimal, decimals: number): Decimal {
  if (decimals >= d.scale) return { units: d.units * 10n ** BigInt(decimals - d.scale), scale: decimals };
  return { units: roundedQuotient(d.units, 10n ** BigInt(d.scale - decimals)), scale: decimals };
}

function isScale(decimals: number): boolean {
  return Number.isInteger(decimals) && decimals >= 0;
}

/**
 * Reads a value as an exact decimal and returns it in canonical form, or
 * `null` when it is not a number.
 *
 * Canonical is `-?\d+(\.\d+)?`: no sign on zero, no leading zeros, no bare
 * point, no exponent. Trailing fraction zeros are kept, since they are
 * precision the data carries: `'1.50'` stays `'1.50'`. A number is read from
 * its shortest round-trip form (`0.1` is `'0.1'`), so a value already in a
 * double stays what it printed as; a string is read digit for digit, so
 * `'9007199254740993.01'` survives untouched. Exponent notation is read
 * exactly: `'1e5'` is `'100000'`, `'1.5E-3'` is `'0.0015'`.
 *
 * Malformed is `''`, `'abc'`, `'1.2.3'`, `'1,5'`, `'Infinity'`, `NaN`, `null`,
 * `undefined`, anything that is not a string, number or bigint, and an
 * exponent beyond 1000. None of them throws, and none reads as zero.
 *
 * @example
 * ```ts
 * wrDecimal('00.10');  // '0.10'
 * wrDecimal(' -5. ');  // '-5'
 * wrDecimal(1e21);     // '1000000000000000000000'
 * wrDecimal('abc');    // null
 * ```
 */
export function wrDecimal(value: unknown): string | null {
  const d = parse(value);
  return d === null ? null : print(d);
}

/**
 * `a + b`, exactly. The result carries the wider scale of the two:
 * `'0.1' + '0.2'` is `'0.3'`, `'10.00' + '0.5'` is `'10.50'`. `null` when
 * either side is malformed (see {@link wrDecimal}).
 */
export function wrDecimalAdd(a: WrDecimalLike, b: WrDecimalLike): string | null {
  const x = parse(a);
  const y = parse(b);
  if (x === null || y === null) return null;
  const [ux, uy, scale] = align(x, y);
  return print({ units: ux + uy, scale });
}

/** `a - b`, exactly. The scale and the malformed rule are {@link wrDecimalAdd}'s. */
export function wrDecimalSubtract(a: WrDecimalLike, b: WrDecimalLike): string | null {
  const x = parse(a);
  const y = parse(b);
  if (x === null || y === null) return null;
  const [ux, uy, scale] = align(x, y);
  return print({ units: ux - uy, scale });
}

/**
 * `a * b`, exactly. The scales add: `'1.5' * '0.25'` is `'0.375'`,
 * `'19.99' * 3` is `'59.97'`. `null` when either side is malformed.
 */
export function wrDecimalMultiply(a: WrDecimalLike, b: WrDecimalLike): string | null {
  const x = parse(a);
  const y = parse(b);
  if (x === null || y === null) return null;
  return print({ units: x.units * y.units, scale: x.scale + y.scale });
}

/**
 * `a / b` at exactly `decimals` fraction digits, rounded half away from zero:
 * `wrDecimalDivide('10', 3, 2)` is `'3.33'`, `wrDecimalDivide('-2.5', 1, 0)`
 * is `'-3'`. `null` when a side is malformed, `b` is zero, or `decimals` is
 * not a whole number of places.
 */
export function wrDecimalDivide(a: WrDecimalLike, b: WrDecimalLike, decimals: number): string | null {
  const x = parse(a);
  const y = parse(b);
  if (x === null || y === null || y.units === 0n || !isScale(decimals)) return null;
  const num = x.units * 10n ** BigInt(y.scale + decimals);
  const den = y.units * 10n ** BigInt(x.scale);
  return print({ units: roundedQuotient(num, den), scale: decimals });
}

/**
 * Orders two decimals: `-1`, `0` or `1`, the shape `Array.prototype.sort`
 * takes. Scale does not count: `'1.50'` and `'1.5'` are `0`. `null` when
 * either side is malformed.
 */
export function wrDecimalCompare(a: WrDecimalLike, b: WrDecimalLike): -1 | 0 | 1 | null {
  const x = parse(a);
  const y = parse(b);
  if (x === null || y === null) return null;
  const [ux, uy] = align(x, y);
  return ux < uy ? -1 : ux > uy ? 1 : 0;
}

/**
 * Sets the scale to exactly `decimals` places: pads with zeros
 * (`wrDecimalRound('1.5', 2)` is `'1.50'`) or rounds half away from zero
 * (`wrDecimalRound('2.345', 2)` is `'2.35'`, `wrDecimalRound('-2.5', 0)` is
 * `'-3'`). Unlike `round` from the same entry point there is no float on the
 * way, so `'1.005'` rounds to `'1.01'` because that is what the digits say.
 * `null` when the value is malformed or `decimals` is not a whole number of
 * places.
 */
export function wrDecimalRound(value: WrDecimalLike, decimals: number): string | null {
  const d = parse(value);
  if (d === null || !isScale(decimals)) return null;
  return print(rescale(d, decimals));
}

/**
 * What the decimal helpers read: a decimal string, a finite number or a
 * bigint. `null` and `undefined` are accepted so a value can be passed
 * straight from data; they read as malformed, like any other text that is not
 * a number.
 */
export type WrDecimalLike = string | number | bigint | null | undefined;
