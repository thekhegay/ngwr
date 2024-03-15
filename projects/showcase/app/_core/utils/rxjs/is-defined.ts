import { Maybe } from '#core/interfaces/common';

export function isDefined<T>(value: Maybe<T>): value is T {
  return value != null;
}
