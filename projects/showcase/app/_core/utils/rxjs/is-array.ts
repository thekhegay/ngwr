import { Maybe } from '#core/interfaces/common';

export function isArray<T>(val: Maybe<T>): val is T {
  return Array.isArray(val);
}
