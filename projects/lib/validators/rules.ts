/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  type LogicFn,
  type PathKind,
  type SchemaPath,
  type SchemaPathRules,
  required,
  requiredError,
  validate,
} from '@angular/forms/signals';

function messageOf<TContext>(
  message: string | ((ctx: TContext) => string) | undefined,
  ctx: TContext
): string | undefined {
  return typeof message === 'function' ? message(ctx) : message;
}

/** What both rules accept, shaped like the options of Angular's own Signal Forms rules. */
export interface WrRuleOptions<TValue, TPathKind extends PathKind = PathKind.Root> {
  /** The sentence the error carries. With none, the error has a `kind` only and the app words it. */
  readonly message?: string | LogicFn<TValue, string, TPathKind>;
  /** The rule applies only while this returns `true`. */
  readonly when?: LogicFn<TValue, boolean, TPathKind>;
}

/**
 * Signal Forms rule: the value at `path` must equal the value at `otherPath`,
 * such as a password confirmation. The counterpart of `WrValidators.match`.
 *
 * The error is `{ kind: 'match', target }`, where `target` is the other field's
 * key, so one `validation.match` entry answers both forms flavours. It is
 * re-evaluated when either value changes.
 *
 * Silent while `path` is empty (`''`, `null` or `undefined`), the way Angular's
 * own `minLength` and `pattern` are: add `required` to refuse an empty value.
 * Values are compared with `===`.
 *
 * @example
 * ```ts
 * form(model, path => {
 *   required(path.confirm);
 *   wrMatches(path.confirm, path.password);
 * });
 * ```
 */
export function wrMatches<TValue, TPathKind extends PathKind = PathKind.Root>(
  path: SchemaPath<TValue, SchemaPathRules.Supported, TPathKind>,
  otherPath: SchemaPath<NoInfer<TValue>, SchemaPathRules, PathKind.Child>,
  options?: WrRuleOptions<TValue, TPathKind>
): void {
  validate(path, ctx => {
    const value = ctx.value();
    if (value == null || value === '') return undefined;
    if (options?.when && !options.when(ctx)) return undefined;
    if (value === ctx.valueOf(otherPath)) return undefined;

    return {
      kind: 'match',
      target: String(ctx.stateOf(otherPath).keyInParent()),
      message: messageOf(options?.message, ctx),
    };
  });
}

/**
 * Signal Forms rule: the string at `path` must hold something other than
 * whitespace. It is `required` that also refuses `'   '`, so it replaces
 * `required` on the field rather than joining it.
 *
 * The error is Angular's own `{ kind: 'required' }` and the field is marked
 * required, so the copy and the asterisk an app already has for `required`
 * cover it. An empty string, `null` and `undefined` are refused by `required`
 * itself.
 *
 * @example
 * ```ts
 * form(model, path => {
 *   wrNotBlank(path.reason, { message: 'Say why.' });
 * });
 * ```
 */
export function wrNotBlank<TValue extends string | null | undefined, TPathKind extends PathKind = PathKind.Root>(
  path: SchemaPath<TValue, SchemaPathRules.Supported, TPathKind>,
  options?: WrRuleOptions<TValue, TPathKind>
): void {
  required(path, options);
  validate(path, ctx => {
    const value = ctx.value();
    // An empty string is `required`'s to report, and reporting it here too would print the message twice.
    if (typeof value !== 'string' || value === '' || value.trim() !== '') return undefined;
    if (options?.when && !options.when(ctx)) return undefined;

    return requiredError({ message: messageOf(options?.message, ctx) });
  });
}
