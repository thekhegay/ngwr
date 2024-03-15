import { Maybe } from 'showcase/@shared/interfaces/common';

export function isDefined<T>(value: Maybe<T>): value is T {
  return value != null;
}
