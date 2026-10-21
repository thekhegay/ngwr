/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Command-line flags for the scripts, and the narrowing a sweep does with
 * them. Every refusal goes to stderr and exits 1: a flag that is ignored reads
 * exactly like one that was honoured.
 */

import { argv, exit } from 'node:process';
import { parseArgs } from 'node:util';

import { err } from './log/err';

type FlagValue<S> = S extends { readonly type: 'boolean' }
  ? boolean
  : S extends { readonly type: 'number' }
    ? number
    : string;

/** What a script's items are matched on: strings match themselves, anything else names its key. */
type KeyOption<T> = [T] extends [string]
  ? { readonly key?: (item: T) => string }
  : { readonly key: (item: T) => string };

export type FlagSpec =
  | { readonly type: 'boolean'; readonly default?: boolean }
  | { readonly type: 'string'; readonly default?: string }
  | { readonly type: 'number'; readonly default?: number };

/** Parsed flags: a flag with a `default` is always set, any other may be `undefined`. */
export type Flags<T extends Readonly<Record<string, FlagSpec>>> = {
  readonly [K in keyof T]: T[K] extends { readonly default: unknown } ? FlagValue<T[K]> : FlagValue<T[K]> | undefined;
};

export interface ParseFlagsOptions {
  /** Defaults to `process.argv.slice(2)`. */
  readonly args?: readonly string[];
  /** One more line printed under the usage line when the flags are refused. */
  readonly note?: string;
}

/**
 * Parses `--name`, `--name=value` and `--name value` against `spec` with
 * `node:util`'s `parseArgs`, strictly.
 *
 * Anything `spec` does not declare is refused as `Unknown option(s): …` with
 * `Usage: <usage>` under it, and so are a positional, a boolean given a value,
 * a missing value and a `number` flag whose value is not a number. A repeated
 * flag keeps its FIRST value, as the `argv.find()` this replaces did.
 */
export function parseFlags<const T extends Readonly<Record<string, FlagSpec>>>(
  usage: string,
  spec: T,
  options: ParseFlagsOptions = {}
): Flags<T> {
  // pnpm passes the `--` of `pnpm check:x -- --verbose` through; the flags after it still count.
  const args = (options.args ?? argv.slice(2)).filter(arg => arg !== '--');
  const refuse = (line: string): never => {
    err(line);
    err(`Usage: ${usage}`);
    if (options.note) err(options.note);
    return exit(1);
  };

  const config = Object.fromEntries(
    Object.entries(spec).map(([name, s]) => [
      name,
      s.type === 'boolean' ? { type: 'boolean' as const } : { type: 'string' as const, multiple: true },
    ])
  );

  const { tokens } = parseArgs({ args, options: config, strict: false, allowPositionals: true, tokens: true });
  const unknown = new Set<number>();
  for (const token of tokens) {
    if (token.kind !== 'option' || !Object.hasOwn(spec, token.name)) unknown.add(token.index);
  }
  if (unknown.size > 0) refuse(`Unknown option(s): ${[...unknown].map(i => args[i]).join(' ')}`);

  let values: Record<string, boolean | string[] | undefined>;
  try {
    values = parseArgs({ args, options: config, strict: true, allowPositionals: false }).values as typeof values;
  } catch (e) {
    return refuse((e as Error).message);
  }

  const out: Record<string, boolean | string | number | undefined> = {};
  for (const [name, s] of Object.entries(spec)) {
    const raw = values[name];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value === undefined) {
      out[name] = s.default;
    } else if (s.type === 'number') {
      const n = Number(value);
      if (Number.isNaN(n)) refuse(`--${name} takes a number, not "${String(value)}"`);
      out[name] = n;
    } else {
      out[name] = value;
    }
  }
  return out as Flags<T>;
}

/**
 * The values a `--theme=` style flag allows, narrowed to the one it names; an
 * empty or absent flag keeps them all. An unknown value exits with
 * `✘ <label>: unknown <noun> "<value>". Use a or b.`
 */
export function pickOne<T extends string>(
  all: readonly T[],
  only: string | undefined,
  label: string,
  noun: string
): readonly T[] {
  if (!only) return all;
  const picked = all.filter(value => value === only);
  if (picked.length === 0) {
    err(`\n✘ ${label}: unknown ${noun} "${only}". Use ${all.join(' or ')}.\n`);
    exit(1);
  }
  return picked;
}

export type NarrowOptions<T> = {
  /** Kept when the item's key contains it; empty or absent keeps everything. */
  readonly filter: string | undefined;
  /** At most this many targets, when above 0. */
  readonly limit?: number;
} & KeyOption<T> &
  (
    | {
        /** The script, as the refusal names it: `contrast`. */
        readonly label: string;
        /** What is being narrowed, singular: `route`. */
        readonly noun: string;
      }
    | {
        /** The refusal, whole, for a script whose wording is its own. */
        readonly message: string;
      }
  );

export interface Narrowed<T> {
  /** Every item the filter kept. */
  readonly all: readonly T[];
  /** `all`, cut to `limit`. */
  readonly targets: readonly T[];
}

/**
 * A sweep's items narrowed by a `--filter=` substring and an optional limit.
 * Nothing left exits with `✘ <label>: no <noun> matches "<filter>".`, or with
 * `message` when one is given — a sweep over nothing would print a pass.
 */
export function narrow<T>(items: readonly T[], options: NarrowOptions<T>): Narrowed<T> {
  const filter = options.filter ?? '';
  const key = (options as { readonly key?: (item: T) => string }).key ?? String;
  const all = items.filter(item => key(item).includes(filter));
  if (all.length === 0) {
    err('message' in options ? options.message : `\n✘ ${options.label}: no ${options.noun} matches "${filter}".\n`);
    exit(1);
  }
  const limit = options.limit ?? 0;
  return { all, targets: limit > 0 ? all.slice(0, limit) : all };
}
