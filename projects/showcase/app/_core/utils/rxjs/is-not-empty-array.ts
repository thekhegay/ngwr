import { Maybe } from '#core/interfaces/common';

export function isNotEmptyArray<T>(val: Maybe<T>): val is T {
  return !Array.isArray(val) || val.length !== 0;
}
