import { isNil } from 'lodash';
import { Maybe } from 'showcase/@shared/interfaces/common';

export function isDefined<T>(val: Maybe<T>): val is T {
  return !isNil(val);
}
